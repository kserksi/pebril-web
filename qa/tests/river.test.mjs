import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('https://**/*', route => route.request().resourceType() === 'image'
  ? route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"/>' })
  : route.abort());
const sample = () => page.locator('.photo-river figure').nth(1).evaluate(element => ({
  x: element.getBoundingClientRect().x + element.getBoundingClientRect().width / 2,
  time: performance.now(),
  offset: element.style.getPropertyValue('--river-offset'),
  bob: element.style.getPropertyValue('--river-bob'),
  sway: element.style.getPropertyValue('--river-sway'),
  photoHeight: element.querySelector('img').clientHeight,
}));
async function go(progress) {
  await page.evaluate(p => {
    const travel = Number(document.documentElement.dataset.introTravel);
    scrollTo(0, p === 1 ? Math.ceil(travel) : Math.round(travel * p));
  }, progress);
  await page.waitForFunction(p => Math.abs(+document.documentElement.dataset.progress - p) < .002, progress);
  await page.waitForTimeout(100);
}
try {
  await page.goto(process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173');
  await page.waitForFunction(() => document.documentElement.dataset.state === 'idle');
  for (const [width, height] of [[1920, 1080], [390, 844], [2560, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    await go(1);
    const before = await sample();
    await page.waitForTimeout(1300);
    const after = await sample();
    const expected = width * (after.time - before.time) / 60000;
    assert.ok(before.x > after.x, 'flow is right to left');
    assert.ok(Math.abs(before.x - after.x - expected) < 2, `one viewport per 60s: ${width}px`);
    assert.equal(await page.locator('.photo-river figure').count(), width === 2560 ? 5 : 4, 'only the slots required by the viewport');
    const poses = await page.locator('.photo-river figure').evaluateAll(cards => cards.map(card => ({
      bob: parseFloat(card.style.getPropertyValue('--river-bob')),
      sway: parseFloat(card.style.getPropertyValue('--river-sway')),
      height: card.querySelector('img').clientHeight,
      transform: getComputedStyle(card).transform,
    })));
    assert.ok(poses.every(pose => Math.abs(pose.bob) <= pose.height * .02 + .001 && Math.abs(pose.sway) <= .6));
    assert.ok(poses.every(pose => pose.transform !== 'none'));
    assert.ok(new Set(poses.map(pose => pose.sway.toFixed(4))).size > 1, 'periods differ across cards');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await go(.8);
    const held = await sample();
    await page.waitForTimeout(400);
    const paused = await sample();
    assert.equal(paused.offset, held.offset, 'intro handoff freezes flow phase');
    assert.equal(paused.bob, held.bob);
    assert.equal(paused.sway, held.sway);
    await go(1);
    console.log(`PASS: ${width}×${height} actual leftward speed, resize, fixed node count and scroll pause`);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const still = await sample();
  await page.waitForTimeout(400);
  const reduced = await sample();
  assert.equal(reduced.offset, still.offset);
  assert.equal(reduced.bob, still.bob);
  assert.equal(reduced.sway, still.sway);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(200);
  assert.ok((await sample()).x < still.x, 'flow resumes from the held phase');
  console.log('PASS: reduced-motion pause/resume');

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = await sample();
  await page.waitForTimeout(500);
  const hiddenPose = await sample();
  assert.equal(hiddenPose.offset, hidden.offset);
  assert.equal(hiddenPose.bob, hidden.bob);
  assert.equal(hiddenPose.sway, hidden.sway);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(150);
  const restored = await sample();
  assert.ok(restored.x < hidden.x && hidden.x - restored.x < 10, 'resume avoids background fast-forward');
  console.log('PASS: simulated visibility pause/resume without fast-forward');

  await page.evaluate(() => {
    window.ringWrites = 0;
    window.ringObserver = new MutationObserver(records => { window.ringWrites += records.length; });
    for (const path of document.querySelectorAll('.rings path')) window.ringObserver.observe(path, { attributes: true });
  });
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.ringWrites), 0, 'retired intro paths are not redrawn for river frames');
  await page.evaluate(() => window.ringObserver.disconnect());
  assert.deepEqual(errors, []);
  console.log('PASS: stable river frames do not redraw retired rings; no uncaught browser errors');
  await page.evaluate(() => dispatchEvent(new ErrorEvent('error', { message: 'Synthetic river fallback' })));
  assert.equal(await page.locator('.album').evaluate(element => element.inert), false);
  assert.ok(await page.locator('.photo-river figure').evaluateAll(cards => cards.every(card => ['--river-offset', '--river-bob', '--river-sway'].every(property => !card.style.getPropertyValue(property)))));
  console.log('PASS: runtime fallback clears river offsets and restores the static album');
} finally { await browser.close(); }
