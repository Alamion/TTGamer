---
description: 'Task list for feature 023: copy, paste, multi-selection, and the element menu'
---

# Tasks: Copy, paste, multi-selection, and the element menu

**Input**: Design documents from `specs/023-editor-selection-clipboard/`:

- [plan.md](./plan.md), [spec.md](./spec.md) (clarified 2026-10-03);
- [research.md](./research.md) (decisions R1–R8);
- [data-model.md](./data-model.md);
- [contracts/editor-ui.md](./contracts/editor-ui.md);
- [quickstart.md](./quickstart.md).

**Tests**: included. Constitution V asks for unit tests of pure helpers, component tests for
user-visible flows, and hostile-input tests for the clipboard (untrusted text, clarification Q1).

Paths are relative to the repository root. TE = `src/sheet_manager/components/dialogs/template-editor`,
Dialog = `src/sheet_manager/components/dialogs/TemplateEditorDialog.tsx`,
TESTS = `tests/sheet_manager`. Every task that adds UI text adds it to
`translations/source/{en,ru}/ui/sheet/templates.yaml` (group `editor.*`) and runs
`yarn build:translations`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no unfinished dependencies).
- **[Story]**: US1–US5 from spec.md, in priority order: US1, US2 (P1), US3, US4 (P2), US5 (P3).

---

## Phase 1: Setup

- [x] T001 Add `@radix-ui/react-context-menu` (2.x, the version line of the installed Radix
      packages) to `package.json` dependencies with `yarn add`; confirm `yarn typecheck` and
      `yarn audit:dead-code` stay clean (the package is used from US4; add a temporary
      `ignoreDependencies` entry in the knip config only if knip fails before US4, and remove it in
      T036).
- [x] T002 Add the strings of the whole feature to `translations/source/{en,ru}/ui/sheet/templates.yaml`
      (group `editor.*`), English per [contracts/editor-ui.md](./contracts/editor-ui.md):
    - commands `cmdCut` "Cut", `cmdCopy` "Copy", `cmdPaste` "Paste", `cmdPasteAtEnd` "Paste at the
      end of the page", `cmdDuplicate` "Duplicate", `cmdRemove` "Remove", `cmdMoveUp` "Move up",
      `cmdMoveDown` "Move down", `cmdMoveOut` "Move out of the group", `cmdMoveIn` "Move into the
      group above", `cmdColumnPrev` "Move to the previous column", `cmdColumnNext` "Move to the next
      column", `cmdUndo` "Undo", `cmdRedo` "Redo", `cmdAddToSelection` "Add to selection",
      `cmdRemoveFromSelection` "Remove from selection", `cmdToggleSelection` "Add or remove an
      element (click)", `cmdRangeSelection` "Select a range (click)", `cmdClearSelection` "Clear the
      selection", `cmdShortcuts` "Keyboard shortcuts";
    - groups `cmdGroupEdit` "Edit", `cmdGroupSelection` "Selection", `cmdGroupArrange` "Arrange",
      `cmdGroupHistory` "History"; table heads `shortcutKeys` "Keys", `shortcutAction` "Action";
    - selection `selectedCount` "{count} elements selected" (plural forms), `openSelected` "Open
      {name}", `noSharedSettings` "These elements have no settings in common.", `mixed` "Mixed";
    - clipboard `pasted` "Pasted {count} element(s)." and `cut` "Cut {count} element(s)." (plural
      forms), `clipboardUnreadable` "These copied elements could not be read.",
      `clipboardNewer` "These elements were copied from a newer version of the editor.".
      Russian names follow the glossary (Вырезать, Копировать, Вставить, Дублировать, Удалить,
      Выбрать ещё, Смешанные значения). Run `yarn build:translations` and `yarn i18n:verify`.

---

## Phase 2: Foundational (blocks all stories)

- [x] T003 [P] Create `TE/selection.ts` per data-model "Editor selection": `EditorSelectionState`,
      `EMPTY_SELECTION`, `selectOnly(id)`, `toggleInSelection(state, id)`,
      `rangeSelection(draft, state, id)` (siblings of the anchor, else `[anchor, id]`),
      `normalizeSelection(draft, ids)` (existing ids, ancestors win, page order via a depth-first
      walk of `draft.children`), `primaryId(state)`.
