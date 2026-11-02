# tools

The local toolchain. The repository needs it only to **regenerate** assets; the site itself has no build step, and `journal/`, `assets/fonts/*.woff2` and `assets/photos/{480,960}/` are generated artefacts that are committed.

## Layout

| Path | Contents | Committed |
| --- | --- | --- |
| `build-brand-kai-font.sh` | WenKai subset for the homepage brand and album titles -> `assets/fonts/wenkai.woff2` + `wenkai.css` | Yes |
| `build-kai-font.sh` | WenKai subset for journal headings -> `journal-src/static/fonts/pebril-kai.woff2` | Yes |
| `resize-photos.py` | Responsive photograph variants -> `assets/photos/480/`, `960/` | Yes |
| `bin/hugo` | Hugo v0.169 static binary (builds `journal/`) | No (gitignored) |
| `fonts/LXGWWenKai-Regular.ttf` | Full WenKai 1.522 (25.5MB), the source for the subset scripts | No |
| `venvs/fonts/` | fonttools + brotli | No |
| `venvs/img/` | Pillow | No |

## One-time setup

```bash
cd /path/to/pebril-web

# Hugo (official static build, v0.169 linux/amd64)
mkdir -p tools/bin && tar -xzf hugo_0.169.0_linux-amd64.tar.gz -C tools/bin hugo

# Full WenKai (OFL-1.1)
mkdir -p tools/fonts && cp /path/to/LXGWWenKai-Regular.ttf tools/fonts/

# Both virtual environments
python3 -m venv tools/venvs/fonts && tools/venvs/fonts/bin/pip install fonttools brotli
python3 -m venv tools/venvs/img   && tools/venvs/img/bin/pip install pillow
```

Font and image licences are in `assets/licenses/` and `assets/fonts/OFL.txt`.

## Common commands

```bash
# Rebuild the journal (after writing or editing journal-src)
tools/bin/hugo --source journal-src --cleanDestinationDir

# Rebuild the heading subset after adding or renaming a journal heading
tools/build-kai-font.sh

# Rebuild the brand subset after changing Chinese brand or album copy
tools/build-brand-kai-font.sh

# Rebuild the 480/960 variants after replacing the sample photographs
tools/venvs/img/bin/python tools/resize-photos.py
```

The subset scripts read the actual characters of the current copy and headings; **commit the regenerated artefacts too**, or the live site falls back to the system Kai typeface.
