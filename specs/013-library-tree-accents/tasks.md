---
description: 'Task list for feature 013: library tree and accents'
---

# Tasks: Library tree for rules, settings, types, and pages

**Input**: Design documents from `specs/013-library-tree-accents/`. These are:

- [plan.md](./plan.md) and [spec.md](./spec.md);
- [research.md](./research.md), whose decisions are cited as R1–R13;
- [data-model.md](./data-model.md);
- the contracts [library-file-format.md](./contracts/library-file-format.md) and
  [library-ui.md](./contracts/library-ui.md);
- [quickstart.md](./quickstart.md).

**Tests**: Tests are included. Constitution V requires tests for persistence, data movement, and
file boundaries, and quickstart.md lists the suites.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: The task can run in parallel, because it touches different files and has no
  unfinished dependencies.
- **[Story]**: US1–US6 from spec.md.

---

## Phase 1: Setup

- [ ] T001 Mark T-071 and T-081 as in progress (`[ ] 🟡`) in `TODO.md`, and add the follow-up entry "Core characters in shipped line settings" (research R3, deferred from prototype v3) with its reason. Run `yarn validate:backlog`.
- [ ] T002 [P] Create `translations/source/en/ui/sheet/library.yaml` and `translations/source/ru/ui/sheet/library.yaml` with the key skeleton for:
    - the dialog title and modes (browse, export, import);
    - search, filters, and levels;
    - badges, the empty state, and per-level details;
    - create forms, move, delete confirmations, export, import, and toasts.

    Add the English and Russian text as each story lands. Run `yarn build:translations`.

- [ ] T003 [P] Create `tests/sheet_manager/helpers/library.ts` with two helpers:
    - `seedLibrary()` installs the example library through the real stores:
        - user setting "Ashen Realms" on `wod-v5`, holding user type "Cult" with one page, one core-character page, and 3 `v5-character` documents with that `settingId`;
        - user type "Organization" owned by `{systemId: 'star-wars-wod'}`, with one page;
        - one Star Wars default override.
    - `resetLibraryStores()` clears the document, template, and type stores between tests.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the ruleset declaration, the store changes, and the pure tree that every story reads.

### Ruleset declaration (R1)

- [ ] T004 Add `ruleset?: SystemId` with a doc comment to `SystemPlugin` in `src/sheet_manager/systems/types.ts`. In `src/sheet_manager/systems/registry.ts`:
    - make the constructor validate that `ruleset` names a registered plugin that has no `ruleset` itself, and throw otherwise, as for missing default views;
    - add `listRulesets()` (plugins without `ruleset`);
    - add `settingSystemsOf(rulesetId)`.
- [ ] T005 Set `ruleset: WOD2E_SYSTEM_ID` on `starWarsWodSystem` in `src/sheet_manager/systems/star-wars-wod/index.ts`. Importing the id must stay within the existing ESLint allowance, or use the literal parsed with `SystemIdSchema`.
- [ ] T006 [P] Create `tests/sheet_manager/systems/registry-rulesets.test.ts`:
    - `listRulesets()` returns `wod-2e` and `wod-v5`;
    - `settingSystemsOf('wod-2e')` returns Star Wars;
    - an unknown or nested `ruleset` throws.

### Stores (R4, R5)

- [ ] T007 In `src/sheet_manager/systems/userTypes.ts`:
    - make `defaultTemplateId` optional;
    - make `synthesizeUserDefinition` handle a missing default. The first page wins, and with no pages the definition falls back to the stored-values view.
- [ ] T008 In `src/sheet_manager/store/documentTypeStore.ts`, bump to version 2:
    - add `defaultPages: Record<string, string>` with the actions `setDefaultPage(key, pageId | null)` and `dropDefaultPagesFor(pageId)`;
    - make `migrateDocumentTypeStoreState` fill `defaultPages` with `{}` for v1 and keep quarantine behaviour;
    - include `defaultPages` in `partialize`.
