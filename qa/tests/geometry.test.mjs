import test from 'node:test';
import assert from 'node:assert/strict';
import { loadingAmplitude, ringPoints, RADII, TRANSITION, sceneState, PHOTO_FLOW_SECONDS, photoExposureTop, riverPositions, PHOTO_MOTION, riverMotion } from '../../src/geometry.mjs';

test('loading amplitude decays monotonically to a calm circle', () => {
  let previous = Infinity;
  for (let p = 0; p <= 100; p++) {
    const amplitude = loadingAmplitude(p / 100);
    assert.ok(amplitude <= previous);
    previous = amplitude;
  }
  assert.equal(loadingAmplitude(1), 0);
});
test('initial rings are concentric with the specified radius ratios', () => {
  RADII.forEach((radius, index) => {
    for (const [x, y] of ringPoints(index, 0)) assert.ok(Math.abs(Math.hypot(x - 500, y - 500) - radius) < 1e-8);
  });
  assert.equal(RADII[0] / RADII[2], .56);
  assert.equal(RADII[1] / RADII[2], .78);
});
test('outer ring opens before middle and inner, all merge into one line', () => {
  const gap = index => { const points = ringPoints(index, .22); return Math.abs(points[0][0] - points.at(-1)[0]); };
  assert.ok(gap(2) > gap(1));
  assert.ok(gap(1) > gap(0));
  assert.deepEqual(ringPoints(0, .70), ringPoints(1, .70));
  assert.deepEqual(ringPoints(1, .70), ringPoints(2, .70));
  assert.ok(ringPoints(2, .7).every(([, y]) => y === 500));
});
test('scroll states retrace exactly and geometry remains continuous', () => {
  for (let index = 0; index < 3; index++) {
    for (let step = 0; step < 100; step++) {
      const p = step / 100;
      const current = ringPoints(index, p);
      assert.deepEqual(current, ringPoints(index, p));
      const next = ringPoints(index, p + .0001);
      current.forEach(([x, y], i) => assert.ok(Math.hypot(next[i][0] - x, next[i][1] - y) < 1));
    }
  }
});
test('opening endpoints retain their sides while the circle unfolds', () => {
  for (let index = 0; index < 3; index++) {
    for (let step = 0; step <= 70; step++) {
      const points = ringPoints(index, step / 100);
      assert.ok(points.slice(0, 65).every(([x]) => x >= 500 - 1e-8));
      assert.ok(points.slice(64).every(([x]) => x <= 500 + 1e-8));
    }
  }
});
test('material points on both halves unroll outward without moving inward', () => {
  for (let index = 0; index < 3; index++) {
    let previous = ringPoints(index, .46);
    for (let step = 47; step <= 64; step++) {
      const next = ringPoints(index, step / 100);
      next.forEach(([x], i) => {
        const distance = Math.abs(x - 500);
        assert.ok(distance + 1e-8 >= Math.abs(previous[i][0] - 500));
      });
      previous = next;
    }
  }
});
test('input ripple is local, propagates, decays and caps repeated input', async () => {
  const { rippleOffset } = await import('../../src/geometry.mjs');
  const pulse = { age: .15, angle: 0, radius: 400, strength: 12 };
  assert.ok(rippleOffset(2, 0, [pulse]) > 5);
  assert.equal(rippleOffset(2, Math.PI, [pulse]), 0);
  assert.ok(Math.abs(rippleOffset(2, .0001, [pulse]) - rippleOffset(2, 0, [pulse])) < .0001, 'wave origin has no sharp cusp');
  assert.ok(Math.abs(rippleOffset(2, Math.PI, [{ ...pulse, age: 1.45 }])) > .1);
  assert.equal(rippleOffset(2, 0, [{ ...pulse, age: 4 }]), 0);
  assert.ok(Math.abs(rippleOffset(2, 0, Array(20).fill(pulse))) <= 14);
});

test('all paths coincide before inner and middle paths start retiring', () => {
  for (let step = 0; step <= 1000; step++) {
    const p = step / 1000;
    const scene = sceneState(p, 4);
    if (scene.merged > 0) {
      assert.deepEqual(ringPoints(0, p), ringPoints(2, p));
      assert.deepEqual(ringPoints(1, p), ringPoints(2, p));
    }
  }
  assert.equal(sceneState(.55, 4).merged, 0);
  assert.equal(sceneState(.70, 4).merged, 1);
  assert.equal(sceneState(.70, 4).line, 1);
  assert.equal(TRANSITION.merge[0], TRANSITION.unfolding[1]);
});
test('text, river and navigation reveal progressively with reversible endpoints', () => {
  const start = sceneState(0, 4);
  const middle = sceneState(.55, 4);
  const river = sceneState(.80, 4);
  const end = sceneState(1, 4);
  assert.deepEqual(start.copy, [0, 0, 0, 0]);
  assert.ok(middle.copy[0] > middle.copy[1]);
  assert.ok(middle.copy[1] > middle.copy[2]);
  assert.deepEqual(middle.photos, [0, 0, 0, 0]);
  assert.ok(river.photos[0] > river.photos[1]);
  assert.ok(river.photos[1] > river.photos[2]);
  assert.equal(river.navigation, 0);
  assert.deepEqual(end.copy, [1, 1, 1, 1]);
  assert.deepEqual(end.photos, [1, 1, 1, 1]);
  assert.equal(end.brand, 1);
  assert.equal(end.navigation, 1);
  assert.equal(end.line, 0);
});

