// Read capture dates only. Pixel data stays with the browser's native image decoder.
export function exifDay(bytes) {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const start = bytes[0] === 69 && bytes[1] === 120 ? 6 : 0;
    const little = view.getUint16(start) === 0x4949;
    if (!little && view.getUint16(start) !== 0x4d4d) return null;
    const u16 = offset => view.getUint16(start + offset, little);
    const u32 = offset => view.getUint32(start + offset, little);
    if (u16(2) !== 42) return null;
    function directory(offset, nested = false) {
      const count = Math.min(u16(offset), 256);
      for (let i = 0; i < count; i++) {
        const at = offset + 2 + i * 12, tag = u16(at);
        if (tag === 0x8769 && !nested) {
          const day = directory(u32(at + 8), true);
          if (day) return day;
        }
        if (tag !== 0x9003 || u16(at + 2) !== 2 || u32(at + 4) < 19) continue;
        if (start + u32(at + 8) + u32(at + 4) > bytes.length) continue;
        const text = new TextDecoder().decode(bytes.subarray(start + u32(at + 8), start + u32(at + 8) + 19));
        const match = /^(\d{4}):(\d{2}):(\d{2}) \d{2}:\d{2}:\d{2}$/.exec(text);
        if (!match) continue;
        const day = `${match[1]}-${match[2]}-${match[3]}`;
        const date = new Date(`${day}T00:00:00Z`);
        if (Number(match[1]) >= 1 && Number.isFinite(+date) && date.toISOString().slice(0, 10) === day) return day;
      }
      return null;
    }
    return directory(u32(4));
  } catch { return null; }
}
export async function captureDay(file) {
  const read = async (offset, length) => new Uint8Array(await file.slice(offset, offset + length).arrayBuffer());
  const head = await read(0, 12);
  const text = bytes => new TextDecoder().decode(bytes);
  let offset, kind;
  if (head[0] === 255 && head[1] === 216) { offset = 2; kind = 'jpeg'; }
  else if (text(head.subarray(0, 4)) === 'RIFF' && text(head.subarray(8)) === 'WEBP') { offset = 12; kind = 'webp'; }
  else if (head[0] === 137 && text(head.subarray(1, 4)) === 'PNG') { offset = 8; kind = 'png'; }
  else return null;
  // Skip encoded pixels; inspect bounded EXIF chunks, never the complete image file.
  for (let i = 0; i < 512 && offset + 8 <= file.size; i++) {
    const header = await read(offset, 8);
    const view = new DataView(header.buffer);
    let size, dataAt, exif;
    if (kind === 'jpeg') {
      if (header[0] !== 255 || [0xda, 0xd9].includes(header[1])) break;
      if (header[1] === 255) { offset++; continue; }
      if (header[1] === 1 || header[1] >= 0xd0 && header[1] <= 0xd7) { offset += 2; continue; }
      size = view.getUint16(2) - 2; dataAt = offset + 4; exif = header[1] === 0xe1;
      offset = dataAt + size;
    } else {
      size = view.getUint32(kind === 'webp' ? 4 : 0, kind === 'webp');
      dataAt = offset + 8;
      exif = text(header.subarray(kind === 'webp' ? 0 : 4, kind === 'webp' ? 4 : 8)) === (kind === 'webp' ? 'EXIF' : 'eXIf');
      offset = dataAt + size + (kind === 'webp' ? size % 2 : 4);
    }
    if (size < 0 || dataAt + size > file.size) break;
    if (exif && size <= 1024 * 1024) {
      const bytes = await read(dataAt, size);
      if (kind !== 'jpeg' || text(bytes.subarray(0, 6)) === 'Exif\0\0') {
        const day = exifDay(bytes);
        if (day) return day;
      }
    }
  }
  return null;
}
export function groupLocal(photos) {
  const days = [...new Set(photos.map(photo => photo.day))].sort((a, b) => a === null ? 1 : b === null ? -1 : a.localeCompare(b));
  return days.map((day, index) => ({ id: `local-${index}`, time: day, example: false, files: photos.filter(photo => photo.day === day).map(photo => photo.id) }));
}
export function mergeLocalPhotos(source, additions, preferredSlots = []) {
  const photos = [...source.photos];
  const slots = [...new Set([...preferredSlots, ...photos.map((_, index) => index)])]
    .filter(index => photos[index]?.example);
  additions.forEach((addition, index) => {
    const photo = { ...addition, example: false };
    if (slots[index] !== undefined) photos[slots[index]] = photo;
    else photos.push(photo);
  });
  const remaining = new Set(photos.filter(photo => photo.example).map(photo => photo.id));
  const examples = source.collections.filter(collection => collection.example)
    .map(collection => ({ ...collection, files: collection.files.filter(id => remaining.has(id)) }))
    .filter(collection => collection.files.length);
  const collections = [...examples, ...groupLocal(photos.filter(photo => !photo.example))]
    .sort((a, b) => a.time === null ? 1 : b.time === null ? -1 : Date.parse(a.time) - Date.parse(b.time));
  return { photos, collections, example: false, mixed: examples.length > 0 };
}
export function createLocalInput(onChange, copy) {
  const panel = document.querySelector('.local-experience');
  const input = panel.querySelector('input');
  const status = panel.querySelector('.local-status');
  let urls = [], generation = 0;
  const release = values => values.forEach(url => URL.revokeObjectURL(url));
  async function choose(files) {
    if (!files.length) return;
    const current = ++generation, next = [], photos = [];
    input.disabled = true;
    status.textContent = copy.readingLocal;
    for (const file of files) {
      if (current !== generation) break;
      const url = URL.createObjectURL(file); next.push(url);
      try {
        const image = new Image(); image.src = url;
        await image.decode();
        if (current !== generation) break;
        const day = await captureDay(file).catch(() => null);
        photos.push({ id: url, src: url, width: image.naturalWidth, height: image.naturalHeight, day, alt: file.name });
      } catch { URL.revokeObjectURL(url); next.splice(next.indexOf(url), 1); }
    }
    if (current !== generation) { release(next); return; }
    input.disabled = false; input.value = '';
    if (!photos.length) { release(next); status.textContent = copy.noLocal; return; }
    const source = onChange(photos);
    urls.push(...next);
    const remaining = source.photos.filter(photo => photo.example).length;
    status.textContent = `${urls.length} ${copy.localReady} · ${remaining} ${copy.examplesRemaining}${photos.length < files.length ? copy.someUnsupported : ''}`;
    panel.querySelector('.restore-example').hidden = false;
  }
  input.addEventListener('change', () => choose([...input.files]));
  panel.addEventListener('dragover', event => { event.preventDefault(); panel.classList.add('dragging'); });
  panel.addEventListener('dragleave', () => panel.classList.remove('dragging'));
  panel.addEventListener('drop', event => { event.preventDefault(); panel.classList.remove('dragging'); choose([...event.dataTransfer.files]); });
  function restore() {
    generation++; onChange(null); release(urls); urls = [];
    input.disabled = false; input.value = ''; status.textContent = copy.restoredLocal;
    panel.querySelector('.restore-example').hidden = true;
  }
  panel.querySelector('.restore-example').addEventListener('click', restore);
  return { release() { if (urls.length || input.disabled) restore(); } };
}
