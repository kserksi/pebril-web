// Captures the cross-document transition frames, journal↔journal and journal→home,
// so timings can be eyeballed without watching the whole story.
import { chromium } from 'playwright';

const url = process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch();

async function shoot(label, start, selector, frames) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url + start, { waitUntil: 'load' });
  await page.locator(selector).first().click({ noWaitAfter: true });
  let previous = 0;
  for (const ms of frames) {
    await page.waitForTimeout(ms - previous);
    previous = ms;
    await page.screenshot({ path: `/tmp/${label}-${String(ms).padStart(3, '0')}.png` });
  }
  await page.close();
}

await shoot('journal', '/journal/', '.entries .entry', [0, 60, 140, 220, 340]);
await shoot('home', '/journal/', '.masthead-nav > a:last-child', [50, 110, 180, 260]);
await browser.close();
console.log('frames in /tmp/journal-*.png and /tmp/home-*.png');
