import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4173/';
const label = process.argv[3] || 'baseline';

async function run(width, height, scroll) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height }, bypassCSP: true });
  const page = await context.newPage();
  const byType = new Map();
  let requests = 0;
  page.on('response', async (res) => {
    requests++;
    const type = res.request().resourceType();
    let bytes = 0;
    try { bytes = (await res.body()).length; } catch { bytes = 0; }
    const entry = byType.get(type) || { count: 0, bytes: 0 };
    entry.count++; entry.bytes += bytes;
    byType.set(type, entry);
  });
  await page.goto(target, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  const firstPaint = await page.evaluate(() => {
    const paint = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
    const lcp = performance.getEntriesByType('largest-contentful-paint').at(-1);
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      fcp: Math.round(paint?.startTime ?? -1),
      lcp: Math.round(lcp?.startTime ?? -1),
      dcl: Math.round(nav?.domContentLoadedEventEnd ?? -1),
      load: Math.round(nav?.loadEventEnd ?? -1),
      imgs: document.images.length,
      imgsLoaded: [...document.images].filter((i) => i.complete && i.naturalWidth > 0).length,
    };
  });
  const initialBytes = [...byType.values()].reduce((a, b) => a + b.bytes, 0);
  if (scroll) {
    const heightTotal = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < heightTotal; y += Math.round(height * 0.8)) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(2500);
  }
  const final = await page.evaluate(() => ({
    imgsLoaded: [...document.images].filter((i) => i.complete && i.naturalWidth > 0).length,
    imgs: document.images.length,
    transfer: performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0),
  }));
  const totals = [...byType.entries()].map(([type, v]) => `${type}:${v.count}/${Math.round(v.bytes / 1024)}KB`).join(' ');
  console.log(`[${label}] ${width}x${height} scroll=${scroll}`);
  console.log(`  firstPaint ${JSON.stringify(firstPaint)}`);
  console.log(`  initialBytes ${Math.round(initialBytes / 1024)}KB requests ${requests}`);
  console.log(`  ${totals}`);
  console.log(`  afterScroll ${JSON.stringify(final)}`);
  await browser.close();
}

await run(1440, 900, false);
await run(390, 844, false);
await run(1440, 900, true);