- [x] T004 [P] Unit tests `TESTS/editor-selection.test.ts`: toggle adds/removes and moves the
      anchor; range within siblings in both directions; range across parents gives two; normalize
      drops missing ids and descendants of selected groups and sorts by page order; `primaryId` is
      null for 0 or 2+.
- [x] T005 Change `TE/history.ts`: `EditorSnapshot.selection: EditorSelectionState` replaces
      `selectedId`; `DraftChangeMeta.selection?` replaces `selectedId?`; `select(history, selection)`
      keeps "no undo step"; `createHistory(draft)` starts empty. Update every reader in
      Dialog (`selectedId` → `primaryId(selection)` for the settings panel, issue focus, reveal;
      single-id metas → `selectOnly(id)`) and `TESTS/template-editor-history.test.ts`. No behavior
      change: the full editor suites pass.
- [x] T006 Change `TE/editorActions.ts`: `EditorSelection` becomes `{ selected, anchor, issueNodeIds }`
      (a `ReadonlySet<string>`, the anchor id or null); `EditorActions.select` gets a third
      argument `mode` (`only`, `toggle`, or `range`). Update `TE/EditorNodeFrame.tsx` (`data-selected` from the set,
      `data-anchor`), `TE/OutlineTree.tsx` (`aria-pressed` on every selected row's select button,
      `aria-current` on the anchor), and the Dialog's memoized selection value (stable `Set` keyed by
      the ids string, research R8).
- [x] T007 [P] Add multi-node operations to `TE/draft.ts` per data-model: `removeNodes`,
      `duplicateNodes` (reusing `duplicateNode`), `insertNodesAt(draft, placement, nodes)` (limits
      checked once for the whole set), `placeNodes(draft, ids, placement)` (refuses placements inside
      the set; index adjusted for removed earlier siblings; column via `materializeColumns`), and
      `moveEachByCommand(draft, ids, command)` (research R7: edge-inwards per parent for up/down,
      all-or-nothing for out/in/column). Each returns `DraftOpResult` plus the new selection ids.
- [x] T008 [P] Unit tests `TESTS/editor-multi-ops.test.ts` for T007: removal picks the next
      selection; duplicates follow each original; insert as a block keeps order and respects
      `nodesPerTemplate`/`maxDepth`; place refuses inside the set and lands in page order from
      before/after the source; Alt+↓ on two adjacent siblings moves the block, on the first of two
      groups moves both, at the edge leaves that one (clarification Q2), out/in all-or-nothing.
- [x] T009 Create `TE/commands.ts` (research R5, data-model "Editor command"): the registry with
      today's commands only (undo, redo, duplicate, delete, move-up/down/out/in, column-prev/next),
      groups, labels from T002, `formatKeys(command, platform)` and `isApplePlatform()`; rewrite
      `matchEditorShortcut` in `TE/shortcuts.ts` to iterate the registry with identical results.
      Include the `pointer` bindings (Ctrl/⌘+click, Shift+click) and `clear-selection` (Escape) as
      list-only entries (data-model "Editor command"), and on Apple platforms Backspace for Remove
      when not typing (contract). `TESTS/template-editor-shortcuts.test.ts` passes unchanged; add a
      test that every registry key combination matches its own command and no two commands share
      keys.
- [x] T010 [P] Add diagnostics code `template-clipboard-invalid` to
      `src/sheet_manager/diagnostics.ts` (details `{ stage: 'version' | 'schema'; error }`).

**Checkpoint**: the editor behaves as before with the new selection state and command registry;
`yarn verify:fast` and the editor suites pass. Commit.

---

## Phase 3: User Story 1 — Copy and paste elements (P1) 🎯 MVP

**Goal**: Ctrl+C/X/V copy, cut, and paste elements within a page, between pages, tabs, and authors.

