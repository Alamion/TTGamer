# Design: Template Editor Architecture

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-06

## Approach

The editor moves to `src/sheet_manager/features/template-editor/` first, as a commit that only moves
files, so every later story edits its final paths and `git log --follow` keeps history. Then four
owners replace hand-kept lists:

- `settings/registry.ts`: one description per setting (US1).
- `session/`: a per-dialog store with history, selection, issues, announcements, and the switch
  stash. Operations are pure functions in `operations/`, and commands carry `run` and `enabled`
  (US2).
- `elements/registry.ts`: one editor entry per node type, checked to be complete by the compiler
  (US3).
- `saveChecks.ts`: the list of save effects (US4).

`draft.ts` is split last, with the guidance update (US5). The sheet renderer, template schema, and
stores are untouched.

Target layout (`features/template-editor/`): `model/` (tree, clone, factories, fields, tables,
catalogs), `issues/`, `settings/`, `elements/`, `operations/`, `session/`, `commands/`,
`components/` (panels, outline, page, menus), `TemplateEditorDialog.tsx`. The outside world imports
only these:

- `TemplateEditorDialog.tsx`;
- `model/ids.ts` (`generateDraftId`, used by the library and the shell);
- `components/EditorHelp.tsx`;
- `sampleDocuments.ts`.

## Decisions

- **D1 — Move first, as Foundation.** _Why_: if the move came last (P3 order), every file the
  stories touch would be moved again. A pure-move commit is reviewable by rename detection.
  _Rejected_: moving last; leaving the editor in `components/dialogs/` (it is a feature, not a
  dialog).
- **D2 — The session is a Zustand store created per dialog (`createStore` from `zustand/vanilla`),
  provided by context and read with selectors.** It replaces `historyRef` + `useState` + the
  `change`/`applyOp`/`commit` trio; callbacks read `store.getState()`, so their identity never
  changes and memoized frames stay memoized. _Why_: it gives stable actions and slice subscriptions
  without refs. _Rejected_:
    - `useReducer`: it still needs refs for stable callbacks, and every consumer re-renders on each
      change.
    - A module-level store: the state would outlive the dialog, which is global mutable state
      (constitution IV).
    - Persisting the session: out of scope.
- **D3 — An operation is `(draft, selection) => OpResult`.** `OpResult` is
  `{ ok: true, draft, selection?, announce? } | { ok: false, error, limit? }`. `announce` is a
  message descriptor with values or a count; the session translates it, so operations import no
  React and no `translate`. Selection operations always take `ids`. The announcement picks the
  element's name for one and the plural count for several, which keeps today's messages (FR-007).
  `multiOps.ts` and the single-node callbacks merge into `operations/types.ts` (`OpResult`),
  `selection.ts`, `structure.ts`, `fields.ts`, and `switches.ts`. _Rejected_: keeping single and
  multi versions behind one dispatcher, since the duplication remains.
- **D4 — Panels edit through `useNodeEdits()`, a hook that binds operations to the session.** It
  replaces the 17-member `ElementEditorCallbacks` prop; the three members no panel calls
  (`onInsert`, `onRemove`, `onMove`) disappear. `SeveralFieldCallbacks` becomes the same hook
  applied to the selection. _Rejected_: building the callbacks object in the session module and
  still passing it down (the prop chains stay).
