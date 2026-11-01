import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const url = process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173';
const output = 'qa/artifacts/transition';
await mkdir(output, { recursive: true });
const errors = [];
async function snapshot(page) {
  return page.evaluate(() => {
    const values = selector => [...document.querySelectorAll(selector)].map(element => ({
      opacity: +getComputedStyle(element).opacity,
      translate: getComputedStyle(element).translate,
    }));
    const brand = document.querySelector('.brand-en').getBoundingClientRect();
    const title = document.querySelector('h1').getBoundingClientRect();
    return {
      progress: +document.documentElement.dataset.progress,
      paths: [...document.querySelectorAll('.rings path')].map(path => ({ d: path.getAttribute('d'), opacity: +path.style.opacity })),
      copy: values('.album-copy > *'), photos: values('.photo-river figure'),
      brand: { x: brand.x, y: brand.y, width: brand.width, height: brand.height },
      title: { y: title.y, height: title.height },
      mist: +getComputedStyle(document.querySelector('.stage')).getPropertyValue('--mist-opacity'),
      albumBackground: getComputedStyle(document.querySelector('.album')).backgroundColor,
      stageTop: document.querySelector('.stage').getBoundingClientRect().top,
    };
  });
}
async function go(page, progress) {
  await page.evaluate(p => {
    const travel = Number(document.documentElement.dataset.introTravel);
    scrollTo(0, p === 1 ? Math.ceil(travel) : Math.round(travel * p));
  }, progress);
  await page.waitForFunction(p => Math.abs(+document.documentElement.dataset.progress - p) < .002, progress);
  await page.waitForTimeout(80);
  return snapshot(page);
}
try {
  for (const [width, height] of [[1920, 1080], [390, 844], [1366, 768]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.state === 'entering', { timeout: 15000 });
    const enteringAt = Date.now();
    await page.waitForTimeout(800);
    const overlap = await page.locator('.brand-en').evaluate(el => +getComputedStyle(el).opacity);
    assert.ok(overlap > .05 && overlap < .95, 'crossfade is still in progress after 800ms');
    if (width === 1920) await page.screenshot({ path: `${output}/brand-overlap.png` });
    await page.waitForFunction(() => document.documentElement.dataset.state === 'idle');
    assert.ok(Date.now() - enteringAt >= 1300, 'brand handover lasts approximately 1.5 seconds');
    const forward = new Map();
    for (const progress of [0, .25, .55, .8, 1]) {
      const state = await go(page, progress);
      assert.equal(state.albumBackground, 'rgba(0, 0, 0, 0)', 'one canvas, no second opaque page');
      assert.ok(Math.abs(state.stageTop) < 2, 'scene remains anchored');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (progress === 0) {
        assert.deepEqual(state.copy.map(item => item.opacity), [0, 0, 0, 0]);
        assert.equal(state.mist, .6, '80% gradient × 60% settled strength = 48%');
      }
      if (state.copy.some(item => item.opacity > 0)) assert.equal(state.mist, 0, 'green is gone before album text appears');
      if (progress === .55) {
        assert.ok(state.paths.every(path => path.opacity === 1), 'all three rings remain until fully unfolded');
        assert.ok(state.copy[0].opacity > state.copy[1].opacity && state.copy[1].opacity > 0);
        assert.ok(state.brand.y + state.brand.height < state.title.y, 'brand clears the incoming heading');
      }
      if (progress === .8) {
        assert.ok(state.photos[0].opacity > state.photos[1].opacity, 'photos are staggered');
        assert.ok(state.photos[0].opacity > 0);
      }
      if (progress === 1) {
        assert.deepEqual(state.copy.map(item => item.opacity), [1, 1, 1, 1]);
        assert.deepEqual(state.photos.map(item => item.opacity), [1, 1, 1, 1]);
        assert.ok(Math.abs(state.brand.x + state.brand.width / 2 - width / 2) < 2);
        assert.ok(state.brand.y < 60);
      }
      forward.set(progress, state);
      await page.screenshot({ path: `${output}/${width}-forward-${Math.round(progress * 100)}.png` });
    }
    for (const progress of [.8, .55, .25]) {
      const backward = await go(page, progress);
      assert.deepEqual(backward, forward.get(progress), 'reverse scrolling restores the same scene');
      await page.waitForTimeout(150);
      assert.deepEqual(await snapshot(page), backward, 'paused scene is stable');
      await page.screenshot({ path: `${output}/${width}-reverse-${Math.round(progress * 100)}.png` });
    }
    await go(page, .67);
    const merged = await snapshot(page);
    assert.ok(merged.paths.every(path => path.d === merged.paths[2].d), 'paths coincide while inner/middle retire');
    await go(page, .70);
    const line = await snapshot(page);
    assert.ok(line.paths[0].opacity < .00001 && line.paths[1].opacity < .00001);
    assert.equal(line.paths[2].opacity, 1);
    assert.equal(line.copy[3].opacity, 0, 'link stays hidden while the merged line crosses its position');
    await page.screenshot({ path: `${output}/${width}-merged-line.png` });
    await go(page, 0);
    await page.locator('.brand-en').click();
    assert.equal(await page.evaluate(() => scrollY), 0, 'center activation stays in the scene');
    await page.locator('.brand-en').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => scrollY), 0, 'keyboard brand activation is a ripple, not a page jump');
    await page.locator('.skip').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => +document.documentElement.dataset.progress === 1);
    assert.equal(await page.locator('.album').evaluate(element => element.inert), false);
    console.log(`PASS: ${width}×${height} five checkpoints, reverse/hold, complete merge, slower crossfade and keyboard skip`);
    await page.close();
  }
  const failure = await browser.newPage();
  await failure.route('**/src/prelude.mjs', route => route.abort());
  await failure.goto(url);
  assert.equal(await failure.locator('.rings').isVisible(), false);
  assert.equal(await failure.locator('h1').isVisible(), true);
  assert.equal(await failure.locator('h1').evaluate(element => +getComputedStyle(element).opacity), 1);
  await failure.close();
  const runtime = await browser.newPage();
  await runtime.goto(url);
  await runtime.waitForFunction(() => document.documentElement.dataset.state === 'idle');
  await go(runtime, .55);
  await runtime.evaluate(() => dispatchEvent(new ErrorEvent('error', { message: 'Synthetic fallback check' })));
  assert.equal(await runtime.locator('h1').evaluate(element => +getComputedStyle(element).opacity), 1);
  assert.equal(await runtime.locator('h1').evaluate(element => getComputedStyle(element).translate), 'none');
  assert.equal(await runtime.locator('.album').evaluate(element => element.inert), false);
  await runtime.close();
  assert.deepEqual(errors, []);
  console.log('PASS: failed-module/runtime fallback restores all independently animated elements');
} finally { await browser.close(); }
