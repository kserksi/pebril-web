import { setPhotoSource, SIZES } from './photo-media.mjs';

export function createCollectionViewer(copy) {
  const dialog = document.querySelector('.collection-viewer');
  const title = dialog.querySelector('h2');
  const frame = dialog.querySelector('.viewer-frame');
  const status = dialog.querySelector('.viewer-status');
  const count = dialog.querySelector('.viewer-count');
  const close = dialog.querySelector('.viewer-close');
  const previous = dialog.querySelector('.viewer-previous');
  const next = dialog.querySelector('.viewer-next');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(.2,.75,.2,1)';
  let photos = [], index = 0, generation = 0, overflow = '', origin = null, anchor = null;
  let animations = [], closing = false;
  for (const [button, label] of [[previous, copy.previousPhoto], [next, copy.nextPhoto], [close, copy.closeViewer]]) button.setAttribute('aria-label', label);
  function cancelMotion() {
    animations.forEach(animation => animation.cancel()); animations = [];
  }
  function fit(image) {
    const chrome = dialog.offsetHeight - frame.offsetHeight;
    const width = image.naturalWidth || photos[index].width, height = image.naturalHeight || photos[index].height;
    const scale = Math.min(1, Math.min(1080, innerWidth - 74) / width, Math.max(24, innerHeight - 36 - chrome) / height);
    dialog.style.setProperty('--viewer-width', `${Math.max(220, width * scale) + 40}px`);
    dialog.style.setProperty('--viewer-height', `${height * scale}px`);
  }
  function originPose(image, bounds, closing = false) {
    const panel = dialog.getBoundingClientRect();
    // A viewer image whose bytes are not cached yet has no intrinsic size and
    // therefore no layout box; the flex frame is centred on the same point, so
    // it stands in for the first frame instead of producing a NaN transform.
    let box = image.getBoundingClientRect();
    if (!box.width || !box.height) box = frame.getBoundingClientRect();
    dialog.style.transformOrigin = `${box.x + box.width / 2 - panel.x}px ${box.y + box.height / 2 - panel.y}px`;
    const scale = closing ? Math.min(bounds.width / box.width, bounds.height / box.height) : bounds.width / box.width;
    return `translate(${bounds.x + bounds.width / 2 - box.x - box.width / 2}px, ${bounds.y + bounds.height / 2 - box.y - box.height / 2}px) scale(${scale})`;
  }
  async function show(value, opening = false) {
    if (closing) return;
    cancelMotion();
    const direction = value >= index ? 1 : -1;
    index = value;
    const current = ++generation, photo = photos[index], oldImage = frame.querySelector('img');
    const focused = document.activeElement;
    previous.disabled = index === 0; next.disabled = index === photos.length - 1;
    if (focused === next && next.disabled) previous.focus({ preventScroll: true });
    if (focused === previous && previous.disabled) next.focus({ preventScroll: true });
    count.textContent = `${index + 1} / ${photos.length}`;
    status.textContent = copy.loadingPhoto; frame.setAttribute('aria-busy', 'true');
    const image = new Image(); image.width = photo.width; image.height = photo.height;
    image.alt = photo.alt; image.decoding = 'async';
    setPhotoSource(image, photo.src, SIZES.viewer);
    if (opening) image.fetchPriority = 'high';
    if (opening) {
      frame.replaceChildren(image);
      fit({ naturalWidth: photo.width, naturalHeight: photo.height });
      dialog.dataset.motion = 'opening';
      if (!reduced.matches && origin) animations = [dialog.animate([
        { transform: originPose(image, origin), opacity: 0 }, { transform: 'none', opacity: 1 },
      ], { duration: 440, easing })];
    }
    try {
      await image.decode();
      if (current !== generation || !dialog.open) return;
      if (!opening) {
        dialog.dataset.motion = 'switching';
        if (!reduced.matches && oldImage) {
          animations = [oldImage.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-direction * 10}px)` }], { duration: 120, easing })];
          await Promise.allSettled(animations.map(animation => animation.finished));
          if (current !== generation) return;
        }
        const panel = dialog.getBoundingClientRect(), oldHeight = frame.offsetHeight;
        frame.replaceChildren(image); status.textContent = ''; fit(image);
        if (!reduced.matches) {
          const target = dialog.getBoundingClientRect();
          animations = [image.animate([{ opacity: 0, transform: `translateX(${direction * 12}px)` }, { opacity: 1, transform: 'none' }], { duration: 220, easing }),
            dialog.animate([{ width: `${panel.width}px`, height: `${panel.height}px` }, { width: `${target.width}px`, height: `${target.height}px` }], { duration: 220, easing }),
            frame.animate([{ height: `${oldHeight}px` }, { height: `${frame.offsetHeight}px` }], { duration: 220, easing })];
        }
      }
      status.textContent = '';
      await Promise.allSettled(animations.map(animation => animation.finished));
    } catch {
      if (current !== generation) return;
      frame.replaceChildren(); status.textContent = copy.unavailablePhoto;
    }
    if (current === generation) { frame.setAttribute('aria-busy', 'false'); dialog.dataset.motion = 'open'; }
  }
  async function dismiss() {
    if (!dialog.open || closing) return;
    closing = true; generation++; cancelMotion(); dialog.dataset.motion = 'closing';
    dialog.style.setProperty('--viewer-duration', '260ms'); dialog.classList.remove('is-visible');
    // Flush the backdrop style so its fade starts on this frame: the motion below
    // forces layout on the main thread and would otherwise delay the transition.
    void getComputedStyle(dialog, '::backdrop').backdropFilter;
    const image = frame.querySelector('img'), bounds = anchor?.isConnected ? anchor.getBoundingClientRect() : origin;
    if (!reduced.matches) {
      const transform = image && bounds ? originPose(image, bounds, true) : 'scale(.97)';
      animations = [dialog.animate([{ transform: 'none', opacity: 1 }, { transform, opacity: 0 }], { duration: 260, easing })];
      await Promise.allSettled(animations.map(animation => animation.finished));
    }
    if (closing && dialog.open) dialog.close();
  }
  previous.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  close.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('keydown', event => {
    if (closing || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const target = index + (event.key === 'ArrowRight' ? 1 : -1);
    if (target >= 0 && target < photos.length) show(target);
  });
  dialog.addEventListener('close', () => {
    generation++; photos = []; origin = anchor = null; closing = false; frame.replaceChildren(); cancelMotion();
    dialog.classList.remove('is-visible'); dialog.dataset.motion = 'closed';
    document.documentElement.style.overflow = overflow;
  });
  window.addEventListener('resize', () => {
    const image = frame.querySelector('img');
    if (dialog.open && image && !closing) { cancelMotion(); fit(image); }
  });
  return {
    open(collection, source, bounds, sourceImage) {
      photos = collection.files.map(id => source.find(photo => photo.id === id));
      title.textContent = collection.time ? collection.time.slice(0, 10).replaceAll('-', '.') : copy.unknownTime;
      origin = bounds; anchor = sourceImage; closing = false;
      window.scrollTo({ top: window.scrollY, behavior: 'instant' });
      overflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      dialog.style.setProperty('--viewer-duration', '440ms');
      dialog.showModal(); getComputedStyle(dialog, '::backdrop').backdropFilter;
      dialog.classList.add('is-visible'); show(0, true);
    },
    close() { if (dialog.open) { generation++; closing = false; cancelMotion(); dialog.close(); } },
  };
}
