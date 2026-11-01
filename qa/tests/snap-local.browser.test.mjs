import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true});
const errors=[];
async function setup(width=686,height=956) {
  const page=await browser.newPage({viewport:{width,height}});
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());
  await page.addInitScript(()=>{
    window.createdUrls=[];window.releasedUrls=[];window.storageWrites=[];
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=blob=>{const url=create(blob);createdUrls.push(url);return url;};
    URL.revokeObjectURL=url=>{releasedUrls.push(url);revoke(url);};
    const set=Storage.prototype.setItem;
    Storage.prototype.setItem=function(...args){storageWrites.push(args[0]);return set.apply(this,args);};
  });
  await page.goto(process.env.PEBRIL_WEB_URL||'http://127.0.0.1:4173/');
  await page.waitForFunction(()=>document.documentElement.dataset.state==='idle');
  await page.evaluate(()=>scrollTo(0,+document.documentElement.dataset.introTravel+document.querySelector('.stage').clientHeight*3.8));
  await page.waitForFunction(()=>!document.querySelector('.timeline').inert);
  return page;
}
async function slowDrag(page, from, to, y) {
  await page.mouse.move(from,y); await page.mouse.down();
  const steps=Math.ceil(Math.abs(to-from)/12);
  for(let i=1;i<=steps;i++) { await page.waitForTimeout(90); await page.mouse.move(from+(to-from)*i/steps,y); }
  await page.mouse.up();
}
const photo=(name,index=0)=>({name,mimeType:'image/svg+xml',buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="${index%2?'#a7b6a4':'#526b79'}"/></svg>`)});
try {
  for (const [width,height] of [[686,956],[390,844],[1920,500]]) {
    const page=await setup(width,height);
    const positions=await page.locator('.collection-control').evaluateAll(controls=>controls.map(control=>parseFloat(control.style.left)));
    const target=positions[1]-width/2;
    const needle=await page.locator('.tuning-needle').boundingBox();
    const axis=await page.locator('.timeline-axis').boundingBox();
    await slowDrag(page,width*.85,width*.85-(target-20),axis.y+8);
    await page.waitForFunction(target=>Math.abs(document.querySelector('.timeline-viewport').scrollLeft-target)<1.1,target);
    assert.ok(Math.abs((await page.locator('.collection-control').nth(1).boundingBox()).x+(await page.locator('.collection-control').nth(1).boundingBox()).width/2-width/2)<1.1,'nearby collection settles under the fixed needle');
    assert.equal((await page.locator('.tuning-needle').boundingBox()).x,needle.x);
    await slowDrag(page,width*.7,width*.7-80,axis.y+8);
    await page.waitForTimeout(500);
    assert.ok(Math.abs(await page.locator('.timeline-viewport').evaluate(el=>el.scrollLeft)-(target+80))<1.1,'outside the capture radius browsing remains free');
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(50);
    await page.locator('.timeline-viewport').evaluate((el,value)=>el.scrollLeft=value,target+18);
    await page.waitForFunction(target=>Math.abs(document.querySelector('.timeline-viewport').scrollLeft-target)<1.1,target);
    await page.close();console.log(`PASS: ${width}×${height} actual release attraction, fixed needle, free panning and reduced-motion alignment`);
  }
  const page=await setup();
  const requests=[];page.on('request',request=>requests.push(request.method()));
  await page.evaluate(()=>window.sourceSlots=[...document.querySelectorAll('.photo-river figure:not(.story-photo)')]);
  const original=await page.locator('.photo-river img').evaluateAll(images=>{window.originalImages=new Map(images.map(image=>[image.getAttribute('src'),image]));return [...originalImages.keys()];});
  await page.locator('input[type=file]').setInputFiles([photo('first.svg')]);
  await page.waitForFunction(()=>document.documentElement.dataset.source==='mixed'&&document.querySelector('.local-status').textContent.includes('24'));
  let examples=await page.locator('.photo-river img[src^="./assets/photos/"]').evaluateAll(images=>images.map(image=>image.getAttribute('src')));
  assert.equal(examples.length,24);assert.ok(examples.every(src=>original.includes(src)));
  assert.equal(await page.locator('.photo-river img[src^="./assets/photos/"]').evaluateAll(images=>images.every(image=>originalImages.get(image.getAttribute('src'))===image)),true,'every untouched sample keeps its existing image node');
  assert.equal(await page.evaluate(()=>sourceSlots.every(card=>card.isConnected)),true,'unaffected source slots are reused');
  const first=await page.locator('img[alt="first.svg"]').getAttribute('src');
  await page.locator('input[type=file]').setInputFiles([photo('second.svg',1)]);
  await page.waitForFunction(()=>document.querySelector('.local-status').textContent.startsWith('2 ')&&document.querySelector('.local-status').textContent.includes('23'));
  assert.equal(await page.locator('.photo-river img[src^="./assets/photos/"]').count(),23);
  assert.equal(await page.locator('img[alt="first.svg"]').getAttribute('src'),first);
  assert.equal(await page.evaluate(url=>releasedUrls.includes(url),first),false,'earlier local previews survive later selections');
  assert.equal(await page.locator('.collection-control').evaluateAll(controls=>controls.filter(control=>control.getAttribute('aria-label').startsWith('示例时间')).length),5,'remaining examples retain explicit fictional-date labels');
  await page.screenshot({path:'qa/artifacts/incremental-local-686.png'});
  await page.locator('input[type=file]').setInputFiles(Array.from({length:27},(_,index)=>photo(`extra-${index}.svg`,index)));
  await page.waitForFunction(()=>document.documentElement.dataset.source==='local'&&document.querySelector('.local-status').textContent.startsWith('29 '));
  assert.equal(await page.locator('.photo-river img[src^="./assets/photos/"]').count(),0);
  assert.equal(await page.locator('.collection-control').count(),1);
  assert.match(await page.locator('.collection-control span').innerText(),/29/,'all 27 new files were accepted along with the two prior local photos');
  assert.equal(await page.locator('.collection-control time').innerText(),'时间未知','real photos never inherit sample dates');
  assert.ok(await page.locator('.photo-river figure').count()<=5,'foreground preview count is independent of pool size');
  assert.equal(await page.evaluate(()=>createdUrls.filter(url=>!releasedUrls.includes(url)).length),29);
  await page.locator('input[type=file]').setInputFiles([{name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('not a photograph')}]);
  await page.waitForFunction(()=>document.querySelector('.local-status').textContent.includes('未找到'));
  assert.match(await page.locator('.collection-control span').innerText(),/29/,'invalid batches retain the active source');
  await page.locator('.restore-example').click();
  await page.waitForFunction(()=>document.documentElement.dataset.source==='example');
  assert.equal(await page.locator('.photo-river img[src^="./assets/photos/"]').count(),25);
  assert.equal(await page.evaluate(()=>createdUrls.every(url=>releasedUrls.includes(url))),true,'restore releases every accumulated preview');
  assert.deepEqual(await page.evaluate(()=>storageWrites),[]);
  assert.ok(requests.every(method=>method==='GET'));
  await page.close();assert.deepEqual(errors,[]);
  console.log('PASS: one-for-one replacement, untouched examples, multi-batch retention, 27-file overflow, unknown dates, bounded preview, reset/release and browser-only processing');
} finally {await browser.close();}
