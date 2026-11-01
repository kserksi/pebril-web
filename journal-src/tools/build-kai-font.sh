#!/usr/bin/env bash
# Rebuild the LXGW WenKai subset used by Journal headings.
#
# Journal titles are arbitrary text, so the homepage's hand-picked WenKai
# subset (assets/fonts/wenkai.css) cannot cover them. This script re-subsets
# the full WenKai face down to the characters the Journal actually renders,
# so headings never mix two typefaces glyph by glyph.
#
# Run after adding or renaming a title/heading:
#   journal-src/tools/build-kai-font.sh
#
# Requires the build toolchain in ../../.build (gitignored):
#   .build/tools/fonts/LXGWWenKai-Regular.ttf
#   .build/tools/fonts-venv/{bin/python,bin/pyftsubset}
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
repo="$(cd "$root/.." && pwd)"
font="$repo/../.build/tools/fonts/LXGWWenKai-Regular.ttf"
venv="$repo/../.build/tools/fonts-venv"
py="$venv/bin/python"
pyftsubset="$venv/bin/pyftsubset"

[ -f "$font" ] || { echo "missing font: $font" >&2; exit 1; }
[ -x "$py" ] || { echo "missing venv: $venv" >&2; exit 1; }

chars="$(mktemp)"
trap 'rm -f "$chars"' EXIT

"$py" - "$root" > "$chars" <<'PY'
"""Collect every character the Journal renders in the kai face."""
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
# Strings that live in templates / i18n rather than in content.
text = ["Pebril 手记 返回官网 English 跳到正文 全部手记 源码 状态：中文", "0123456789"]

for page in sorted(root.glob("content/*/*.md")):
    src = page.read_text(encoding="utf-8")
    front = re.search(r"^---\n(.*?)\n---", src, re.S)
    if front:
        title = re.search(r"^title:\s*\"?([^\"\n]+)\"?\s*$", front.group(1), re.M)
        if title:
            text.append(title.group(1))
    for line in src.splitlines():
        if re.match(r"^#{1,6}\s", line):
            text.append(line.lstrip("# ").strip())

seen, ordered = set(), []
for ch in "".join(text):
    if not ch.isspace() and ch not in seen:
        seen.add(ch)
        ordered.append(ch)
sys.stdout.write("".join(ordered))
PY

echo "glyph set: $(wc -m < "$chars") characters"

mkdir -p "$root/static/fonts"
"$pyftsubset" "$font" \
  --text-file="$chars" \
  --flavor=woff2 \
  --layout-features='' \
  --no-hinting \
  --drop-tables+=DSIG \
  --output-file="$root/static/fonts/pebril-kai.woff2"

ls -l "$root/static/fonts/pebril-kai.woff2"