- **D5 — The setting registry stores metadata, not controls.** Each entry holds:
    - `group`;
    - `label`;
    - `appliesTo(node)`;
    - `shared?: { control, inverted? }` for the multi-selection panel;
    - `identity?: true` for settings that name or store one element (today's `OWN_KEYS`);
    - `carry?: true` for settings that survive a source or kind switch when `appliesTo` holds for
      the new node.

    The panels keep their hand-written JSX but take the label and `data-setting` key from the entry.
    The following become views of the registry: `SHARED_SETTINGS`, `OWN_KEYS`, `FIELD_PANEL_KEYS`,
    `GROUP_KEYS`, `SETTING_NAMES` (issues), `carried()` (sourceNodes), and `LIST_ONLY_KEYS`
    (elementKinds). _Why_: a declarative control renderer would rewrite the 800-line panels for no
    author-visible gain (clarification Q1). _Rejected_: generating controls from the registry; it
    fits T-058 better, which can extend the entries later.

- **D6 — The `carried()` fix is `keepSettings(from, to)`.** It copies every `carry` key of `from`
  that applies to `to` and returns the dropped labels. Used by source switches (`sourceNodes.ts`)
  and kind switches (`elementKinds.ts`). Dropped keys go to the session stash (today's `KindStash`,
  generalized from list/table to every switch), so switching back restores them. The session
  announces "Not applicable to the new element: {settings}" (clarification Q2).
- **D7 — Commands own their behaviour.** `EditorCommand` gains `run(session)` and `enabled?(state)`.
  The following read the list:
    - the keyboard handler (`shortcuts.ts`, now `commands/keys.ts`);
    - the element menu (`menuSource` moves from the dialog to `commands/menu.ts`);
    - the toolbar undo/redo;
    - the shortcut list.

    A disabled command is skipped by the key handler and shown disabled in the menu for the same
    reason (US2 scenario 3). Clipboard commands keep their browser-event binding.

- **D8 — The element registry is a mapped type over `TemplateNodeType`**
  (`{ [T in TemplateNodeType]: ElementEditor<NodeOf<T>> }`), so a missing type fails `tsc`. Each
  entry has:
    - `kindLabel`;
    - `displayName(node)`;
    - `settings(node, ctx): GroupedSettings`, which replaces the `kindSettings` switch;
    - `create?()` for new fields, which replaces the `baseField` switch;
    - `kinds?` (group and list kind switches from `elementKinds.ts`).

    The add menu, the outline, `nodeKindLabel`, and `ElementSettings` read the registry.

- **D9 — A save check is `{ id, title, confirm, run(before, after, state) => string[] }`.** It is a
  list in `saveChecks.ts`, ordered kinds → lists → trackers → retarget, and the first check with
  lines gives the title, as today. The list, tracker, and kind reports stay in
  `features/sheet/data/`, wrapped by entries; the retarget plan stays a separate step because it
  also changes what the save writes. _Rejected_: folding the retarget into the list, since it
  applies documents as well as warning.
- **D10 — Tests stay in `tests/sheet_manager/`.** Only their imports change (SC-004). New unit tests
  go to `tests/sheet_manager/template-editor/`.

## Changed types and data

- No schema, persisted store, saved template, or file format changes; no migration.
- Removed: `ElementEditorCallbacks`, `SeveralFieldCallbacks`, `EditorActions`.
  `EditorActionsContext` and `EditorSelectionContext` become selectors on the session.
- New translation: `sheet.templates.editor.settingsDropped` (en + ru YAML).
- Moved: `components/dialogs/template-editor/**` and `TemplateEditorDialog.tsx` →
  `features/template-editor/`. Importers outside are updated: `LibraryDialog`, `library/*Panel`,
  `features/sheet/shell/{typeFile,libraryImport}.ts`, `features/docs/ElementStorybook.tsx`.

## Principles at risk

- **IV (stores):** the session store is created per dialog and dropped with it. It is not persisted,
  not global, and has one responsibility.
- **V (testing):** every operation, the registries, `keepSettings`, and the save checks get unit
  tests without rendering. The existing component tests stay the behaviour net.
- **VI (accessibility):** the dropped-settings announcement uses the existing live region, and
  existing announcements are unchanged (asserted by the existing tests).
- **VII (performance):** selector subscriptions must not re-render frames on unrelated edits. The
  perf tests in `template-editor.perf.test.tsx` and the move-preview test keep their budgets
  (SC-005).
- **I and II (boundaries):** the feature's four public files are listed in the module notes; nothing
  imports from `features/template-editor/` internals (checked with `grep` in the finish phase).

## Tests

- `template-editor/settings-registry.test.tsx`:
    - every `data-setting` rendered for each storybook element has a registry entry (FR-004);
    - every `carry` setting survives each source and kind switch it applies to (SC-001);
    - the switches in the acceptance scenarios of US1.
- `template-editor/operations.test.ts`: each operation on one id and on several gives the same
  result as today's single and multi paths, including the refusals for depth, count, and moving into
  itself.
- `template-editor/session.test.ts`:
    - a change, an undo, and a redo are each one step;
    - announcements are translated per count;
    - the stash restores dropped settings.
- `template-editor/commands.test.ts`: `enabled` agrees for keys and menu; disabled keys do nothing.
- `template-editor/element-registry.test.ts`: labels and display names match today's for every type;
  a type-level test that a missing entry fails.
- `template-editor/save-checks.test.ts`:
    - an edit that triggers every check yields today's confirmation text;
    - an added test check appears in the confirmation.
- Baseline for SC-005 (2026-10-06, `testing` at `1e30d8e`, dev server running): unit run 113 s, 196
  files, 2171 tests. The run before merge is compared on the same machine with the dev server
  running, best of two.
- Existing: all editor test files listed in `tests/sheet_manager/` pass with import changes only.

## Manual walk

1. Give a number field span 2 and a display condition, then bind it to a trait → both kept; nothing
   announced.
2. Switch a list with presets to a table → presets dropped and announced; switch back → presets
   restored; undo → list in one step.
3. Select three elements, then run delete, duplicate, and move from the keyboard and the menu → same
   results and messages as on `master`.
4. Right-click the first element → "Move up" is disabled; pressing its keys does nothing.
5. Save a page that drops tracker marks and switches a list with entries → one confirmation names
   both.
6. Open, edit, and save from the library on a phone-width window → the layout is unchanged.
