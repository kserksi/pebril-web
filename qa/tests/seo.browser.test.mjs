import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { copy } from '../../src/zh-CN.mjs';

const origin = process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173';
const canonical = 'https://pebril.dev/';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const response = await context.request.get(origin);
  assert.equal(response.status(), 200);
  const raw = await response.text();
  assert.match(raw, /self-hosted image management project/);
  assert.match(raw, /<a href="\/journal">/);
  assert.doesNotMatch(raw, /meta name="keywords"|SearchAction|aggregateRating|datePublished/);
  const page = await context.newPage();
  await page.goto(origin);
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.match(await page.title(), /Pebril.*self-hosted/);
  assert.equal(await page.locator('main').count(), 1);
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), canonical);
  assert.equal(await page.locator('link[rel="describedby"]').getAttribute('href'), '/llms.txt');
  assert.ok(await page.locator('h1').isVisible());
  assert.ok(await page.locator('.closure-actions .repository').isVisible());
  assert.ok(await page.locator('main').evaluate(el => !el.closest('section, article, aside, header, footer, nav')));
  assert.equal(await page.getByRole('contentinfo').count(), 1);
  assert.equal(await page.locator('meta[name="description"]').count(), 1);
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 1);
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  assert.equal(schema['@type'], 'WebSite');
  assert.equal(schema.name, 'Pebril');
  assert.equal(schema.url, canonical);
  const social = await page.locator('meta[property^="og:"], meta[name^="twitter:"]').evaluateAll(elements =>
    Object.fromEntries(elements.map(el => [el.getAttribute('property') || el.name, el.content])));
  assert.equal(social['og:url'], canonical);
  assert.equal(social['og:image'], social['twitter:image']);
  const image = await context.request.get(origin + new URL(social['og:image']).pathname);
  assert.equal(image.status(), 200);
  assert.match(image.headers()['content-type'], /image\/png/);
  const png = await image.body();
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), Number(social['og:image:width']));
  assert.equal(png.readUInt32BE(20), Number(social['og:image:height']));
  const robots = await context.request.get(origin + '/robots.txt');
  assert.equal(robots.status(), 200);
  assert.match(robots.headers()['content-type'], /text\/plain/);
  assert.match(await robots.text(), /User-agent: \*\s+Allow: \/\s+Sitemap: https:\/\/pebril.dev\/sitemap.xml/);
  const sitemap = await context.request.get(origin + '/sitemap.xml');
  assert.equal(sitemap.status(), 200);
  const xml = await sitemap.text();
  const entries = await page.evaluate(text => {
    const document = new DOMParser().parseFromString(text, 'application/xml');
    return { error: !!document.querySelector('parsererror'), namespace: document.documentElement.namespaceURI,
      urls: [...document.querySelectorAll('loc')].map(el => el.textContent) };
  }, xml);
  assert.equal(entries.error, false);
  assert.equal(entries.namespace, 'http://www.sitemaps.org/schemas/sitemap/0.9');
  assert.deepEqual(entries.urls, [canonical, canonical + 'journal/', canonical + 'journal/why-pebril/']);
  assert.doesNotMatch(xml, /lastmod|priority|changefreq/);
  assert.match(xml, /hreflang="x-default" href="https:\/\/pebril.dev\/journal\/why-pebril\/"/);
  for (const filename of ['llm.txt', 'llms.txt']) {
    const resource = await context.request.get(origin + '/' + filename);
    assert.equal(resource.status(), 200);
    assert.match(resource.headers()['content-type'], /text\/plain/);
    const text = await resource.text();
    assert.match(text, /^# Pebril\n/);
    assert.match(text, /early development/);
    assert.doesNotMatch(text, /localhost|127\.0\.0\.1|\/home\/|\/mnt\/|handoff|AGENTS|\.qa|\/docs\//);
  }
  const llms = await context.request.get(origin + '/llms.txt');
  assert.match(await llms.text(), /\(https:\/\/pebril\.dev\/journal\/\)/);
  console.log('PASS: raw/no-JS content, semantic landmarks, metadata, image and discovery resources');
  await context.close();

  const enhanced = await browser.newPage({ viewport: { width: 686, height: 956 } });
  const errors = [];
  enhanced.on('pageerror', error => errors.push(error.message));
  await enhanced.route('https://**', route => route.abort());
  await enhanced.goto(origin);
  await enhanced.waitForFunction(() => document.documentElement.dataset.state === 'idle', { timeout: 18000 });
  assert.equal(await enhanced.locator('html').getAttribute('lang'), copy.locale);
  assert.equal(await enhanced.title(), copy.seoTitle);
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    assert.equal(await enhanced.locator(selector).getAttribute('content'), copy.seoDescription);
    assert.equal(await enhanced.locator(selector).textContent(), '');
  }
  assert.equal(await enhanced.locator('meta[property="og:locale"]').getAttribute('content'), copy.socialLocale);
  assert.equal(await enhanced.locator('link[rel="canonical"]').getAttribute('href'), canonical);
  assert.deepEqual(errors, []);
  console.log('PASS: Chinese head/body localization, stable canonical and intact Prelude startup');
  await enhanced.close();

  const failed = await browser.newPage();
  await failed.route('**/src/prelude.mjs', route => route.abort());
  await failed.goto(origin);
  await failed.waitForFunction(() => !document.documentElement.classList.contains('enhanced'));
  assert.equal(await failed.locator('html').getAttribute('lang'), 'en');
  assert.ok(await failed.locator('h1').isVisible());
  assert.ok(await failed.locator('.closure-actions .repository').isVisible());
  assert.match(await failed.title(), /self-hosted/);
  console.log('PASS: unavailable JavaScript leaves readable, correctly labeled HTML and working links');
  await failed.close();
} finally { await browser.close(); }
