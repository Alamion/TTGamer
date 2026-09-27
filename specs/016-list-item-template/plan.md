# Implementation Plan: Custom list item template

**Branch**: `testing` (spec directory `016-list-item-template`) | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-list-item-template/spec.md`

## Summary

A custom list gets one entry template (`ListNode.item`, which is any field type except formula)
and a naming switch (`ListNode.named`). Each entry renders with the real field control, the same
way table cells already do.

- **Controls**: they gain three slots.
    - `nameSlot`: the typed name in the label position.
    - `rollLabel`: the name a rating's die roll uses.
    - `removeSlot`: the remove control, which each control places where it fits.
- **Storage**: an entry is `{id, label?, value?, detail?, pickLabel?}`. Old entries are already
  valid rating entries. A list without an item reads as a legacy named rating list in the dot
  style, with flags and a die.
- **Validation**: the write path checks changed entries against the item.
- **Editor**: the item is edited with `FieldEditor`. The draft model finds `list.item` by id.
- **Saving**: at save, a pure report counts the stored values and names a type or naming change
  would stop showing, and a confirmation asks first. Nothing stored is deleted.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5, Zod 3, Radix Dialog, Tailwind 3 + clsx,
and Lucide. No new dependency.

**Storage**: the template value bag in `documentStore`. Only the envelope list entry schema
widens (optional `detail` and `pickLabel`, an empty label, and any cell value). No store version
changes. Template and library files change only by optional properties, so their versions stay.

**Testing**:

- Vitest pure tests: coercion, the change report, write validation, and the legacy item.
- Component tests: every item type, named and unnamed, remove, catalog, and the legacy look.
- Editor tests.
- The storybook guard.
- `yarn verify:full`.

**Target Platform**: browser, desktop and phone widths

**Project Type**: web application (the sheet manager module of the Docusaurus site)

**Performance Goals**: a list of 1000 entries of any type edits without visible lag: memoized
entry rows, callbacks stable per id, and one write per edit.

**Constraints**:

- Existing templates and sheets render unchanged (SC-003).
- No stored value is deleted by a template change.
- No system conditionals.
- English code and docs, with ru mirrors for the UI and the guide.

**Scale/Scope**:

- 2 optional schema properties, 1 widened value schema, 3 control props;
- about 2 new pure helpers (coercion and the change report) and 2 small components (the entry
  row and the remove button);
- editor and save-flow changes;
- stories for 8 item types.

## Constitution Check

_GATE: checked before Phase 0 and re-checked after Phase 1._

| Principle                                    | Assessment                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                     | **Pass.** All changes are inside `sheet_manager` template code; system lists and system folders are untouched.                                                                                                                                                                                                                                |
| II. Explicit Contracts at Boundaries         | **Pass.** The entry shape is a Zod schema. The write path validates changed entries against the item field. Old templates, sheets, and files load without migration (R1, R2). The contracts are `data-model.md` and `contracts/list-item-ui.md`.                                                                                              |
| III. Pleasurable Cross-Module Interactions   | **Pass.** A type change never deletes data: values stay stored and come back when the type is changed back. The save asks first, with counts. Unreadable values show empty and are reported through diagnostics, as other bad stored values are.                                                                                              |
| IV. Fit-for-Purpose Code Quality             | **Pass.** One rendering path serves every type (the field controls). The item reuses `TemplateField`, `validateTemplateValue`, and `FieldEditor`, so there is no parallel per-type code. Custom lists stop depending on `CustomTraitList`.                                                                                                    |
| V. Risk-Proportional Testing                 | **Pass.** The schema and persistence tiers apply. Tests cover: the legacy entries round trip, write validation per type, coercion, the change report, each item type on the sheet (add, edit, remove by keyboard), the catalog "value from" per type, the editor save confirmation, and the storybook guard. Final check: `yarn verify:full`. |
| VI. Consistent, Accessible Experience        | **Pass.** Existing controls and `ConfirmDialog` are reused. Remove buttons are labelled, 32 px targets, keyboard reachable, and never overlays. The storybook shows every item type, named and unnamed (FR-016). Strings come from YAML in en and ru. The guide is updated in en and ru.                                                      |
| VII. Performance as a Shared Budget          | **Pass.** No dependency is added. Entry rows are memoized, and one write happens per edit. The change report runs only at save, over this template's documents.                                                                                                                                                                               |
| VIII. Respectful Use of Third-Party Material | **Pass.** No publisher material is involved.                                                                                                                                                                                                                                                                                                  |

**Deviations**: none.

**Post-Phase-1 re-check**: unchanged. The design adds:

- optional template properties only;
- a widened envelope entry;
- no new store, file, or route.

## Project Structure

### Documentation (this feature)

```text
specs/016-list-item-template/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── list-item-ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/sheet_manager/
├── types/
│   ├── template.ts                  # ListNode.item / named, ListItemField, listItemField, listIsNamed, LEGACY item, refine
│   └── templateValues.ts            # TemplateListEntrySchema widened; coerceListValue
├── features/sheet/
│   ├── data/
│   │   ├── templateValueWrites.ts   # custom-list branch (changed entries vs item)
│   │   ├── templateReferences.ts    # item references, valueFrom fit, list-catalog-unnamed
│   │   └── listItemChanges.ts       # NEW: listItemChangeReport (pure)
│   └── declarative/
│       ├── fieldControls.tsx        # nameSlot / rollLabel / removeSlot per control
│       ├── LabeledField.tsx         # NEW home of LabeledField (shared by page fields and entries)
│       ├── listEntries.tsx          # NEW: CustomListView, ListEntryRow, ListEntryRemove
│       ├── primitives.tsx           # old CustomListView removed; system lists unchanged
│       ├── DeclarativeSheetView.tsx # ListView → new CustomListView
│       └── hooks.ts                 # preset seeding from the item
├── components/
│   ├── stat-fields/RatingRow.tsx    # label slot + trailing slot
│   └── dialogs/
│       ├── TemplateEditorDialog.tsx # save confirmation with the change report
│       └── template-editor/
│           ├── ElementSettings.tsx  # ListConfig: named switch, Entry block, catalog rules, presets
│           ├── FieldEditor.tsx       # itemOfList hides per-field settings, no formula
│           ├── CatalogBindingEditor.tsx # valueFrom filtered by item type; disabled when unnamed
│           └── draft.ts             # field lookup includes list.item; legacy item materialized on first edit
└── storybook/stories.ts             # list stories per item type, named and unnamed, legacy

translations/source/{en,ru}/ui/sheet/templates.yaml
docs/template-editor/*.mdx (list section) + ru mirror
tests/sheet_manager/
├── list-items.test.tsx              # NEW: each type on the sheet, named/unnamed, remove, catalog, legacy look
├── list-item-change.test.ts         # NEW: coercion, change report, write validation
└── template-editor.test.tsx, storybook.test.tsx, template-values tests (extended)
```

Housekeeping when the work is done:

- the sheet-templates skill ("Lists");
- `src/sheet_manager/AGENTS.md` if list behavior is described there;
- `CHANGELOG.md` 3.14.0;
- `TODO.md` T-077 ✅.

**Structure Decision**: this is the existing single-project layout. The list entry rendering gets
its own file, so `primitives.tsx` keeps only system-bound primitives.

## Complexity Tracking

No constitution violations to justify.
