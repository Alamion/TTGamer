# Implementation Plan: Tracker brush and two layers

**Branch**: `testing` (spec directory `019-tracker-brush-layers`) | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/019-tracker-brush-layers/spec.md`; approved prototype
[prototype.html](./prototype.html) (outline look "Ring outside")

## Summary

Both parts extend the spec 018 tracker in place; no new element.

- **Brush.** The `Tracker` molecule keeps the brush as local state (one mark id or none). The
  legend renders buttons when the sheet is editable, and `onMark` gains an optional brush mark.
  Own trackers write with a new `paintTrackerMark`; built-in trackers with a `paintMark` next to
  `cohort.ts` `toggleMark`. Nothing about the brush is stored (R1, R2).
- **Layers.** A mark kind gains `layer: 'fill' | 'outline'` (default fill). A stored copy keeps
  today's `marks` record as the fill slot and gains an optional `outlines` record. One pure
  resolver reads both slots by each mark's current layer, so changing a mark's layer needs no
  data rewrite and every older value reads as fills (R3, R4).
- **Rules.** Cycling, total, out, folding, and hidden counts run per layer on resolved records:
  the "reading layer" is fill, or outline on a tracker with no fill marks (R5, R6).
- **Look.** Boxes shrink (table/strip 26px, one line 20px) and space out; an outline is a CSS
  `outline` with a transparent offset in the mark's color, so the gap never depends on the
  section's background (R7).
- **Editor.** `TrackerSettings` gets a Layer switch per mark (locked on built-in trackers), a new
  "Points: current and maximum" set, and the change report counts outlines (R8).
- **Storybook and docs.** New tracker variants and tags, the guide (en/ru), the skill, the module
  notes, and a spec 018 pointer (R9).

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5, Zod 3, Tailwind 3 + clsx, Lucide. No new
dependency.

**Storage**:

- `TrackerMarkKindSchema` gains `layer` with a `fill` default, so stored templates parse
  unchanged; `TrackerOverride` marks are unchanged (built-in trackers are fill-only).
- `TrackerCopyValueSchema` gains an optional `outlines` record with the same bounds as `marks`.
- `TEMPLATE_SCHEMA_VERSION`, the template file format, and the store versions stay as they are:
  every change is additive (FR-021).

**Testing**:

- Vitest: rule tests (resolver, paint, cycle per layer, total/out, per-layer fold, hidden counts),
  schema tests (old values and templates parse), component tests (brush on own and built-in
  trackers, read-only, Escape, two layers, accessible names), editor tests (layer switch, locked
  layer, change report with outlines), parity test extended with the brush, storybook guard.
- `yarn verify:full` (docs and translations change).

**Target Platform**: browser, desktop and phone widths.

**Project Type**: web application (the sheet manager module of the Docusaurus site)

**Performance Goals**: one store write per box click, as today; the resolver is linear in the
levels of a copy and runs inside the memoized model.

**Constraints**:

- No system conditionals; built-in trackers stay fill-only through the shared rules, not a
  system check.
- No stored mark is deleted by an editor change (FR-019).
- English code and docs, with ru mirrors for the UI and the guide.

**Scale/Scope**:

- 1 schema field on mark kinds, 1 optional record on stored copies;
- about 5 new or changed pure functions, 1 molecule change, 1 settings change;
- about 15 strings;
- storybook variants, 1 docs section update.

## Constitution Check

_GATE: checked before Phase 0 and re-checked after Phase 1._

| Principle                                    | Assessment                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                     | **Pass.** All changes stay in `sheet_manager`. Built-in trackers are fill-only because their model never offers an outline mark, not because of a system check.                                                                                                                                                                                                         |
| II. Explicit Contracts at Boundaries         | **Pass.** Additive Zod changes with defaults: older templates and values parse and read the same (SC-003). The write path still validates `TrackerValue`. Contracts are in `data-model.md` and `contracts/tracker-ui.md`.                                                                                                                                               |
| III. Pleasurable Cross-Module Interactions   | **Pass.** No cross-module handoff changes. Hidden outlines join the existing `template-value-hidden` report and the editor's save confirmation; a length switch that folds outlines asks first, as for fills.                                                                                                                                                           |
| IV. Fit-for-Purpose Code Quality             | **Pass.** One resolver feeds every rule, so each rule stays single-layer and unchanged in shape. The brush is local UI state in the molecule; no store or context is added.                                                                                                                                                                                             |
| V. Risk-Proportional Testing                 | **Pass.** Schema changes get parse tests with spec 018 fixtures; the resolver and per-layer rules get unit tests; component and editor tests cover the flows; the fodder-group parity test runs with the brush. `yarn verify:full` last.                                                                                                                                |
| VI. Consistent, Accessible Experience        | **Pass.** Legend buttons use `aria-pressed`; the brush has a `role="status"` message; box names list both marks; Escape ends the brush while focus is in the tracker. The outline uses the mark's palette color in both themes. Storybook variants and guard tags cover the brush and both layers (FR-025). Strings come from YAML in en and ru; the guide is mirrored. |
| VII. Performance as a Shared Budget          | **Pass.** No dependency or route; one write per click; bounded records (R4).                                                                                                                                                                                                                                                                                            |
| VIII. Respectful Use of Third-Party Material | **Pass.** No rules text; example names (Point, Maximum) are generic.                                                                                                                                                                                                                                                                                                    |

**Deviations**: none.

**Post-Phase-1 re-check**: unchanged. The resolver keeps storage and display apart, so the layer
switch in the editor never rewrites documents (R3).

## Project Structure

### Documentation (this feature)

```text
specs/019-tracker-brush-layers/
├── spec.md
├── prototype.html           # approved prototype ("Ring outside")
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
├── types/
│   ├── template.ts                  # TRACKER_LAYERS; TrackerMarkKindSchema.layer (default 'fill')
│   └── templateValues.ts            # TrackerCopyValueSchema.outlines
├── features/sheet/
│   ├── data/
│   │   ├── tracker.ts               # layerMarks resolver, reading layer, per-layer cycle; remap per layer
│   │   ├── trackerModel.ts          # copies carry fills + outlines; paintTrackerMark; hidden counts both slots;
│   │   │                            # stepTrackerLength/trackerLengthHidesMarks per layer
│   │   ├── trackerDefaults.ts       # markSet('points'); new marks are fills
│   │   └── trackerChanges.ts        # shown values via the resolver (outlines counted)
│   └── declarative/
│       ├── TrackerFieldControl.tsx  # onMark(…, brush) → paint or toggle
│       ├── BuiltInTracker.tsx       # onMark(…, brush) → paintMark on the game column, paint on extras
│       └── cohort.ts                # paintMark (set or clear one ConditionMark)
├── components/
│   ├── stat-fields/Tracker.tsx      # brush state, legend buttons + status, Escape; MarkBox fill + outline;
│   │                                # smaller boxes; MarkSwatch outline look
│   └── dialogs/template-editor/
│       ├── TrackerSettings.tsx      # Layer switch per mark (locked with game); "Points" set
│       ├── builtInTrackerSettings.ts# marks reported as fills
│       └── sourceNodes.ts           # built-in → own: marks become fills
├── storybook/stories.ts             # two-layer tracker, brush legends, built-in with legend
└── (tests) tests/sheet_manager/storybook.test.tsx tags

translations/source/{en,ru}/ui/sheet/templates.yaml (layer, points set), tracks.yaml (brush wording)
docs/template-editor/elements.mdx + i18n/ru mirror (layers, brush)
tests/sheet_manager/
├── tracker-rules.test.ts, tracker-schema.test.ts, tracker-changes.test.ts   # extended
├── tracker-field.test.tsx, tracker-builtin.test.tsx, tracker-parity.test.tsx # extended
└── tracker-brush.test.tsx                                                    # NEW: brush flows
```

Housekeeping when the work is done:

- the sheet-templates skill (tracker section) and `src/sheet_manager/AGENTS.md`;
- spec 018: a banner pointing to spec 019 for the legend and one-mark-per-box parts;
- `CHANGELOG.md` v3.17.0 and `package.json`;
- `TODO.md`: T-086 ✅.

**Structure Decision**: the existing layout; every change lands in the files spec 018 created.

## Complexity Tracking

No constitution violations to justify.