**Independent test**: copy a section of the full Star Wars sheet, open a blank page of the same
document kind, paste: the section and its contents appear without issues; one Undo removes it.

### Tests

- [x] T011 [P] [US1] Unit tests `TESTS/editor-clipboard.test.ts` for T013–T015:
    - serialize → parse round trip; not JSON and other `format` → `ignored`; `formatVersion` 2 →
      `version`; a node breaking the schema (empty label, unknown type, too many options) →
      `schema`; extra unknown keys are stripped; `__proto__` keys do not pollute;
    - identity: no pasted id equals a source id (nodes, columns, options, entry field); same page
      drops custom value keys; another page keeps them unless the coordinate exists; system-data
      coordinates kept;
    - remap: a formula and a `visibleWhen` inside the copy that read a copied rating now read the
      copy's coordinate; references outside the copy are unchanged; identifiers inside longer
      names are not replaced;
    - placement: nothing selected → end of root; a group → end of its children; a field → after it
      in its column; depth refusal falls back after the container, then to the root end; count
      refusal refuses.
- [x] T012 [P] [US1] Component tests in `TESTS/editor-clipboard-ui.test.tsx` (render Dialog, fire
      `copy`/`cut`/`paste` events with a stub `clipboardData`):
    - copy writes the envelope as `text/plain`; paste after the selected field selects the copy,
      named "… (copy)", one Undo removes it;
    - cut removes as one step and announces "Cut 1 element.";
    - a copy kept in memory pastes after the editor is closed and reopened on another template
      (original names kept);
    - pasting a foreign-system copy keeps the element and lists its issues;
    - refused text shows the message and leaves the draft equal; reports
      `template-clipboard-invalid` for version and schema stages only;
    - events whose target is a text box are not handled (the default is not prevented);
    - WebKit fallback (research R2): Ctrl+C / Ctrl+V keydown with no clipboard event following
      copies to the memory slot (and calls a mocked `navigator.clipboard.writeText`) and pastes
      from it; when the clipboard event does follow, the action runs exactly once;
    - SC-006: after copy, cut, and paste the draft parses with `CustomTemplateSchema`.

### Implementation

- [x] T013 [US1] Create `TE/clipboard.ts`: `CopiedElements` type, `serializeCopied(draft, ids)`
      (normalized subtrees, `source` from the draft), `parseCopied(text)` →
      `{ ok: true; copied } | { ok: false; stage: 'ignored' | 'version' | 'schema' }` (JSON, envelope,
      nodes parsed by wrapping them in a throwaway `CustomTemplateSchema` parse with the target's
      system and kind), the memory slot `rememberCopied`/`lastCopied`.
- [x] T014 [US1] In `TE/draft.ts` extend `cloneWithFreshIds` with options `samePage` and
      `targetCoordinates` for the value-key rule (research R3) and return the
      `old → new` coordinate map; add `remapCoordinates(node, map)` that rewrites `formula`,
      `maxFrom`, `minFrom`, `maxMinFrom` token by token with the formula lexer of
      `src/sheet_manager/features/sheet/declarative/formula.ts`, and `visibleWhen.coordinate`; apply
      it in `duplicateNode` too. Keep the "copy" name suffix only for `samePage`.
- [x] T015 [US1] In `TE/clipboard.ts` add `pastePlacement(draft, selection)` and
      `pasteCopied(draft, copied, selection)` → `DraftOpResult & { ids }` using T014 and
      `insertNodesAt` with the fallback chain of data-model "Paste placement".
- [x] T016 [US1] Wire clipboard events in Dialog: listeners for `copy`, `cut`, `paste` on the
      content element (edit mode only), skipped when the target is a text box (reuse
      `isTypingTarget` from `TE/shortcuts.ts`, exported); copy/cut call `preventDefault`, write
      `clipboardData`, remember in memory; cut removes with `removeNodes` in one step; paste parses
      `clipboardData` (falls back to the memory slot when the data is empty), applies `pasteCopied`
      in one step with the new selection, reveals it, announces "Pasted {count}"; refusals set the
      issue banner message and report diagnostics per contract. The page area gets `tabIndex={-1}`
      and receives focus only from a click that selects an element (never from clicks left to
      `VALUE_CONTROLS`), so the events reach the content element. Add the WebKit keydown fallback of
      research R2 (one-shot check after `KeyC`/`KeyX`/`KeyV` with the platform modifier, cancelled
      by the clipboard event). Reveal the pasted selection on the page and in the outline, opening
      folded ancestors (data-model "Multi-node operations").
