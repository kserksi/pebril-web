import { clamp, range, sceneState, photoExposureTop, riverPositions, riverMotion, PHOTO_MOTION, loadingAmplitude, ringPoints, pathData } from './geometry.mjs';
import { createPhotoPool } from './photo-pool.mjs';
import { PHOTO_FILES, DEMO_COLLECTIONS } from './demo-photos.mjs';
import { STORY, storyState, fullRevealPose, photoSize } from './gathering-geometry.mjs';
import { createGathering } from './gathering.mjs';
import { createClosure } from './closure.mjs';
import { createCollectionViewer } from './collection-viewer.mjs';
import { createLocalInput, mergeLocalPhotos } from './local-photos.mjs';
import { applySampleSources, setPhotoSource, SIZES } from './photo-media.mjs';
import { copy } from './zh-CN.mjs';

const BRAND_CROSSFADE_MS = 1500;
// Slot poses for the photo river. The stylesheet carries the first four so the
// no-JS document still lays out; the script re-applies them and extends the
// pattern to extra slots on wide viewports.
const RIVER_POSES = [[-5, 45, -8], [20, 65, 5], [46, 50, -4], [73, 73, 7]];

function initialize() {
  const boot = window.pebrilBoot;
  if (!document.documentElement.classList.contains('prelude-boot')) return;
  clearTimeout(boot.timer);
  const root = document.documentElement;
  const prelude = document.querySelector('.prelude');
  const stage = document.querySelector('.stage');
  const paths = [...document.querySelectorAll('.rings path')];
  const brand = document.querySelector('.brand-position');
  const english = document.querySelector('.brand-en');
  const chinese = document.querySelector('.brand-zh');
  const caption = document.querySelector('.prelude-caption');
  const status = document.querySelector('.loading-status');
  const album = document.querySelector('.album');
  const copyElements = [...document.querySelectorAll('.album-copy > *')];
  const cards = [...document.querySelectorAll('.photo-river figure')];
  const river = document.querySelector('.photo-river');
  const examples = { example: true,
    photos: PHOTO_FILES.map((id, index) => ({ id, src: `./assets/photos/${id}`, width: 1920, height: 1080, example: true, alt: `Sample photograph ${index + 1}` })),
    collections: DEMO_COLLECTIONS.map(collection => ({ ...collection, time: collection.demoTime, example: true })),
  };
  let source = examples;
  const closure = createClosure(river, copy);
  const viewer = createCollectionViewer(copy);
  let pool = createPhotoPool(cards, source.photos);
  let gathering = createGathering(river, copy, source, closure, viewer);
  const photoFor = image => source.photos.find(photo => image.getAttribute('src') === photo.src || image.getAttribute('src').endsWith(photo.id));
  prelude.style.setProperty('--story-height', `${(1 + STORY.intro + STORY.reveal + STORY.gather + STORY.explore + STORY.exit) * 100}svh`);
  const navigation = [...document.querySelector('.navigation').children];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  root.lang = copy.locale;
  for (const element of document.querySelectorAll('[data-copy]')) {
    const value = copy[element.dataset.copy];
    if (value === undefined) continue;
    if (element.tagName === 'META') element.content = value;
    else element.textContent = value;
  }

  let state = 'loading';
  let actual = 0;
  let visual = 0;
  let failed = 0;
  let ready = false;
  let enteringAt = null;
  let idleAt = null;
  let ripples = [];
  let idleSeconds = 0;
  let motionSeconds = 0;
  let riverSeconds = 0;
  let riverCards = [];
  let riverWidths = [];
  let riverBases = [];
  let riverHeights = [];
  let previousCenters = [];
  let riverWidth = 0;
  let riverAnchor = 0;
  let layoutDirty = true;
  let lastProgress = -1;
  let lastStory = -1;
  let riverMetrics = [];
  let riverTop = 0;
  let lastInput = -Infinity;
  let width = innerWidth;
  let height = innerHeight;
  let travel = 1;
  let scroll = 0;
  let last = performance.now();
  let frame;
  let active = true;
  const start = boot.start;

  function setState(next) {
    if (state === next) return;
    state = next;
    root.dataset.state = next;
  }
  function sizeCard(card) {
    const image = card.querySelector('img'), photo = photoFor(image);
    if (!photo) return;
    const size = photoSize(photo, clamp(width * .29, 170, 500), height);
    card.style.width = `${size.width + 10}px`;
  }
  const local = createLocalInput(next => {
    const slots = cards.map(card => source.photos.indexOf(photoFor(card.querySelector('img'))));
    const nextSource = next ? mergeLocalPhotos(source, next, slots) : examples;
    pool.stop();
    const retained = gathering.stop(new Set(nextSource.photos.map(photo => photo.id)));
    source = nextSource;
    while (cards.length > source.photos.length) cards.pop().remove();
    const initial = next ? slots.map(slot => source.photos[slot]) : source.photos.slice(0, cards.length);
    for (const [index, photo] of initial.entries()) {
      const card = cards[index] ?? document.createElement('figure');
      let image = card.querySelector('img');
      card.dataset.exposure = ['.5', '.25', '.5', '.15'][index];
      card.style.setProperty('--x', `${[-5, 20, 46, 73][index]}%`);
      card.style.setProperty('--angle', `${[-8, 5, -4, 7][index]}deg`);
      // Swap in a fresh <img> when the source changes: a reused element keeps the
      // pixel density of the srcset candidate it last selected, which would shrink
      // a local photograph's intrinsic size.
      if (!image || image.getAttribute('src') !== photo.src) {
        const swap = new Image();
        swap.width = photo.width; swap.height = photo.height; swap.alt = photo.alt;
        swap.decoding = 'async';
        setPhotoSource(swap, photo.src, SIZES.card);
        if (image?.isConnected) image.replaceWith(swap);
        else card.append(swap);
        image = swap;
        card.classList.remove('failed');
      } else applySampleSources(image, photo.src, SIZES.card);
      if (!card.contains(image)) card.append(image);
      if (!card.isConnected) river.append(card);
      if (!cards.includes(card)) cards.push(card);
    }
    riverSeconds = 0;
    pool = createPhotoPool(cards, source.photos);
    gathering = createGathering(river, copy, source, closure, viewer, retained);
    measure();
    if (storyState(scroll, height).gather === 0) pool.prepare();
    schedule();
    return source;
  }, copy);
  function measure() {
    layoutDirty = true;
    width = document.documentElement.clientWidth;
    height = stage.clientHeight;
    travel = Math.max(1, Math.round(height * STORY.intro));
    root.dataset.introTravel = String(travel);
    riverWidth = river.clientWidth;
    cards.forEach((card, index) => {
      const [x, y, angle] = RIVER_POSES[index % RIVER_POSES.length];
      card.style.setProperty('--x', `${x}%`);
      card.style.setProperty('--y', `${y}%`);
      card.style.setProperty('--angle', `${angle}deg`);
      sizeCard(card);
    });
    const sample = cards.find(card => !card.classList.contains('failed'));
    if (!sample) {
      riverCards = []; riverMetrics = [];
      gathering.measure(width, height, [], height - river.clientHeight);
      closure.measure(width, height, gathering.axisY);
      return;
    }
    const angle = (Math.abs(parseFloat(getComputedStyle(sample).getPropertyValue('--angle'))) + PHOTO_MOTION.sway) * Math.PI / 180;
    const projectedWidth = Math.cos(angle) * sample.offsetWidth + Math.sin(angle) * sample.offsetHeight;
    // Add the minimum slots needed to respect the whitepaper's maximum 50% gap.
    const slotCount = gathering.active ? cards.length : Math.min(source.photos.length, Math.max(4, Math.ceil((riverWidth + projectedWidth + 40) / (sample.offsetWidth * 1.5))));
    while (cards.length > slotCount) cards.pop().remove();
    while (cards.length < slotCount) {
      const card = cards[cards.length % Math.min(4, cards.length)].cloneNode(true);
      card.classList.remove('failed');
      card.dataset.exposure = '0.5';
      pool.add(card);
      sizeCard(card);
      cards.push(card);
      river.append(card);
      if (ready) {
        card.style.visibility = 'hidden';
        deadline(card.querySelector('img').decode()).catch(() => card.classList.add('failed')).finally(() => {
          card.style.visibility = '';
          if (active) { measure(); schedule(); }
        });
      }
    }
    previousCenters = [];
    riverCards = cards.filter(card => !card.classList.contains('failed'));
    riverHeights = riverCards.map(card => card.querySelector('img').clientHeight);
    riverWidths = riverCards.map(card => {
      const baseAngle = parseFloat(getComputedStyle(card).getPropertyValue('--angle'));
      return Math.max(...[-PHOTO_MOTION.sway, PHOTO_MOTION.sway].map(sway => {
        const angle = (baseAngle + sway) * Math.PI / 180;
        return Math.abs(Math.cos(angle)) * card.offsetWidth + Math.abs(Math.sin(angle)) * card.offsetHeight;
      }));
    });
    riverCards.forEach(card => {
      const image = card.querySelector('img');
      const photo = { width: image.clientWidth, height: image.clientHeight,
        offsetY: card.clientTop + image.offsetTop + image.clientHeight / 2 - card.offsetHeight / 2 };
      card.style.top = `${photoExposureTop(river.clientHeight, card.offsetHeight, photo,
        parseFloat(getComputedStyle(card).getPropertyValue('--angle')), +card.dataset.exposure)}px`;
    });
    riverBases = riverCards.map(card => parseFloat(getComputedStyle(card).left) + card.offsetWidth / 2);
    if (!source.example) {
      const envelope = Math.max(...source.photos.map(photo => {
        const size = photoSize(photo, clamp(width * .29, 170, 500), height);
        return (size.width + 10) * Math.cos(8.6 * Math.PI / 180) + (size.height + 10) * Math.sin(8.6 * Math.PI / 180);
      }));
      riverWidths = riverCards.map(() => envelope);
    }
    riverAnchor = -riverWidth * .05 + (clamp(width * .29, 170, 500) + 10) / 2;
    riverTop = height - river.clientHeight;
    riverMetrics = riverCards.map((card, index) => ({ card,
      file: photoFor(card.querySelector('img'))?.id,
      width: card.offsetWidth, height: card.offsetHeight,
      baseX: riverBases[index], baseY: riverTop + parseFloat(card.style.top) + card.offsetHeight / 2,
      angle: parseFloat(getComputedStyle(card).getPropertyValue('--angle')),
    }));
    gathering.measure(width, height, riverMetrics.map((metric, index) => {
      const pose = riverMotion(riverSeconds, index, riverCards.length);
      return { ...metric, x: riverPositions(riverWidth, riverWidths, riverSeconds, riverAnchor)[index],
        y: metric.baseY + pose.bob * riverHeights[index], angle: metric.angle + pose.sway };
    }), riverTop);
    closure.measure(width, height, gathering.axisY);
  }
  function fallback() {
    active = false;
    pool.stop();
    gathering.stop();
    document.querySelector('.closure').hidden = false;
    document.querySelector('.closure').inert = false;
    document.querySelector('.closure').style.opacity = '';
    document.querySelector('.closure').style.visibility = '';
    document.querySelector('.stream-divider').setAttribute('hidden', '');
    clearTimeout(watchdog);
    cancelAnimationFrame(frame);
    root.classList.remove('enhanced', 'prelude-boot');
    delete root.dataset.state;
    brand.remove();
    for (const element of [...copyElements, ...cards]) {
      element.style.opacity = '';
      element.style.translate = '';
      element.style.visibility = '';
      for (const property of ['--river-offset', '--river-bob', '--river-sway']) element.style.removeProperty(property);
    }
    album.inert = false;
    document.querySelector('.album-copy').inert = false;
    album.style.visibility = '';
    navigation.forEach(element => { element.style.opacity = '1'; element.inert = false; });
  }
  // A failed enhancement must leave the semantic album and its links usable.
  const watchdog = setTimeout(fallback, 14000);
  root.classList.add('enhanced');
  setState('loading');
  document.body.append(brand);
  brand.style.position = 'fixed';
  measure();

  function deadline(task, milliseconds = 7000) {
    let timer;
    return Promise.race([
      task,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Resource timeout')), milliseconds); }),
    ]).finally(() => clearTimeout(timer));
  }
  async function prepareFont(href, family, text) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = href;
    try {
      await deadline((async () => {
        await new Promise((resolve, reject) => {
          stylesheet.onload = resolve;
          stylesheet.onerror = reject;
          document.head.append(stylesheet);
        });
        const faces = await document.fonts.load(`40px "${family}"`, text);
        if (faces.length === 0) throw new Error('Font fallback');
      })());
    } catch (error) {
      stylesheet.remove();
      throw error;
    }
  }
  const photos = [...document.querySelectorAll('.photo-river img')];
  const tasks = [
    document.fonts.load('40px "Manrope"', 'Pebril').then(faces => { if (faces.length === 0) throw new Error('Font fallback'); }),
    prepareFont('./assets/fonts/wenkai.css', 'LXGW WenKai', '溪石你的图片自有归处'),
    ...photos.map(async image => {
      try { await deadline(image.decode()); }
      catch (error) { image.closest('figure').classList.add('failed'); throw error; }
    }),
  ];
  let settled = 0;
  // Each task counts one prepared resource (success or explicit safe fallback), not bytes.
  Promise.all(tasks.map(task => deadline(task).catch(() => { failed++; }).finally(() => {
    actual = ++settled / tasks.length;
    status.textContent = `${copy.loading} · ${settled}/${tasks.length}`;
  }))).then(() => { ready = true; measure(); if (riverCards.length) pool.prepare(); });

  function progress() {
    return clamp(scroll / travel);
  }
  english.addEventListener('click', event => disturb(event, true));
  // One bounded wave packet per input, localized at its angle and propagated across the rings.
  function disturb(event, activation = false) {
    const now = performance.now();
    if (!active || state !== 'idle' || motion.matches || (!activation && now - lastInput < 180)) return;
    const bounds = document.querySelector('.rings').getBoundingClientRect();
    const scale = 1000 / bounds.width;
    const x = event?.clientX == null || event.detail === 0 && event.type === 'click' ? 0 : (event.clientX - bounds.left - bounds.width / 2) * scale;
    const y = event?.clientY == null || event.detail === 0 && event.type === 'click' ? 0 : (event.clientY - bounds.top - bounds.height / 2) * scale;
    const radius = Math.hypot(x, y);
    if (!activation && radius > 460) return;
    ripples = [...ripples.slice(-2), {
      age: 0,
      angle: radius < 10 ? -Math.PI / 2 : Math.atan2(y, x),
      radius: Math.min(400, radius),
      strength: activation ? 12 : 7,
    }];
    lastInput = now;
  }
  document.addEventListener('pointermove', event => disturb(event), { passive: true });
  document.addEventListener('pointerdown', event => {
    if (!english.contains(event.target)) disturb(event, true);
  }, { passive: true });
  english.addEventListener('focus', () => disturb(null, true));
  function schedule() {
    if (active && !document.hidden) { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); }
  }
  window.addEventListener('scroll', () => { scroll = window.scrollY; schedule(); }, { passive: true });
  window.addEventListener('resize', () => {
    if (!active) return;
    const tail = Math.max(0, scroll - travel - height * (STORY.reveal + STORY.gather + STORY.explore + STORY.exit));
    const previous = storyState(scroll, height);
    measure();
    scroll = Math.round(previous.intro < 1 ? travel * previous.intro
      : travel + height * (STORY.reveal * previous.reveal + STORY.gather * previous.gather + STORY.explore * previous.explore + STORY.exit * previous.exit) + tail);
    window.scrollTo({ top: scroll, behavior: 'instant' });
    schedule();
  }, { passive: true });
  window.addEventListener('pageshow', event => {
    if (!active) return;
    scroll = window.scrollY;
    measure();
    if (event.persisted && active) { cancelAnimationFrame(frame); last = performance.now(); frame = requestAnimationFrame(render); }
  });
  document.querySelector('.skip').addEventListener('click', event => {
    event.preventDefault();
    if (!idleAt) { enteringAt = performance.now() - BRAND_CROSSFADE_MS; idleAt = performance.now(); clearTimeout(watchdog); }
    scroll = travel;
    window.scrollTo({ top: travel, behavior: 'instant' });
    album.inert = false;
    document.querySelector('#album').focus({ preventScroll: true });
    schedule();
  });

  function render(now) {
    if (!active || document.hidden) return;
    const elapsed = now - last;
    const dt = Math.min(64, elapsed);
    last = now;
    visual = Math.min(actual, visual + (actual - visual) * (1 - Math.exp(-dt / 180)));
    if (actual === 1 && 1 - visual < .0005) visual = 1;
    const reduced = motion.matches;
    const appearance = reduced ? 1 : range(now - start, 0, 1000);
    if (ready && visual === 1 && appearance === 1 && enteringAt === null) {
      enteringAt = now;
      setState('entering');
    }
    const enter = enteringAt === null ? 0 : reduced ? 1 : range(now - enteringAt, 0, BRAND_CROSSFADE_MS);
    if (enter === 1 && idleAt === null) {
      idleAt = now;
      clearTimeout(watchdog);
      status.textContent = failed ? copy.fallback : copy.ready;
    }
    const p = idleAt === null ? 0 : progress();
    if (idleAt !== null) setState(p > .001 ? 'exiting' : 'idle');
    const story = idleAt === null ? { reveal: 0, gather: 0, explore: 0, exit: 0 } : storyState(scroll, height);
    if (p >= 1 && story.gather === 0 && !reduced) riverSeconds += elapsed / 1000;
    closure.update(story.exit, width, height, dt, reduced);
    const riverCenters = riverPositions(riverWidth, riverWidths, riverSeconds, riverAnchor);
    riverCards.forEach((card, index) => {
      if (story.gather === 0 && previousCenters[index] !== undefined && riverCenters[index] - previousCenters[index] > riverWidth / 2) { pool.recycle(card); if (!source.example) { measure(); schedule(); } }
      const pose = riverMotion(riverSeconds, index, riverCards.length);
      card.style.setProperty('--river-offset', `${riverCenters[index] - riverBases[index]}px`);
      card.style.setProperty('--river-bob', `${pose.bob * riverHeights[index]}px`);
      card.style.setProperty('--river-sway', `${pose.sway}deg`);
    });
    previousCenters = riverCenters;
    if (!gathering.active && story.gather === 0 && !reduced) riverCards.forEach((card, index) => {
      const metric = riverMetrics[index], drift = riverMotion(riverSeconds, index, riverCards.length);
      const initial = { ...metric, x: riverCenters[index], y: metric.baseY + drift.bob * riverHeights[index], angle: metric.angle + drift.sway };
      const pose = fullRevealPose(initial, story.reveal, height);
      card.style.transform = `translate(${pose.x - metric.baseX}px, ${pose.y - metric.baseY}px) rotate(${pose.angle}deg) scale(${pose.scale})`;
    });
    if (story.reveal > 0 || gathering.active) {
      const sources = riverMetrics.map((metric, index) => {
        const pose = riverMotion(riverSeconds, index, riverCards.length);
        return { ...metric, file: photoFor(metric.card.querySelector('img'))?.id,
          x: riverCenters[index], y: metric.baseY + pose.bob * riverHeights[index], angle: metric.angle + pose.sway };
      });
      const wasGathering = gathering.active;
      gathering.update(story.reveal, story.gather, sources, reduced, story.exit);
      if (wasGathering && !gathering.active) { measure(); pool.prepare(); schedule(); }
    }
    if (!document.hidden && (p < 1 || (story.gather === 0 || closure.interactive) && !reduced && riverCards.length > 0)) frame = requestAnimationFrame(render);
    const updateScene = p < 1 || lastProgress !== p || lastStory !== story.reveal + story.gather + story.explore + story.exit || layoutDirty;
    lastStory = story.reveal + story.gather + story.explore + story.exit;
    lastProgress = p;
    layoutDirty = false;
    if (!updateScene) return;
    root.dataset.exploration = story.explore.toFixed(3);
    root.dataset.exit = story.exit.toFixed(3);
    root.dataset.source = source.example ? 'example' : source.mixed ? 'mixed' : 'local';
    root.dataset.reveal = story.reveal.toFixed(3);
    root.dataset.gather = story.gather.toFixed(3);
    const scene = sceneState(p, cards.length);
    const move = scene.brand;
    const settle = scene.settle;
    if (p === 0) {
      motionSeconds += dt / 1000;
      ripples = ripples.filter(ripple => ripple.age < 4.3);
      for (const ripple of ripples) ripple.age += dt / 1000;
      if (idleAt !== null) idleSeconds += dt / 1000;
    }
    const breath = !reduced && idleAt !== null ? Math.sin(idleSeconds * Math.PI / 3) * .012 * settle : 0;
    const amplitude = !reduced && idleAt === null ? loadingAmplitude(visual) : 0;
    const seconds = motionSeconds;
    const ringOpacity = appearance * scene.line;
    stage.style.setProperty('--mist-opacity', String(appearance * scene.mist * (1 - .4 * visual)));
    paths.forEach((path, index) => {
      const geometryProgress = reduced ? 0 : p;
      path.setAttribute('d', pathData(ringPoints(index, geometryProgress, seconds, amplitude, breath, reduced ? [] : ripples, settle)));
      // At the merged state, one original path remains; overlapping strokes never darken the line.
      path.style.opacity = String(ringOpacity * (index === 2 ? 1 : 1 - scene.merged));
    });
    const navY = width <= 600 ? 36 : 44;
    brand.style.top = `${height / 2 + (navY - height / 2) * move}px`;
    const baseSize = clamp(width * .05, 40, 72);
    english.style.fontSize = `${baseSize + (22 - baseSize) * move}px`;
    english.style.opacity = String(appearance * enter * (1 - range(story.reveal, 0, .5)));
    brand.style.visibility = story.reveal >= .5 ? 'hidden' : 'visible';
    chinese.style.opacity = String(appearance * (1 - enter));
    english.tabIndex = idleAt !== null && story.reveal < .5 ? 0 : -1;
    root.classList.remove('prelude-boot');
    caption.style.opacity = String(1 - range(p, 0, .24));
    caption.style.visibility = p > .25 ? 'hidden' : 'visible';
    album.style.visibility = scene.copy[0] > 0 ? 'visible' : 'hidden';
    album.inert = p < .9;
    copyElements.forEach((element, index) => {
      const reveal = scene.copy[index];
      element.style.opacity = String(reveal * (reduced && story.reveal > 0 ? 0 : 1 - range(story.reveal, 0, .6)));
      element.style.translate = reduced ? 'none' : `0 ${(1 - reveal) * 16}px`;
    });
    album.classList.toggle('cue-visible', scene.copy.at(-1) > 0 && story.reveal < .6);
    document.querySelector('.album-copy').inert = story.reveal > .6;
    cards.forEach((card, index) => {
      const reveal = scene.photos[index];
      if (!gathering.active) card.style.opacity = String(reveal);
      card.style.translate = reduced ? 'none' : `${(1 - reveal) * (index % 2 ? 12 : -12)}px ${(1 - reveal) * 32}px`;
    });
    navigation.forEach(element => {
      element.style.opacity = String(scene.navigation * (1 - range(story.reveal, 0, .5)));
      element.inert = p < .9 || story.reveal >= .5;
    });
    root.dataset.progress = p.toFixed(3);
    root.dataset.actual = actual.toFixed(3);
    root.dataset.visual = visual.toFixed(3);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && active) { cancelAnimationFrame(frame); last = performance.now(); frame = requestAnimationFrame(render); }
  });
  motion.addEventListener('change', () => { last = performance.now(); layoutDirty = true; schedule(); });
  window.addEventListener('error', fallback, { once: true });
  window.addEventListener('pagehide', () => { viewer.close(); cancelAnimationFrame(frame); clearTimeout(watchdog); local.release(); });
  frame = requestAnimationFrame(render);
}

initialize();