- [ ] T009 Add `relocateDocuments(changes: DocumentRelocation[])` to `src/sheet_manager/store/documentStore.ts`:
    - one `set`;
    - `null` clears `metadata.settingId` or `metadata.templateId`;
    - `systemId` is rewritten only for documents whose `definitionId` is a user kind (`isUserKind`);
    - preset ids are skipped.

    Export the `DocumentRelocation` type.

- [ ] T010 Update the callers of the now-optional `defaultTemplateId`:
    - `src/sheet_manager/features/sheet/shell/typeFile.ts`: validation requires the default only when present; `reissueCollidingTemplates` renames it only when present;
    - `src/sheet_manager/features/sheet/data/templateRetarget.ts`: a type with no page left drops `defaultTemplateId` instead of keeping a dangling id;
    - `src/sheet_manager/features/sheet/CharacterSheet.tsx`, if it reads the default.
- [ ] T011 [P] Create `tests/sheet_manager/document-type-store.test.ts`:
    - a v1 state (types with a default, settings, quarantine) migrates to v2 unchanged, with `defaultPages: {}`;
    - a type without `defaultTemplateId` parses;
    - `setDefaultPage` and `dropDefaultPagesFor` work.
- [ ] T012 [P] Create `tests/sheet_manager/document-store-relocate.test.ts` for `relocateDocuments`:
    - a batch changes several documents in one write;
    - `null` clears a field;
    - shipped-definition documents keep their `systemId`.

### Pure tree (data-model "library tree", R2, R3, R10)

- [ ] T013 Create `src/sheet_manager/features/sheet/data/libraryPages.ts`:
    - `pageNodeKey`, `typeNodeKey`, `settingNodeKey`, and `rulesetNodeKey` builders, plus a `parseNodeKey`, following data-model "Node keys";
    - `resolveDefaultPage(typeRef, state)`, which follows the order in data-model "Placement rules";
    - `newDocumentPage(systemId, definitionId, settingId, state)`, which returns `{ preferredViewId?, templateId? }` for the create flow.
- [ ] T014 Create `src/sheet_manager/features/sheet/data/libraryTree.ts`:
    - `buildLibraryTree({ registry, types, settings, templates, defaultOverrides, defaultPages, documentCounts })`, which returns `RulesetNode[]` following data-model "Placement rules":
        - "Rules only" first, then module settings, then setting systems, then user settings;
        - core types only under "Rules only" and user settings;
        - an unavailable user setting when an owner is missing;
        - a final read-only "Unavailable" group (`r:unavailable`) for stored user settings whose ruleset is not registered (data-model "Placement rules").

        Unresolvable placements report through `reportSheetIssue` (a new issue code `library-placement` in `src/sheet_manager/diagnostics.ts`).

    - `countDocuments(documents)`, which builds a `Map` keyed `systemId|definitionId|settingId` (R10);
    - `filterTree(tree, { query, filter: 'all' | 'yours' | 'edited' })`, which keeps the ancestors of matches;
    - `flattenVisible(tree, expanded)` for keyboard navigation;
    - `findNode(tree, key)`, which returns `{ node, ancestors }`.

- [ ] T015 [P] Create `tests/sheet_manager/library-tree.test.ts` using `seedLibrary()`:
    - the ruleset order and the settings order;
    - Star Wars under WoD 2e, Hunter under V5, Ashen Realms under V5 with its core type and Cult;
    - Organization under Star Wars;
    - an edited shipped page is flagged, and the default page carries `isDefault`;
    - document counts sum up the tree;
    - search keeps ancestors, and the "yours" and "edited" filters work;
    - a type whose setting is missing appears under an unavailable setting;
    - a stored setting on an unregistered ruleset appears in the "Unavailable" group with its types, and `canMove` refuses it;
    - 300 generated pages build in under 100 ms, as a guard for SC-007;
    - `newDocumentPage` covers a user type, a core type in a setting, and a shipped type with and without a preference.

**Checkpoint**: The tree derives correctly from real stores. The user stories can start.

