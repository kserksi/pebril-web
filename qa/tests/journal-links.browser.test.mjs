import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const origin = process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pathname = () => new URL(page.url()).pathname;
  const visit = async path => {
    const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200, `${path} should answer 200`);
  };
  const follow = async selector => {
    await page.locator(selector).click();
    await page.waitForLoadState('domcontentloaded');
  };

  // Masthead brand is the journal index of the current language, never the site homepage.
  await visit('/journal/');
  assert.equal(await page.locator('a.brand').getAttribute('href'), '/journal/');
  assert.equal(await page.locator('a.lang').getAttribute('href'), '/journal/en/');
  await follow('a.brand');
  assert.equal(pathname(), '/journal/');

  // Language switch stays under /journal, in both directions.
  await follow('a.lang');
  assert.equal(pathname(), '/journal/en/');
  assert.equal(await page.locator('a.brand').getAttribute('href'), '/journal/en/');
  await follow('a.brand');
  assert.equal(pathname(), '/journal/en/');
  await follow('a.lang');
  assert.equal(pathname(), '/journal/');

  // Article pages: "all notes" and the brand both return to the journal index.
  await visit('/journal/why-pebril/');
  assert.equal(await page.locator('.post-nav a').getAttribute('href'), '/journal/');
  assert.equal(await page.locator('a.lang').getAttribute('href'), '/journal/en/why-pebril/');
  await follow('a.lang');
  assert.equal(pathname(), '/journal/en/why-pebril/');

  await visit('/journal/en/why-pebril/');
  assert.equal(await page.locator('.post-nav a').getAttribute('href'), '/journal/en/');
  assert.equal(await page.locator('a.lang').getAttribute('href'), '/journal/why-pebril/');
  await follow('a.lang');
  assert.equal(pathname(), '/journal/why-pebril/');

  // Switching language from an article keeps the reader on the same article.
  await visit('/journal/en/why-pebril/');
  await follow('.post-nav a');
  assert.equal(pathname(), '/journal/en/');

  // "Main site" is the only journal link that leaves /journal, and it is the homepage.
  await visit('/journal/');
  assert.equal(await page.locator('.masthead-nav > a:last-child').getAttribute('href'), '/');

  console.log('PASS: journal masthead, language switch and article links stay inside /journal');
} finally {
  await browser.close();
}
