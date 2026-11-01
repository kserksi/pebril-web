import { PHOTO_FILES } from './demo-photos.mjs';
import { setPhotoSource, SIZES } from './photo-media.mjs';

// Keep one decoded replacement ready; swap only when its card recycles offscreen.
export function createPhotoPool(cards, photos = PHOTO_FILES.map(id => ({ id, src: `./assets/photos/${id}`, alt: `Sample photograph ${PHOTO_FILES.indexOf(id) + 1}` }))) {
  const files = photos.map(photo => photo.id);
  let next = cards.length;
  let pending = null;
  let stopped = false;
  let failures = 0;
  function reserve() {
    for (let count = 0; count < files.length; count++) {
      const filename = files[next++ % files.length];
      if (pending?.filename !== filename && !cards.some(card => card.querySelector('img').getAttribute('src').endsWith(filename))) return filename;
    }
    return null;
  }
  function assign(image, filename) {
    const photo = photos.find(photo => photo.id === filename);
    if (!photo) return;
    image.decoding = 'async';
    setPhotoSource(image, photo.src, SIZES.card);
    image.alt = photo.alt;
    image.width = photo.width ?? 1920; image.height = photo.height ?? 1080;
  }
  function prepare() {
    if (stopped || pending || failures >= files.length) return;
    const filename = reserve();
    if (!filename) return;
    const image = new Image();
    const candidate = { filename, image, ready: false };
    pending = candidate;
    const timer = setTimeout(() => reject(), 7000);
    function reject() {
      if (pending !== candidate || stopped) return;
      clearTimeout(timer);
      failures++;
      pending = null;
      prepare();
    }
    assign(image, filename);
    image.decode().then(() => {
      clearTimeout(timer);
      if (pending !== candidate || stopped) return;
      candidate.ready = true;
      failures = 0;
    }, reject);
    candidate.cancel = () => clearTimeout(timer);
  }
  return {
    prepare,
    add(card) { assign(card.querySelector('img'), reserve()); },
    recycle(card) {
      if (!pending?.ready || stopped) return;
      assign(card.querySelector('img'), pending.filename);
      pending = null;
      prepare();
    },
    stop() { stopped = true; pending?.cancel(); pending = null; },
  };
}