---

## Phase 3: User Story 1 — See and manage everything in one tree (Priority: P1) 🎯 MVP

**Goal**: The library opens as the four-level tree with a details pane, and lets the user create, rename, describe, delete, and set the default page.

**Independent Test**: Seed the example library, open the library, read the ownership of every type from the tree, then create a setting and a type and confirm that neither has a page (spec US1).

### Tests for User Story 1

- [ ] T016 [P] [US1] Create `tests/sheet_manager/library-dialog.test.tsx` with the browse-mode cases from contracts/library-ui.md:
    - tree roles and levels (`aria-level`, `aria-expanded`, `aria-selected`);
    - the keyboard table (arrows, Home/End, type-ahead);
    - selection shows details;
    - search, filters, and the empty state;
    - create setting, create type, and "no page created" (US1 scenarios 2 and 3);
    - core fallback text (scenario 4);
    - make default (scenario 5: the ★ badge, and a new document opens on the chosen page; for a user type the details note that existing documents without their own page follow it too);
    - delete a setting with a count, with the documents kept (scenario 6), and its core-character documents lose their `settingId`;
    - shipped items are read-only (scenario 7);
    - Escape closes the dialog and returns focus.

### Implementation for User Story 1

- [ ] T017 [P] [US1] Create `src/sheet_manager/components/dialogs/library/TreeRow.tsx`. It renders one `treeitem`:
    - a level icon (Lucide: Dices, Globe, FileType, FileText) and the name;
    - badges (yours, edited, ★ default, no setting, unavailable) and a count;
    - an expand toggle and a "⋯" button with `aria-label`;
    - primary for selection and focus, and secondary for hover (R11).

    It takes props only and reads no store.

- [ ] T018 [US1] Create `src/sheet_manager/components/dialogs/library/LibraryTree.tsx`, the `role="tree"` container:
    - expanded-set state, with rulesets and the selected path expanded initially;
    - renders only expanded branches;
    - roving `tabindex` over `flattenVisible`;
    - the keyboard handling from contracts/library-ui.md, with type-ahead matching the start of a name;
    - `onOpenPage` (Enter on a page), `onContextMenu`, and `onSelect` callbacks.
- [ ] T019 [P] [US1] Create `src/sheet_manager/components/dialogs/library/CreateForm.tsx`, an inline form with:
    - a name (1–80 characters, trimmed, required, `role="alert"` error);
    - a description (up to 500 characters);
    - an optional "start from" select, Blank or a copy of another page of the same type.

    Create and Cancel buttons; Escape cancels.

- [ ] T020 [US1] Create `src/sheet_manager/features/sheet/data/libraryActions.ts`, pure builders that return the writes for:
    - `createSetting(rulesetId, name, description)`;
    - `createType(settingRef, name, description)`, where the owner is `{settingId}` or `{systemId, moduleId?}` and no page is created;
    - `renameItem` and `describeItem`;
    - `deletePlan(nodeKey)`, which returns the affected document count and the writes. Deleting a setting removes it, its types, and their templates, keeps the documents, and clears `settingId` on the documents of its core character (through `relocateDocuments`). Deleting a type removes it and its templates. Deleting a page removes it and clears `templateId` on the documents opened on it.
    - `setDefault(typeNodeKey, pageNodeKey)`, which writes to the type, the setting's `pages`, or `defaultPages`.
- [ ] T021 [US1] Create `src/sheet_manager/components/dialogs/library/DetailsPane.tsx`, with one section per level following the table in contracts/library-ui.md:
    - rulesets show the dice summary, taken from translated plugin text or omitted when the plugin has none, and the core character list;
    - settings show the "Rules only" and shipped notes;
    - types show the fallback note (stored values or "Rules only"), and for user types and core characters in user settings, that changing the default also changes existing documents without their own page;
    - pages show the default and edited states.

    Buttons call the `libraryActions` builders and apply their writes. Deletes go through the existing `ConfirmDialog`.

