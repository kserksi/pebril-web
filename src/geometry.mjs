export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
export const range = (value, start, end) => ease((value - start) / (end - start));
export const loadingAmplitude = progress => 10 * (1 - clamp(progress)) ** 1.35;
export const RADII = [224, 312, 400];

export const TRANSITION = {
  opening: [.15, .38], openingStagger: .04,
  unfolding: [.26, .64], unfoldingStagger: .025,
  merge: [.64, .70], lineExit: [.72, .94],
  brandTravel: [.15, .60], brandSettle: [.90, 1],
  mistExit: [.15, .46],
  copy: [[.46, .64], [.49, .72], [.55, .77], [.82, .94]],
  photos: [.72, .94], photoStagger: .015,
  navigation: [.88, 1],
};

export function sceneState(progress, photoCount) {
  const p = clamp(progress);
  return {
    settle: 1 - range(p, 0, .15),
    brand: .94 * range(p, ...TRANSITION.brandTravel) + .06 * range(p, ...TRANSITION.brandSettle),
    merged: range(p, ...TRANSITION.merge),
    line: 1 - range(p, ...TRANSITION.lineExit),
    mist: 1 - range(p, ...TRANSITION.mistExit),
    copy: TRANSITION.copy.map(interval => range(p, ...interval)),
    photos: Array.from({ length: photoCount }, (_, index) => range(p,
      TRANSITION.photos[0] + Math.min(index, 3) * TRANSITION.photoStagger,
      TRANSITION.photos[1] + Math.min(index, 3) * TRANSITION.photoStagger)),
    navigation: range(p, ...TRANSITION.navigation),
  };
}

export const PHOTO_FLOW_SECONDS = 60;
export const PHOTO_MOTION = { bob: .02, sway: .6, period: [8, 12] };

// Reserve the complete motion envelope; exposure is measured against displayed photo height.
export function photoExposureTop(riverHeight, cardHeight, photo, baseAngle, exposure) {
  const projectedHeight = Math.max(...[-PHOTO_MOTION.sway, PHOTO_MOTION.sway].map(sway => {
    const angle = (baseAngle + sway) * Math.PI / 180;
    return Math.abs(Math.sin(angle)) * photo.width + Math.abs(Math.cos(angle)) * photo.height;
  }));
  return riverHeight - photo.height * exposure + projectedHeight / 2 - cardHeight / 2
    + Math.abs(photo.offsetY) + photo.height * PHOTO_MOTION.bob;
}

export function riverMotion(elapsedSeconds, index, count) {
  const period = PHOTO_MOTION.period[0] + (PHOTO_MOTION.period[1] - PHOTO_MOTION.period[0]) * index / Math.max(1, count - 1);
  const wave = Math.sin(elapsedSeconds * 2 * Math.PI / period);
  return { bob: PHOTO_MOTION.bob * wave, sway: PHOTO_MOTION.sway * wave };
}


export function riverPositions(viewportWidth, projectedWidths, elapsedSeconds, anchor) {
  if (projectedWidths.length === 0) return [];
  // Keep the existing card shadow outside the scene when recycling a photo.
  const margin = Math.max(...projectedWidths) / 2 + 20;
  const cycle = viewportWidth + 2 * margin;
  const distance = viewportWidth * elapsedSeconds / PHOTO_FLOW_SECONDS;
  return projectedWidths.map((_, index) => {
    const center = anchor + index * cycle / projectedWidths.length - distance;
    return ((center + margin) % cycle + cycle) % cycle - margin;
  });
}

export function rippleOffset(index, angle, ripples) {
  let displacement = 0;
  for (const ripple of ripples) {
    const wrapped = Math.atan2(Math.sin(angle - ripple.angle), Math.cos(angle - ripple.angle));
    const distance = Math.hypot(wrapped, .1) - .1;
    const arrival = distance / 2.5 + Math.min(.12, Math.abs(RADII[index] - ripple.radius) / 650);
    const elapsed = ripple.age - arrival;
    if (elapsed < 0 || elapsed > 3) continue;
    displacement += ripple.strength * Math.sin(elapsed * 12) * Math.exp(-elapsed * 2.5) * Math.exp(-distance * .25);
  }
  return clamp(displacement, -14, 14);
}

// All states use the same sample topology, so reversing scroll retraces the path.
export function ringPoints(index, progress, time = 0, amplitude = 0, breath = 0, ripples = [], rippleScale = 1) {
  const opening = range(progress, TRANSITION.opening[0] + (2 - index) * TRANSITION.openingStagger, TRANSITION.opening[1] + (2 - index) * TRANSITION.openingStagger);
  const unfolding = range(progress, TRANSITION.unfolding[0] + (2 - index) * TRANSITION.unfoldingStagger, TRANSITION.unfolding[1]);
  const drop = range(progress, ...TRANSITION.lineExit) * 550;
  const radius = RADII[index] * (1 + breath * (1 - range(progress, 0, .18)));
  return Array.from({ length: 129 }, (_, i) => {
    const u = i / 128;
    const gap = opening * .42;
    const angle = -Math.PI / 2 + gap + u * (Math.PI * 2 - gap * 2);
    const wave = amplitude * (Math.sin(angle * 3 + time * 1.1 + index * .5) * .65 + Math.sin(angle * 5 - time * .7) * .35);
    const r = radius + wave + rippleOffset(index, angle, ripples) * rippleScale;
    const side = u <= .5 ? 1 : -1;
    const arc = (Math.PI - gap) * Math.abs(2 * u - 1);
    const curvature = 1 - unfolding;
    // Unroll each half toward its own side, preserving arc order around the bottom anchor.
    const unfoldedRadius = r + (RADII[2] - r) * unfolding;
    const x = curvature < 1e-8
      ? side * unfoldedRadius * arc
      : side * unfoldedRadius * Math.sin(arc * curvature) / curvature;
    const y = curvature < 1e-8
      ? 0
      : r * curvature + unfoldedRadius * (Math.cos(arc * curvature) - 1) / curvature;
    return [500 + x, 500 + y + drop];
  });
}
export const pathData = points => `M${points.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join('L')}`;
