import { clamp, ease, range } from './geometry.mjs';

export const STORY = { intro: 1.3, reveal: .5, gather: 3, explore: .6, exit: 1, scale: .75, fan: 3, overlap: .2 };
export function storyState(scroll, height) {
  const introDistance = Math.round(height * STORY.intro);
  const phase = (distance, length) => distance >= length - 1 ? 1 : clamp(distance / length);
  return {
    intro: clamp(scroll / introDistance),
    reveal: phase(scroll - introDistance, height * STORY.reveal),
    gather: phase(scroll - introDistance - height * STORY.reveal, height * STORY.gather),
    explore: phase(scroll - introDistance - height * (STORY.reveal + STORY.gather), height * STORY.explore),
    exit: phase(scroll - introDistance - height * (STORY.reveal + STORY.gather + STORY.explore), height * STORY.exit),
  };
}
export function gatheringContext(collections, sources, viewportWidth) {
  const visible = sources.filter(source => {
    const half = projectedWidth(source.width, source.height, source.angle, source.scale ?? 1) / 2;
    return source.x + half > 0 && source.x - half < viewportWidth;
  }).sort((a, b) => Math.abs(a.x - viewportWidth / 2) - Math.abs(b.x - viewportWidth / 2));
  const priority = new Map(visible.map((source, index) => [source.file, index]));
  const orders = collections.map(collection => [...collection.files].sort((a, b) => (priority.get(a) ?? sources.length) - (priority.get(b) ?? sources.length)));
  const group = Math.max(0, collections.findIndex(collection => collection.files.includes(visible[0]?.file)));
  return { orders, group };
}
export function timelineLayout(times, cardWidth, viewportWidth = 0, zoom = 1) {
  // Calendar coordinates preserve the displayed date/clock without host-timezone conversion.
  const stamps = times.map(time => time ? Date.parse(time.length > 10 ? `${time.slice(0, 19)}Z` : time) : null);
  const known = stamps.filter(time => time !== null);
  const gaps = known.slice(1).map((time, index) => time - known[index]).filter(gap => gap > 0);
  const unit = (cardWidth * 1.3 + 40) / Math.min(...gaps, 30 * 86400000) * zoom;
  const spacing = (cardWidth * 1.3 + 40) * zoom;
  const limit = Math.max((cardWidth * 1.3 + 40) * 2, viewportWidth * .8) * zoom;
  const padding = Math.max(viewportWidth / 2, cardWidth * .6 + 20);
  const positions = [], segments = [];
  stamps.forEach((time, index) => {
    if (!index) { positions.push(padding); return; }
    const duration = time === null || stamps[index - 1] === null ? null : time - stamps[index - 1];
    const distance = duration === null ? spacing : Math.min(duration * unit, limit);
    positions.push(positions[index - 1] + distance);
    if (duration > 0) segments.push({ from: stamps[index - 1], to: time, left: positions[index - 1], right: positions[index], compressed: duration * unit > limit + 1 });
  });
  return { positions, width: (positions.at(-1) ?? padding) + padding, stamps, unit, first: known[0] ?? 0, segments };
}
export function positionAtTime(layout, time) {
  const segment = layout.segments.find(segment => time <= segment.to) ?? layout.segments.at(-1);
  return segment ? segment.left + (time - segment.from) / (segment.to - segment.from) * (segment.right - segment.left)
    : layout.positions[0] + (time - layout.first) * layout.unit;
}
export function timeAtPosition(layout, x) {
  const last = layout.stamps.findLastIndex(time => time !== null);
  if (last < 0 || x > layout.positions[last] + 1) return null;
  const segment = layout.segments.find(segment => x <= segment.right) ?? layout.segments.at(-1);
  return segment ? segment.from + (x - segment.left) / (segment.right - segment.left) * (segment.to - segment.from)
    : layout.first + (x - layout.positions[0]) / layout.unit;
}
export function magneticPosition(left, positions, viewportWidth) {
  const center = left + viewportWidth / 2;
  const nearest = positions.reduce((best, x) => Math.abs(x - center) < Math.abs(best - center) ? x : best, positions[0]);
  const target = nearest - viewportWidth / 2;
  return Math.abs(target - left) <= Math.min(36, viewportWidth * .08) ? target : left;
}
export function fullRevealPose(source, reveal, height) {
  const scale = Math.min(1, height * .30 / source.height);
  const extent = projectedWidth(source.height, source.width, source.angle, scale);
  const y = Math.max(height * .12, 24 + extent / 2);
  return { ...source, y: source.y + (y - source.y) * reveal, scale: 1 + (scale - 1) * reveal };
}
export function photoSize(photo, base, height) {
  const ratio = photo.width / photo.height;
  const area = base * base / (16 / 9);
  const width = Math.sqrt(area * ratio), tall = Math.sqrt(area / ratio);
  const fit = Math.min(1, base * 1.3 / width, height * .4 / tall);
  return { width: width * fit, height: tall * fit };
}
const mix = (a, b, t) => a + (b - a) * t;
function between(a, b, progress) {
  const t = ease(progress);
  return { x: mix(a.x, b.x, ease(t)), y: mix(a.y, b.y, t),
    scale: mix(a.scale, b.scale, t), angle: mix(a.angle, b.angle, t) };
}
export function projectedWidth(width, height, angle, scale = 1) {
  const radians = angle * Math.PI / 180;
  return (Math.abs(Math.cos(radians)) * width + Math.abs(Math.sin(radians)) * height) * scale;
}
export function leaderGuide(leader, follower, width, height, scale, finalY) {
  const guideScale = (leader.scale + scale) / 2;
  const guideAngle = leader.angle / 2;
  const a = projectedWidth(width, height, guideAngle, guideScale);
  const b = projectedWidth(width, height, follower.angle, follower.scale);
  const direction = Math.sign(follower.x - leader.x) || 1;
  return { x: follower.x - direction * ((a + b) / 2 - Math.min(a, b) * STORY.overlap),
    y: mix(leader.y, finalY, .5), scale: guideScale, angle: guideAngle };
}
export function gatheringPose(progress, rank, source, target, guide) {
  const p = clamp(progress);
  const near = { ...target, y: target.y - target.height * .03, angle: target.angle * .8 };
  const pose = rank === 0
    ? p <= .2 ? between(source, guide, p / .2) : between(guide, near, (p - .2) / .6)
    : between(source, near, (p - (.2 + (rank - 1) * .15)) / (.8 - (.2 + (rank - 1) * .15)));
  return between(pose, target, range(p, .8, 1));
}