- [ ] T022 [US1] Create `src/sheet_manager/components/dialogs/LibraryDialog.tsx`:
    - a Radix Dialog with a header (mode switch with only Browse active until US4 and US5, search, filter select, and a help link to the guide);
    - a body split into tree and details at `md` and above, and Tree and Details tabs below `md`, where selecting a row switches to Details;
    - memoized `buildLibraryTree` inputs from the four stores and `countDocuments`.
- [ ] T023 [US1] Replace `TemplateLibraryDialog` with `LibraryDialog`:
    - in `src/sheet_manager/features/sheet/shell/SheetWorkspace.tsx` (`:268`);
    - in `src/sheet_manager/components/index.ts` (`:14`).

    Delete `src/sheet_manager/components/dialogs/TemplateLibraryDialog.tsx` and `src/sheet_manager/components/dialogs/UserSettingsPanel.tsx` once US2 covers the page actions. Until then, keep the page actions reachable through the new dialog.

- [ ] T024 [US1] Use `newDocumentPage` in `src/sheet_manager/components/dialogs/DocumentCreateDialog.tsx` (`:87`) and `src/sheet_manager/features/sheet/shell/CreateCharacterButton.tsx` (`:23`), so that a chosen default page applies to new documents only (R4).
- [ ] T025 [US1] Fill the en and ru strings for US1 in `translations/source/{en,ru}/ui/sheet/library.yaml` and run `yarn build:translations`.
- [ ] T026 [US1] Move the still-relevant cases of `tests/sheet_manager/user-settings.test.tsx` and `tests/sheet_manager/user-document-types.test.tsx` into `tests/sheet_manager/library-dialog.test.tsx` and delete what the old dialogs covered. `yarn test` must stay green.

**Checkpoint**: US1 is independently usable. The MVP replaces the old dialog.

---

## Phase 4: User Story 2 — Work with pages from the tree (Priority: P1)

**Goal**: Every page action works from a page row: open, duplicate, make default, export, delete, and reset.

**Independent Test**: Create a copy of a shipped page for a shipped type from the tree, edit and save it in the editor, find it under that type, then reset an edited shipped page (spec US2).

- [ ] T027 [P] [US2] Add US2 cases to `tests/sheet_manager/library-dialog.test.tsx`:
    - Enter or "Open in editor" opens `TemplateEditorDialog`, and the saved name shows in the tree;
    - Duplicate;
    - "New page" as "Copy of …" opens the editor on a new page of that type;
    - Reset restores the original, and the documents keep their values;
    - deleting a page returns its documents to their default page.
- [ ] T028 [US2] In `src/sheet_manager/components/dialogs/library/DetailsPane.tsx` and `LibraryDialog.tsx`, add page actions by porting the behaviour of the deleted `TemplateLibraryDialog`:
    - open in the editor (reusing `TemplateEditorDialog` with `lockTarget` for new pages);
    - duplicate (`templateStore.duplicateTemplate`);
    - make default (T020);
    - reset (`clearDefaultOverride`);
    - delete.

    Also make "New page" start blank or as a copy. It creates the draft with the type's `systemId`, `documentKind`, and `settingId`.

- [ ] T029 [US2] Deleting or moving a page calls `dropDefaultPagesFor(pageId)` and clears the type or setting default that pointed at it, per the edge case "default page deleted". Implement this in `src/sheet_manager/features/sheet/data/libraryActions.ts`.
- [ ] T030 [US2] Finish T023: delete `TemplateLibraryDialog.tsx` and `UserSettingsPanel.tsx`, and fix every import. Run `yarn audit:dead-code`.

**Checkpoint**: US1 and US2 together replace the old library in full.

---

## Phase 5: User Story 3 — Move settings, types, and pages (Priority: P2)

**Goal**: The user can move their own pages, types, and settings by drag, picker, or menu, with confirmation when the system changes.

**Independent Test**: Drag a user type to another setting and check that its documents and pages follow. Move a user setting from V5 to WoD 2e and check that the warning comes first and that the core-character documents stay (spec US3).

