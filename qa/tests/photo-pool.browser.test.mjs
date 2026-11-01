import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { PHOTO_FILES } from '../../src/demo-photos.mjs';
const browser = await chromium.launch({ headless: true });
const url = process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173';
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.resourceType() === 'image') requests.push(request.url()); });
  await page.route('https://**/*', route => route.abort());
  await page.clock.install();
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.dataset.state === 'idle');
  await page.waitForTimeout(100);
  assert.equal(requests.length, 5, 'only four initial photos and one replacement are requested');
  assert.ok(requests.every(request => request.includes('/assets/photos/')));
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.evaluate(() => {
    window.swaps = [];
    new MutationObserver(records => {
      for (const record of records) {
        const card = record.target.closest('figure');
        const bounds = card.getBoundingClientRect();
        window.swaps.push({ left: bounds.left, right: bounds.right, width: innerWidth, loaded: record.target.naturalWidth > 0 });
      }
    }).observe(document.querySelector('.photo-river'), { subtree: true, attributes: true, attributeFilter: ['src'] });
    scrollTo(0, Math.ceil(Number(document.documentElement.dataset.introTravel)));
  });
  await page.clock.runFor(26000);
  const swaps = await page.evaluate(() => window.swaps);
  assert.ok(swaps.length > 0, 'a real card passes the recycle boundary');
  assert.ok(swaps.every(swap => swap.left >= swap.width || swap.right <= 0), 'all replacements happen outside the viewport');
  assert.ok(swaps.every(swap => swap.loaded), 'a decoded replacement is immediately available');
  assert.equal(await page.locator('.photo-river figure').count(), 4);
  assert.ok(requests.length < 25, 'the entire source pool is not eagerly downloaded');
  await page.setViewportSize({ width: 3840, height: 1080 });
  await page.waitForTimeout(100);
  await page.clock.runFor(100);
  assert.equal(await page.locator('.photo-river figure').count(), 6, 'wide viewports add only the required slots');
  assert.ok(await page.locator('.photo-river figure').evaluateAll(cards => cards.every(card => +card.style.opacity === 1)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  await page.clock.runFor(100);
  assert.equal(await page.locator('.photo-river figure').count(), 4, 'unused wide-screen slots are removed');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: 'qa/artifacts/local-photo-pool-mobile.png' });
  console.log('PASS: bounded local requests, decoded offscreen replacement, responsive slot count and no browser errors');
  await page.close();

  const failure = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await failure.route('https://**/*', route => route.abort());
  await failure.route('**/assets/photos/**', route => PHOTO_FILES.slice(0, 4)
    .includes(new URL(route.request().url()).pathname.split('/').pop()) ? route.continue() : route.abort());
  await failure.clock.install();
  await failure.goto(url);
  await failure.waitForFunction(() => document.documentElement.dataset.state === 'idle');
  const before = await failure.locator('.photo-river img').evaluateAll(images => images.map(image => image.src));
  await failure.clock.pauseAt(await failure.evaluate(() => Date.now() + 100));
  await failure.evaluate(() => scrollTo(0, Math.ceil(Number(document.documentElement.dataset.introTravel))));
  await failure.clock.runFor(26000);
  assert.deepEqual(await failure.locator('.photo-river img').evaluateAll(images => images.map(image => image.src)), before);
  assert.ok(await failure.locator('.photo-river img').evaluateAll(images => images.every(image => {
    const source = new URL(image.currentSrc);
    return image.complete && image.naturalWidth > 0 && source.pathname.startsWith('/assets/photos/');
  })));  console.log('PASS: failed replacement requests preserve the existing decoded photos');
  await failure.close();
} finally { await browser.close(); }
