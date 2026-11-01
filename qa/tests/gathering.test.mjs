import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY, storyState, timelineLayout, projectedWidth, leaderGuide, gatheringPose, magneticPosition, positionAtTime, timeAtPosition, gatheringContext } from '../../src/gathering-geometry.mjs';
import { DEMO_COLLECTIONS } from '../../src/demo-photos.mjs';
const source = { x: 100, y: 240, scale: 1, angle: -8 };
const follower = { x: 600, y: 240, scale: 1, angle: 5 };
const target = { x: 220, y: 430, scale: .75, angle: 0, height: 210 };
const guide = leaderGuide(source, follower, 500, 286, .75, target.y);
const fields = pose => ['x', 'y', 'scale', 'angle'].map(key => pose[key]);
test('original intro, half-screen reveal and three-screen gathering have separate progress', () => {
  for (const height of [500, 628, 768, 844, 1080]) {
    const intro = Math.round(height * STORY.intro);
    assert.deepEqual(storyState(intro, height), { intro: 1, reveal: 0, gather: 0, explore: 0, exit: 0 });
    assert.deepEqual(storyState(intro + height * .5, height), { intro: 1, reveal: 1, gather: 0, explore: 0, exit: 0 });
    assert.deepEqual(storyState(intro + height * 3.5, height), { intro: 1, reveal: 1, gather: 1, explore: 0, exit: 0 });
  }
});
test('leader reaches 20% horizontal projected overlap before the second photo follows', () => {
  const a = projectedWidth(500, 286, guide.angle, guide.scale);
  const b = projectedWidth(500, 286, follower.angle, follower.scale);
  const overlap = (a + b) / 2 - Math.abs(guide.x - follower.x);
  assert.ok(Math.abs(overlap / Math.min(a, b) - .2) < 1e-10);
  assert.deepEqual(fields(gatheringPose(.2, 0, source, target, guide)), fields(guide));
  assert.deepEqual(fields(gatheringPose(.2, 1, follower, target, guide)), fields(follower));
});
test('all five photos hold before their turn and finish at the final fan pose', () => {
  for (let rank = 0; rank < 5; rank++) {
    const start = rank === 0 ? 0 : .2 + (rank - 1) * .15;
    assert.deepEqual(fields(gatheringPose(start, rank, source, target, guide)), fields(source));
    assert.deepEqual(fields(gatheringPose(1, rank, source, target, guide)), fields(target));
    for (let step = 0; step <= 1000; step++) {
      const p = step / 1000;
      assert.ok(fields(gatheringPose(p, rank, source, target, guide)).every(Number.isFinite));
      const pose = gatheringPose(p, rank, source, target, guide);
      assert.ok(pose.scale >= .75 && pose.scale <= 1);
    }
  }
});
test('guide and settlement junctions remain continuous in either direction', () => {
  for (let rank = 0; rank < 5; rank++) for (const point of [.2, .35, .5, .65, .8, 1]) {
    const before = fields(gatheringPose(point - 1e-7, rank, source, target, guide));
    const after = fields(gatheringPose(point + 1e-7, rank, source, target, guide));
    assert.ok(before.every((value, index) => Math.abs(value - after[index]) < .001));
  }
});
test('long empty intervals contract visibly while every node and date uses the same mapping', () => {
  const times = DEMO_COLLECTIONS.map(collection => collection.demoTime);
  const layout = timelineLayout(times, 375, 686);
  assert.ok(layout.segments.some(segment => segment.compressed));
  for (let index = 0; index < times.length; index++) {
    assert.equal(positionAtTime(layout, Date.parse(`${times[index].slice(0, 19)}Z`)), layout.positions[index]);
    assert.ok(Math.abs(timeAtPosition(layout, layout.positions[index]) - Date.parse(`${times[index].slice(0, 19)}Z`)) < .1);
  }
  for (const segment of layout.segments) {
    const midpoint = (segment.from + segment.to) / 2;
    assert.ok(Math.abs(timeAtPosition(layout, positionAtTime(layout, midpoint)) - midpoint) < .1);
    assert.ok(segment.right - segment.left <= (375 * 1.3 + 40) * 2 + 1);
  }
});
test('calendar dates retain sample clock precision and keep same-day local/sample collections distinct', () => {
  const layout = timelineLayout(['2024-06-08', '2024-06-08T13:37:00+08:00', '2025-09-04T00:08:00+08:00'],200,686);
  assert.ok(layout.positions[1] - layout.positions[0] >= 300);
  assert.equal(new Date(layout.stamps[2]).toISOString().slice(0,10),'2025-09-04');
});
test('faster-slide detail scale narrows the visible time range and preserves unknown dates', () => {
  const times = ['2001-01-01', '2001-02-01', '2026-01-01', null];
  const normal = timelineLayout(times, 200, 686), detail = timelineLayout(times, 200, 686, 2.5);
  const date = Date.parse('2014-01-01');
  const span = layout => timeAtPosition(layout, positionAtTime(layout, date) + 100) - timeAtPosition(layout, positionAtTime(layout, date) - 100);
  assert.ok(span(detail) < span(normal) / 2);
  assert.equal(timeAtPosition(detail, detail.positions.at(-1)), null);
  assert.equal(timeAtPosition(timelineLayout([null],200,686),343),null);
});