### Tests for User Story 3

- [ ] T031 [P] [US3] Create `tests/sheet_manager/library-moves.test.ts` with these cases:
    - `canMove`, following the table in data-model: shipped items, core types, "Rules only", unavailable items, and the item itself, its descendants, and its current parent are all refused;
    - `planPageMove` equals the T-070 `planTemplateRetarget` result;
    - `planTypeMove` within a ruleset rewrites the owner and template `settingId`, and the documents follow;
    - `planTypeMove` across systems sets `crossesSystem`, and templates and documents get the new `systemId`;
    - `planSettingMove` from V5 to WoD 2e (FR-015a):
        - the 3 mortals stay with their `settingId` cleared, and `documentsStaying` is 3;
        - a mortal without its own `templateId` that followed `setting.pages` is pinned to that page, and one with its own `templateId` keeps it;
        - the old core pages lose their `settingId` (`pagesStaying`);
        - `setting.pages` loses its V5 core entries;
        - the setting's own types move;
    - moving a Star Wars user setting to `wod-2e` sets `crossesSystem`.

### Implementation for User Story 3

- [ ] T032 [US3] Create `src/sheet_manager/features/sheet/data/libraryMoves.ts` with:
    - `canMove(subjectKey, targetKey, tree)` and `moveTargets(subjectKey, tree)`, which returns targets with a path and a `crossesSystem` flag;
    - `planPageMove`, which wraps `planTemplateRetarget`;
    - `planTypeMove`;
    - `planSettingMove`, following R6, which returns `MovePlan` (data-model);
    - `applyMovePlan(plan)`, which writes settings, then types, then templates, then documents (`relocateDocuments`), then `defaultPages`, one store call each.
- [ ] T033 [P] [US3] Create `src/sheet_manager/components/dialogs/library/MovePanel.tsx`:
    - target buttons with a path and an _other rules_ badge;
    - a consequence note;
    - when `crossesSystem` is true, a warning callout in the secondary accent that names `documentsMoving`, `documentsStaying`, and `pagesStaying`;
    - a Move button disabled until a target is chosen.
- [ ] T034 [US3] Add drag and drop to `src/sheet_manager/components/dialogs/library/TreeRow.tsx` and `LibraryTree.tsx`:
    - a library MIME type; only rows allowed by `canMove` are `draggable`;
    - `dragover` accepts only valid targets and shows a primary outline;
    - a drop with `crossesSystem` opens the MovePanel confirmation with that target preselected;
    - other drops apply at once, then show a toast and briefly highlight the moved row.

    Follow the pattern in `src/sheet_manager/components/dialogs/template-editor/OutlineTree.tsx` (`:32`, `:85`).

- [ ] T035 [US3] Create `src/sheet_manager/components/dialogs/library/ContextMenu.tsx`:
    - a Radix Popover with `role="menu"`, anchored at the pointer or the "⋯" button;
    - it opens on right-click and on Shift+F10 or the Menu key;
    - its actions are the same as those in `DetailsPane`, including Move…;
    - arrows move between items, Enter activates, and Escape returns focus to the row.

    Wire it into `LibraryTree.tsx`.

- [ ] T036 [US3] Add US3 UI cases to `tests/sheet_manager/library-dialog.test.tsx`:
    - drag onto a valid target moves the item;
    - an invalid target refuses the drop;
    - a cross-system drop opens the confirmation and changes nothing before it;
    - the Move… picker and the context menu reach the same result;
    - shipped rows are not draggable and have no Move…
- [ ] T037 [US3] Fill the US3 strings (en and ru) in `translations/source/{en,ru}/ui/sheet/library.yaml`.

**Checkpoint**: Items can be moved at every level without losing values.

---

## Phase 6: User Story 4 — Export chosen branches (Priority: P2)

**Goal**: Export mode with tri-state selection, automatically added parents in tertiary, a summary, a preview, and a `ttgamer-library` v1 file.

