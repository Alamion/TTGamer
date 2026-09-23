# Baselines (feature 010)

Captured on 2026-09-23 from the clean tree at commit `92b6e98` (T001–T003).

## Build — before

`yarn build`, 54.7 s, exit 0.

| Metric                                                   | Before                               |
| -------------------------------------------------------- | ------------------------------------ |
| `build/assets/js` total                                  | 10 MB across 87 chunks               |
| `main.*.js` (loaded on every route)                      | **1 437 367 B** (`main.412fcc20.js`) |
| Chunks containing `WebGLRenderer` (three.js)             | 1 — `main.*.js` only                 |
| Scripts referenced by `build/universal_sheet/index.html` | 1 — `main.*.js`                      |

So today the 3D engine and its physics sit inside the single main bundle that every
route downloads, which is exactly what SC-001 forbids.

## Dead-code audit — before

`yarn audit:dead-code`, exit 1:

```text
Duplicate exports (1)
TemplatePageValuesSchema|TemplateValuesBagSchema  src/sheet_manager/types/templateValues.ts
Configuration hints (1)
src/i18n/generated/**    knip.json  Remove from ignore
```

## Tests — before

`yarn test tests/dice_roller tests/sheet_manager`: 80 files, 907 tests, all passing.

## Build — after

`yarn build` after US1 (T014), exit 0.

| Metric                             | Before               | After                                              | Change                 |
| ---------------------------------- | -------------------- | -------------------------------------------------- | ---------------------- |
| `main.*.js` (every route)          | 1 437 367 B          | **792 588 B**                                      | −644 779 B (−44.9%)    |
| Chunk holding three.js / cannon-es | none (inside `main`) | `4593.*.js`, 607 353 B                             | split out              |
| HTML references to the 3D chunk    | n/a                  | 0 in `index.html` and `universal_sheet/index.html` | fetched on demand only |

The 3D chunk is referenced only from the webpack runtime and `main.*.js` as a dynamic
import target, so no page preloads or downloads it until a 3D roll asks for it (SC-001,
SC-002).

## Browser acceptance notes (T015, T023, T027)

Checked against `yarn serve` on port 3001 with `playwright-cli`.

- Sheet route loads with **0** requests for the 3D chunk; the first 3D roll fetches it once
  and a second roll fetches nothing. A removed chunk (simulated 404) produces a correct 2D
  result, the `3DDiceRolls` warning, and a retry on the next roll.
- React hydration warning #418 appears on the sheet route **before and after** this change
  (verified by rebuilding the stashed baseline), so it is pre-existing and out of scope.
- Panel rolls do not surface the roll toast in a production build, before or after this
  change — a pre-existing defect recorded as F-003 in `TOFIX.md`. The 3D-fallback notice is
  covered by `tests/dice_roller/components/renderer-3d-fallback-notice.test.tsx` instead.
- A creature sheet's `Bestiary entry` renders the searchable input; typing `wamp` and
  pressing Enter fills Species = Wampa. Keyboard-only selection took ~2 s of scripted
  interaction (SC-003 budget: 10 s). At 360 px the suggestion popover sits below the input
  (no overlap) and inside the viewport, with the input 294 px wide.
- The clear control renders at `rgb(185, 28, 28)` with opacity 0.5 at rest (8 instances on
  the creature sheet) and carries `aria-label="Remove"`. The hover/keyboard-focus
  intensification is asserted by class contract in `tests/sheet_manager/stat-dot-clear.test.tsx`.
