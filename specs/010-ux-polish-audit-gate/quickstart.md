# Quickstart: validating this feature

Prerequisites: `yarn install` done, a dev server available on http://localhost:3000
(check for a running one before starting another).

## 0. Baseline before touching anything

```bash
yarn build                      # record the sheet route's JS asset sizes (SC-002)
yarn audit:dead-code            # expect: 1 duplicate export + 1 config hint, exit 1
```

Keep both outputs; the completion note compares against them.

## 1. Dead-code gate (T-030)

```bash
yarn audit:dead-code            # expect: clean, exit 0
yarn verify                     # expect: pass, audit included
```

Negative check — the gate must actually bite:

```bash
printf '\nexport const knipProbe = 1;\n' >> src/shared/utils/env.ts
yarn audit:dead-code            # expect: fails naming env.ts / knipProbe
git checkout -- src/shared/utils/env.ts
```

Also confirm `yarn verify:fast` did **not** gain the audit (it must stay fast).

## 2. On-demand 3D renderer (T-013)

```bash
yarn test tests/dice_roller     # lazy-load, once-per-session, and failure-path cases
yarn build                      # compare sheet-route assets against the baseline
```

In the browser, with DevTools → Network open:

1. Load `/`, `/docs/...`, and `/universal_sheet` without rolling — no chunk containing
   the 3D engine is requested.
2. Enable 3D dice and roll — the chunk is fetched once and the dice animate.
3. Roll again — no second fetch.
4. Set the network to offline, reload, and request a 3D roll — the roll still returns a
   result through the 2D path and a message appears instead of a dead end.

## 3. Searchable long catalog selects (T-064)

```bash
yarn test tests/sheet_manager
```

In the browser, on a sheet with a catalog-bound select of a long catalog (species,
vehicles, creatures, Force techniques):

1. The field is a search input, not a drop-down; typing a Russian or English fragment
   narrows it; `ё`/`е` and case do not matter.
2. Choose an entry — dependent fields filled from the catalog update as before.
3. A short bound select (≤ 12 options) and any multi-select still render as today.
4. Tab to the field and complete the whole selection without the mouse.
5. At 360 px width the suggestion list does not cover the input.

## 4. Clear control (T-055)

On a rating row that offers removal, in light and dark themes: the cross is visibly
destructive at rest, stronger on hover and on keyboard focus, the focus ring is visible,
and a screen reader announces the removal (not just a tooltip). Row width is unchanged,
including the narrow brief layouts.

## 5. Close out

```bash
yarn verify:full
```

Then update `TODO.md` (T-013, T-030, T-055, T-064), `CHANGELOG.md`, `AGENTS.md` §3/§10,
and the constitution's Verification Workflow with its Sync Impact Report.