**Independent Test**: Tick one page of a user type and export. The file contains the page, its type, and its setting, and nothing shipped except addresses (spec US4).

- [ ] T038 [P] [US4] Create `tests/sheet_manager/library-file.test.ts` with these cases:
    - `exportClosure`: picking one page auto-adds its user type and setting and lists the shipped ancestors as addresses;
    - tri-state is `checked`, `partial`, or `unchecked`;
    - an edited shipped page goes into `overrides`;
    - shipped content is never serialized;
    - `notices` appear only for V5 material;
    - serialize and parse round-trip to equal collections;
    - `parseLibraryFile` covers every error code (parse, format, version, schema with the entry named);
    - the legacy adapters read a spec 012 type file (with and without `setting`) and a `ttgamer-template` v3 file.
- [ ] T039 [US4] Create `src/sheet_manager/features/sheet/shell/libraryFile.ts`, following contracts/library-file-format.md:
    - `LIBRARY_FILE_FORMAT` and `LIBRARY_FILE_VERSION`;
    - `tickState(node, picked)` and `exportClosure(tree, picked)`;
    - `buildLibraryPayload(closure, stores)`;
    - `serializeLibraryFile(payload)`, which adds `notices` through `resolveDocumentPolicies` or `exportNotices` for every touched system and definition;
    - `buildLibraryFilename(name | 'selection')`;
    - `parseLibraryFile(text)`, which returns `{ ok, payload, degradedCatalogFields } | { ok: false, error, entry? }`, runs the legacy adapters for `ttgamer-document-type` v1 and `ttgamer-template` v3, and applies `resolveImportedTemplate` to templates and overrides.
- [ ] T040 [P] [US4] Create `src/sheet_manager/components/dialogs/library/ExportPanel.tsx`:
    - a summary with counts per level and an addresses list;
    - a collapsible JSON preview;
    - **Save file**, disabled while nothing is picked, which downloads through the existing download helper used by `typeFile`/`templateFile` callers.
- [ ] T041 [US4] Add export mode to `LibraryTree.tsx` / `TreeRow.tsx` and `LibraryDialog.tsx`:
    - tri-state checkboxes (`role="checkbox"`, `aria-checked` `mixed`) on exportable rows;
    - automatically added rows show a **tertiary** checked box and "added for {child}" (FR-023);
    - the mode switch enables Export;
    - a page's and a setting's or type's own "Export" actions (US1 and US2 details) open export mode with that node pre-picked.
- [ ] T042 [US4] Add export UI cases to `tests/sheet_manager/library-dialog.test.tsx`: the tick states, the auto-added parent marked with the tertiary class, and Save disabled when empty. Fill the US4 strings (en and ru).

---

## Phase 7: User Story 5 — Import with a preview (Priority: P2)

**Goal**: Import preview with new / same / conflict / unavailable states, per-branch Replace or Keep both, and installing only what is selected.

**Independent Test**: Export a setting, change one of its pages, import the file back, choose Keep both for the conflicting page, and confirm that both pages exist (spec US5).

- [ ] T043 [P] [US5] Create `tests/sheet_manager/library-import.test.ts` with these cases:
    - the states new, same, conflict, and unavailable (an unknown system or a missing shipped definition), with an unavailable parent making its branch unavailable;
    - same and unavailable entries cannot be picked;
    - a picked child auto-picks a new parent;
    - Replace overwrites by id and keeps the installed pages of a replaced type that are not in the file;
    - Keep both remaps ids across owner, `settingId`, `documentKind`, `setting.pages`, and `defaultTemplateId`, and adds the "(imported)" suffix;
    - a template id colliding with an unrelated template is re-issued;
    - nothing is written until `installImport` runs (SC-005);
    - importing an export into empty stores reproduces it (SC-004).
