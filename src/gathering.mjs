import { clamp, range } from './geometry.mjs';
import { STORY, timelineLayout, leaderGuide, gatheringPose, fullRevealPose, photoSize, projectedWidth, magneticPosition, positionAtTime, timeAtPosition, gatheringContext } from './gathering-geometry.mjs';
import { setPhotoSource, SIZES } from './photo-media.mjs';

export function createGathering(river, copy, source, closure, viewer, retained = new Map()) {
  const scene = document.querySelector('.timeline');
  const viewport = scene.querySelector('.timeline-viewport');
  const content = scene.querySelector('.timeline-content');
  const status = scene.querySelector('.timeline-status');
  const readout = scene.querySelector('.tuning-readout');
  const axis = scene.querySelector('.timeline-axis');
  const headingCopy = scene.querySelector('.timeline-copy');
  const localPanel = scene.querySelector('.local-experience');
  const controls = [], abort = new AbortController(), options = { signal: abort.signal };
  const photos = source.photos, collections = source.collections;
  const files = photos.map(photo => photo.id);
  let orders = collections.map(collection => collection.files);
  let entries = [], sources = [], width = 0, height = 0, lastGather = 0, rawGather = 0, exit = 0;
  let axisY = 0;
  let layout, riverTop = 0, selected = -1, stopped = false, base = 170;
  let frozen = false, reduced = false, dragging = null, suppressClick = false;
  const timers = new Set();
  let snapTimer, scaleFrame = 0, scaleAt = 0, axisCardWidth = 0, scaleAnchor;
  let zoom = 1, targetZoom = 1, ignoredLeft = null, lastPanAt = 0, lastPanLeft = 0, quietUntil = 0;
  viewport.setAttribute('aria-label', source.example ? copy.timelineLabel : source.mixed ? copy.mixedTimelineLabel : copy.localTimelineLabel);
  collections.forEach((collection, index) => {
    const example = collection.example ?? source.example;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'collection-control';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'collection-viewer');
    const time = document.createElement('time');
    time.dateTime = collection.time ?? '';
    time.textContent = collection.time ? collection.time.slice(0, 10).replaceAll('-', '.') : copy.unknownTime;
    const caption = document.createElement('span'); caption.className = 'collection-caption';
    const label = document.createElement('small');
    label.textContent = `${example && source.mixed ? copy.exampleCollection : copy.collection} ${index + 1} · ${collection.files.length} ${copy.photos}`;
    caption.append(time, label); button.append(caption);
    button.setAttribute('aria-label', `${example ? copy.exampleTime : copy.localTime} ${time.textContent}，${label.textContent}`);
    button.addEventListener('click', () => {
      const image = entries.find(entry => entry.group === index && entry.rank === 0)?.card.querySelector('img');
      const bounds = image?.getBoundingClientRect();
      stopScale(); quietUntil = performance.now() + 400;
      selected = index;
      controls.forEach((control, i) => control.setAttribute('aria-pressed', String(i === selected)));
      status.textContent = copy.timelineHint;
      viewport.scrollLeft = layout.positions[index] - width / 2;
      viewer.open({ ...collection, files: orders[index] }, photos, bounds, image);
    }, options);
    button.addEventListener('focus', () => { if (lastGather === 1) frozen = true; }, options);
    content.append(button); controls.push(button);
  });
  function settle() {
    clearTimeout(snapTimer);
    if (dragging || scaleFrame || stopped || !entries.length || scene.inert) return;
    snapTimer = setTimeout(() => {
      if (scene.inert) return;
      const target = magneticPosition(viewport.scrollLeft, layout.positions, width);
      if (Math.abs(target - viewport.scrollLeft) > 1) { scaleAnchor = undefined; quietUntil = performance.now() + 500; viewport.scrollTo({ left: target, behavior: reduced ? 'instant' : 'smooth' }); }
    }, 140);
  }
  viewport.addEventListener('scroll', () => { if (entries.length) { trackScale(); paint(); settle(); } }, { ...options, passive: true });
  scene.addEventListener('keydown', event => {
    if (event.target.closest('.local-experience')) return;
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { stopScale(); quietUntil = performance.now() + 200; }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); frozen = true;
      viewport.scrollLeft += event.key === 'ArrowRight' ? 48 : -48;
    }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); viewport.scrollLeft = event.key === 'Home' ? 0 : layout.width; }
    if (event.key === 'Escape') { selected = -1; controls.forEach(control => control.setAttribute('aria-pressed', 'false')); status.textContent = copy.timelineHint; }
  }, options);
  viewport.addEventListener('pointerdown', event => {
    clearTimeout(snapTimer);
    quietUntil = 0; lastPanAt = performance.now(); lastPanLeft = viewport.scrollLeft;
    viewport.scrollTo({ left: viewport.scrollLeft, behavior: 'instant' });
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    suppressClick = false;
    dragging = { x: event.clientX, left: viewport.scrollLeft, moved: false }; frozen = true;
  }, options);
  viewport.addEventListener('pointermove', event => {
    if (!dragging) return;
    if (!dragging.moved && Math.abs(event.clientX - dragging.x) > 5) {
      dragging.moved = true; viewport.dataset.dragging = 'true'; viewport.setPointerCapture(event.pointerId); viewport.focus({ preventScroll: true });
    }
    viewport.scrollLeft = dragging.left + dragging.x - event.clientX;
  }, options);
  viewport.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; }
  }, { ...options, capture: true });
  const release = () => { suppressClick = dragging?.moved ?? false; dragging = null; delete viewport.dataset.dragging; settle(); };
  viewport.addEventListener('pointerup', release, options);
  viewport.addEventListener('pointercancel', release, options);

  function stopScale() {
    cancelAnimationFrame(scaleFrame); scaleFrame = 0; targetZoom = zoom; scaleAnchor = undefined; scene.dataset.scaling = 'false';
  }
  function applyScale(value) {
    const before = viewport.scrollLeft, center = before + width / 2;
    const anchor = scaleAnchor === undefined ? timeAtPosition(layout, center) : scaleAnchor, offset = (center - layout.positions.at(-1)) / zoom;
    zoom = value;
    layout = timelineLayout(collections.map(collection => collection.time), axisCardWidth, width, zoom);
    drawAxis();
    viewport.scrollLeft = (anchor === null ? layout.positions.at(-1) + offset * zoom : positionAtTime(layout, anchor)) - width / 2;
    if (dragging) dragging.left += viewport.scrollLeft - before;
    ignoredLeft = lastPanLeft = viewport.scrollLeft;
    scene.dataset.zoom = zoom.toFixed(3);
    paint();
  }
  function scaleTick(now) {
    if (stopped || scene.inert) { stopScale(); return; }
    const dt = Math.min(64, now - scaleAt || 32); scaleAt = now;
    const done = Math.abs(targetZoom - zoom) < .005;
    applyScale(done ? targetZoom : zoom + (targetZoom - zoom) * (1 - Math.exp(-dt / 100)));
    if (done) { scaleFrame = 0; scene.dataset.scaling = 'false'; settle(); }
    else scaleFrame = requestAnimationFrame(scaleTick);
  }
  function trackScale() {
    const now = performance.now(), left = viewport.scrollLeft;
    const elapsed = now - lastPanAt, distance = Math.abs(left - lastPanLeft);
    const generated = ignoredLeft !== null && Math.abs(left - ignoredLeft) < 2;
    ignoredLeft = null; lastPanLeft = left;
    if (generated || distance === 0) return;
    lastPanAt = now;
    scaleAnchor = undefined;
    if (scene.inert || now < quietUntil || elapsed <= 0 || elapsed > 180 || distance < 1) return;
    // Keep one logical date while scaling; native pixel rounding must not accumulate each frame.
    scaleAnchor = timeAtPosition(layout, left + width / 2);
    targetZoom = 1 + range(distance / Math.max(16, elapsed), .2, 1.6) * 1.5;
    if (reduced) { applyScale(targetZoom); return; }
    if (!scaleFrame) { scene.dataset.scaling = 'true'; scaleAt = now; scaleFrame = requestAnimationFrame(scaleTick); }
  }
  function drawAxis() {
    content.style.width = `${layout.width}px`;
    controls.forEach((control, index) => control.style.left = `${layout.positions[index]}px`);
    axis.replaceChildren();
    const mark = (className, x) => {
      const element = document.createElement('span'); element.className = className; element.style.left = `${x}px`;
      axis.append(element); return element;
    };
    for (const segment of layout.segments) {
      const pixelsPerDay = (segment.right - segment.left) / (segment.to - segment.from) * 86400000;
      const step = Math.max(1, Math.ceil(12 / pixelsPerDay));
      for (let day = Math.ceil(segment.from / 86400000 / step) * step; day * 86400000 < segment.to; day += step) {
        const x = positionAtTime(layout, day * 86400000);
        if (layout.positions.every(node => Math.abs(node - x) > 3)) mark('minor-tick', x);
      }
      if (segment.compressed) mark('time-break', (segment.left + segment.right) / 2);
    }
    const last = layout.stamps.findLastIndex(time => time !== null);
    if (last >= 0) {
      const first = new Date(layout.first);
      const month = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
      let previous = -100;
      for (let i = 0; +month <= layout.stamps[last] && i < 2400; i++, month.setUTCMonth(month.getUTCMonth() + 1)) {
        const x = positionAtTime(layout, +month);
        if (x < 0 || x - previous < 64 || layout.positions.some(node => Math.abs(node - x) < 72)) continue;
        mark('time-tick', x); previous = x;
      }
    }
    collections.forEach((_, index) => mark('collection-node', layout.positions[index]));
  }
  function measure(nextWidth, nextHeight, nextSources, nextRiverTop) {
    const anchor = layout && timeAtPosition(layout, viewport.scrollLeft + width / 2);
    const fraction = layout && layout.width > width ? viewport.scrollLeft / (layout.width - width) : 0;
    width = nextWidth; height = nextHeight; sources = nextSources; riverTop = nextRiverTop;
    base = clamp(width * .29, 170, 500);
    const sizes = photos.map(photo => photoSize(photo, base, height));
    const maxWidth = Math.max(...sizes.map(size => size.width));
    const scale = Math.min(STORY.scale, height * .24 / Math.max(...sizes.map(size => size.height + 10)));
    axisCardWidth = maxWidth * scale;
    layout = timelineLayout(collections.map(collection => collection.time), axisCardWidth, width, zoom);
    const previewHeight = Math.max(...sizes.map(size => (size.height + 10) * scale * .56 + 28
      + projectedWidth(size.height + 10, size.width + 10, STORY.fan, scale) / 2)) + 44;
    const wasHidden = scene.hidden;
    scene.hidden = false;
    const heading = headingCopy;
    axisY = Math.max(height * .52, heading.offsetTop + heading.offsetHeight + previewHeight + 14);
    scene.hidden = wasHidden;
    scene.style.setProperty('--axis-y', `${axisY}px`);
    controls.forEach((control, index) => {
      control.style.left = `${layout.positions[index]}px`;
      control.style.width = `${maxWidth * scale * 1.2 + 30}px`;
      control.style.setProperty('--preview-height', `${previewHeight}px`);
    });
    drawAxis();
    quietUntil = performance.now() + 200;
    if (entries.length) { viewport.scrollLeft = anchor === null || anchor === undefined ? fraction * (layout.width - width) : positionAtTime(layout, anchor) - width / 2; reconcile(); }
  }
  function reconcile() {
    const original = new Map(sources.map(source => [source.file, source]));
    entries.forEach(entry => {
      const source = original.get(entry.file), index = files.indexOf(entry.file);
      const size = photoSize(entry.photo, base, height);
      entry.source = source ? fullRevealPose(source, 1, height)
        : fullRevealPose({ x: width + size.width / 2 + index * size.width * .2, y: 0,
          width: size.width + 10, height: size.height + 10, angle: [-8, 5, -4, 7][index % 4], scale: 1 }, 1, height);
      entry.baseX = source?.baseX ?? size.width / 2 + 5;
      entry.baseY = source?.baseY ?? riverTop + size.height / 2 + 5;
      if (entry.added) entry.card.style.width = `${size.width + 10}px`;
    });
  }
  function enter() {
    const originals = new Map(sources.map(source => [source.file, source.card]));
    const context = gatheringContext(collections, sources.map(source => fullRevealPose(source, 1, height)), width);
    orders = context.orders;
    // Five visible members convey the stack; full membership remains in its label/source pool.
    const visibleFiles = new Set(orders.flatMap(order => order.slice(0, 5)));
    sources.forEach(source => visibleFiles.add(source.file));
    entries = photos.filter(photo => visibleFiles.has(photo.id)).map(photo => {
      let card = originals.get(photo.id) ?? retained.get(photo.id);
      const added = !originals.has(photo.id);
      if (!card) {
        card = document.createElement('figure'); card.className = 'story-photo';
        card.style.left = '0'; card.style.top = '0';
        const image = new Image(); image.width = photo.width; image.height = photo.height; image.alt = photo.alt;
        image.loading = 'lazy'; image.decoding = 'async';
        setPhotoSource(image, photo.src, SIZES.card);
        card.append(image);
      }
      if (!card.isConnected) river.append(card);
      const image = card.querySelector('img');
      if (added && image.loading !== 'lazy' && (!image.naturalWidth || card.style.visibility === 'hidden') && !card.classList.contains('failed')) {
        card.style.visibility = 'hidden';
        const fail = () => { if (!stopped && card.isConnected) { card.classList.add('failed'); status.textContent = copy.fallback; } };
        const timer = setTimeout(fail, 7000); timers.add(timer);
        image.decode().then(() => { if (!stopped && !card.classList.contains('failed')) card.style.visibility = ''; }, fail)
          .finally(() => { clearTimeout(timer); timers.delete(timer); });
      } else if (added && image.loading === 'lazy') {
        // Lazy members only fetch near the viewport; reveal them as they arrive
        // instead of holding them behind a decode gate they have not entered.
        card.style.visibility = '';
        image.addEventListener('load', () => { if (!stopped && !card.classList.contains('failed')) card.style.visibility = ''; }, { once: true });
        image.addEventListener('error', () => { if (!stopped && card.isConnected) { card.classList.add('failed'); status.textContent = copy.fallback; } }, { once: true });
      }
      const group = collections.findIndex(collection => collection.files.includes(photo.id));
      const rank = orders[group].indexOf(photo.id);
      card.dataset.group = group;
      return { file: photo.id, photo, card, added, group, rank };
    });
    const used = new Set(entries.map(entry => entry.card));
    for (const card of retained.values()) if (!used.has(card) && !sources.some(source => source.card === card)) card.remove();
    retained.clear();
    reconcile(); scene.hidden = false;
    quietUntil = performance.now() + 200;
    viewport.scrollLeft = layout.positions[context.group] - width / 2;
  }
  function clear(keep = new Map()) {
    clearTimeout(snapTimer);
    stopScale();
    if (zoom !== 1) { zoom = targetZoom = 1; layout = timelineLayout(collections.map(collection => collection.time), axisCardWidth, width); drawAxis(); }
    viewer.close();
    for (const entry of entries) {
      if (entry.added && !keep.has(entry.file)) entry.card.remove();
      else { entry.card.style.transform = ''; entry.card.style.zIndex = ''; entry.card.style.opacity = ''; }
      entry.card.removeAttribute('data-residual'); entry.card.removeAttribute('tabindex'); entry.card.removeAttribute('role');
    }
    entries = []; scene.hidden = true; frozen = false;
    timers.forEach(timer => clearTimeout(timer)); timers.clear();
    if (scene.contains(document.activeElement)) document.activeElement.blur();
    selected = -1; controls.forEach(control => control.setAttribute('aria-pressed', 'false'));
    status.textContent = copy.timelineHint;
  }
  function paint() {
    const g = lastGather;
    const center = viewport.scrollLeft + width / 2;
    const nearest = layout.positions.reduce((best, x, i) => Math.abs(x - center) < Math.abs(layout.positions[best] - center) ? i : best, 0);
    const representatives = entries.filter(entry => entry.rank < 3);
    const riverEntries = [...representatives.filter(entry => entry.group >= nearest), ...representatives.filter(entry => entry.group < nearest)]
      .slice(0, Math.max(4, sources.length));
    const flow = closure.flow(riverEntries.map(entry => entry.source));
    const flowing = new Map(riverEntries.map((entry, index) => [entry, flow[index]]));
    const allSizes = entries.map(entry => entry.source.height);
    const scale = Math.min(STORY.scale, height * .24 / Math.max(...allSizes));
    entries.forEach(entry => {
      const { group, rank, card } = entry, source = entry.source;
      if (!closure.interactive) { card.removeAttribute('data-residual'); card.removeAttribute('tabindex'); card.removeAttribute('role'); }
      const fanAngle = [0, -STORY.fan, -STORY.fan / 2, STORY.fan / 2, STORY.fan][Math.min(rank, 4)];
      const target = { x: layout.positions[group] - viewport.scrollLeft + fanAngle / STORY.fan * source.width * scale * .08,
        y: axisY - source.height * scale / 2 - 28 - Math.abs(fanAngle) / STORY.fan * source.height * scale * .06,
        scale, angle: fanAngle, height: source.height * scale };
      const leader = entries.find(other => other.group === group && other.rank === 0)?.source ?? source;
      const follower = entries.find(other => other.group === group && other.rank === 1)?.source ?? source;
      const guide = leaderGuide(leader, follower, source.width, source.height, scale, target.y);
      let pose = reduced ? target : gatheringPose(g, Math.min(rank, 4), source, target, guide);
      let opacity = 1 + (([1, .8, .4, .16, .06][Math.min(rank, 4)]) - 1) * range(g, .65, 1);
      if (exit > 0) {
        const loose = flowing.has(entry);
        const t = range(exit, .08, loose ? .78 : 1);
        const destination = loose ? flowing.get(entry)
          : { x: target.x - width * .4 - rank * 30, y: target.y - height * .16 - rank * 18, scale: scale * .6, angle: source.angle };
        const from = target.x < -source.width && loose ? width + source.width + destination.x : target.x;
        const endX = loose ? destination.x : Math.min(destination.x, from - 32);
        const move = loose ? closure.residual(card, endX) : 0;
        pose = { x: from + (endX - from) * t, y: target.y + (destination.y - target.y) * t + move,
          scale: scale + (destination.scale - scale) * t, angle: fanAngle + (destination.angle - fanAngle) * t + move * .12 };
        opacity = loose ? opacity + (1 - opacity) * range(exit, .1, .8) : opacity * (1 - range(exit, .1, .7));
        if (loose && closure.interactive) {
          const extent = projectedWidth(source.width, source.height, pose.angle, pose.scale);
          card.dataset.residual = 'true'; card.tabIndex = pose.x - extent / 2 >= 4 && pose.x + extent / 2 <= width - 4 ? 0 : -1;
          card.setAttribute('role', 'button'); card.setAttribute('aria-label', `${entry.photo.alt} · ${copy.rippleLabel}`);
        } else { card.removeAttribute('data-residual'); card.removeAttribute('tabindex'); card.removeAttribute('role'); }
      }
      card.style.transform = `translate(${pose.x - entry.baseX}px, ${pose.y - entry.baseY}px) rotate(${pose.angle}deg) scale(${pose.scale})`;
      card.style.zIndex = String(5 - Math.min(rank, 4)); card.style.opacity = String(rank > 4 && !exit ? opacity * (1 - range(g, .5, 1)) : opacity);
    });
    scene.style.opacity = String((reduced ? 1 : range(g, .3, 1)) * (1 - range(exit, .08, .3)));
    const interactive = (reduced || g === 1) && exit <= .08;
    scene.inert = !interactive;
    if (!interactive) viewer.close();
    headingCopy.style.opacity = String(reduced ? 1 : range(g, .55, .85));
    const localReveal = reduced ? 1 : range(rawGather, .75, 1);
    localPanel.style.opacity = String(localReveal);
    localPanel.style.translate = reduced ? 'none' : `0 ${(1 - localReveal) * 12}px`;
    localPanel.style.visibility = localReveal > 0 && exit < .3 ? 'visible' : 'hidden';
    status.style.visibility = interactive ? 'visible' : 'hidden';
    viewport.style.cursor = interactive ? 'grab' : 'default';
    scene.dataset.progress = (reduced ? 1 : g).toFixed(3);
    const time = scaleAnchor === undefined ? timeAtPosition(layout, center) : scaleAnchor;
    readout.textContent = Math.abs(center - layout.positions[nearest]) < 1.1 ? controls[nearest].querySelector('time').textContent
      : time === null ? copy.unknownTime : new Date(time).toISOString().slice(0, 10).replaceAll('-', '.');
    controls.forEach((control, index) => {
      control.dataset.centered = String(index === nearest);
      const caption = control.querySelector('.collection-caption');
      const reveal = reduced ? 1 : range(rawGather, .65, 1);
      caption.style.opacity = String(reveal);
      caption.style.translate = reduced ? 'none' : `0 ${(1 - reveal) * 140}%`;
    });
  }
  return {
    measure,
    get axisY() { return axisY; },
    get active() { return entries.length > 0; },
    update(reveal, gather, nextSources, nextReduced, nextExit = 0) {
      reduced = nextReduced; exit = nextExit; rawGather = gather;
      if (stopped) return;
      if (gather === 0 && !reduced) { if (entries.length) clear(); lastGather = 0; return; }
      if (reveal === 0) { if (entries.length) clear(); return; }
      if (!entries.length) { sources = nextSources; enter(); }
      if (gather < .8) { frozen = false; stopScale(); if (zoom !== 1) applyScale(1); }
      const settled = gather >= .97 - 1 / Math.max(1, height * STORY.gather);
      lastGather = settled || frozen && gather >= .8 ? 1 : gather; paint();
    },
    stop(keepIds) {
      const keep = new Map(entries.filter(entry => keepIds?.has(entry.file)).map(entry => [entry.file, entry.card]));
      stopped = true; clear(keep); abort.abort(); controls.forEach(control => control.remove());
      axis.replaceChildren();
      return keep;
    },
  };
}
