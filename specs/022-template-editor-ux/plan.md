# Implementation Plan: Template editor usability from player feedback

**Branch**: `022-template-editor-ux` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-template-editor-ux/spec.md`; approved
[prototype.html](./prototype.html) rev. 2.

## Summary

Six editor and sheet improvements share one rule: what a template stores and how documents store
values do not change.

1. **Settings panel.** It is rebuilt from small settings parts that return controls per named group:
   Content, Value, Limits and formulas, Look, Visibility and help. Every setting gets a visible label
   and a `data-setting` key. Formula settings get an fx mark and inline checks.
2. **Issues.** Draft checks cover table columns, list entry fields and every reachable schema rule.
   A schema backstop maps any remaining error to the nearest element and setting. Raw errors never
   reach the user. Clicking an issue focuses the setting.
3. **Dragging.** It becomes pointer-driven: the nearest legal insertion slot is chosen, and after a
   short dwell the page renders an uncommitted preview draft.
4. **Editor areas.** Two keyboard-accessible dividers resize the areas, and the widths are remembered
   in localStorage.
5. **Reordering.** Table columns can be reordered in the editor. Table rows and list entries can be
   reordered on the sheet.
6. **Element kinds.** Section and group appear as Group (Section or Card), and table and list appear
   as List (Table or Entries). Switching kinds converts settings and keeps the dropped ones for the
   session.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5, Zod 3, Tailwind 3, lucide-react. No new
dependency; dnd-kit was considered and rejected (research R5).

**Storage**:

- Pane widths go in localStorage (`template-editor-panes`).
- Template and document shapes are unchanged.
- Row order is written through the existing document write paths.

**Testing**: Vitest 4 with jsdom and Testing Library. Pure functions (nearest slot, issue location,
row moves, kind conversion) are unit-tested; jsdom has no layout, so geometry tests use fake
rectangles.

**Target Platform**: browser; desktop editor and phone tabs.

**Project Type**: web site with client-side tools (`sheet_manager` module).

**Performance Goals**:

- The placement preview renders within 100 ms on the full Star Wars sheet (SC-003).
- Keystroke and move budgets stay within today's editor performance test (≤ 100 ms each, about
  40 ms measured), including the deferred schema backstop.

**Constraints**:

- No schema or document migration (FR-006, FR-027).
- Every surface is accessible: labels, separators, focus, and announcements.
- Russian strings come through YAML.

**Scale/Scope**:

- About 20 editor files are touched, plus 4 sheet renderer files.
- About 60 new strings, en and ru.
- 2 docs pages, en and ru.
- 6 user stories.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                             | Check                                                                                                                                                                                                                                                       | Status |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Modular semi-autonomy              | All work stays in `sheet_manager`: editor in `components/dialogs/template-editor`, sheet order in `features/sheet/declarative`. The shared `DocsHelpLink`/`NumberInput` are reused unchanged. No system conditionals: element kinds are generic node types. | PASS   |
| II. Explicit contracts                | Template and document shapes are unchanged. The issue location walks the schema's own arrays. New strings go through YAML; the guide is mirrored and parity-checked.                                                                                        | PASS   |
| III. Pleasurable interactions         | Every save problem leads to its setting. A cancelled drag changes nothing. Kind switches keep the dropped settings for the session. The schema backstop reports to `diagnostics.ts` (new code `template-draft-invalid`), so it is never silent.             | PASS   |
| IV. Fit-for-purpose quality           | Settings building blocks replace six copied `inputClasses`. Pure helpers are separated from UI. No `any`.                                                                                                                                                   | PASS   |
| V. Risk-proportional testing          | Unit tests cover the pure helpers. Component tests cover the panel, issues, drag state, dividers, reorder and kinds. The shipped-template round trip proves stored shapes are unchanged. The performance budget is re-checked.                              | PASS   |
| VI. Consistent, accessible experience | Visible labels, a separator role, named move controls, and focus management. The storybook's editable tables and lists show the move controls; element variants are unchanged, so no new stories are needed. The editor stays in the app's accent roles.    | PASS   |
| VII. Performance budget               | The preview reuses memoized frames, and only moved subtrees re-render. The schema check is deferred with the draft and measured.                                                                                                                            | PASS   |
| VIII. Third-party material            | Not touched.                                                                                                                                                                                                                                                | PASS   |

Post-design re-check: PASS. Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/022-template-editor-ux/
├── spec.md, prototype.html (rev. 2), checklists/requirements.md
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/editor-ui.md
└── tasks.md                     # /speckit-tasks
```