- [ ] T044 [US5] Create `src/sheet_manager/features/sheet/shell/libraryImport.ts` with:
    - `buildImportPreview(payload, stores)`, which returns an `ImportEntry[]` tree (data-model) placed with the same rules as `buildLibraryTree`;
    - `togglePick` and `setChoice` as pure updaters;
    - `installImport(preview, payload)`, which writes settings, then types, then templates, then overrides, one store call each, and returns a summary with counts.

    Reuse or refactor the helpers `comparable`, `rewriteTypeIdentity`, and `reissueCollidingTemplates` from `typeFile.ts` rather than copying them. Document import keeps using `typeFile.ts`: `tests/sheet_manager/type-file.test.ts` and `tests/sheet_manager/import-export.test.ts` must pass, with a new case for a document whose embedded type has no pages (FR-020).

- [ ] T045 [US5] Create `src/sheet_manager/components/dialogs/library/ImportPreview.tsx`:
    - a file input with `accept=".json"`;
    - a rejection message with `role="alert"` that names the reason and the entry;
    - a preview tree with state badges, reasons, and the Replace / Keep both switch on conflicts;
    - tertiary auto-picked boxes;
    - **Import selected** and Cancel;
    - a summary toast.

    Enable Import in the `LibraryDialog.tsx` mode switch.

- [ ] T046 [US5] Delete `src/sheet_manager/components/dialogs/TemplateImportDialog.tsx` and fold `tests/sheet_manager/template-import-dialog.test.tsx` into the import cases of `tests/sheet_manager/library-dialog.test.tsx`. The import cases cover:
    - the conflict choice;
    - Keep both;
    - a rejected file changes nothing;
    - a legacy type file and a template file preview.

    Keep the shipped-view-id collision rule from spec 012 T021. Remove the old dialog's entry points (toolbar or library) and run `yarn audit:dead-code`.

- [ ] T047 [US5] Fill the US5 strings (en and ru) in `translations/source/{en,ru}/ui/sheet/library.yaml`.

---

## Phase 8: User Story 6 — One set of accent colors (Priority: P3)

**Goal**: The editor and the library use primary and secondary accents, and violet becomes `tertiary`, kept for edge cases only (T-081).

**Independent Test**: Open the editor and the library in both themes. No violet appears except on automatically added parts, and the palette lists `tertiary`.

- [ ] T048 [P] [US6] Rename the `--editor` CSS variable to `--tertiary` (light and dark) in `src/css/custom.css` (`:45-46`, `:69`), and the Tailwind color `editor` to `tertiary` in `tailwind.config.cjs` (`:42`). Update the comment to say "edge cases only".
- [ ] T049 [US6] Replace every `*-editor*` class with `primary` (selection, frames, insertion points, drop targets) or `secondary` (hover, pressed Edit/Preview, help), following the "Accent Roles" section of `.agents/skills/tailwind-theming/SKILL.md`. The files are:
    - `src/sheet_manager/components/dialogs/template-editor/EditorNodeFrame.tsx`;
    - `OutlineTree.tsx`;
    - `AddElementMenu.tsx`;
    - `src/sheet_manager/components/dialogs/TemplateEditorDialog.tsx`.

    Then check with `grep -rn "editor\b" src --include=*.tsx | grep -E "(bg|text|border|ring|outline)-editor"`, which must return nothing.

