# Contributing to Pebril Web

Internal contributor guidance for this repository. It is not part of the published site.

This repository holds the Pebril website (`index.html`, `src/`, `assets/`, `journal/`) and the Journal's Hugo source (`journal-src/`), plus the design wiki in `docs/`. The product itself lives in a separate repository; nothing here serves API traffic.

## Propose focused changes

Open an issue describing the problem and the expected behavior before changing structure, the design tokens or the Journal build. Keep unconfirmed requirements as proposals.

Use `dev` for normal development and open pull requests against it. `main` holds the published baseline; a newer `dev` state does not authorize merging or publishing it. Keep changes focused, explain the visible effect, and update the affected documentation in `docs/` in the same change.

Work inside WSL2 on its native filesystem. Do not use Windows-mounted project or cache paths for builds, tests or Git operations.

## Design authority

`docs/24-通用设计规范.md` (PEB-DES-SYSTEM-001) is the shared spec for this site and for the product front-end: colour, type roles, spacing, components, motion. `loning.md` covers the Prelude motion. If an implementation disagrees with the spec, fix the implementation; if the spec is wrong, change it in the same commit and record why in `docs/变更记录.md`.

## Checks

Run the checks that match the change; do not claim a check ran when it did not.

- Every change: `python3 scripts/check-site.py` (local links, third-party references, CSP hash, sitemap agreement, icons).
- Journal or `docs/` changes: rebuild and check for drift with `tools/bin/hugo --source journal-src --cleanDestinationDir` followed by `git diff --exit-code -- journal`; after renaming a title rerun `tools/build-kai-font.sh` and commit the regenerated subset.
- Copy or brand-glyph changes: rerun `tools/build-brand-kai-font.sh` and commit `assets/fonts/wenkai.woff2` with `wenkai.css`.
- Behaviour, motion or layout changes: run the full serial suite from the repository root and confirm the current total passes. See `qa/README.md` for the environment variables; parallel runs produce timing false negatives.
- Deploy-relevant changes: `qa/probes/deploy-check.mjs` against a clean checkout, as described in `qa/README.md`.

## Commit and report

Commit messages use a conventional prefix in English (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `perf:`). Keep internal design notes and agent documents out of the deployed site; they belong in `docs/` (not published) or stay local.

Report a bug with the page URL, browser and version, viewport or device, reproduction steps and expected versus actual behavior. Never attach credentials, private photos or unredacted logs.

## Dependencies and assets

Prefer native platform capabilities and existing assets. The published pages make **no third-party requests**: fonts are self-hosted subsets and images are served from `assets/`. Any new external reference needs the owner's approval and a review of size, request count, licensing and privacy.

Generated assets (font subsets, photo variants, `journal/`) are committed so the site can be published without a build step. Record the script that produced them in `tools/README.md` when you add one.

## Security

Report suspected vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Do not post exploit details in a public issue.