### Source Code (repository root)

```text
src/sheet_manager/components/dialogs/template-editor/
├── settings/                    # new: SettingField, FormulaField, KeyField, SettingsGroup,
│                                #      inputClasses, GroupedSettings + mergeGroups, group state
├── ElementSettings.tsx          # header (actions above kind+name), merges grouped parts
├── FieldEditor.tsx, PrimitiveConfig.tsx, LayoutControls.tsx, SourceControls.tsx,
│   CatalogBindingEditor.tsx, TermHintControl.tsx, PoolTrackerSettings.tsx
│                                # converted to grouped parts with visible labels + data-setting
├── draft.ts                     # issues walk columns/item; SettingRef; moveTableColumn;
│                                # kind conversion helpers; issueLocation (or issues.ts)
├── issues.ts                    # new: issueLocation(draft, path), schema backstop
├── useEditorDrag.ts             # new: pointer drag controller + nearestPlacement
├── EditorNodeFrame.tsx, OutlineTree.tsx, EditorPage.tsx
│                                # pointer grips, marker, preview/origin slot
├── PaneDivider.tsx, usePaneWidths.ts   # new
├── elementKinds.ts              # new: elementKind(), conversions, KindStash
└── AddElementMenu.tsx           # Group, Field, List, Tracker
src/sheet_manager/components/dialogs/TemplateEditorDialog.tsx
                                 # grid with dividers, drag state, issue click focus, save mapping,
                                 # kind-switch save warning
src/sheet_manager/features/sheet/data/formulaCheck.ts      # new: checkFormulaInput
src/sheet_manager/features/sheet/data/templateReferences.ts # coordinate check shared
src/sheet_manager/features/sheet/declarative/
├── rowOrder.ts                  # new: moveTableRow, moveItem
├── RowMoveControls.tsx          # new: grip + up/down (+ useRowReorder)
├── DeclarativeSheetView.tsx (TableBlock), listEntries.tsx, primitives.tsx (SystemListBody),
│   RowsBody.tsx, hooks.ts (moveRow), editorOverlay.tsx (origin slot)
src/sheet_manager/diagnostics.ts                           # code template-draft-invalid
translations/source/{en,ru}/ui/sheet/{templates,fields}.yaml
docs/template-editor/{index,elements}.mdx + i18n/ru mirror
tests/sheet_manager/                                       # updated and new suites
TODO.md, TOFIX.md, CHANGELOG.md (v3.20.0), package.json, src/sheet_manager/AGENTS.md,
.agents/skills/sheet-templates/SKILL.md
```

**Structure Decision**: the editor UI stays inside `template-editor/` with a new `settings/`
folder for the building blocks. Sheet ordering stays in the declarative renderer next to the rows
it moves.

## Phasing

1. **Foundation**
    - Settings building blocks and `GroupedSettings`.
    - `checkFormulaInput`.
    - `SettingRef` on issues.
    - Diagnostics code.
2. **US1, settings panel (P1)**
    - Convert every part to grouped, labelled settings.
    - New header.
    - Group state with issue badges.
    - Update tests to the new names.
3. **US4, issues (P1)**
    - Walk columns and entry fields.
    - Close the gaps.
    - Schema backstop with `issueLocation`.
    - Click to focus.
    - Save mapping.
4. **US2, drag (P1)**
    - Pointer controller and nearest slot.
    - Marker, preview draft, origin slot.
    - Outline drag.
    - Autoscroll.
    - Tests rewritten from HTML5 events to the controller.
5. **US3, areas (P2)**: dividers and stored widths.
6. **US5, order (P2)**
    - Column move in the editor.
    - Row and entry move on the sheet.
    - Shared controls, also used by `RowsBody`.
7. **US6, kinds (P2)**
    - Element kinds, add menu, conversions with stash.
    - Disabled Table for game and catalog lists.
    - Save warning.
8. **Polish**
    - Guide en/ru, module notes and skill.
    - Backlog closed, CHANGELOG v3.20.0.
    - `yarn verify:full`.
    - Quickstart walk on the dev server.

## Complexity Tracking

None.
