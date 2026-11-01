import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const url = process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173';
const errors = [];
const fixture = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#889b91"/></svg>';
async function pageFor(options = {}, mode = 'fixture') {
  const page = await browser.newPage(options);
  page.on('pageerror', error => errors.push(error.message));
  if (mode !== 'live') await page.route(/https:\/\/|\/assets\/photos\/.*\.webp/, async route => {
    if (route.request().resourceType() === 'image' && mode === 'fixture') {
      await route.fulfill({ contentType: 'image/svg+xml', body: fixture });
    } else await route.abort();
  });
  return page;
}
async function idle(page) { await page.waitForFunction(() => document.documentElement.dataset.state === 'idle', { timeout: 18000 }); }
async function scrollTo(page, progress) {
  await page.evaluate(p => {
    window.scrollTo(0, Number(document.documentElement.dataset.introTravel) * p);
  }, progress);
  await page.waitForTimeout(100);
}
async function shape(page) { return page.locator('.rings path').evaluateAll(paths => paths.map(path => path.getAttribute('d'))); }
try {
  const bootPage = await pageFor();
  let releaseModule;
  const moduleGate = new Promise(resolve => { releaseModule = resolve; });
  await bootPage.route('**/src/prelude.mjs', async route => { await moduleGate; await route.continue(); });
  await bootPage.goto(url, { waitUntil: 'commit' });
  await bootPage.waitForFunction(() => getComputedStyle(document.querySelector('.stage')).position === 'sticky');
  assert.equal(await bootPage.locator('.closure').isVisible(), false, 'closure is hidden before the module loads');
  assert.equal(await bootPage.locator('.album').isVisible(), false, 'album is hidden before the enhancement module loads');
  await bootPage.waitForTimeout(200);
  assert.ok(await bootPage.locator('.brand-zh').evaluate(el => +getComputedStyle(el).opacity > 0));
  assert.equal(await bootPage.locator('.brand-en').evaluate(el => getComputedStyle(el).opacity), '0');
  releaseModule();
  await idle(bootPage);
  assert.equal(await bootPage.locator('.brand-en').evaluate(el => getComputedStyle(el).opacity), '1');
  assert.equal(await bootPage.locator('.brand-zh').evaluate(el => getComputedStyle(el).opacity), '0');
  console.log('PASS: pre-module first paint is the Prelude; Chinese precedes English');
  await bootPage.close();

  const page = await pageFor({ viewport: { width: 1920, height: 1080 } });
  await page.goto(url);
  await idle(page);
  await page.screenshot({ path: 'qa/artifacts/prelude-desktop.png' });
  assert.equal(await page.evaluate(() => document.documentElement.dataset.actual), '1.000');
  await scrollTo(page, .05);
  const early = await shape(page);
  await page.waitForTimeout(200);
  assert.deepEqual(await shape(page), early, 'early exit also freezes autonomous movement');
  await scrollTo(page, .7);
  const paused = await shape(page);
  await page.waitForTimeout(250);
  assert.deepEqual(await shape(page), paused, 'scroll geometry holds while paused');
  await scrollTo(page, .95);
  await scrollTo(page, .7);
  assert.deepEqual(await shape(page), paused, 'reverse scroll restores the same geometry');
  await scrollTo(page, 1);
  const position = await page.locator('.brand-en').boundingBox();
  assert.ok(Math.abs(position.x + position.width / 2 - 960) < 2);
  assert.ok(position.y < 60);
  assert.equal(await page.locator('.album').evaluate(el => el.inert), false);
  await page.screenshot({ path: 'qa/artifacts/album-desktop.png' });
  await scrollTo(page, 0);
  await idle(page);
  const cue = page.locator('.explore');
  assert.equal(await cue.evaluate(el => el.tagName), 'P', 'the prelude hint is a passive note, not a button');
  assert.equal(await cue.evaluate(el => getComputedStyle(el).pointerEvents), 'none', 'nothing hit-tests the hint');
  assert.equal(await cue.evaluate(el => getComputedStyle(el).cursor), 'auto', 'the hint does not invite a click');
  const cueBox = await cue.boundingBox();
  await page.mouse.click(cueBox.x + cueBox.width / 2, cueBox.y + cueBox.height / 2);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => scrollY), 0, 'clicking where the hint sits does not jump');
  for (let step = 0; step < 8 && !(await page.evaluate(() => Number(document.documentElement.dataset.progress) > .99)); step++) {
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(250);
  }
  await page.waitForFunction(() => Number(document.documentElement.dataset.progress) > .99);
  console.log('PASS: loading, held/reversed geometry, brand position, passive hint, keyboard paging');
  await page.close();

  for (const [width, height] of [[390, 844], [1024, 768], [1366, 768], [2560, 1080]]) {
    const responsive = await pageFor({ viewport: { width, height }, reducedMotion: 'reduce' });
    await responsive.goto(url);
    await idle(responsive);
    const before = await shape(responsive);
    await responsive.mouse.move(width / 2, height / 2);
    await responsive.waitForTimeout(150);
    assert.deepEqual(await shape(responsive), before, 'reduced motion disables breathing and ripple');
    assert.equal(await responsive.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (width === 390) await responsive.screenshot({ path: 'qa/artifacts/prelude-mobile.png' });
    await scrollTo(responsive, 1);
    assert.equal(await responsive.locator('.album').evaluate(el => el.inert), false);
    assert.equal(await responsive.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    console.log(`PASS: ${width}×${height}, reduced motion, navigation`);
    await responsive.close();
  }

  const failure = await pageFor({}, 'failure');
  await failure.goto(url);
  await idle(failure);
  assert.equal(await failure.locator('.photo-river figure.failed').count(), 4);
  await scrollTo(failure, 1);
  assert.equal(await failure.locator('.album').evaluate(el => el.inert), false);
  console.log('PASS: all photo and font resources failing safely');
  await failure.close();

  const delayed = await pageFor();
  await delayed.route('**/web_image_26e8cb.webp', async route => {
    await new Promise(resolve => setTimeout(resolve, 2500));
    await route.fulfill({ contentType: 'image/svg+xml', body: fixture });
  });
  await delayed.goto(url, { waitUntil: 'domcontentloaded' });
  await delayed.waitForTimeout(1200);
  assert.equal(await delayed.evaluate(() => document.documentElement.dataset.state), 'loading');
  const loading = await delayed.evaluate(() => ({ actual: +document.documentElement.dataset.actual, visual: +document.documentElement.dataset.visual }));
  assert.ok(loading.actual < 1 && loading.visual <= loading.actual);
  assert.equal(await delayed.locator('.album').evaluate(el => el.inert), true);
  await idle(delayed);
  console.log('PASS: actual delayed resource gates entry; visual progress never leads actual');
  await delayed.close();

  const stalled = await pageFor();
  await stalled.route('**/web_image_26e8cb.webp', () => {});
  await stalled.goto(url, { waitUntil: 'domcontentloaded' });
  await idle(stalled);
  assert.equal(await stalled.locator('figure.failed').count(), 1);
  console.log('PASS: stalled resource times out and safely degrades');
  await stalled.close();

  const staticPage = await pageFor({ javaScriptEnabled: false });
  await staticPage.goto(url);
  assert.equal(await staticPage.locator('.rings').isVisible(), false);
  assert.equal(await staticPage.locator('h1').isVisible(), true);
  console.log('PASS: no-JavaScript semantic album fallback');
  await staticPage.close();

  const live = await pageFor({ viewport: { width: 1366, height: 768 } }, 'live');
  await live.goto(url, { waitUntil: 'domcontentloaded' });
  await idle(live);
  console.log('LIVE:', await live.evaluate(() => ({ photos: [...document.images].filter(i => i.naturalWidth > 0).length, fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family) })));
  await live.screenshot({ path: 'qa/artifacts/prelude-live.png' });
  await scrollTo(live, 1);
  await live.screenshot({ path: 'qa/artifacts/album-live.png' });
  await live.close();
  assert.deepEqual(errors, []);
  console.log('PASS: no uncaught browser errors');
} finally { await browser.close(); }
