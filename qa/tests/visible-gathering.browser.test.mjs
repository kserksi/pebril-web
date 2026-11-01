import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { DEMO_COLLECTIONS } from '../../src/demo-photos.mjs';
await mkdir(new URL('../artifacts/motion/',import.meta.url),{recursive:true});
const browser=await chromium.launch({headless:true}),errors=[];
async function setup(width,height,fake=false) {
  const page=await browser.newPage({viewport:{width,height}});
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());
  if(fake)await page.clock.install();
  await page.goto(process.env.PEBRIL_WEB_URL||'http://127.0.0.1:4173');
  await page.waitForFunction(()=>document.documentElement.dataset.state==='idle');
  if(fake)await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
  return page;
}
async function go(page,gather=0,explore=0) {
  await page.evaluate(({gather,explore})=>scrollTo(0,Math.round(+document.documentElement.dataset.introTravel+document.querySelector('.stage').clientHeight*(.5+3*gather+.6*explore))),{gather,explore});
  await page.waitForTimeout(70);await page.clock.runFor(32);
}
const visible=page=>page.locator('.photo-river figure:not(.story-photo):not(.failed)').evaluateAll(cards=>cards.map(card=>{
  const box=card.getBoundingClientRect(),image=card.querySelector('img');
  return {src:image.getAttribute('src'),file:image.getAttribute('src').split('/').at(-1),left:box.left,right:box.right,x:box.x+box.width/2};
}).filter(photo=>photo.right>0&&photo.left<innerWidth).sort((a,b)=>Math.abs(a.x-innerWidth/2)-Math.abs(b.x-innerWidth/2)));
try {
  for(const [width,height] of [[686,956],[390,844],[1920,500]]) {
    const page=await setup(width,height);
    await page.evaluate(()=>scrollTo(0,Math.round(+document.documentElement.dataset.introTravel*.94)));
    await page.waitForFunction(()=>document.documentElement.dataset.progress==='0.940');
    const cue=page.locator('.album-link > span');assert.ok(+await page.locator('.album-link').evaluate(el=>getComputedStyle(el).opacity)>.5);
    assert.equal(await cue.evaluate(el=>getComputedStyle(el).animationName),'gentle-float','a visible cue animates before exact intro completion');
    const before=await cue.boundingBox();await page.waitForTimeout(900);const after=await cue.boundingBox();assert.ok(Math.abs(after.y-before.y)>.2);
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await cue.evaluate(el=>el.getAnimations().length),0);
    await page.close();console.log(`PASS: ${width}×${height} visible near-complete album cue really moves, with static reduced motion`);
  }
  for(const [width,height] of [[686,956],[390,844],[1920,500]]) {
    const page=await setup(width,height,true);await go(page);
    let current=await visible(page),group=DEMO_COLLECTIONS.findIndex(collection=>collection.files.includes(current[0].file));
    // Advance the real bounded source pool instead of replacing DOM images for the test.
    for(let step=0;group===0&&step<30;step++) {
      await page.clock.fastForward(15000);await page.waitForTimeout(100);
      current=await visible(page);group=DEMO_COLLECTIONS.findIndex(collection=>collection.files.includes(current[0].file));
    }
    assert.ok(group>0,'the real flowing source pool reaches a later collection');
    const expected=current[0];
    const order=[...current.filter(photo=>DEMO_COLLECTIONS[group].files.includes(photo.file)).map(photo=>photo.file),...DEMO_COLLECTIONS[group].files.filter(file=>!current.some(photo=>photo.file===file))];
    await page.locator('.photo-river figure:not(.story-photo)').evaluateAll(cards=>window.originalCards=new Map(cards.map(card=>[card.querySelector('img').getAttribute('src'),card])));
    await go(page,.001);
    const leader=await page.locator(`figure[data-group="${group}"]`).evaluateAll(cards=>{const card=cards.find(card=>card.style.zIndex==='5');return {src:card.querySelector('img').getAttribute('src'),reused:originalCards.get(card.querySelector('img').getAttribute('src'))===card};});
    assert.equal(leader.src,expected.src);assert.equal(leader.reused,true,'the current visible leader keeps its actual node');
    const ranked=await page.locator(`figure[data-group="${group}"]`).evaluateAll(cards=>cards.sort((a,b)=>+b.style.zIndex-+a.style.zIndex).map(card=>card.querySelector('img').getAttribute('src').split('/').at(-1)));
    assert.deepEqual(ranked,order,'visible members lead and remaining real members follow');
    await go(page,.55);const held=await page.locator('.photo-river figure').evaluateAll(cards=>cards.map(card=>card.style.transform));
    await go(page,1,.5);
    assert.equal(await page.locator('.tuning-readout').innerText(),DEMO_COLLECTIONS[group].demoTime.slice(0,10).replaceAll('-','.'));
    const centered=await page.locator('.collection-control').nth(group).boundingBox();assert.ok(Math.abs(centered.x+centered.width/2-width/2)<1.1,'the ruler begins at the visible collection rather than the first example');
    assert.equal(await page.locator('.timeline-axis').innerText(),'');assert.equal(await page.locator('.node-date').count(),0);assert.equal(await page.locator('.tuning-readout').count(),1,'only one lower date readout remains');
    await page.screenshot({path:`qa/artifacts/motion/visible-context-${width}.png`});
    await go(page,.55);assert.deepEqual(await page.locator('.photo-river figure').evaluateAll(cards=>cards.map(card=>card.style.transform)),held,'the chosen context stays reversible');
    await go(page,1,.5);await page.locator('.collection-control').nth(group).click();
    await page.waitForTimeout(100);await page.locator('dialog').evaluate(dialog=>dialog.getAnimations().forEach(animation=>animation.finish()));await page.clock.runFor(32);
    assert.equal(await page.locator('.viewer-frame img').getAttribute('src'),expected.src,'viewer opening matches the current collection leader');
    assert.equal(await page.locator('.viewer-count').innerText(),'1 / 5');
    await page.close();console.log(`PASS: ${width}×${height} real pool rotation, visible-first member reuse/order, later initial date, one readout, reverse and matching viewer`);
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