- [x] T017 [US1] Add Cut, Copy, Paste to the command registry (`clipboard` field, no keydown
      binding) with `available` (selection non-empty; Paste: memory slot set) for US4/US5.

**Checkpoint**: quickstart §2 passes; commit.

---

## Phase 4: User Story 2 — Select several elements and act on them together (P1)

**Goal**: Ctrl/⌘+click and Shift+click selections; remove, duplicate, copy, drag, and Alt-moves
act on all of them as one undo step.

**Independent test**: Ctrl+click three fields in different groups, drag them into one group: all
three there in page order; one Undo returns them.

### Tests

- [x] T018 [P] [US2] Component tests `TESTS/editor-multi-select.test.tsx`: Ctrl+click and
      Meta+click toggle on page and outline, marks in both (`data-selected`, `aria-pressed`);
      Shift+click range; a plain click reduces the selection; Escape with a selection clears it and
      the editor stays open (no discard question), Escape with nothing selected asks to close as
      today, Escape in a text box does neither; the live region announces the count; Delete /
      Ctrl+D / Alt+↓ on the selection are one undo step each and Undo restores the previous
      selection; a group plus its child is duplicated once; after each action the draft parses with
      `CustomTemplateSchema` (SC-006).
- [x] T019 [P] [US2] Extend `TESTS/editor-drag.test.ts` and the drag component test: dragging a
      selected element moves the whole normalized selection via `placeNodes`; slots inside any
      dragged subtree are refused; the preview draft contains all moved nodes; dragging an
      unselected element moves only it.

### Implementation

- [x] T020 [US2] Modifier clicks: in `TE/EditorPage.tsx` the delegated click passes `toggle` for
      Ctrl/Meta and `range` for Shift (and `preventDefault` on Shift to avoid text selection); in
      `TE/OutlineTree.tsx` the row button does the same. Dialog `selectNode` applies
      `selectOnly`/`toggleInSelection`/`rangeSelection` and announces `selectedCount` when the count
      changes by a modifier click. Escape per research R9: the editor's `Dialog.Content`
      `onEscapeKeyDown` clears a non-empty selection with `preventDefault()` (not from a text box,
      an open menu, or a nested dialog) and otherwise leaves today's `requestClose`.
- [x] T021 [US2] Route Dialog commands through the normalized selection: delete → `removeNodes`,
      duplicate → `duplicateNodes`, move-up/down → `moveEachByCommand`, move-out/in and columns →
      all-or-nothing; announcements use the count for 2+ (existing single messages for 1). Copy and
      cut already use the selection (T016).
- [x] T022 [US2] `TE/useEditorDrag.ts`: `start(nodeId, …)` resolves the dragged set (the normalized
      selection when `nodeId` is selected, else `[nodeId]`); slot filtering, preview, `sameSpot`,
      origin marks, the ghost label ("{count} elements"), and `onCommit` work on the set through
      `placeNodes`; Dialog `commitDrag` takes ids and selects them.
- [x] T023 [US2] Settings area header for 2+ (contract "Settings area with several elements"):
      `data-settings-for="multiple"`, heading with the count, the list of "Open {name}" buttons, the
      shared action row bound to the multi commands; for now without shared settings (US3).

**Checkpoint**: quickstart §3 passes; commit.

---

## Phase 5: User Story 3 — Change shared settings of several elements at once (P2)

**Goal**: shared settings with Mixed values, written to every selected element in one step.

**Independent test**: select five fields with different display conditions, set one: all five get
it; one Undo restores each one's own.

### Tests

