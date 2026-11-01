# Pebril Website and Journal

The public-facing site for Pebril, a quiet, self-hostable photo library: a Prelude brand prologue, a photo river, a spring-rain gathering, a timeline explorer and a local-photo demo, closing into a short coda. A hand-built static site with no framework and no bundler.

**Pebril Website and Journal.** A zero-build static site for the Pebril project. This repository is independent from the product repository; it shares the project's design language through the design wiki: [**PEB-DES-SYSTEM-001 · Design system specification**](https://github.com/kserksi/pebril-web/wiki/24-Design-System-Spec).

- Repository: <https://github.com/kserksi/pebril-web> (`dev` develops, `main` is the published baseline)
- Site: <https://pebril.dev>
- Design wiki: <https://github.com/kserksi/pebril-web/wiki>

---

## What is here

| Path | Contents |
|---|---|
| `index.html` | Homepage: Prelude → album and photo river → spring-rain gathering → timeline → local photos → coda |
| `404.html` | Where a missing page lands: the same paper, two ways back |
| `src/` | Hand-written ES modules (no framework, no bundler); `photo-media.mjs` owns responsive sources, `boot.mjs` owns the first frame |
| `assets/` | Sample photographs (1920 originals plus 480/960 variants), self-hosted fonts, share card, font licences |
| `journal-src/` | Hugo source for the Journal (layouts, i18n, Chinese and English chapters, the Kai subset hook) |
| `journal/` | Built Journal output (static HTML/CSS/fonts/RSS/sitemap), committed so the site publishes without a build |
| `qa/` | Tests and monitoring: Playwright suites, perf/audit probes, screenshot artifacts (dependencies and artifacts are not committed) |
| `tools/` | Local toolchain: font subsets, responsive photo variants (binaries and venvs are not committed) |
| `scripts/` | `check-site.py`: static checks (local references, third-party requests, CSP hash, sitemap, robots, icons), the first gate in CI |
| `.github/` | CI and issue/pull-request templates |
| `loning.md` | Motion specification for the Prelude, PEB-DES-MOTION-001 |

The site does not bundle: it publishes native ES modules and hand-written CSS. Only the Journal needs a build step.

## Preview locally

```bash
cd /path/to/pebril-web
python3 -m http.server 4173 --bind 127.0.0.1
# http://127.0.0.1:4173/
```

Every site path is absolute (`/assets/…`, `/src/…`), so the server must start at the repository root and the site must be published at the domain root.

## Journal

```bash
tools/bin/hugo --source journal-src --cleanDestinationDir
```

Hugo v0.169 (the binary lives in `tools/bin/`, untracked). Output goes to `journal/`; Chinese and English editions, RSS, `sitemap.xml` and `hreflang` are all generated. Journal pages carry no scripts: page-to-page transitions are CSS View Transitions.

After adding or renaming a Journal title, rebuild the Kai subset or headings fall back to a system kai:

```bash
tools/build-kai-font.sh          # → journal-src/static/fonts/pebril-kai.woff2
tools/build-brand-kai-font.sh    # → assets/fonts/wenkai.woff2 (brand and album headings)
```

## Checks and tests

The fast gate (standard library only, no server needed):

```bash
python3 scripts/check-site.py
```

It verifies that every local reference exists, that no third-party resource slipped in, that the inline `<style>` CSP hash still matches, that `sitemap.xml` agrees with canonical URLs, that `robots.txt` and `llms.txt` point at the right places and that the icon files are present. When the Journal changed, rebuild it and confirm `git diff --exit-code -- journal` is empty.

The full regression suite (Playwright):

```bash
cd /path/to/pebril-web
LD_LIBRARY_PATH=$PWD/qa/libs/sysroot/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=$PWD/qa/browsers \
node --test --test-concurrency=1 qa/tests/*.test.mjs
```

- Run it **serially**: parallel runs make two or three timing-sensitive browser suites fail spuriously.
- A single suite: `node qa/tests/river.test.mjs`.
- Some suites drive a fake clock with `page.clock`; lazily loaded images only request once frames are advanced — check that before changing such a test.
- Details in [`qa/README.md`](qa/README.md). Screenshots go to `qa/artifacts/` (untracked).

## Regenerating assets

```bash
tools/venvs/img/bin/python tools/resize-photos.py   # assets/photos/{480,960}/, Pillow 13
```

Font subsets need the full Kai typeface and fonttools: place `LXGWWenKai-Regular.ttf` in `tools/fonts/`; the venv is described in `tools/README.md`. Licences for both are in `assets/licenses/`.

## Publishing

Upload the static files as they are — no Node, no database, no server-side language. Requirements:

- **Domain root**: site paths are absolute; a subdirectory will 404.
- **MIME**: `text/html`, `text/css`, `text/javascript` (`.mjs`), `image/webp`, `font/woff2`, `application/xml`.
- **Directory index and trailing slash**: `/journal` must 301 to `/journal/`.
- **HTTPS**: fonts and View Transitions both need a secure context (localhost and 127.0.0.1 excepted).
- **404 page**: serve `404.html` with status **404**, not 200.
- **Response headers**: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: frame-ancestors 'none'` (the in-page CSP comes from `<meta>`; `frame-ancestors` must be a header), `no-cache` for HTML, long caching for `/assets/`.
- Do not publish `journal-src/`, `qa/`, `tools/`, `scripts/`, `.github/`, `CONTRIBUTING.md`, `SECURITY.md`, `loning.md` — only the site files.

## Contributing

Conventions and checklists live in [`CONTRIBUTING.md`](CONTRIBUTING.md); report security issues privately ([`SECURITY.md`](SECURITY.md)). Commits use an English conventional prefix; development happens on `dev`.

## Relationship to the product

The Pebril product itself (Go service, storage, API) lives in another repository. This one is its public site and Journal; both share one design language, defined in the design wiki — colours, type roles, spacing, components and motion — which the product front-end implements against.

## Licence

[MIT](LICENSE) © 2026 kserksi. Sample photographs and fonts are covered in `assets/licenses/`.
