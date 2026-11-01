import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const errors = [];
async function setup(width, height, reducedMotion = 'no-preference') {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://**/*', route => route.abort());
  await page.goto(process.env.PEBRIL_WEB_URL || 'http://127.0.0.1:4173/');
  await page.waitForFunction(() => document.documentElement.dataset.state === 'idle');
  await page.evaluate(() => scrollTo(0, +document.documentElement.dataset.introTravel));
  await page.mouse.wheel(0, await page.locator('.stage').evaluate(el=>el.clientHeight*3.8));
  await page.waitForFunction(() => +document.documentElement.dataset.exploration > .2 && !document.querySelector('.timeline').inert);
  await page.waitForTimeout(250);
  return page;
}
async function checkNodes(page) {
  const offsets = await page.evaluate(() => [...document.querySelectorAll('.collection-control')].map((control,index) => {
    const node = document.querySelectorAll('.collection-node')[index].getBoundingClientRect();
    const photo = [...document.querySelectorAll(`figure[data-group="${index}"]`)].find(card => card.style.zIndex === '5').getBoundingClientRect();
    const box = control.getBoundingClientRect();
    return [Math.abs(box.x + box.width/2 - node.x), Math.abs(photo.x + photo.width/2 - node.x)];
  }));
  assert.ok(offsets.flat().every(delta => delta < 1.1), 'every collection leader, control and exact-day ruler node share a horizontal anchor');
}
async function settle(page) {
  await page.waitForFunction(() => document.querySelector('.timeline').dataset.scaling !== 'true');
  await page.waitForTimeout(180);
}
try {
  for (const [width,height] of [[686,956],[390,844],[1920,500]]) {
    const page = await setup(width,height);
    await checkNodes(page);
    assert.equal(await page.locator('.timeline-copy p').count(),0,'example badge removed from the heading');
    assert.equal(await page.locator('.timeline-status').evaluate(el=>getComputedStyle(el).clipPath),'inset(50%)','status is accessible without a visible badge');
    assert.ok(await page.locator('.time-break').count()>=1,'long empty spans have explicit compression marks');
    const positions=await page.locator('.collection-control').evaluateAll(controls=>controls.map(control=>parseFloat(control.style.left)));
    assert.ok(Math.max(...positions.slice(1).map((x,i)=>x-positions[i]))<=Math.max(width*.8,(positions[1]-positions[0])*2)+2,'long gaps are bounded instead of spanning many empty screens');
    const chooser=page.locator('.file-choice');
    assert.ok(await chooser.evaluate(el=>parseFloat(getComputedStyle(el).borderRadius))>0);
    assert.equal(await chooser.locator('svg').count(),1);
    await page.mouse.move(1,height/2);
    assert.equal(await page.locator('.local-privacy').evaluate(el=>getComputedStyle(el).visibility),'hidden');
    const before=await page.locator('.local-actions').boundingBox();
    await chooser.hover();
    assert.equal(await page.locator('.local-privacy').evaluate(el=>getComputedStyle(el).visibility),'visible');
    assert.deepEqual(await page.locator('.local-actions').boundingBox(),before,'privacy floats without moving the button row');
    await page.mouse.move(1,height/2);
    await page.keyboard.press('Tab'); await page.locator('input[type=file]').focus();
    assert.equal(await page.locator('.local-privacy').evaluate(el=>getComputedStyle(el).visibility),'visible','keyboard focus has equivalent disclosure');
    await page.locator('.timeline-viewport').focus(); await page.keyboard.press('Home'); await page.waitForTimeout(220);
    const origin=await page.locator('figure[data-group="0"]').evaluateAll(cards=>cards.find(card=>card.style.zIndex==='5').querySelector('img').getBoundingClientRect().toJSON());
    await page.locator('.collection-control').first().click();
    await page.waitForFunction(()=>document.querySelector('.viewer-frame img')?.naturalWidth>0);
    assert.equal(await page.locator('#viewer-title').innerText(),'2024.06.08');
    for(const cls of ['close','previous','next']) {
      const button=page.locator(`.viewer-${cls}`);
      assert.equal((await button.innerText()).trim(),''); assert.equal(await button.locator('svg').count(),1);
      assert.ok(await button.getAttribute('aria-label'));
    }
    const animation=await page.locator('.viewer-frame img').evaluate(image=>{
      const animations=document.querySelector('.collection-viewer').getAnimations();
      if(!animations.length)return null;
      const animation=animations[0];animation.pause();animation.currentTime=0;
      const box=image.getBoundingClientRect().toJSON();animation.play();return box;
    });
    assert.ok(animation && Math.abs(animation.x-origin.x)<2 && Math.abs(animation.y-origin.y)<2,'opening starts at the real collection photograph');
    await page.waitForFunction(()=>document.querySelector('.collection-viewer').dataset.motion==='open');
    const dialog=await page.locator('.collection-viewer').boundingBox(), image=await page.locator('.viewer-frame img').boundingBox();
    assert.ok(dialog.height-image.height<180,'the elastic container does not retain a large empty fixed-height frame');
    assert.ok(dialog.x>=0 && dialog.y>=0 && dialog.x+dialog.width<=width && dialog.y+dialog.height<=height);
    await page.screenshot({path:`qa/artifacts/elastic-viewer-${width}.png`});
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('.collection-viewer').open);
    await page.locator('.timeline-viewport').focus(); await page.keyboard.press('End'); await page.waitForTimeout(250);
    assert.equal(await page.locator('.tuning-readout').innerText(),await page.locator('.collection-control time').last().innerText(),'the snapped date matches the displayed calendar day even across timezone offsets');
    await page.keyboard.press('Home'); await page.waitForTimeout(250);
    const axis=await page.locator('.timeline-axis').boundingBox();
    await page.mouse.move(width*.75,axis.y+6); await page.mouse.down(); await page.mouse.move(width*.75-120,axis.y+6,{steps:6}); await page.mouse.up();
    const anchor=await page.locator('.tuning-readout').innerText();
    await page.waitForFunction(()=>+document.querySelector('.timeline').dataset.zoom>1.2);
    await settle(page);
    const fast=+await page.locator('.timeline').getAttribute('data-zoom');
    assert.equal(await page.locator('.tuning-readout').innerText(),anchor,'detail scaling preserves the date beneath the fixed needle');
    await checkNodes(page);
    await page.mouse.move(width*.65,axis.y+6); await page.mouse.down();
    for(let step=1;step<=10;step++){await page.mouse.move(width*.65-step*5,axis.y+6);await page.waitForTimeout(85);}
    await page.mouse.up(); await settle(page);
    const slow=+await page.locator('.timeline').getAttribute('data-zoom');
    assert.ok(fast>slow+.2,'fast sliding zooms in more than slow sliding');
    await checkNodes(page);
    await page.screenshot({path:`qa/artifacts/elastic-ruler-${width}.png`});
    await page.close(); console.log(`PASS: ${width}×${height} elastic origin animation, date/icon controls, privacy tooltip, aligned compressed chronology and anchored velocity detail`);
  }
  const page=await setup(686,956,'reduce');
  const files=[[300,900],[1200,400],[800,800]].map(([w,h],i)=>({name:`ratio-${i}.svg`,mimeType:'image/svg+xml',buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#a7b6a4"/></svg>`)}));
  await page.locator('input[type=file]').setInputFiles(files);await page.waitForFunction(()=>document.documentElement.dataset.source==='mixed');
  await page.locator('.timeline-viewport').focus();await page.keyboard.press('End');await page.waitForTimeout(220);
  const localOrder=await page.locator('figure').evaluateAll(cards=>cards.filter(card=>card.querySelector('img').alt.startsWith('ratio-')).sort((a,b)=>+b.style.zIndex-+a.style.zIndex).map(card=>card.querySelector('img').alt));
  await page.locator('.collection-control').last().click();
  await page.waitForFunction(()=>document.querySelector('.viewer-frame img')?.naturalWidth>0);
  assert.equal(await page.locator('.collection-viewer').evaluate(dialog=>dialog.getAnimations().length),0,'reduced motion omits the bloom animation');
  assert.equal(await page.locator('#viewer-title').innerText(),'时间未知');
  let prior;
  for(let i=0;i<3;i++) {
    if(i) {await page.locator('.viewer-next').click();await page.waitForFunction(alt=>document.querySelector('.viewer-frame img')?.alt===alt,localOrder[i]);await page.waitForFunction(()=>document.querySelector('dialog').dataset.motion==='open');}
    const image=await page.locator('.viewer-frame img').boundingBox(), panel=await page.locator('dialog').boundingBox();
    assert.ok(panel.height-image.height<180 && panel.width-image.width<65,'portrait, landscape and square shapes keep a tight shared envelope');
    if(prior)assert.ok(Math.abs(panel.width-prior.width)>30||Math.abs(panel.height-prior.height)>30,'the container follows the new aspect ratio');
    prior=panel;
  }
  await page.setViewportSize({width:390,height:500});
  const resized=await page.locator('dialog').boundingBox();assert.ok(resized.x>=0&&resized.y>=0&&resized.x+resized.width<=390&&resized.y+resized.height<=500);
  await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('.collection-viewer').open);
  await page.close();assert.deepEqual(errors,[]);
  console.log('PASS: mixed/local dates, portrait/landscape/square envelopes, live resize and static reduced-motion opening');
} finally {await browser.close();}