- [x] T024 [P] [US3] `TESTS/editor-shared-settings.test.tsx`: descriptor `appliesTo` per node kind
      (no descriptor for value key, options, columns, entry field, type, kind); field + section
      shows only the intersection; equal values show, different show Mixed (`aria-checked="mixed"`,
      "Mixed" placeholder); one change writes all nodes as one undo step and coalesces typing;
      leaving Mixed untouched changes nothing; an invalid docs link lists one issue per element;
      no common setting shows the empty text.

### Implementation

- [x] T025 [US3] Create `TE/sharedSettings.tsx`: the `SharedSetting` descriptors of research R6
      (display condition, documentation link, Required, book name hint, column span, compact, hide
      title, columns, start folded, minimum/maximum for same-type numeric fields) with the spec 022
      `data-setting` keys and groups, and `MultiSettings` rendering them with the `TE/settings/`
      building blocks inside `SettingsGroup`s (group state shared with the single panel).
- [x] T026 [US3] Mixed-capable controls: indeterminate checkbox and "Mixed" placeholder support in
      `TE/settings/SettingField.tsx` callers used by `MultiSettings` (no change for single-element
      panels); reuse the display-condition and docs-link editors with an optional `mixed` prop.
- [x] T027 [US3] Dialog: `onSharedUpdate(key, value)` maps every normalized selected node through
      the descriptor's `write` in one `change` with `coalesceKey` `multi:<ids>:<key>`; render
      `MultiSettings` under the T023 header.

**Checkpoint**: quickstart §4 passes; commit.

---

## Phase 6: User Story 4 — Element context menu (P2)

**Goal**: right click, long press, menu key, or Shift+F10 opens the actions with their keys.

**Independent test**: right-click a field: the menu lists actions with keys; Copy, right-click a
group, Paste: the copy is inside the group.

### Tests

- [ ] T028 [P] [US4] `TESTS/editor-context-menu.test.tsx` (fire `contextmenu`; Radix needs
      `PointerEvent` and `DOMRect` polyfills from `TESTS/helpers/editor.ts`): right click on an
      unselected frame selects it, on a selected one keeps the multi-selection; items in contract
      order with shortcut text (non-Mac and a mocked Mac platform); Paste disabled before copy and
      enabled after; Move up disabled on the first element; choosing an item runs the command
      once; empty page shows only "Paste at the end of the page"; Escape returns focus to the row
      or grip; a `contextmenu` inside the settings area is not intercepted; a right click during a
      drag is ignored; with a touch pointer the menu shows Add to / Remove from selection.

### Implementation

- [ ] T029 [US4] Create `TE/EditorContextMenu.tsx`: a Radix `ContextMenu.Root` wrapping a surface
      (`surface: 'page' | 'outline'`), a capture `onContextMenu` that resolves the target
      (`closest('[data-editor-frame]')` / `[data-outline-row]`), selects it if not selected,
      ignores events during a drag, and remembers whether the last pointer was touch; items built
      from the registry (`inMenu`, `touchOnly`), grouped with separators, disabled by `available`,
      shortcut text by `formatKeys`; focus returns to the target's grip or row on close.
- [ ] T030 [US4] Add Add to selection / Remove from selection (`touchOnly`) to the registry and
      wire both surfaces: wrap `TE/EditorPage.tsx`'s page area and `TE/OutlineTree.tsx`'s outline in
      `EditorContextMenu`; make outline rows and page grips reachable for Shift+F10 (focusable,
      `aria-haspopup="menu"`); menu Copy/Cut also call `navigator.clipboard.writeText` best effort.

**Checkpoint**: quickstart §5 passes; commit.

---

## Phase 7: User Story 5 — Shortcut list (P3)

**Goal**: every shortcut listed in the editor and the guide, in the author's platform notation.

**Independent test**: press "?" in the editor: Copy (Ctrl+C) and Move up (Alt+↑) are listed; the
guide shows the same.

### Tests

