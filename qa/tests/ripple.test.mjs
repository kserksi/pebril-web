import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const url = process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173';
async function spread(page) {
  return page.locator('.rings path').evaluateAll(paths => paths.map(path => {
    const radii = path.getAttribute('d').slice(1).split('L').map(point => {
      const [x, y] = point.split(',').map(Number);
      return Math.hypot(x - 500, y - 500);
    });
    return Math.max(...radii) - Math.min(...radii);
  }));
}
async function fixture(options = {}, delay = 0) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, ...options });
  await page.route(/https:\/\/|\/assets\/photos\/.*\.webp/, async route => {
    if (route.request().resourceType() !== 'image') return route.abort();
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"/>' });
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return page;
}
try {
  const page = await fixture({}, 3500);
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('html').getAttribute('data-state'), 'loading');
  assert.ok(Math.max(...await spread(page)) > 2, 'actual loading has visible contour ripples');
  await page.waitForFunction(() => document.documentElement.dataset.state === 'idle');
  assert.ok(Math.max(...await spread(page)) < .01, 'loading ripples settle to regular circles');
  const bounds = await page.locator('.rings').boundingBox();
  const x = bounds.x + bounds.width * .9;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.waitForTimeout(150);
  assert.ok((await spread(page))[2] > 1, 'hover visibly perturbs the nearest ring');
  await page.waitForTimeout(4500);
  await page.mouse.click(x, y);
  await page.waitForTimeout(150);
  assert.ok((await spread(page))[2] > 2, 'pointer activation creates a stronger ripple');
  await page.screenshot({ path: 'qa/artifacts/ripple.png' });
  assert.equal(await page.evaluate(() => scrollY), 0);
  await page.waitForTimeout(4500);
  assert.ok(Math.max(...await spread(page)) < .01, 'interaction decays back to regular circles');
  await page.locator('.brand-en').click();
  assert.equal(await page.evaluate(() => scrollY), 0, 'center brand activation preserves the ripple scene');
  console.log('PASS: real-loading ripple, hover, pointer activation, decay and stationary brand activation');
  await page.close();

  const touch = await fixture({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  await touch.waitForFunction(() => document.documentElement.dataset.state === 'idle');
  const mobile = await touch.locator('.rings').boundingBox();
  await touch.touchscreen.tap(mobile.x + mobile.width * .9, mobile.y + mobile.height / 2);
  await touch.waitForTimeout(150);
  assert.ok((await spread(touch))[2] > 2, 'touch activation visibly perturbs the ring');
  console.log('PASS: touch ripple');
  await touch.close();

  const reduced = await fixture({ reducedMotion: 'reduce' });
  await reduced.waitForFunction(() => document.documentElement.dataset.state === 'idle');
  await reduced.mouse.click(800, 384);
  await reduced.waitForTimeout(200);
  assert.ok(Math.max(...await spread(reduced)) < .01);
  console.log('PASS: reduced motion suppresses interaction ripples');
  await reduced.close();
} finally { await browser.close(); }
