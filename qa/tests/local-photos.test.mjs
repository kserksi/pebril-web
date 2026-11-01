import test from 'node:test';
import assert from 'node:assert/strict';
import { exifDay, captureDay, groupLocal, mergeLocalPhotos } from '../../src/local-photos.mjs';
export function tiff(date = '2021:04:11 12:34:56', little = true) {
  const bytes = new Uint8Array(70), v = new DataView(bytes.buffer);
  bytes.set(little ? [73,73] : [77,77]);
  const u16 = (at, value) => v.setUint16(at, value, little), u32 = (at, value) => v.setUint32(at, value, little);
  u16(2,42);u32(4,8);u16(8,1);u16(10,0x8769);u16(12,4);u32(14,1);u32(18,26);
  u16(26,1);u16(28,0x9003);u16(30,2);u32(32,20);u32(36,50);
  bytes.set(new TextEncoder().encode(date),50); return bytes;
}
const join = (...parts) => new Uint8Array(Buffer.concat(parts.map(part => Buffer.from(part))));
test('read original capture day from little/big-endian TIFF and JPEG Exif prefix', () => {
  assert.equal(exifDay(tiff()),'2021-04-11');
  assert.equal(exifDay(tiff('2022:12:31 23:59:59',false)),'2022-12-31');
  assert.equal(exifDay(join(new TextEncoder().encode('Exif\0\0'),tiff())),'2021-04-11');
});
test('invalid dates, truncated offsets and unrelated metadata stay unknown', () => {
  assert.equal(exifDay(tiff('2021:02:30 12:34:56')),null);
  for (let length=0;length<70;length++) assert.equal(exifDay(tiff().slice(0,length)),null);
  const bytes=tiff();bytes[28]=0x32;bytes[29]=1;assert.equal(exifDay(bytes),null);
});
test('capture date readers skip pixels and handle JPEG, PNG and WebP EXIF containers', async () => {
  const data=tiff();
  const jpeg=join([255,216,255,225,0,data.length+8],new TextEncoder().encode('Exif\0\0'),data,[255,217,0,0,0,0,0,0]);
  const png=join([137,80,78,71,13,10,26,10,0,0,0,data.length],new TextEncoder().encode('eXIf'),data,[0,0,0,0]);
  const webp=join(new TextEncoder().encode('RIFF'),[0,0,0,0],new TextEncoder().encode('WEBPEXIF'),[data.length,0,0,0],data);
  for (const bytes of [jpeg,png,webp]) assert.equal(await captureDay(new Blob([bytes])),'2021-04-11');
  assert.equal(await captureDay(new Blob(['not an image'])),null);
  const invalid=webp.slice();invalid[16]=255;assert.equal(await captureDay(new Blob([invalid])),null);
});
test('local groups preserve real capture days and never invent dates for missing metadata', () => {
  const photos=[{id:'a',day:null},{id:'b',day:'2023-12-01'},{id:'c',day:'2020-01-01'},{id:'d',day:'2023-12-01'}];
  assert.deepEqual(groupLocal(photos).map(({time,files})=>({time,files})),[
    {time:'2020-01-01',files:['c']},{time:'2023-12-01',files:['b','d']},{time:null,files:['a']},
  ]);
});

function exampleSource() {
  const photos = Array.from({length:25},(_,index)=>({id:`sample-${index}`,src:`sample-${index}`,width:1920,height:1080,example:true}));
  return {example:true,photos,collections:Array.from({length:5},(_,index)=>({id:`sample-group-${index}`,time:`2024-0${index+1}-01`,example:true,files:photos.slice(index*5,index*5+5).map(photo=>photo.id)}))};
}
test('one local photo replaces one sample and retains all unrelated source records', () => {
  const original=exampleSource();
  const source=mergeLocalPhotos(original,[{id:'local-1',day:'2023-12-01'}],[7,8,9]);
  assert.equal(source.photos.length,25);assert.equal(source.photos.filter(photo=>photo.example).length,24);
  assert.equal(source.photos[7].id,'local-1');
  original.photos.forEach((photo,index)=>{if(index!==7)assert.equal(source.photos[index],photo);});
  assert.equal(source.collections.find(collection=>collection.id==='sample-group-1').files.length,4);
  assert.equal(source.collections.find(collection=>!collection.example).time,'2023-12-01');
  assert.equal(source.mixed,true);
});
test('successive selections accumulate without losing earlier local photos or their real dates', () => {
  const first=mergeLocalPhotos(exampleSource(),[{id:'local-1',day:'2023-12-01'}]);
  const next=mergeLocalPhotos(first,[{id:'local-2',day:null},{id:'local-3',day:'2022-01-01'}]);
  assert.equal(next.photos.length,25);assert.equal(next.photos.filter(photo=>photo.example).length,22);
  assert.equal(next.photos[0],first.photos[0]);
  assert.deepEqual(next.collections.filter(collection=>!collection.example).map(collection=>collection.time),['2022-01-01','2023-12-01',null]);
  assert.ok(next.collections.filter(collection=>collection.example).every(collection=>collection.files.every(id=>id.startsWith('sample-'))));
});
test('more than 25 valid local photos replace samples then append every remaining photo', () => {
  const local=Array.from({length:31},(_,index)=>({id:`local-${index}`,day:null}));
  const source=mergeLocalPhotos(exampleSource(),local);
  assert.equal(source.photos.length,31);assert.equal(source.mixed,false);
  assert.equal(source.photos.filter(photo=>photo.example).length,0);
  assert.deepEqual(source.collections.map(collection=>collection.files.length),[31]);
  assert.equal(source.collections[0].time,null);
});