test('green atmosphere is gone before any album text appears', () => {
  assert.equal(sceneState(0, 4).mist, 1);
  assert.equal(TRANSITION.mistExit[1], TRANSITION.copy[0][0]);
  for (let step = 0; step <= 1000; step++) {
    const scene = sceneState(step / 1000, 4);
    if (scene.copy.some(reveal => reveal > 0)) assert.equal(scene.mist, 0);
  }
});

test('river moves right to left at one viewport width per 60 seconds', () => {
  assert.equal(PHOTO_FLOW_SECONDS, 60);
  for (const width of [390, 1366, 1920, 2560]) {
    const sizes = [180, 190, 175, 185];
    const before = riverPositions(width, sizes, 0, width / 3);
    const after = riverPositions(width, sizes, 1, width / 3);
    assert.ok(Math.abs(before[0] - after[0] - width / 60) < 1e-8);
  }
  assert.deepEqual(riverPositions(390, [], 100, 0), []);
});
test('river recycles only while the entire card and its shadow are offscreen', () => {
  for (const width of [390, 1366, 1920, 2560]) {
    const sizes = [180, 190, 175, 185];
    const margin = Math.max(...sizes) / 2 + 20;
    const cycle = width + 2 * margin;
    const crossing = (width / 3 + margin) / width * 60;
    const before = riverPositions(width, sizes, crossing - .0001, width / 3)[0];
    const after = riverPositions(width, sizes, crossing + .0001, width / 3)[0];
    assert.ok(before + sizes[0] / 2 + 16 < 0);
    assert.ok(after - sizes[0] / 2 - 16 > width);
    assert.ok(Math.abs(riverPositions(width, sizes, 0, width / 3)[0]
      - riverPositions(width, sizes, cycle / width * 60, width / 3)[0]) < 1e-8);
  }
});

test('secondary motion starts at rest and respects confirmed amplitude/period bounds', () => {
  assert.deepEqual(PHOTO_MOTION, { bob: .02, sway: .6, period: [8, 12] });
  for (let index = 0; index < 4; index++) {
    const period = 8 + 4 * index / 3;
    assert.deepEqual(riverMotion(0, index, 4), { bob: 0, sway: 0 });
    const peak = riverMotion(period / 4, index, 4);
    assert.ok(Math.abs(peak.bob - .02) < 1e-10);
    assert.ok(Math.abs(peak.sway - .6) < 1e-10);
    const trough = riverMotion(period * .75, index, 4);
    assert.ok(Math.abs(trough.bob + .02) < 1e-10);
    assert.ok(Math.abs(trough.sway + .6) < 1e-10);
    const cycle = riverMotion(period, index, 4);
    assert.ok(Math.abs(cycle.bob) < 1e-10 && Math.abs(cycle.sway) < 1e-10);
    for (let step = 0; step <= 1000; step++) {
      const pose = riverMotion(step / 10, index, 4);
      assert.ok(Math.abs(pose.bob) <= .02 && Math.abs(pose.sway) <= .6);
    }
  }
  assert.notDeepEqual(riverMotion(2, 0, 4), riverMotion(2, 3, 4));
});

test('larger photo pools still finish their reveal within the transition', () => {
  assert.ok(sceneState(1, 25).photos.every(value => value === 1));
});

test('photo exposure respects each layer throughout its rotation and bob envelope', () => {
  for (const width of [170, 396, 500]) {
    const height = (width - 10) * 9 / 16;
    const cardHeight = height + 10;
    const photo = { width: width - 10, height, offsetY: 0 };
    for (const baseAngle of [-8, 5, -4, 7]) for (const exposure of [.5, .25, .15]) {
      const top = photoExposureTop(250, cardHeight, photo, baseAngle, exposure);
      for (let wave = -1; wave <= 1; wave += .02) {
        const angle = (baseAngle + .6 * wave) * Math.PI / 180;
        const projectedHeight = Math.abs(Math.sin(angle)) * photo.width + Math.abs(Math.cos(angle)) * height;
        const imageTop = top + cardHeight / 2 - projectedHeight / 2 + height * .02 * wave;
        assert.ok(250 - imageTop <= height * exposure + 1e-8);
      }
    }
  }
});
