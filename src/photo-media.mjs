// Sample photographs ship as 1920×1080 originals plus 480/960 wide variants.
// Local photographs (file: blobs, data URLs) never match SAMPLE_DIR, so they
// keep their single source and no srcset is emitted for them.
const SAMPLE_DIR = './assets/photos/';

export const SIZES = {
  card: '(max-width: 600px) 172px, (min-width: 1725px) 500px, 29vw',
  viewer: '(max-width: 1200px) 92vw, 1100px',
};

export function sampleSrcset(src) {
  if (typeof src !== 'string' || !src.startsWith(SAMPLE_DIR)) return '';
  const name = src.slice(SAMPLE_DIR.length);
  if (!name || name.includes('/')) return '';
  return `${SAMPLE_DIR}480/${name} 480w, ${SAMPLE_DIR}960/${name} 960w, ${src} 1920w`;
}

export function applySampleSources(image, src, sizes) {
  const srcset = sampleSrcset(src);
  if (!srcset) return false;
  image.srcset = srcset;
  image.sizes = sizes;
  return true;
}

// Swap a card or viewer image in place. Sample sources get their responsive
// candidates; local photographs (blob:/data:) must drop stale ones, otherwise
// a previous srcset keeps winning over the new local file.
export function setPhotoSource(image, src, sizes) {
  if (!applySampleSources(image, src, sizes)) {
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
  }
  image.src = src;
}
