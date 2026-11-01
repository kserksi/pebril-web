import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
const info = await page.evaluate(() => {
  const kai = 'LXGW WenKai';
  const probe = '你的图片自有归处时间漫游溪石向下慢慢展开选择本地照片图片集张';
  const missing = [...probe].filter((c) => !document.fonts.check(`40px "${kai}"`, c));
  return {
    state: document.documentElement.dataset.state,
    status: document.querySelector('.loading-status')?.textContent,
    missing: missing.join(''),
    h1: getComputedStyle(document.querySelector('h1')).fontFamily,
    closureFont: getComputedStyle(document.querySelector('#closure-title')).fontFamily,
  };
});
console.log(JSON.stringify(info));
console.log('errors:', errors.length ? errors : 'none');
await page.screenshot({ path: '/tmp/subset-hero.png' });
const height = await page.evaluate(() => document.documentElement.scrollHeight);
await page.evaluate((y) => window.scrollTo(0, y), height - 900);
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/subset-closure.png' });
await browser.close();
