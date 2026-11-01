# Pebril Web instructions

This repository is the deployable website and journal for Pebril. It is an independent git repository: the product itself (server, storage, API) lives elsewhere, and nothing outside this directory is part of the site build.

Superseded rule: this repository used to live inside the product repository as `pebril-web/`, with its QA harness and build toolchain outside the site directory. Both now live here (`qa/`, `tools/`) and the site files sit at the repository root.

## Minimal JavaScript, CSS and external resources

- Keep all JavaScript, CSS and external resources to the smallest necessary scope for the confirmed requirements. Reuse existing code and assets; avoid unused code, duplicate rules, speculative features and unnecessary dependencies.
- Modularize only where a distinct responsibility, actual reuse or independent verification warrants it. Keep module boundaries clear; avoid both monolithic files and excessive fragmentation, wrappers or single-use abstractions.
- Load only the code, styles, font families/weights/glyphs, images and other resources needed by the current experience. Defer noncritical resources and avoid importing entire libraries or asset collections for a small subset.
- Prefer native browser capabilities and existing dependencies. Any new external resource must justify its size, request count and maintenance cost, and follow the project's source, licensing and privacy rules. The site currently makes **zero third-party requests** (fonts are self-hosted and subset); keep it that way unless the owner approves otherwise.
- Keep source files readable. The site has no bundler: do not introduce a build stack solely for minification. Preserve required license notices (`assets/licenses/`).
- Preserve accessibility, required behavior, safe resource-failure recovery and meaningful verification while reducing code and resource cost.

## Design authority

- `docs/` is the design wiki; `docs/24-通用设计规范.md` (PEB-DES-SYSTEM-001) is the shared, executable spec for this site **and** the product front-end: colors, type roles, spacing, components, motion. Values in the site must come from it, not from the other direction.
- `loning.md` is the motion spec for the Prelude (PEB-DES-MOTION-001).
- Follow the wiki and the owner's later confirmed adjustments. When a design requirement, visual parameter, content/data choice, interaction rule or technical selection remains uncertain, ask the owner before implementing it. Do not silently turn candidates or prototype suggestions into confirmed decisions. Continue independent inspection and work covered by existing decisions while waiting; ask one focused decision question at a time.
- If an implementation and the spec disagree, fix the implementation; if the spec is wrong, update the spec in the same change and say so in `docs/变更记录.md`.

## Layout boundary

- Site files live at the repository root and are the only thing deployed: `index.html`, `src/`, `assets/`, `journal/`, `robots.txt`, `sitemap.xml`, `llms.txt`, `llm.txt`.
- `journal-src/` is the Hugo source for `journal/`; `journal/` is generated output and is committed so the site can be published without a build step.
- `docs/`, `qa/`, `tools/`, `AGENTS.md`, `loning.md` are not part of the deployed site.
- Tests, probes and screenshots belong in `qa/`; keep them out of the site directories. Browser binaries, `node_modules` and artifacts are gitignored.

## Build and verification

- Journal: `tools/bin/hugo --source journal-src --cleanDestinationDir` (Hugo v0.169, binary gitignored).
- After adding or renaming a Journal title, rerun `tools/build-kai-font.sh`; after changing Chinese brand/album copy, rerun `tools/build-brand-kai-font.sh`. Both write subsets that must be committed.
- The homepage opts into cross-document view transitions with an inline `<style>` whose bytes are pinned by a CSP hash in `index.html`. If you edit that block, recompute the hash (`sha256-…`) or the transition silently stops working.
- Tests: run serially from the repository root; parallel runs produce timing false negatives. See `qa/README.md` for the exact environment variables.
- Before delivering, run the full serial suite and confirm 56/56 (or the current total) plus the journal audit probe.

## Working boundary

Complete and verify work locally. Do not create GitHub issues, push, publish or otherwise write to remote services unless the owner explicitly authorizes it.
