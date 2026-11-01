import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173';

// The journal runs with script-src 'none', so its page transitions have to be
// pure CSS. Playwright can still listen for pagereveal from an init script:
// injected scripts are not subject to the page's CSP.
async function open(browser, reducedMotion = 'no-preference') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion });
  await page.addInitScript(() => {
    window.__reveal = 0;
    addEventListener('pagereveal', event => { window.__reveal = event.viewTransition ? 1 : 2; });
    window.__csp = [];
    addEventListener('securitypolicyviolation', event => window.__csp.push(`${event.violatedDirective} ${event.blockedURI}`));
  });
  return page;
}

// pagereveal fires after the new document is revealed, a beat after the URL.
async function animatedReveal(page, label) {
  await page.waitForFunction(() => window.__reveal !== 0, null, { timeout: 5000 });
  assert.equal(await page.evaluate(() => window.__reveal), 1, label);
}

// The transition's own animations appear on the next frame, not during pagereveal.
async function transitionAnimations(page) {
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  return page.evaluate(() => document.getAnimations().map(animation => animation.animationName).filter(Boolean));
}

test('journal navigations cross-fade with the site motion language', async () => {
  const browser = await chromium.launch();
  try {
    const page = await open(browser);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${url}/journal/`, { waitUntil: 'load' });
    assert.equal(await page.evaluate(() => CSS.supports('view-transition-name: journal-brand')), true, 'cross-document view transitions are available');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.brand')).viewTransitionName), 'journal-brand', 'the wordmark is the shared element');

    await page.locator('.entries .entry').first().click();
    await page.waitForURL('**/journal/why-pebril/');
    await animatedReveal(page, 'the article arrives through a view transition');
    const names = await transitionAnimations(page);
    assert.ok(names.includes('journal-arrive'), `the arrival is animated (${names.join(', ')})`);
    assert.ok(names.includes('view-transition-group(journal-brand)') || names.some(name => name.includes('journal-brand')), 'the wordmark morphs across pages');

    await page.locator('.post-nav a').click();
    await page.waitForURL(`${url}/journal/`);
    await animatedReveal(page, 'returning to the index is animated too');

    await page.locator('.masthead-nav a.lang').click();
    await page.waitForURL('**/journal/en/');
    await animatedReveal(page, 'switching language is animated');
    assert.equal(await page.locator('.brand-en').textContent(), 'Pebril');
    assert.deepEqual(errors, []);
    await page.close();

    const calm = await open(browser, 'reduce');
    await calm.goto(`${url}/journal/`, { waitUntil: 'load' });
    await calm.locator('.entries .entry').first().click();
    await calm.waitForURL('**/journal/why-pebril/');
    await animatedReveal(calm, 'the transition still navigates under reduced motion');
    const running = await calm.evaluate(() => document.getAnimations().filter(animation => {
      const timing = animation.effect?.getTiming().duration;
      return typeof timing === 'number' && timing > 20;
    }).length);
    assert.equal(running, 0, 'reduced motion skips the cross-fade');
    await calm.close();
  } finally {
    await browser.close();
  }
});

test('returning to the site arrives through the same transition', async () => {
  const browser = await chromium.launch();
  try {
    const page = await open(browser);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${url}/journal/`, { waitUntil: 'load' });
    await page.locator('.masthead-nav > a:last-child').click();
    await page.waitForURL(`${url}/`);
    await animatedReveal(page, 'the site arrives through a view transition');
    const names = await transitionAnimations(page);
    assert.ok(names.includes('site-arrive'), `the site fades in (${names.join(', ')})`);
    assert.ok(names.includes('site-leave'), 'the journal leaves first');

    // The opt-in rule is inline because the first style pass has to see it;
    // its CSP hash has to stay in step with the bytes.
    const optIn = await page.evaluate(() => [...document.styleSheets].flatMap(sheet => {
      try { return [...sheet.cssRules]; } catch { return []; }
    }).filter(rule => rule.cssText?.includes('@view-transition')).length);
    assert.ok(optIn > 0, 'the site opts in to cross-document transitions');
    assert.deepEqual(await page.evaluate(() => window.__csp), [], 'the inline opt-in passes CSP');

    // The prelude still boots on its own clock, untouched by the transition.
    await page.waitForFunction(() => document.documentElement.dataset.state !== 'loading', null, { timeout: 15000 });
    assert.equal(await page.locator('.explore').evaluate(node => node.tagName), 'P');
    assert.deepEqual(errors, []);
    await page.close();

    const calm = await open(browser, 'reduce');
    await calm.goto(`${url}/journal/`, { waitUntil: 'load' });
    await calm.locator('.masthead-nav > a:last-child').click();
    await calm.waitForURL(`${url}/`);
    await animatedReveal(calm, 'returning still navigates under reduced motion');
    const calmNames = await transitionAnimations(calm);
    assert.equal(calmNames.includes('site-arrive'), false, 'reduced motion skips the arrival fade');
    await calm.close();
  } finally {
    await browser.close();
  }
});
