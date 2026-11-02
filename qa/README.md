# Pebril Web QA

Tests, performance monitoring, screenshot artefacts and the browser toolchain live here, apart from the site files: the site root (`index.html`, `src/`, `assets/`, `journal/`) contains only what gets deployed, and `qa/` is not published.

## Layout

| Path | Contents |
| --- | --- |
| `tests/` | 21 `node:test` suites (Playwright end-to-end plus pure geometry/profile assertions) |
| `probes/` | Monitoring scripts: performance budgets, journal audits, screenshot sweeps, frame comparison |
| `artifacts/` | Screenshots written by tests and probes (artefacts, gitignored) |
| `node_modules/` | Pinned Playwright 1.64.1 (the only copy, gitignored) |
| `browsers/` | chromium headless shell 1248 (gitignored) |
| `libs/sysroot/` | System libraries Chromium needs under WSL (`LD_LIBRARY_PATH` points here, gitignored) |

## Start a local preview

```bash
cd /path/to/pebril-web
python3 -m http.server 4173 --bind 127.0.0.1
```

When every refresh must pick up the latest files, use a small server that sends `Cache-Control: no-store` instead (any static server plus that header will do).

## Run the full suite (serial, about 6-7 minutes)

```bash
cd /path/to/pebril-web
LD_LIBRARY_PATH=$PWD/qa/libs/sysroot/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=$PWD/qa/browsers \
node --test --test-concurrency=1 qa/tests/*.test.mjs
```

- **Serial is required**: when run in parallel, `elastic-ruler`, `motion` and `visible-gathering` occasionally fail on timing (false positives under load; each passes alone).
- One suite at a time: replace the last line with `node qa/tests/river.test.mjs`.
- Screenshots go to `qa/artifacts/`; relative paths inside the suites are resolved as if started from the repository root (the directory holding `index.html`).
- Every suite starts from the **repository root**. Do not `cd qa` first, or relative paths and screenshot output will land in the wrong place.

## The probes kept in the repository

`qa/probes/` keeps only the five still in use; the other one-off debugging scripts were removed so no dead code with broken paths remains:

| Script | Purpose |
| --- | --- |
| `perf-probe.mjs` | Transfer bytes and request counts for the first screen and a full scroll |
| `audit-journal.mjs` | `lang`, `hreflang`, fonts and console for the four journal pages |
| `deploy-check.mjs` | Page-by-page 200s, console, external requests and internal links against a deploy copy |
| `vt-frames.mjs` | Frames from the cross-page transition, to compare with the settled frames in `qa/artifacts/` |
| `check-glyphs.mjs` | Whether the brand subset covers the current Chinese copy (lists missing characters) |

## Performance and audits

```bash
cd /path/to/pebril-web
LD_LIBRARY_PATH=$PWD/qa/libs/sysroot/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=$PWD/qa/browsers \
node qa/probes/perf-probe.mjs     # first-screen and full-scroll bytes and requests
node qa/probes/audit-journal.mjs  # lang/hreflang/fonts/console on the four journal pages
node qa/probes/vt-frames.mjs      # cross-page transition frames (compare with qa/artifacts/)
```

## Regenerate assets

The asset scripts live in `tools/` at the repository root, not in `qa/`:

- Responsive photographs (`assets/photos/480/`, `960/`): `tools/venvs/img/bin/python tools/resize-photos.py` (Pillow 13).
- Brand WenKai subset (site): `tools/build-brand-kai-font.sh`.
- Journal WenKai subset: `tools/build-kai-font.sh` (rerun after adding or renaming a heading, or titles fall back to KaiTi).

## Regression cover for the journal transition

`qa/tests/journal-transition.browser.test.mjs` proves the cross-document view transition with `pagereveal` plus animation names - `journal-arrive` inside the journal, `site-arrive` on the way back to the site - and runs `prefers-reduced-motion` separately. The site's `@view-transition` rule is inline in `index.html` (CSP hash): changing those bytes means recomputing the hash. After editing `journal-src/static/journal.css`, rebuild the journal.

## Conventions

- None of these files belong to the site; the whole of `qa/` can be left out of a deployment.
- Older documents mention `.qa/...` and `qa/pebril-web/...`; those describe the layout before the 2026-11-01 move. This file describes the current one.
