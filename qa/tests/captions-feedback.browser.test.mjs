import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
await mkdir(new URL('../artifacts/motion/',import.meta.url),{recursive:true});
const browser=await chromium.launch({headless:true}), errors=[];
async function setup(width,height,reducedMotion='no-preference') {
  const page=await browser.newPage({viewport:{width,height},reducedMotion});
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());await page.clock.install();
  await page.goto(process.env.PEBRIL_WEB_URL||'http://127.0.0.1:4173');
  await page.waitForFunction(()=>document.documentElement.dataset.state==='idle');
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));return page;
}
async function go(page,gather,exit=0) {
  await page.evaluate(({gather,exit})=>scrollTo(0,Math.round(+document.documentElement.dataset.introTravel+document.querySelector('.stage').clientHeight*(.5+3*gather+(exit>0?.6+exit:0)))),{gather,exit});
  await page.waitForTimeout(60);await page.clock.runFor(32);
}
const captions=page=>page.locator('.collection-caption').evaluateAll(elements=>elements.map(el=>({opacity:el.style.opacity,translate:el.style.translate})));
const poses=page=>page.locator('[data-residual]').evaluateAll(cards=>cards.map(card=>({src:card.querySelector('img').getAttribute('src'),group:card.dataset.group,y:new DOMMatrix(getComputedStyle(card).transform).m42})));
try {
  for(const [width,height] of [[686,956],[390,844],[1920,500]]) {
    const page=await setup(width,height);
    await go(page,.5);assert.ok((await captions(page)).every(c=>+c.opacity===0),'captions wait until stacks form');
    await go(page,.78);const mid=await captions(page);
    assert.ok(mid.every(c=>+c.opacity>0&&+c.opacity<1&&c.translate!=='0px'),'independent captions emerge gradually');
    assert.ok(await page.locator('.collection-caption').evaluateAll(elements=>elements.every(el=>el.querySelector('time')&&el.querySelector('small')&&el.getBoundingClientRect().width<=el.parentElement.getBoundingClientRect().width)),'date and count share an elastic bounded container');
    const overlap=await page.evaluate(()=>{
      const caption=document.querySelector('.collection-caption').getBoundingClientRect();
      const photo=[...document.querySelectorAll('figure[data-group="0"]')].find(card=>card.style.zIndex==='5').getBoundingClientRect();
      return Math.min(caption.bottom,photo.bottom)-Math.max(caption.top,photo.top);
    });
    assert.ok(overlap>0,'forming captions start behind the photograph envelope');
    const localMid=await page.locator('.local-experience').evaluate(el=>({opacity:+el.style.opacity,translate:el.style.translate,visibility:getComputedStyle(el).visibility}));
    assert.ok(localMid.opacity>0&&localMid.opacity<1);assert.equal(localMid.visibility,'visible');
    await page.screenshot({path:`qa/artifacts/motion/captions-${width}-forming.png`});
    await go(page,1);const settled=await page.locator('.collection-caption').first().boundingBox();
    assert.ok((await captions(page)).every(c=>+c.opacity===1));
    await go(page,1,.16);const exiting=await page.locator('.collection-caption').first().boundingBox();
    assert.ok(Math.abs(exiting.y-settled.y)<1&&Math.abs(exiting.x-settled.x)<1,'captions fade at their settled position');
    assert.ok(+await page.locator('.timeline').evaluate(el=>getComputedStyle(el).opacity)<1);
    assert.equal(await page.locator('.local-experience').evaluate(el=>getComputedStyle(el).visibility),'visible');
    await go(page,.78);assert.deepEqual(await captions(page),mid,'reverse restores caption entry without a queued animation');
    await go(page,1,1);
    const action=page.locator('.closure-actions a').nth(1), box=await action.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(260);
    const hover=await action.evaluate(el=>getComputedStyle(el).transform);assert.notEqual(hover,'none');
    await page.mouse.down();await page.waitForTimeout(260);const pressed=await action.evaluate(el=>getComputedStyle(el).transform);assert.notEqual(pressed,hover);
    await page.mouse.move(1,height/2);await page.mouse.up();await page.waitForTimeout(260);
    assert.equal(await action.evaluate(el=>getComputedStyle(el).transform),'none','action returns quietly without navigation');
    await page.screenshot({path:`qa/artifacts/motion/actions-${width}.png`});
    await page.close();console.log(`PASS: ${width}×${height} responsive caption emergence/reverse, local entrance/exit and restrained action feedback`);
  }
  const page=await setup(686,956);
  await go(page,1,1);await page.mouse.move(1,500);
  await go(page,1,.5);await go(page,1,1);await page.clock.runFor(100);await page.clock.runFor(240);const baseline=await poses(page);
  await go(page,1,.5);await go(page,1,1);await page.clock.runFor(100);
  const target=page.locator('[data-residual][tabindex="0"]').first();const src=await target.locator('img').getAttribute('src'),group=await target.getAttribute('data-group');
  const box=await target.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.clock.runFor(240);
  const clicked=await poses(page);
  assert.ok(baseline.some(photo=>photo.group===group&&photo.src!==src),'the counterfactual includes another member of the same collection');
  for(const photo of clicked) {
    const reference=baseline.find(other=>other.src===photo.src);const delta=Math.abs(photo.y-reference.y);
    if(photo.src===src)assert.ok(delta>1,'the activated photo visibly responds');
    else assert.ok(delta<.5,`unactivated photo keeps its own motion: ${photo.src}`);
  }
  await page.close();console.log('PASS: actual photo click changes only that photo, including peers of the same collection');
  const reduced=await setup(390,844,'reduce');await go(reduced,.78);
  assert.ok((await captions(reduced)).every(c=>c.translate==='none'&&+c.opacity===1));await go(reduced,1,1);
  const action=reduced.locator('.closure-actions a').first();await action.focus();assert.equal(await action.evaluate(el=>getComputedStyle(el).transform),'none');
  await reduced.close();assert.deepEqual(errors,[]);console.log('PASS: static reduced-motion captions and accessible project-action feedback');
} finally {await browser.close();}
