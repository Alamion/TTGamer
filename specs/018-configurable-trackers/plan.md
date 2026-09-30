# Implementation Plan: Configurable trackers

**Branch**: `testing` (spec directory `018-configurable-trackers`) | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/018-configurable-trackers/spec.md`; approved prototype
[prototype.html](./prototype.html)

## Summary

Own and built-in trackers share one configuration and one renderer.

- **Own tracker.** A new `tracker` field type carries a `TrackerConfig`:
    - display;
    - mark kinds;
    - levels with values;
    - value column;
    - marks and text columns with copies;
    - total, lengths, and out.

    It stores a tagged `TrackerValue` in `templateValues`, keyed by stable level, mark, column, and
    copy ids (research R2, R3).

- **Built-in trackers.** Track primitives get an optional `tracker` override covering:
    - the display;
    - mark names, symbols, and fills;
    - per-level names and values, which keep the game's other values;
    - the value column;
    - extra page-stored columns;
    - the total.

    Marks stay in the document's data. The game fixes the level count, a computed length, the
    number of mark kinds, and the members (R4, R5).

- **One display setting.** It replaces `compact` and `trackLayout` for trackers. Legacy values
  are read through a fallback, with no rewrite (R6).
- **Shared rules and rendering.** Pure rules (cycle, total, out, folding) generalize `cohort.ts`
  (R7). Two adapters build a `TrackerModel` for one `Tracker` molecule, which replaces the
  table, strip, and cohort renderers.
- **Editor.** One `TrackerSettings` component serves both element kinds. A Source select switches
  between own values and bindings, and a value-loss report joins the pending-save confirmation
  (R8).
- **Storybook and docs.** The storybook gets a `trackers` story, bound tracker variants, and a
  `TrackerParity` widget. The editor guide and skill are updated (R12).

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5, Zod 3, Tailwind 3 + clsx, Lucide, and Radix
(the existing `ConfirmDialog`). No new dependency.

**Storage**:

- The template schema gains:
    - the `tracker` field;
    - the optional `PrimitiveNode.tracker`;
    - new `TEMPLATE_LIMITS` entries.
- `TEMPLATE_SCHEMA_VERSION` and the template file format stay at 3: every change is additive, and
  old files load unchanged.
- The document `templateValues` union gains `TrackerValue`.
- No store version bump and no data migration (FR-025).

**Testing**:

- Vitest:
    - pure tests: schema, rules, change report;
    - component tests: own tracker, built-in trackers, editor;
    - the parity test and the storybook guard.
- `yarn verify:full`, because the docs and translations change.

**Target Platform**: browser, desktop and phone widths. The table scrolls inside its own frame.

**Project Type**: web application (the sheet manager module of the Docusaurus site)

**Performance Goals**:

- One store write per box click, with 24 copies and 20 levels, as the cohort performance test
  checks today.
- The model is memoized per value and config.

**Constraints**:

- No system conditionals: mark names come from bindings.
- Built-in marks stay in the document data.
- No stored value is dropped without the editor saying so.
- English code and docs, with ru mirrors for the UI and the guide.

**Scale/Scope**:

- 1 new field type and 1 new primitive option;
- about 4 new pure modules: config defaults, rules, model adapters, change report;
- 1 new molecule, replacing 3 renderers;
- 1 settings component;
- about 60 strings;
- 1 story, 1 widget, and 1 docs section.

## Constitution Check

_GATE: checked before Phase 0 and re-checked after Phase 1._

| Principle                                    | Assessment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                     | **Pass.** Everything lives in `sheet_manager`. Game mark names are declared on `TrackBinding` by each system (R5), so generic code stays system-free. No `systems/<system>/` import is added to generic code.                                                                                                                                                                                                                                                                                                                           |
| II. Explicit Contracts at Boundaries         | **Pass.** Additive Zod schemas: old templates and documents parse unchanged (SC-003), and legacy options are read through one documented fallback (R4, R6). `TrackerValue` is tagged and validated at the write path. The contracts are in `data-model.md` and `contracts/tracker-ui.md`.                                                                                                                                                                                                                                               |
| III. Pleasurable Cross-Module Interactions   | **Pass.** No cross-module handoff changes: dice and docs do not read tracks today. Degradation is observable: an unreadable value reports `template-value-unreadable`, values hidden by a template change report `template-value-hidden` (FR-026a), and a rejected write reports `template-value-write-rejected` (R11). Value-dropping edits are confirmed first (FR-026).                                                                                                                                                              |
| IV. Fit-for-Purpose Code Quality             | **Pass.** The rules are pure and shared by both paths. One molecule replaces three renderers. The existing pipelines are reused: field registry, value validation, pending-save report, and `ConfirmDialog`.                                                                                                                                                                                                                                                                                                                            |
| V. Risk-Proportional Testing                 | **Pass.** Schema and persistence changes get parse tests, including legacy templates and documents. The rules get exhaustive unit tests, including folding and parity with `cohort.ts`. Component tests cover the sheet and editor flows. The existing track tests stay green. `yarn verify:full` runs last.                                                                                                                                                                                                                            |
| VI. Consistent, Accessible Experience        | **Pass.** The marks keep today's look, and fills use palette tokens (R9), so both themes work. Table headers have `scope="col"`, and icon buttons have `aria-label`. Boxes have accessible names with the level, copy, and mark. Everything is keyboard reachable. The storybook covers every variant, with a parity widget (FR-027). Strings come from YAML in en and ru, and the guide is in en and ru. The tracker is an editor-configurable template element, and built-in trackers gain options rather than a similar new element. |
| VII. Performance as a Shared Budget          | **Pass.** No dependency and no route. One write per click. The model is memoized, and the size is bounded by the limits (R10).                                                                                                                                                                                                                                                                                                                                                                                                          |
| VIII. Respectful Use of Third-Party Material | **Pass.** Mark and level names are game terms (Bashing, Lethal, Aggravated); no rules text is copied. No publisher notice is added or needed beyond the existing ones.                                                                                                                                                                                                                                                                                                                                                                  |

**Deviations**: none.

**Post-Phase-1 re-check**: unchanged.

- The data model is additive.
- The legacy count override is kept readable rather than rewritten (R4).
- `compact` keeps its meaning for non-track primitives (R6).

## Project Structure

### Documentation (this feature)

```text
specs/018-configurable-trackers/
├── spec.md
├── prototype.html           # approved prototype v2
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
│   ├── template.ts                 # TrackerConfig/TrackerOverride schemas; tracker field; PrimitiveNode.tracker;
│   │                               # table columns reject tracker; TEMPLATE_FIELD_TYPES; not in LIST_ITEM_TYPES
│   ├── templateLimits.ts           # tracker limits (R10)
│   └── templateValues.ts           # TrackerValue in TemplatePageValuesSchema; validate/coerce 'tracker' cases
├── diagnostics.ts                  # template-value-unreadable, template-value-hidden
├── systems/
│   ├── templateBindings.ts         # TrackBinding.marks
│   ├── wod-like/templateBindings.ts, wod-like/profile.ts   # Bashing/Lethal mark names
│   └── v5/ruleset/bindings.ts      # Superficial/Aggravated mark names
│   └── star-wars-wod/templates/character.ts   # health: tracker.total (FR-023)
├── features/sheet/
│   ├── data/
│   │   ├── tracker.ts              # NEW: defaults, ready sets, cycle, total, out, lengths, folding (R7)
│   │   ├── trackerModel.ts         # NEW: ownTrackerModel, builtInTrackerModel, trackerDisplayOf (R1, R6)
│   │   └── trackerChanges.ts       # NEW: trackerChangeReport (R8)
│   ├── declarative/
│   │   ├── fieldControls.tsx       # TrackerFieldControl (own values)
│   │   ├── primitives.tsx          # PrimitiveTrackBody → builtInTrackerModel + Tracker
│   │   ├── CohortTrack.tsx         # members via the model; rendering moves to Tracker
│   │   └── cohort.ts               # kept API, delegates to tracker.ts rules
│   └── registry/declarativeFieldRegistry.ts   # 'tracker' control
├── components/
│   ├── stat-fields/Tracker.tsx     # NEW molecule: table/strip/line, MarkBox, legend, copies, length
│   ├── stat-fields/ConditionTrack.tsx         # length buttons kept; table/strip replaced by Tracker
│   └── dialogs/
│       ├── TemplateEditorDialog.tsx           # tracker changes in the pending-save confirmation
│       └── template-editor/
│           ├── TrackerSettings.tsx            # NEW: all groups, own and built-in (contract)
│           ├── FieldEditor.tsx                # tracker → TrackerSettings; table column picker excludes it
│           ├── PrimitiveConfig.tsx            # track bindings → TrackerSettings (compact/trackLayout/track UI removed)
│           ├── AddElementMenu.tsx             # palette "Tracker" → own field
│           └── draft.ts                       # baseField('tracker'), source switch, draft issues
├── storybook/stories.ts            # trackers story; bound tracker with extra column + total
└── (docs widget) ElementStorybook.tsx         # TrackerParity

translations/source/{en,ru}/ui/sheet/templates.yaml, tracks.yaml
docs/template-editor/elements.mdx (Tracker) + i18n/ru mirror; docs/dev/storybook template-elements page
tests/sheet_manager/
├── tracker-schema.test.ts, tracker-rules.test.ts          # NEW
├── tracker-field.test.tsx, tracker-builtin.test.tsx       # NEW
├── tracker-parity.test.tsx                                # NEW
└── template-editor.test.tsx, storybook.test.tsx (extended); existing track tests updated where markup changes
```

Housekeeping when the work is done:

- the sheet-templates skill: the tracker section and the "New field type" checklist;
- `src/sheet_manager/AGENTS.md`;
- `CHANGELOG.md`: a minor version;
- `TODO.md`: T-078 marked ✅, plus the follow-ups:
    - formulas reading a tracker;
    - a square toggle look.

**Structure Decision**: this is the existing single-project layout.

- The rules and adapters sit in `features/sheet/data`, next to `listItemChanges.ts`.
- The molecule sits in `components/stat-fields`, next to `ConditionTrack.tsx`.
- The editor settings sit next to `PrimitiveConfig.tsx`.

## Complexity Tracking

No constitution violations to justify.
