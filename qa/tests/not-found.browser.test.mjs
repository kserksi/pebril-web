import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4173';

test('the not-found page stays quiet and points back to the river', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    const failed = [];
    const external = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push(request.url()));
    page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
    await page.route('https://**', route => { external.push(route.request().url()); route.abort(); });

    const response = await page.goto(base + '/404.html', { waitUntil: 'load' });
    assert.equal(response.status(), 200);

    const info = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      title: document.title,
      heading: document.querySelector('h1')?.textContent?.trim(),
      icons: [...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')].map(link => link.getAttribute('href')),
      kai: document.fonts.check('28px "LXGW WenKai"', '这一页不在河里'),
      manrope: document.fonts.check('12px "Manrope"', 'Pebril'),
      robots: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      links: [...document.querySelectorAll('.links a')].map(link => ({ href: link.getAttribute('href'), text: link.textContent.trim() })),
    }));

    assert.equal(info.lang, 'zh-CN');
    assert.match(info.title, /找不到这一页/);
    assert.equal(info.heading, '这一页不在河里');
    assert.equal(info.kai, true, 'the not-found heading must be covered by the WenKai subset');
    assert.equal(info.manrope, true);
    assert.equal(info.robots, 'noindex');
    assert.equal(info.overflow, false);
    assert.deepEqual(info.icons, ['/favicon.ico', '/assets/icon.svg', '/assets/icon-180.png']);
    assert.deepEqual(info.links, [
      { href: '/', text: '回到首页' },
      { href: '/journal/', text: '看一看手记' },
    ]);

    for (const asset of ['/favicon.ico', '/assets/icon.svg', '/assets/icon-180.png']) {
      const response = await page.request.get(base + asset);
      assert.equal(response.status(), 200, `${asset} must be served`);
      assert.match(response.headers()['content-type'], /^image\//, `${asset} must be an image`);
    }

    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    assert.deepEqual(external, []);

    const journal = await page.goto(base + '/journal/', { waitUntil: 'load' });
    assert.equal(journal.status(), 200);

    await page.goto(base + '/404.html', { waitUntil: 'load' });
    await page.locator('.links a').first().click();
    await page.waitForURL(url => url.pathname === '/');
    assert.match(await page.title(), /Pebril/);
    assert.ok(['loading', 'idle'].includes(await page.evaluate(() => document.documentElement.dataset.state)));

    const narrow = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await narrow.goto(base + '/404.html', { waitUntil: 'load' });
    await narrow.waitForTimeout(500);
    const narrowOverflow = await narrow.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(narrowOverflow, false);
    await narrow.screenshot({ path: 'qa/artifacts/not-found-390.png' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + '/404.html', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'qa/artifacts/not-found-1440.png' });
    await narrow.close();
    await page.close();
  } finally {
    await browser.close();
  }
});