- [ ] T050 [P] [US6] Extend `tests/sheet_manager/storybook.test.tsx`, or the palette test, so that `tertiary` is listed and `editor` is not. Add a test in `tests/sheet_manager/library-dialog.test.tsx` that export mode is the only place using `tertiary` classes in the library.
- [ ] T051 [US6] Update `.agents/skills/tailwind-theming/SKILL.md`: the token name is `tertiary`, and the class mapping table is final.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T052 [P] Add library stories to `src/sheet_manager/storybook/stories.ts`, per the constitution VI storybook rule: tree rows at every level with all badges, export tri-state and tertiary auto boxes, and import state badges. Add the tags to `REQUIRED_VARIANTS` in `tests/sheet_manager/storybook.test.tsx`.
- [ ] T053 [P] Write the guide page `docs/template-editor/library.mdx` and its ru mirror `i18n/ru/docusaurus-plugin-content-docs/current/template-editor/library.mdx`, with escaped ids `\{#library}`, `\{#library-move}`, `\{#library-export}`, and `\{#library-import}`, and with prose in our own words. Add them to the sidebar or category if the folder uses one.
- [ ] T054 Add `library`, `libraryMove`, `libraryExport`, and `libraryImport` to `EDITOR_GUIDE` in `src/sheet_manager/components/dialogs/template-editor/EditorHelp.tsx`. Link them from the `LibraryDialog` header, `MovePanel`, `ExportPanel`, and `ImportPreview`, and extend `tests/docs/template-editor-guide.test.ts` to check the anchors in both locales.
- [ ] T055 [P] Update the current-state docs:
    - `.agents/skills/sheet-templates/SKILL.md`: the library tree, placement, moves, default pages, and the library file;
    - `src/sheet_manager/AGENTS.md`: the structure line for `components/dialogs/library/` and `SystemPlugin.ruleset`;
    - the root `AGENTS.md` module-boundaries bullet about rulesets, if the wording needs `ruleset`;
    - a historical banner in `specs/012-*/contracts/type-file-format.md` saying the type-file export is superseded by the library file (spec 013).
- [ ] T056 [P] Add CHANGELOG entries in the current version section of `CHANGELOG.md` for the library tree, moves, library files, and accents. Mark T-071 and T-081 done in `TODO.md` and run `yarn validate:backlog`.
- [ ] T057 Run `yarn i18n:verify`, fix missing keys or add justified exceptions to `translations/i18n-exceptions.yaml`, then run `yarn verify:full`. Everything must pass: lint, typecheck, knip, tests, and the en and ru build.
- [ ] T058 Walk through the manual scenarios in [quickstart.md](./quickstart.md) on the dev server at localhost:3000, after checking whether it is already running. This step is left to the maintainer if it cannot run here.

---

## Dependencies & Execution Order

- **Setup (T001–T003)** has no prerequisites.
- **Foundational (T004–T015)** blocks every story. Within it:
    - T004 comes before T005;
    - T007 comes before T008 and T010;
    - T013 comes before T014.
- **US1 (T016–T026)** starts after the foundation. It is the MVP.
- **US2 (T027–T030)** needs US1's dialog and details (T021, T022).
- **US3 (T031–T037)** needs US1's tree (T018) and details (T021). It is independent of US2 except that the page move reuses T029.
- **US4 (T038–T042)** needs the tree (T018). It is independent of US3.
- **US5 (T043–T047)** needs `libraryFile.ts` (T039) for parsing.
- **US6 (T048–T051)** is independent of the library and can run any time after Setup. T041 and T045 use the `tertiary` name, so do T048 before them or rename later.
- **Polish (T052–T058)** comes after the stories it documents.

## Parallel Examples

- Foundation: T006, T011, T012, and T015 (tests, different files) run in parallel once their subjects exist. T048 (the token rename) can run alongside.
- US1: T017 (TreeRow), T019 (CreateForm), and T016 (tests) in parallel, then T018, then T020 through T022.
- US3: T031 (tests) and T033 (MovePanel) in parallel, while T032 is being written.
- US4 and US5: T038 and T043 in parallel, and T040 alongside T039.
- Polish: T052, T053, T055, and T056 in parallel.

## Implementation Strategy

1. **MVP**: Setup, Foundation, US1, and US2. The old dialog is fully replaced, pages are managed in the tree, and the default page is chosen per type.
2. **Increment 2**: US3 (moves), the most-requested fix after the tree.
3. **Increment 3**: US4 and US5 (file transfer), shipped together because export without import has little value.
4. **Increment 4**: US6 (accents). It can land earlier, even before the MVP, since it touches different files.
5. **Polish**: the storybook, the guide, current-state docs, and the full verification.

Commit only when the maintainer asks.
