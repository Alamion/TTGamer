# Implementation Plan: Point trackers and Force Points

**Branch**: `testing` (spec directory `020-point-trackers`) | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/020-point-trackers/spec.md`; approved prototype
[prototype.html](./prototype.html)

## Summary

Everything extends the spec 018/019 tracker and the existing resource primitive; no new element.

- **Clicks.** The molecule's `onMark` takes a click description (`{ brush }` or `{ layer }`);
  the right click asks for the outline layer on every tracker that has outlines (R2).
- **Fill from the start.** Own trackers gain `fromStart` and `fillInside`; a pure run write marks
  boxes 1…N of one layer and clears the rest of it, reusing spec 019's `writeLayer` (R1, R3).
- **Count.** `totalReads: 'deepest' | 'count'`; the model prints "filled / framed" (R4).
- **Pools.** A pool `resource` primitive gains a `poolTracker` display option and a `maxMinFrom`
  formula. A pure `poolTracker.ts` builds a `TrackerModel` from `{ current, max }` and maps clicks
  to the dots' clamps; the molecule gets a `row` display, 16px boxes, and locked boxes in a
  darker shade of their mark (R5–R7).
- **Editor.** New toggles and the total choice in `TrackerSettings`; a Display choice and a small
  `PoolTrackerSettings` in `PrimitiveConfig`; `maxMinFrom` joins formula checks (R8).
- **Star Wars.** The full sheet's two Force Points rows become one tracker node (R9).
- **Storybook and docs** (R10).

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5, Zod 3, Tailwind 3 + clsx, Lucide. No new
dependency.

**Storage**:

- `TrackerFieldSchema` gains `fromStart`, `fillInside`, `totalReads`, all with defaults.
- `TRACKER_PALETTE_FILLS` gains `primary`.
- `PrimitiveNodeSchema` gains optional `poolTracker` and `maxMinFrom`.
- Template values and document data are unchanged; `TEMPLATE_SCHEMA_VERSION` and store versions
  stay (additive changes).

**Testing**:

- Vitest rule tests: run writes (both layers, brush, fillInside, gaps, lengths), count totals,
  `markPool` clamps (minimums, raise-max, lowered maximum, limit), `poolTrackerModel`.
- Schema tests: older templates parse with defaults; `poolTracker` and `maxMinFrom` parse and
  formula checks reject bad `maxMinFrom`.
- Component tests: right click on own and two-layer trackers, native menu without outlines; pool
  tracker on a page (Row, locked boxes, read-only, same values as dots); editor settings.
- Storybook guard tags; Star Wars template test for the single Force Points node.
- `yarn verify:full` (docs, translations, shipped template).

**Target Platform**: browser, desktop and phone widths.

**Project Type**: web application (the sheet manager module of the Docusaurus site)

**Performance Goals**: one store write per click, as today; run writes are linear in the shown
levels (≤ `trackerLevelsMax`).

**Constraints**:

- No system conditionals: pools are found by binding kind and mode, the raise-max rule comes
  from the binding descriptor.
- The brief Star Wars sheet and every other shipped template stay as they are.
- English code and docs, with ru mirrors for the UI and the guide.

**Scale/Scope**:

- 3 tracker fields, 1 palette color, 2 primitive fields;
- 1 new pure module, 1 new bound component, 1 new editor component; molecule changes (click
  description, row display, dot size, locked boxes);
- about 25 strings; storybook variants; 1 docs section.

## Constitution Check

_GATE: checked before Phase 0 and re-checked after Phase 1._

| Principle                                    | Assessment                                                                                                                                                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                     | **Pass.** Changes stay in `sheet_manager`. The pool tracker reads the binding descriptor (`mode`, `maximum`, `currentRaisesMax`); only the Star Wars template file names Force Points.                                                                                            |
| II. Explicit Contracts at Boundaries         | **Pass.** Additive Zod fields with defaults; writes go through the existing document update and its schema. `data-model.md` and `contracts/tracker-ui.md` record the contracts.                                                                                                   |
| III. Pleasurable Cross-Module Interactions   | **Pass.** No hidden values are added; a bad `maxMinFrom` reports `formula-error` like `minFrom` and leaves the maximum unclamped below; the clamp notice shows as under the dots.                                                                                                 |
| IV. Fit-for-Purpose Code Quality             | **Pass.** One click description for all trackers; pool rules in one pure module mirroring the dots' clamps; the run write reuses `writeLayer`.                                                                                                                                    |
| V. Risk-Proportional Testing                 | **Pass.** Unit tests for every write rule and clamp; schema parse tests with older fixtures; component tests for the right click, Row, and locks; `yarn verify:full` last.                                                                                                        |
| VI. Consistent, Accessible Experience        | **Pass.** Right click is an extra path; keyboard users reach outlines through the brush. Locked boxes say "locked" in their name. The Row matches rating rows. Storybook variants and guard tags cover each new look; strings come from YAML in en and ru; the guide is mirrored. |
| VII. Performance as a Shared Budget          | **Pass.** No dependency or route; one write per click.                                                                                                                                                                                                                            |
| VIII. Respectful Use of Third-Party Material | **Pass.** No rules text; the Force Points minimum already exists in the shipped template.                                                                                                                                                                                         |

**Deviations**: none.

**Post-Phase-1 re-check**: unchanged. The pool tracker keeps the document's pool as the only
store, so dots and tracker pages agree by construction (SC-004).

## Project Structure

### Documentation (this feature)

```text
specs/020-point-trackers/
├── spec.md
├── prototype.html           # approved prototype
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── tracker-ui.md
├── checklists/requirements.md
└── tasks.md                 # /speckit-tasks
```

### Source Code (repository root)

```text
src/sheet_manager/
├── types/template.ts                    # fromStart, fillInside, totalReads; palette 'primary';
│                                        # PoolTrackerOverrideSchema; poolTracker + maxMinFrom; refine
├── features/sheet/
│   ├── data/
│   │   ├── trackerModel.ts              # TrackerClick; markTracker (brush/layer, run or cycle);
│   │   │                                # runTrackerMark; count total; model fromStart/hasOutlines/locked
│   │   ├── poolTracker.ts               # NEW: poolTrackerModel, markPool, PoolRules
│   │   └── trackerDefaults.ts           # 'points' set: fromStart + count
│   └── declarative/
│       ├── TrackerFieldControl.tsx      # onMark(click) → markTracker
│       ├── BuiltInTracker.tsx           # onMark(click): layer → toggle, brush → paint (fills only)
│       ├── PoolTracker.tsx              # NEW: bound pool tracker (bound.update)
│       ├── primitives.tsx               # PrimitiveResourceBody → PoolTracker when poolTracker set
│       ├── hooks.ts                     # maxMinFrom resolution
│       └── DeclarativeSheetView.tsx     # resolvedMaxMin into PrimitiveMaxState
├── components/
│   ├── stat-fields/Tracker.tsx          # click description, contextmenu, row display, dot size,
│   │                                    # locked boxes, 'primary' classes
│   └── dialogs/template-editor/
│       ├── TrackerSettings.tsx          # toggles + total choice; Accent color
│       ├── PrimitiveConfig.tsx          # Display: Dots / Tracker; maxMinFrom
│       ├── PoolTrackerSettings.tsx      # NEW: look, two marks, legend, count
│       └── draft.ts                     # maxMinFrom optional key + formula check
├── features/sheet/data/templateReferences.ts # maxMinFrom coordinates
├── systems/star-wars-wod/templates/character.ts # one Force Points tracker node
└── storybook/stories.ts                 # point trackers, pool row

translations/source/{en,ru}/ui/sheet/templates.yaml, tracks.yaml
docs/template-editor/elements.mdx + i18n/ru mirror
tests/sheet_manager/
├── tracker-rules.test.ts, tracker-schema.test.ts, tracker-field.test.tsx, tracker-brush.test.tsx,
│   tracker-builtin.test.tsx, template-editor tests, storybook.test.tsx          # extended
├── pool-tracker.test.ts                                                          # NEW: rules
└── pool-tracker.test.tsx                                                         # NEW: bound UI
```

Housekeeping when the work is done:

- the sheet-templates skill (tracker and primitive sections) and `src/sheet_manager/AGENTS.md`;
- `CHANGELOG.md` and `package.json` (minor);
- `TODO.md`: T-085 ✅.

**Structure Decision**: the existing layout; the only new files are the pool rules, the bound pool
tracker, and its editor panel.

## Complexity Tracking

No constitution violations to justify.
