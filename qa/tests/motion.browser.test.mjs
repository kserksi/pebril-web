import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
await mkdir(new URL('../artifacts/motion/', import.meta.url), { recursive: true });
const browser=await chromium.launch({headless:true}), errors=[];
async function setup(width,height,reducedMotion='no-preference') {
  const page=await browser.newPage({viewport:{width,height},reducedMotion});
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());
  await page.goto(process.env.PEBRIL_WEB_URL||'http://127.0.0.1:4173');
  await page.waitForFunction(()=>document.documentElement.dataset.state==='idle');
  return page;
}
async function story(page,value) {
  await page.evaluate(value=>scrollTo(0,+document.documentElement.dataset.introTravel+document.querySelector('.stage').clientHeight*(4.1+value)),value);
  await page.waitForFunction(value=>Math.abs(+document.documentElement.dataset.exit-value)<.01,value);
}
const blur=page=>page.locator('dialog').evaluate(el=>parseFloat(getComputedStyle(el,'::backdrop').backdropFilter.replace('blur(','')));
try {
  for(const [width,height] of [[686,956],[390,844],[1920,500]]) {
    const page=await setup(width,height);
    const start=await page.locator('.explore > span').first().boundingBox();await page.waitForTimeout(800);
    const floated=await page.locator('.explore > span').first().boundingBox();assert.ok(Math.abs(start.y-floated.y)>.2,'Prelude cue floats gently');
    const hint=page.locator('.explore');assert.equal(await hint.evaluate(el=>el.tagName),'P','prelude hint is passive');assert.equal(await hint.evaluate(el=>getComputedStyle(el).pointerEvents),'none');assert.equal(await hint.evaluate(el=>getComputedStyle(el).cursor),'auto');
    const hintBox=await hint.boundingBox();await page.mouse.click(hintBox.x+hintBox.width/2,hintBox.y+hintBox.height/2);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>scrollY),0,'passive hint has no click jump');
    await page.evaluate(()=>scrollTo({top:+document.documentElement.dataset.introTravel,behavior:'instant'}));await page.waitForFunction(()=>document.documentElement.dataset.progress==='1.000');
    const cue=page.locator('.album-link'), before=await page.evaluate(()=>scrollY);
    assert.equal(await cue.evaluate(el=>el.tagName),'SPAN');
    await cue.click();await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>scrollY),before,'passive cue has no click jump');
    assert.equal(await cue.evaluate(el=>getComputedStyle(el).cursor),'auto');
    assert.equal(await cue.locator('span').evaluate(el=>el.getAnimations().length),1,'album guidance has gentle motion');
    await page.mouse.wheel(0,height*3.8);await page.waitForFunction(()=>!document.querySelector('.timeline').inert&&+document.documentElement.dataset.exploration>.2);
    await story(page,.16);
    const fading=await page.locator('.local-experience').evaluate(el=>({visibility:getComputedStyle(el).visibility,opacity:+getComputedStyle(el.closest('.timeline')).opacity,inert:el.closest('.timeline').inert}));
    assert.equal(fading.visibility,'visible');assert.ok(fading.opacity>0&&fading.opacity<1);assert.equal(fading.inert,true,'local panel fades continuously while input is released');
    await story(page,.32);assert.equal(await page.locator('.local-experience').evaluate(el=>getComputedStyle(el).visibility),'hidden');
    await story(page,0);assert.equal(await page.locator('.local-experience').evaluate(el=>getComputedStyle(el).visibility),'visible');
    await page.keyboard.press('Tab');await page.locator('.timeline-viewport').focus();
    assert.equal(await page.locator('.timeline-viewport').evaluate(el=>getComputedStyle(el).outlineColor),'rgb(82, 107, 121)','keyboard focus uses mineral blue rather than a default black box');
    await page.keyboard.press('Home');await page.waitForTimeout(200);
    const control=page.locator('.collection-control').first();await control.click();
    await page.waitForFunction(()=>document.querySelector('dialog').open);
    assert.equal(await page.locator('dialog').getAttribute('data-motion'),'opening');
    assert.ok(await page.locator('dialog').evaluate(el=>el.getAnimations().length)>0,'panel and image share an opening transform');
    await page.waitForTimeout(100);const openingBlur=await blur(page);assert.ok(openingBlur>0&&openingBlur<=8,'background begins blurring with the popup');
    await page.waitForFunction(()=>document.querySelector('dialog').dataset.motion==='open');assert.ok(await blur(page)>7.9);
    await page.screenshot({path:`qa/artifacts/motion/${width}-open.png`});
    const old=await page.locator('.viewer-frame img').getAttribute('src');
    await page.locator('.viewer-next').click();
    await page.waitForFunction(()=>document.querySelector('dialog').dataset.motion==='switching');
    assert.equal(await page.locator('.viewer-frame img').getAttribute('src'),old,'the old image remains through its exit');
    assert.ok(await page.locator('.viewer-frame img').evaluate(el=>el.getAnimations().length)>0,'switching animates the departing photo');
    await page.waitForFunction(()=>document.querySelector('dialog').dataset.motion==='open');
    assert.notEqual(await page.locator('.viewer-frame img').getAttribute('src'),old);assert.equal(await page.locator('.viewer-count').innerText(),'2 / 5');
    await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(()=>document.querySelector('dialog').dataset.motion==='open');assert.equal(await page.locator('.viewer-count').innerText(),'3 / 5','rapid navigation retains the latest request');
    await page.locator('.viewer-close').click();assert.equal(await page.locator('dialog').evaluate(el=>el.open),true);
    assert.equal(await page.locator('dialog').getAttribute('data-motion'),'closing');
    await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('dialog'),'::backdrop').backdropFilter.replace('blur(',''))<8,null,{polling:20,timeout:4000});
    const closingBlur=await blur(page);assert.ok(closingBlur>=0&&closingBlur<8,'blur recedes during the close animation');
    await page.waitForFunction(()=>!document.querySelector('dialog').open);assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');
    assert.equal(await control.evaluate(el=>el===document.activeElement),true);
    await story(page,1);const residual=await page.locator('[data-residual][tabindex="0"]').first().boundingBox();await page.mouse.move(residual.x+residual.width/2,residual.y+residual.height/2);
    assert.equal(await page.locator('.closure-status').evaluate(el=>getComputedStyle(el).clipPath),'inset(50%)','ripple narration is not visibly inserted into the footer');
    await page.close();console.log(`PASS: ${width}×${height} passive floating cues, continuous local exit, colored focus, coherent popup/blur, switching and animated dismissal`);
  }
  const shapes=await setup(686,956);
  await shapes.evaluate(()=>scrollTo({top:+document.documentElement.dataset.introTravel,behavior:'instant'}));await shapes.waitForFunction(()=>document.documentElement.dataset.progress==='1.000');await shapes.mouse.wheel(0,956*3.8);await shapes.waitForFunction(()=>!document.querySelector('.timeline').inert);
  const files=[[300,900],[1200,400],[800,800]].map(([width,height],i)=>({name:`motion-shape-${i}.svg`,mimeType:'image/svg+xml',buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#a7b6a4"/></svg>`)}));
  await shapes.locator('input[type=file]').setInputFiles(files);await shapes.waitForFunction(()=>document.documentElement.dataset.source==='mixed');
  await shapes.locator('.timeline-viewport').focus();await shapes.keyboard.press('End');
  const localOrder=await shapes.locator('figure').evaluateAll(cards=>cards.filter(card=>card.querySelector('img').alt.startsWith('motion-shape-')).sort((a,b)=>+b.style.zIndex-+a.style.zIndex).map(card=>card.querySelector('img').alt));
  await shapes.locator('.collection-control').last().click();
  await shapes.waitForFunction(()=>document.querySelector('dialog').dataset.motion==='open');
  for(let index=1;index<3;index++) {
    await shapes.locator('.viewer-next').click();await shapes.waitForFunction(()=>document.querySelector('dialog').dataset.motion==='switching');
    await shapes.waitForFunction(alt=>document.querySelector('.viewer-frame img')?.alt===alt,localOrder[index]);
    for(let sample=0;sample<3;sample++) {
      const boxes=await shapes.evaluate(()=>['dialog','.viewer-frame img','.viewer-controls'].map(selector=>document.querySelector(selector).getBoundingClientRect().toJSON()));
      assert.ok(boxes.every(box=>box.x>=0&&box.y>=0&&box.x+box.width<=687&&box.y+box.height<=957),'shape changes remain inside viewport throughout the transition');
      await shapes.waitForTimeout(65);
    }
    await shapes.waitForFunction(()=>document.querySelector('dialog').dataset.motion==='open');
  }
  await shapes.keyboard.press('ArrowLeft');await shapes.locator('.viewer-close').click();await shapes.waitForFunction(()=>!document.querySelector('dialog').open);
  assert.equal(await shapes.evaluate(()=>document.documentElement.style.overflow),'');await shapes.close();
  console.log('PASS: animated portrait/landscape/square reflow and dismissal during a pending change');
  const reduced=await setup(390,844,'reduce');
  assert.equal(await reduced.locator('.explore > span').first().evaluate(el=>el.getAnimations().length),0);
  await reduced.evaluate(()=>scrollTo({top:+document.documentElement.dataset.introTravel,behavior:'instant'}));await reduced.waitForFunction(()=>document.documentElement.dataset.progress==='1.000');await reduced.mouse.wheel(0,844*3.8);await reduced.waitForFunction(()=>!document.querySelector('.timeline').inert);
  assert.equal(await reduced.locator('.album-link > span').evaluate(el=>el.getAnimations().length),0);
  await reduced.locator('.collection-control').first().click();
  await reduced.waitForFunction(()=>document.querySelector('dialog').dataset.motion==='open');
  assert.equal(await reduced.locator('dialog').evaluate(el=>el.getAnimations().length),0);assert.equal(await blur(reduced),8);
  await reduced.locator('.viewer-next').click();await reduced.waitForFunction(()=>document.querySelector('.viewer-count').textContent==='2 / 5'&&document.querySelector('dialog').dataset.motion==='open');
  assert.equal(await reduced.locator('.viewer-frame img').evaluate(el=>el.getAnimations().length),0);
  await reduced.keyboard.press('Escape');assert.equal(await reduced.locator('dialog').evaluate(el=>el.open),false);
  await reduced.locator('.collection-control').first().click();await reduced.waitForFunction(()=>document.querySelector('dialog').dataset.motion==='open');
  await reduced.evaluate(()=>dispatchEvent(new ErrorEvent('error',{message:'Synthetic motion cleanup'})));
  await reduced.waitForFunction(()=>!document.querySelector('dialog').open&&document.documentElement.style.overflow==='',null,{timeout:4000});
  assert.equal(await reduced.locator('dialog').evaluate(el=>el.open),false);assert.equal(await reduced.evaluate(()=>document.documentElement.style.overflow),'');
  await reduced.close();assert.deepEqual(errors,[]);console.log('PASS: static reduced-motion alternatives, Escape and forced lifecycle cleanup without a scroll lock');
} finally {await browser.close();}
