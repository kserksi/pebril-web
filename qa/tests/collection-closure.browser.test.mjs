import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { DEMO_COLLECTIONS } from '../../src/demo-photos.mjs';
const browser = await chromium.launch({ headless: true });
const errors = [];
const url = process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173';
async function ready(width, height, reducedMotion = 'no-preference', hasTouch = false, blocked = null) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion, hasTouch });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://**/*', route => route.abort());
  if (blocked) await page.route(`**/${blocked}`, route => route.abort());
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.dataset.state === 'idle');
  return page;
}
async function explore(page) {
  await page.evaluate(() => scrollTo(0, +document.documentElement.dataset.introTravel));
  await page.mouse.wheel(0, await page.locator('.stage').evaluate(el=>el.clientHeight*3.8));
  await page.waitForFunction(() => +document.documentElement.dataset.exploration > .2 && !document.querySelector('.timeline').inert);
}
async function exit(page, value) {
  await page.evaluate(value => scrollTo(0, +document.documentElement.dataset.introTravel + document.querySelector('.stage').clientHeight * (4.1 + value)), value);
  await page.waitForFunction(value => Math.abs(+document.documentElement.dataset.exit - value) < .01, value);
}
async function visibleClosure(page, width, height) {
  const cards = page.locator('[data-residual]:not(.failed)');
  assert.ok(await cards.count() >= 1);
  const visible = await cards.evaluateAll(cards => cards.filter(card => {
    const r = card.getBoundingClientRect();
    return card.querySelector('img').naturalWidth > 0 && getComputedStyle(card).visibility === 'visible' && +getComputedStyle(card).opacity > .9 && r.right > 0 && r.left < innerWidth && r.top >= 0 && r.bottom < document.querySelector('.closure-copy').getBoundingClientRect().top;
  }).length);
  assert.ok(visible >= 1, 'decoded final-scene photos really render above the brand');
  const divider = page.locator('.stream-divider');
  const box = await divider.boundingBox();
  assert.ok(box && box.y > 0 && box.y + box.height < height, 'wave remains inside the actual viewport');
  const photo = page.locator('[data-residual][tabindex="0"]:not(.failed)').first();
  const r = await photo.boundingBox();
  assert.ok(await photo.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), 'actual pointer reaches the visible photo');
  await page.mouse.move(width - 2, height / 2);
  const wave = await page.locator('.stream-divider path').getAttribute('d');
  await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForTimeout(220);
  assert.match(await page.locator('.closure-status').innerText(), /涟漪/);
  assert.notEqual(await page.locator('.stream-divider path').getAttribute('d'), wave, 'visible closure accepts interaction before the exact endpoint');
  const start = await cards.nth(1).boundingBox();
  await page.waitForTimeout(650);
  const end = await cards.nth(1).boundingBox();
  assert.ok(end.x < start.x - width / 150, 'last-scene river continues moving');
}
try {
  for (const [width, height] of [[686,956],[390,844],[1920,500]]) {
    const page = await ready(width,height);
    await explore(page);
    const control = page.locator('.collection-control').first();
    const order = await page.locator('figure[data-group="0"]').evaluateAll(cards=>cards.sort((a,b)=>+b.style.zIndex-+a.style.zIndex).map(card=>card.querySelector('img').getAttribute('src')));
    const region = await control.boundingBox();
    // Click where the visible leader photograph lies, not just its text label.
    await page.mouse.click(region.x + region.width / 2, region.y + region.height - 65);
    await page.waitForFunction(() => document.querySelector('.collection-viewer').open);
    await page.waitForFunction(() => document.querySelector('.viewer-frame img')?.naturalWidth > 0);
    assert.equal(await page.locator('.viewer-frame img').getAttribute('src'), order[0]);
    assert.equal(await page.locator('.viewer-count').innerText(), '1 / 5');
    await page.waitForFunction(()=>document.querySelector('.collection-viewer').dataset.motion==='open');
    const imageBox = await page.locator('.viewer-frame img').boundingBox();
    assert.ok(imageBox.x >= 0 && imageBox.y >= 0 && imageBox.x + imageBox.width <= width && imageBox.y + imageBox.height <= height, 'viewer image fits the actual viewport');
    const controlsBox = await page.locator('.viewer-controls').boundingBox();
    assert.ok(controlsBox.y >= 0 && controlsBox.y + controlsBox.height <= height, 'viewer controls remain reachable without hidden overflow');
    await page.screenshot({path:`qa/artifacts/collection-viewer-${width}.png`});
    assert.equal(await page.locator('.viewer-previous').isDisabled(), true);
    for (let i = 1; i < 5; i++) {
      await page.locator('.viewer-next').click();
      await page.waitForFunction(src => document.querySelector('.viewer-frame img')?.getAttribute('src') === src, order[i]);
    }
    assert.equal(await page.locator('.viewer-next').isDisabled(), true);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('.viewer-count').innerText(), '4 / 5');
    const scroll = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0,500); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => scrollY), scroll, 'modal does not move the background story');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.collection-viewer').open);
    assert.equal(await control.evaluate(el => el === document.activeElement), true, 'closing returns focus to the collection');
    const axis = await page.locator('.timeline-axis').boundingBox();
    await page.mouse.move(width * .7, axis.y + 8); await page.mouse.down();
    await page.mouse.move(width * .35, axis.y + 8, { steps: 8 }); await page.mouse.up();
    assert.equal(await page.locator('.collection-viewer').evaluate(el => el.open), false, 'a timeline drag never opens a collection');
    await exit(page,.92);
    await visibleClosure(page,width,height);
    await page.screenshot({ path: `qa/artifacts/closure-interactive-${width}.png` });
    await exit(page,.5);
    assert.equal(await page.locator('[data-residual]').count(),0,'reverse scrolling releases closure interaction');
    await exit(page,1);
    await visibleClosure(page,width,height);
    await page.close();
    console.log(`PASS: ${width}×${height} actual photograph click, all members, modal focus/scroll, drag distinction, visible closure/flow/wave before and at endpoint`);
  }
  const page = await ready(686,956);
  const requests=[]; page.on('request',request=>requests.push(request));
  await explore(page);
  const files = Array.from({length:29},(_,i)=>({name:`local-${i}.svg`,mimeType:'image/svg+xml',buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${i%2?200:600}" height="${i%2?600:200}"><rect width="100%" height="100%" fill="#a7b6a4"/></svg>`)}));
  await page.locator('input[type=file]').setInputFiles(files);
  await page.waitForFunction(()=>document.documentElement.dataset.source==='local');
  await page.locator('.collection-control').first().click();
  await page.waitForFunction(()=>document.querySelector('.viewer-frame img')?.naturalWidth>0);
  for(let i=1;i<29;i++) await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>document.querySelector('.viewer-frame img')?.alt==='local-28.svg');
  assert.equal(await page.locator('.viewer-count').innerText(),'29 / 29','all members beyond the five-card preview can be viewed');
  await page.waitForFunction(()=>document.querySelector('dialog').dataset.motion==='open');
  assert.ok(await page.locator('.viewer-frame img').evaluate(image=>{const box=image.getBoundingClientRect();return Math.abs(box.width/box.height-image.naturalWidth/image.naturalHeight)<.01;}),'local photo retains its original aspect ratio');
  const local = await page.locator('.viewer-frame img').getAttribute('src');
  assert.ok(local.startsWith('blob:'));
  await page.locator('.viewer-close').click();
  await page.waitForFunction(()=>!document.querySelector('.collection-viewer').open);
  await exit(page,.92); await visibleClosure(page,686,956);
  await page.locator('.privacy-toggle').click(); await page.keyboard.press('Escape');
  await page.evaluate(()=>scrollTo(0,+document.documentElement.dataset.introTravel+document.querySelector('.stage').clientHeight*3.8));
  await page.waitForFunction(()=>!document.querySelector('.timeline').inert);
  await page.locator('.restore-example').click();
  await page.waitForFunction(()=>document.documentElement.dataset.source==='example');
  assert.equal(await page.locator('.collection-viewer').evaluate(el=>el.open),false);
  assert.ok(requests.every(request=>request.method()==='GET'),'viewing never uploads local images');
  await page.close();
  console.log('PASS: 29-member local collection browsing, original aspect ratios, final-scene local flow/waves and reset');
  const touch = await ready(390,844,'reduce',true);
  await explore(touch);
  await touch.locator('.collection-control').first().tap();
  await touch.waitForFunction(()=>document.querySelector('.viewer-frame img')?.naturalWidth>0);
  await touch.locator('.viewer-next').tap();
  assert.equal(await touch.locator('.viewer-count').innerText(),'2 / 5');
  await touch.locator('.viewer-close').tap();
  await exit(touch,.92);
  const wave=await touch.locator('.stream-divider path').getAttribute('d');
  await touch.locator('[data-residual][tabindex="0"]').first().tap();
  assert.match(await touch.locator('.closure-status').innerText(),/涟漪/);
  assert.equal(await touch.locator('.stream-divider path').getAttribute('d'),wave,'reduced motion keeps static equivalent feedback');
  await touch.close();
  const missing = await ready(686,956,'no-preference',false,DEMO_COLLECTIONS[0].files[4]);
  await explore(missing);
  await missing.locator('.collection-control').first().click();
  for(let i=1;i<5;i++) await missing.keyboard.press('ArrowRight');
  await missing.waitForFunction(()=>document.querySelector('.viewer-status').textContent.includes('无法显示'));
  assert.equal(await missing.locator('.viewer-frame img').count(),0,'a failed image leaves an explicit error instead of stale content');
  await missing.keyboard.press('ArrowLeft');
  await missing.waitForFunction(()=>document.querySelector('.viewer-frame img')?.naturalWidth>0);
  await missing.keyboard.press('ArrowRight'); await missing.keyboard.press('Escape');
  await missing.waitForFunction(()=>!document.querySelector('.collection-viewer').open);
  assert.equal(await missing.locator('.viewer-frame img').count(),0,'closing cancels pending image rendering');
  assert.equal(await missing.evaluate(()=>document.documentElement.style.overflow),'');
  await missing.close();
  console.log('PASS: unavailable collection member, continued browsing and cleanup of pending view/scroll lock');
  assert.deepEqual(errors,[]);
  console.log('PASS: touch viewer controls and reduced-motion closure feedback; no browser errors');
} finally { await browser.close(); }
