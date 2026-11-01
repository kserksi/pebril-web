"""Generate the responsive photo variants used by the site.

Reads assets/photos/*.webp (1920×1080 originals) and writes 480w and 960w
WebP copies into assets/photos/480/ and assets/photos/960/. The site's
src/photo-media.mjs builds its srcset from those two directories.

Run from anywhere with the local toolchain:
    tools/venvs/img/bin/python tools/resize-photos.py
"""
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent.parent / 'assets/photos'
targets = {480: 480, 960: 960}
before = after = 0
files = sorted(root.glob('*.webp'))
for src in files:
    before += src.stat().st_size
    with Image.open(src) as im:
        im = im.convert('RGB')
        for label, width in targets.items():
            out_dir = root / str(label)
            out_dir.mkdir(exist_ok=True)
            height = round(im.height * width / im.width)
            out = out_dir / src.name
            im.resize((width, height), Image.LANCZOS).save(out, 'WEBP', quality=82, method=6)
            after += out.stat().st_size
print(f'{len(files)} originals {before/1024/1024:.2f}MB -> {len(files)*2} variants {after/1024/1024:.2f}MB')