- [ ] T031 [P] [US5] `TESTS/editor-commands.test.ts`: the shortcut list renders one row per command
      with keys or clipboard binding, grouped, `scope="col"` heads; "?" opens it (with `key: '?'`
      and with `code: 'Slash'` + Shift), not while typing; Escape closes and restores focus; parse
      the `#arranging` shortcut table of `docs/template-editor/index.mdx` and of its Russian mirror
      and compare the key column with the registry's non-Mac notation (same set, same order).

### Implementation

- [ ] T032 [US5] Create `TE/ShortcutList.tsx` (Radix Dialog per contract) and add the `shortcuts`
      command (`{ key: '?' }`, last in the Edit group, `inMenu: false`) to the registry and
      matcher; Dialog toolbar gets the "Keyboard shortcuts" button
      (`Keyboard` icon, `aria-keyshortcuts="?"`).
- [ ] T033 [US5] Rewrite the shortcut table in `docs/template-editor/index.mdx` `#arranging` and the
      Russian mirror under `i18n/ru/docusaurus-plugin-content-docs/current/template-editor/index.mdx`
      to the full registry (cut, copy, paste, selection clicks, Escape, "?"); `yarn validate:i18n`.

**Checkpoint**: quickstart §6 passes; commit.

---

## Phase 8: Polish & cross-cutting

- [ ] T034 [P] Guide: in `docs/template-editor/index.mdx` and its Russian mirror describe copy and
      paste (placement, other pages and tabs, names, what the issue list shows, refused text),
      selecting several elements, shared settings with Mixed, and the context menu (long press on
      touch); keep existing anchors, add `#copy-paste` and `#selection`; `yarn validate:i18n`.
- [ ] T035 [P] Notes: `src/sheet_manager/AGENTS.md` (selection model, command registry as the
      single owner of keys, clipboard envelope as untrusted input) and
      `.agents/skills/sheet-templates/SKILL.md` (editor section).
- [ ] T036 [P] Performance: add a full-sheet case to `TESTS/template-editor.perf.test.tsx` selecting
      every element and timing copy, paste, remove, and a shared-setting change (each < 1 s,
      SC-005); remove any temporary knip entry from T001.
- [ ] T037 [P] Backlog: mark T-089, T-090, T-093 ✅ in `TODO.md` with a dated "built in spec 023"
      note; `yarn validate:backlog`.
- [ ] T038 `CHANGELOG.md` v3.21.0 (one entry per story) and `package.json` 3.21.0;
      `yarn check:version`.
- [ ] T039 Run `yarn verify:full`; fix findings.
- [ ] T040 Walk `quickstart.md` §2–§6 on the running dev server with `playwright-cli` (Chromium),
      and §2 steps 1–2 and 7 again in WebKit to check the clipboard fallback (research R2); record
      results and refinements in `research.md`; leave SC-007 for the maintainer's review.

---

## Dependencies & execution order

- Phase 1 → Phase 2 → stories. T005 before T006 (both touch Dialog); T003 before T005; T007 and
  T009 are independent of T005/T006.
- US1 needs T003 (normalized selection) and T007 (`insertNodesAt`); it works with one selected
  element and does not need US2.
- US2 needs Phase 2; its copy/paste of several elements comes from US1 without extra work.
- US3 needs US2's header (T023).
- US4 needs the registry entries of US1 (T017) and US2's selection; US5 needs the full registry
  (after US4's T030).
- Polish last.

## Parallel examples

- Phase 2: T003 ‖ T007 ‖ T009 ‖ T010; T004 after T003, T008 after T007.
- US1: T011 ‖ T012 first; T013 → T014 → T015 → T016 → T017.
- US2: T018 ‖ T019; T020 → T021 → T022 → T023.
- US3: T024 ‖ T025; T026 → T027.
- US4: T028 ‖ T029; T030 after T029.
- Polish: T034 ‖ T035 ‖ T036 ‖ T037.

## Implementation strategy

1. MVP = Phases 1–3: copy and paste of one element across pages (the most requested item).
2. US2 completes P1: the selection makes copy, remove, and drag act on many.
3. US3 and US4 (P2), then US5 (P3); each a separate commit.
4. Each phase ends with targeted tests and `yarn verify:fast` (pre-commit); `yarn verify:full` in
   Polish.
