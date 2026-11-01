import { chromium } from 'playwright';
const url = process.env.DEPLOY_URL || 'http://127.0.0.1:4174';
const browser = await chromium.launch();
const pages = ['/', '/journal/', '/journal/why-pebril/', '/journal/en/', '/journal/en/why-pebril/'];
for (const path of pages) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [], failed = [], external = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => failed.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  await page.route('https://**', route => { external.push(route.request().url()); route.abort(); });
  await page.goto(url + path, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    fonts: { manrope: document.fonts.check('40px Manrope'), kai: document.fonts.check('20px "Pebril Kai"') },
    state: document.documentElement.dataset.state || null,
    title: document.title.slice(0, 40),
  }));
  console.log(path.padEnd(28), JSON.stringify({ ...info, errors: errors.length, failed, external }));
  await page.close();
}
await browser.close();
