import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhotoPool } from '../../src/photo-pool.mjs';
import { DEMO_COLLECTIONS, PHOTO_FILES } from '../../src/demo-photos.mjs';
import { readFileSync } from 'node:fs';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function setup(t, decode = () => Promise.resolve()) {
  const requests = [];
  globalThis.Image = class {
    set src(value) { this.url = value; requests.push(value); }
    get src() { return this.url; }
    decode() { return decode(this); }
  };
  t.after(() => { delete globalThis.Image; });
  const cards = PHOTO_FILES.slice(0, 4).map(filename => {
    const image = { src: `./assets/photos/${filename}`, getAttribute() { return this.src; } };
    return { querySelector() { return image; } };
  });
  const pool = createPhotoPool(cards);
  t.after(() => pool.stop());
  return { cards, pool, requests };
}
test('one prefetched replacement cycles through all 25 local sources without visible-slot duplication', async t => {
  const { cards, pool, requests } = setup(t);
  const seen = new Set(cards.map(card => card.querySelector().src));
  pool.prepare(); pool.prepare();
  assert.equal(requests.length, 1);
  for (let index = 0; index < 100; index++) {
    await flush();
    const card = cards[index % cards.length];
    const old = card.querySelector().src;
    pool.recycle(card);
    assert.notEqual(card.querySelector().src, old);
    seen.add(card.querySelector().src);
    assert.equal(new Set(cards.map(item => item.querySelector().src)).size, cards.length);
  }
  assert.equal(seen.size, 25);
  assert.equal(requests.length, 101);
});
test('slow or stopped prefetch keeps the existing image unchanged', async t => {
  let resolve;
  const { cards, pool } = setup(t, () => new Promise(done => { resolve = done; }));
  const old = cards[0].querySelector().src;
  pool.prepare(); pool.recycle(cards[0]);
  assert.equal(cards[0].querySelector().src, old);
  pool.stop(); resolve(); await flush(); pool.recycle(cards[0]);
  assert.equal(cards[0].querySelector().src, old);
});
test('unavailable replacements are bounded and do not erase current photos', async t => {
  const { cards, pool, requests } = setup(t, () => Promise.reject(new Error('Unavailable')));
  const original = cards.map(card => card.querySelector().src);
  pool.prepare();
  for (let index = 0; index < 30; index++) await flush();
  assert.equal(requests.length, PHOTO_FILES.length);
  cards.forEach(card => pool.recycle(card));
  assert.deepEqual(cards.map(card => card.querySelector().src), original);
});

test('fictional chronology has five stable dates and five unique source photos per collection', () => {
  const sources = JSON.parse(readFileSync(new URL('../../assets/photos/sources.json', import.meta.url)));
  assert.equal(DEMO_COLLECTIONS.length, 5);
  assert.equal(new Set(DEMO_COLLECTIONS.map(collection => collection.id)).size, 5);
  assert.ok(DEMO_COLLECTIONS.every(collection => collection.files.length === 5));
  const times = DEMO_COLLECTIONS.map(collection => Date.parse(collection.demoTime));
  assert.ok(times.every(Number.isFinite));
  assert.equal(new Set(times).size, 5);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
  assert.equal(PHOTO_FILES.length, 25);
  assert.equal(new Set(PHOTO_FILES).size, 25);
  assert.deepEqual([...PHOTO_FILES].sort(), sources.images.map(image => image.filename).sort());
  assert.ok(DEMO_COLLECTIONS.every(collection => !('capturedAt' in collection)));
});
