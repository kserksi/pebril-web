import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
try {
  await page.route('https://**/*', route => route.abort());
  await page.clock.install();
  await page.goto(process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173');
  await page.waitForFunction(() => document.documentElement.dataset.state === 'idle');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  for (const [width, height] of [[1920, 1080], [390, 844], [2560, 1080], [3840, 1080], [466, 628], [1366, 768]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    await page.clock.runFor(100);
    await page.evaluate(() => scrollTo(0, Math.ceil(Number(document.documentElement.dataset.introTravel))));
    await page.waitForTimeout(100);
    await page.clock.runFor(100);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.progress), '1.000');
    for (let sample = 0; sample < 7; sample++) {
      const state = await page.locator('.photo-river figure').evaluateAll(cards => {
        const bottom = document.querySelector('.stage').getBoundingClientRect().bottom;
        return cards.map(card => {
          const image = card.querySelector('img'), bounds = image.getBoundingClientRect();
          return { layer: +card.dataset.exposure, visible: Math.max(0, Math.min(bottom, bounds.bottom) - Math.max(0, bounds.top)), height: image.clientHeight };
        });
      });
      assert.equal(state.filter(card => card.layer === .25).length, 1);
      assert.equal(state.filter(card => card.layer === .15).length, 1);
      assert.ok(state.filter(card => card.layer === .5).length >= 2);
      assert.ok(state.every(card => card.visible <= card.height * card.layer + 1), `${width}×${height}: no exposure cap is exceeded`);
      assert.ok(state.filter(card => card.layer === .5).every(card => card.visible > card.height * .40), `${width}×${height}: the primary layer remains present ${JSON.stringify(state)}`);
      await page.clock.runFor(2000);
    }
    await page.screenshot({ path: `qa/artifacts/exposure-${width}.png` });
    console.log(`PASS: ${width}×${height} exposure layers throughout 12 seconds of bob/sway`);
  }
} finally { await browser.close(); }
