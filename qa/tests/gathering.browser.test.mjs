import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { DEMO_COLLECTIONS, PHOTO_FILES } from '../../src/demo-photos.mjs';
const browser = await chromium.launch({ headless: true });
const url = process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173';
const errors = [];
async function go(page, reveal, gather = 0) {
  await page.evaluate(({ reveal, gather }) => {
    const h = document.querySelector('.stage').clientHeight;
    scrollTo(0, Math.round(+document.documentElement.dataset.introTravel + h * (.5 * reveal + 3 * gather)));
  }, { reveal, gather });
  await page.waitForTimeout(80);
  await page.clock.runFor(32);
  const actual = await page.evaluate(() => ({ reveal: +document.documentElement.dataset.reveal, gather: +document.documentElement.dataset.gather }));
  assert.ok(Math.abs(actual.reveal - reveal) < .003 && Math.abs(actual.gather - gather) < .003);
}
async function poses(page) {
  return page.locator('.photo-river figure:not(.failed)').evaluateAll(cards => cards.map(card => ({
    file: card.querySelector('img').getAttribute('src').split('/').at(-1),
    transform: card.style.transform,
  })));
}
async function setup(options = {}) {
  const page = await browser.newPage(options);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://**/*', route => route.abort());
  await page.clock.install();
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.dataset.state === 'idle');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  return page;
}
try {
  for (const [width, height] of [[1920, 1080], [390, 844], [1366, 768], [1920, 500]]) {
    const page = await setup({ viewport: { width, height } });
    await go(page, 0);
    const initialSlots = await page.locator('.photo-river figure').count();
    await page.locator('.photo-river figure').evaluateAll(cards => cards.forEach(card => { card.dataset.original = 'true'; }));
    const initialBounds = await page.locator('.photo-river figure').first().boundingBox();
    await go(page, .002);
    const enteredBounds = await page.locator('[data-original]').first().boundingBox();
    assert.ok(Math.abs(initialBounds.x - enteredBounds.x) < 2 && Math.abs(initialBounds.y - enteredBounds.y) < 2, 'scene entry preserves current photo position');
    assert.equal(await page.locator('.photo-river figure').count(), initialSlots);
    await go(page, 1, .001);
    assert.equal(await page.locator('.photo-river figure').count(), 25);
    assert.ok(await page.locator('.photo-river figure').evaluateAll(cards=>cards.every(card=>card.getBoundingClientRect().top < innerHeight * .25)), 'every collection member begins in the same upper river band');
    assert.equal(await page.locator('[data-original]').count(), initialSlots, 'original river nodes are reused');
    // Members load lazily: only the ones crossing the viewport must be decoded before measuring.
    await page.waitForFunction(() => [...document.querySelectorAll('.photo-river img')]
      .filter(image => { const box = image.getBoundingClientRect(); return box.right > 0 && box.left < innerWidth; })
      .every(image => image.naturalWidth > 0), { polling: 50 });
    await go(page, 1);
    const bounds = await page.locator('[data-original]').evaluateAll(cards => cards.map(card => {
      const box = card.getBoundingClientRect(); return { top: box.top, bottom: box.bottom };
    }));
    assert.ok(bounds.every(box => box.top >= 20 && box.bottom < height * .5), 'river reaches the upper band before descending into collections');
    assert.equal(await page.locator('.timeline').evaluate(element => +element.style.opacity), 0);
    const checkpoints = new Map();
    for (const p of [0, .2, .35, .5, .8, 1]) {
      await go(page, 1, p);
      checkpoints.set(p, await poses(page));
      if (width === 1920 && height === 1080 && p === .2) {
        const projected = await page.locator('.photo-river figure').evaluateAll(cards => cards.filter(card=>card.dataset.group==='0').sort((a,b)=>+b.style.zIndex-+a.style.zIndex).slice(0, 2).map(card => {
          const box = card.getBoundingClientRect(); return { x: box.x, right: box.right, width: box.width };
        }));
        const ratio = (Math.min(projected[0].right, projected[1].right) - Math.max(projected[0].x, projected[1].x)) / Math.min(projected[0].width, projected[1].width);
        assert.ok(Math.abs(ratio - .2) < .005, 'actual guide overlap is 20%');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `qa/artifacts/gathering-${width}-${height}-${Math.round(p * 100)}.png` });
    }
    const settled = await page.locator('.photo-river figure').evaluateAll(cards => {
      const axis = document.querySelector('.timeline-axis').getBoundingClientRect().top;
      const headingBottom = document.querySelector('.timeline-copy').getBoundingClientRect().bottom;
      return cards.every(card => card.getBoundingClientRect().bottom <= axis - 16
        && card.getBoundingClientRect().top >= headingBottom + 8);
    });
    assert.ok(settled, 'all previews settle between the heading and fixed timeline');
    assert.ok(await page.locator('.collection-control').evaluateAll(controls => controls.every((control, index) => {
      const top = Math.min(...[...document.querySelectorAll(`figure[data-group="${index}"]`)].map(card => card.getBoundingClientRect().top));
      return control.querySelector('span').getBoundingClientRect().bottom <= top - 2;
    })), 'collection dates and member counts stay clear of angled rear photos');
    assert.equal(await page.locator('.timeline').evaluate(element => element.inert), false);
    assert.equal(await page.locator('.collection-control').count(), 5);
    assert.deepEqual(await page.locator('.collection-control time').evaluateAll(times => times.map(time => time.dateTime)), DEMO_COLLECTIONS.map(collection => collection.demoTime));
    assert.equal(new Set((await poses(page)).map(pose => pose.file)).size, PHOTO_FILES.length);
    for (const p of [.8, .5, .35, .2]) {
      await go(page, 1, p);
      assert.deepEqual(await poses(page), checkpoints.get(p), 'reverse scroll restores the exact held scene');
      await page.clock.runFor(300);
      assert.deepEqual(await poses(page), checkpoints.get(p), 'autonomous motion does not advance the gathering');
    }
    await go(page, 1, 1);
    const first = page.locator('.collection-control').first();
    await first.focus();
    await page.waitForTimeout(250);
    assert.equal(await first.evaluate(element => getComputedStyle(element, '::before').opacity), '1');
    await page.keyboard.press('Enter');
    assert.equal(await first.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.collection-viewer').evaluate(el => el.open), true);
    await page.keyboard.press('Escape');
    await page.locator('.collection-viewer').evaluate(el=>el.getAnimations().forEach(animation=>animation.finish()));
    await page.clock.runFor(32);
    assert.equal(await page.locator('.collection-viewer').evaluate(el=>el.open),false);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(80);
    await page.clock.runFor(32);
    assert.ok(await page.locator('.timeline-viewport').evaluate(element => element.scrollLeft > 0), 'arrow keys tune continuously');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.timeline-next, .timeline-previous').count(), 0);
    const ruler = await page.locator('.timeline-axis').boundingBox();
    await page.mouse.move(width * .65, ruler.y + 8); await page.mouse.down();
    await page.mouse.move(width * .3, ruler.y + 8, { steps: 8 }); await page.mouse.up();
    await page.clock.runFor(32);
    await page.waitForTimeout(80);
    assert.ok(await page.locator('.timeline-viewport').evaluate(element => element.scrollLeft > 0), 'navigation browses the horizontal timeline');
    const stable = await poses(page);
    await go(page, 1, .98);
    assert.deepEqual(await poses(page), stable, 'minor scroll preserves active exploration');
    await go(page, 0);
    assert.equal(await page.locator('.photo-river figure').count(), initialSlots);
    assert.equal(await page.locator('.timeline').isVisible(), false);
    console.log(`PASS: ${width}×${height} reuse, full reveal, guide, reverse/hold, time labels and keyboard browsing`);
    await page.close();
  }
  const resized = await setup({ viewport: { width: 1920, height: 1080 } });
  await go(resized, 1, .5);
  for (const [width, height] of [[390, 844], [2560, 1080]]) {
    await resized.setViewportSize({ width, height });
    await resized.waitForTimeout(150);
    await resized.clock.runFor(64);
    assert.ok(Math.abs(await resized.evaluate(() => +document.documentElement.dataset.gather) - .5) < .002, 'resize preserves gathering progress');
    assert.equal(await resized.locator('.photo-river figure').count(), 25);
    assert.equal(new Set((await poses(resized)).map(pose => pose.file)).size, 25);
  }
  await go(resized, 0);
  assert.equal(await resized.locator('.photo-river figure').count(), 5, 'returning to the wide river restores its responsive slot count');
  console.log('PASS: active-scene resize preserves progress and identities; reverse restores responsive river slots');
  await resized.close();
  const reduced = await setup({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true, isMobile: true });
  await go(reduced, .1);
  assert.equal(await reduced.locator('.timeline').evaluate(element => element.inert), false);
  const reducedPoses = await poses(reduced);
  await go(reduced, 1, .5);
  assert.deepEqual(await poses(reduced), reducedPoses, 'reduced motion avoids scroll trajectories');
  await reduced.locator('.collection-control').first().tap();
  assert.equal(await reduced.locator('.collection-control').first().getAttribute('aria-pressed'), 'true');
  assert.equal(await reduced.locator('.collection-viewer').evaluate(el => el.open), true);
  await reduced.locator('.viewer-close').tap();
  const touch = await reduced.context().newCDPSession(reduced);
  const beforePan = await reduced.locator('.timeline-viewport').evaluate(element => element.scrollLeft);
  const touchY = (await reduced.locator('.timeline-axis').boundingBox()).y + 8;
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 320, y: touchY }] });
  for (const x of [280, 230, 180, 130]) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: touchY }] });
    await reduced.waitForTimeout(20);
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await reduced.waitForTimeout(250);
  assert.ok(await reduced.locator('.timeline-viewport').evaluate(element => element.scrollLeft) > beforePan + 50, 'native touch swiping pans the timeline');
  await reduced.evaluate(() => dispatchEvent(new ErrorEvent('error', { message: 'Synthetic gathering failure' })));
  assert.equal(await reduced.locator('.timeline').isVisible(), false);
  assert.equal(await reduced.locator('.story-photo').count(), 0);
  assert.equal(await reduced.locator('.album-copy').evaluate(element => element.inert), false);
  assert.equal(await reduced.locator('h1').isVisible(), true);
  assert.deepEqual(errors, []);
  console.log('PASS: touch selection/swipe, static reduced-motion exploration and runtime fallback cleanup');
  await reduced.close();
  const missing = await setup({ viewport: { width: 1366, height: 768 } });
  await missing.route('**/assets/photos/**', route => PHOTO_FILES.slice(0, 4)
    .some(file => route.request().url().endsWith(`/assets/photos/${file}`)) ? route.continue() : route.abort());
  await go(missing, 1, 1);
  // Members are lazy: advance scripted frames until the failing fetches settle.
  for (let attempt = 0; attempt < 60 && await missing.locator('.story-photo.failed').count() === 0; attempt++) await missing.clock.runFor(64);
  await missing.waitForFunction(() => document.querySelectorAll('.story-photo.failed').length > 0, null, { polling: 50 });
  assert.equal(await missing.evaluate(() => document.documentElement.classList.contains('enhanced')), true);
  assert.equal(await missing.locator('.collection-control').count(), 5);
  assert.equal(await missing.locator('.photo-river figure:not(.story-photo):not(.failed)').count(), 4);
  console.log('PASS: fast forward with missing noncritical photos retains the prepared river and usable timeline');
  await missing.close();
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
