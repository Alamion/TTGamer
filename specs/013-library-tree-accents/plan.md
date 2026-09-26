# Implementation Plan: Library tree for rules, settings, types, and pages

**Branch**: `testing` (spec directory `013-library-tree-accents`) | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-library-tree-accents/spec.md`

## Summary

This feature replaces the flat "Page templates" library dialog with one tree: ruleset → setting →
document type → page. The tree is derived from existing sources:

- registry declarations, plus one new optional `SystemPlugin.ruleset` field;
- the user type/setting store;
- the template store;
- document counts.

**Tree and details**: the tree comes with details panels, search, filters, a context menu,
keyboard navigation, and a phone tab layout.

**Moves**: pure move planners move pages, types, and settings. They reuse T-070 for pages.
Setting moves across rulesets detach the old core character's documents and pages (FR-015a).

**File transfer**: a new `ttgamer-library` v1 file adds selective export, with parents added
automatically. Import has a preview with new / same / conflict / unavailable states and per-branch
Replace or Keep both. It still reads spec 012 type files and template files.

**Stores**:

- `documentTypeStore` v2 makes a user type's default page optional and adds default-page
  preferences for shipped types.
- `documentStore` gains one bulk relocation action.

**Accents (T-081)**: the violet `editor` token is renamed `tertiary`. The editor's accents move to
primary and secondary.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5 (persist), Zod, Radix Dialog/Popover, Tailwind 3 + clsx, Lucide. No new dependency.

**Storage**: IndexedDB via localForage. Changes:

- `documentTypeStore` goes v1 → v2;
- `documentStore` stays v4 with a new action;
- `templateStore` stays v5 unchanged.

**Testing**: Vitest + Testing Library (pure model tests, component tests), `yarn verify:full`

**Target Platform**: Browser (desktop and phone widths), static Docusaurus site

**Project Type**: Web application (single Docusaurus project, sheet manager module)

**Performance Goals**: The library opens with 300 pages in under 1 s (SC-007). Moves and imports apply in one store write per store.

**Constraints**:

- Nothing is written before a confirmation or a preview is confirmed (SC-005).
- Shipped content is never serialized.
- No system conditionals in generic code.
- English code and docs, with ru UI and docs mirrors.

**Scale/Scope**: Hundreds of pages, tens of types and settings, thousands of documents (counts in one pass). 15 new source files (6 pure modules, 9 UI components), and 3 dialogs replaced.

## Constitution Check

_GATE: checked before Phase 0 and re-checked after Phase 1._

| Principle                                    | Assessment                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                     | **Pass.** The ruleset grouping is a plugin declaration (`SystemPlugin.ruleset`, R1), not a library conditional. The library reaches systems only through the registry and `systems/userTypes.ts`. Model code lives with the sheet data helpers, and UI lives under `components/dialogs/library/`. `shared/` is untouched.                                                                                                                                             |
| II. Explicit Contracts at Boundaries         | **Pass.** There are two written contracts: the library file format and the dialog interaction. Imports validate every entry with the existing Zod schemas before any write, and older formats pass through explicit adapters. Store change: `documentTypeStore` v2 with a migration test. `defaultTemplateId` becomes optional, which widens the parse, so no stored data is lost.                                                                                    |
| III. Pleasurable Cross-Module Interactions   | **Pass.** Moves never lose values. The documents a setting move leaves behind keep opening on a known page (FR-015a, R6). An unavailable setting or system is shown, never dropped. Rejected files explain why. New fallbacks report through `reportSheetIssue`: an unresolved placement, and a dropped default preference.                                                                                                                                           |
| IV. Fit-for-Purpose Code Quality             | **Pass.** The tree, move plans, export closure, and import states are pure functions with unit tests. The UI splits into tree, details, export, and import pieces, so no 700-line dialog is repeated. Three superseded components are deleted (knip gate).                                                                                                                                                                                                            |
| V. Risk-Proportional Testing                 | **Pass.** Persistence: v1 → v2 migration test. Data movement: plan tests per level, including FR-015a and cross-system confirmation. File: round trip, legacy adapters, every rejection code. UI: keyboard, drag validity, forms, modes. Tier 3 `yarn verify:full`, because config (Tailwind token) and docs paths change.                                                                                                                                            |
| VI. Consistent, Accessible Experience        | **Pass.** The tree follows the WAI-ARIA tree pattern. Drag has keyboard equivalents (Move…, context menu). The dialog is a Radix Dialog with focus return, and alerts use `role="alert"`. Accents follow the primary/secondary rule, with tertiary for the edge case only. There are en and ru strings in YAML and a guide page in both locales with help links. The storybook shows the tree row states and export checkbox states (constitution VI storybook rule). |
| VII. Performance as a Shared Budget          | **Pass.** No dependency or route is added. Branches render only when expanded, and counts come from one memoized pass (R10). The dialog stays lazily mounted as today.                                                                                                                                                                                                                                                                                                |
| VIII. Respectful Use of Third-Party Material | **Pass.** Exports carry `notices` for every system and module they touch, and no book text is added. The notices are computed from policy metadata, so the Dark Pack appears only for V5 material.                                                                                                                                                                                                                                                                    |

**Deviations**: none. One scope choice departs from prototype v3: the core character is not listed
under shipped line settings (research R3). It is recorded as a follow-up.

**Post-Phase-1 re-check**: unchanged. The design adds:

- one optional plugin field;
- one store version;
- one store action;
- two file adapters;
- the library UI folder.

## Project Structure

### Documentation (this feature)

```text
specs/013-library-tree-accents/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── library-file-format.md
│   └── library-ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/sheet_manager/
├── systems/
│   ├── types.ts                         # + SystemPlugin.ruleset
│   ├── registry.ts                      # validate ruleset refs; rulesets()/settingSystems() helpers
│   ├── userTypes.ts                     # defaultTemplateId optional
│   └── star-wars-wod/index.ts           # ruleset: 'wod-2e'
├── store/
│   ├── documentTypeStore.ts             # v2: defaultPages, optional default migration
│   └── documentStore.ts                 # + relocateDocuments
├── features/sheet/data/
│   ├── libraryTree.ts                   # buildLibraryTree, node keys, filters, counts (new)
│   ├── libraryMoves.ts                  # canMove, planPageMove/planTypeMove/planSettingMove (new)
│   ├── libraryActions.ts                # create, rename, delete plans, set default (new)
│   ├── libraryPages.ts                  # default page resolution, newDocumentPage (new)
│   └── templateRetarget.ts              # reused by planPageMove
├── features/sheet/shell/
│   ├── libraryFile.ts                   # export closure, serialize, parse + legacy adapters (new)
│   ├── libraryImport.ts                 # import states, Replace/Keep both, install (new)
│   ├── typeFile.ts                      # kept for document-embedded types; defaults optional
│   └── SheetWorkspace.tsx               # opens LibraryDialog
├── components/dialogs/
│   ├── LibraryDialog.tsx                # replaces TemplateLibraryDialog (new)
│   ├── library/                         # LibraryTree, TreeRow, DetailsPane (per level),
│   │                                    # MovePanel, CreateForm, ContextMenu, ExportPanel,
│   │                                    # ImportPreview (new)
│   ├── TemplateLibraryDialog.tsx        # removed
│   ├── UserSettingsPanel.tsx            # removed (absorbed)
│   └── TemplateImportDialog.tsx         # removed (absorbed)
├── components/dialogs/template-editor/  # EditorHelp anchors; editor → primary/secondary (T-081)
└── storybook/stories.ts                 # library row and checkbox states

src/css/custom.css, tailwind.config.cjs  # --editor → --tertiary (T-081)
translations/source/{en,ru}/ui/sheet/library.yaml   # new UI strings
docs/template-editor/library.mdx (+ ru mirror)     # guide page (FR-024)
tests/sheet_manager/library-*.test.ts(x), document-type-store.test.ts
```

**Structure Decision**: The layout follows the existing sheet-manager conventions:

- pure data helpers go next to `templateRetarget.ts`;
- file formats go next to `typeFile.ts` in the shell;
- dialog subcomponents go in a folder beside their dialog, like `template-editor/`.

**Documentation updates required before the feature is complete** (constitution and AGENTS §9):

- `.agents/skills/sheet-templates/SKILL.md`: the library, moves, and file format;
- `src/sheet_manager/AGENTS.md`: the structure line for `library/`, and `SystemPlugin.ruleset`;
- `.agents/skills/tailwind-theming/SKILL.md`: the `tertiary` token name;
- a historical banner in spec 012 on the type-file export (superseded by the library file);
- CHANGELOG;
- TODO: T-071 and T-081 done, plus the follow-up from R3.

## Complexity Tracking

No violations, so this section is empty.
