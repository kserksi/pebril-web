## Problem and resulting behavior

## Scope and documentation

Reference the relevant wiki page or spec section (`docs/24-通用设计规范.md`, `loning.md`). Identify proposed requirement changes separately.

## Validation

List the checks actually run and their results (`python3 scripts/check-site.py`, journal rebuild diff, pure or full serial suite, `qa/probes/deploy-check.mjs`). Explain what remains untested and why.

## Risks

Asset weight, third-party requests, CSP changes, font subsets, or behavior that only appears on a real device.

## Checklist

- [ ] No credentials, private photos, personal paths, logs, or temporary artifacts are included.
- [ ] `python3 scripts/check-site.py` passes.
- [ ] Regenerated assets (font subsets, photo variants, `journal/`) are committed with the source change.
- [ ] Documentation distinguishes implemented behavior from proposals.
- [ ] The pages still make no third-party requests.