test('stable exploration occupies a scroll interval rather than a single coordinate', () => {
  const h = 956, start = Math.round(h * STORY.intro) + h * (STORY.reveal + STORY.gather);
  for (const fraction of [.01, .25, .5, .9]) {
    const state = storyState(start + h * STORY.explore * fraction, h);
    assert.equal(state.gather, 1); assert.equal(state.exit, 0);
    assert.ok(Math.abs(state.explore - fraction) < 1e-10);
  }
});

test('fractional document heights still reach the completed closure within a CSS pixel', () => {
  for (const h of [500, 628, 768, 844, 956, 1080]) {
    const end = Math.floor(h * (STORY.intro + STORY.reveal + STORY.gather + STORY.explore + STORY.exit));
    assert.equal(storyState(end, h).exit, 1);
  }
});

test('ruler attraction is local to collection nodes and leaves free browsing outside the capture radius', () => {
  const nodes=[200,600,1100];
  assert.equal(magneticPosition(382,nodes,400),400);
  assert.equal(magneticPosition(421,nodes,400),400);
  assert.equal(magneticPosition(300,nodes,400),300);
  assert.equal(magneticPosition(48,nodes,400),48,'one arrow-key step escapes the current node');
  assert.equal(magneticPosition(400,nodes,400),400);
});

test('visible members lead their real collections and the central source chooses the initial date', () => {
  const collections=[{files:['a1','a2']},{files:['b1','b2','b3']}];
  const snapshot=structuredClone(collections);
  const source=(file,x,scale=1)=>({file,x,width:100,height:60,angle:0,scale});
  const context=gatheringContext(collections,[source('a1',-10),source('b3',190),source('b1',425),source('a2',700)],400);
  assert.equal(context.group,1);assert.deepEqual(context.orders,[['a1','a2'],['b3','b1','b2']]);
  assert.deepEqual(collections,snapshot,'preview ranking never rewrites membership');
});
test('visible members beyond the five-photo preview are promoted without dropping full membership', () => {
  const files=Array.from({length:29},(_,i)=>`photo-${i}`),collections=[{files}];
  const context=gatheringContext(collections,[{file:'photo-28',x:200,width:100,height:60,angle:0,scale:1}],400);
  assert.equal(context.orders[0][0],'photo-28');assert.equal(new Set(context.orders[0]).size,29);
  const outside=gatheringContext(collections,[{file:'photo-28',x:440,width:100,height:60,angle:0,scale:.25}],400);
  assert.deepEqual(outside.orders[0],files,'visibility uses the displayed scale');
});
