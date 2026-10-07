# Sheet Templates — Editor

Reference for the `sheet-templates` skill: the template editor (`features/template-editor/`, spec
025 layout). Outside code imports only `TemplateEditorDialog.tsx`, `model/ids.ts`
(`generateDraftId`), `components/EditorHelp.tsx`, and `sampleDocuments.ts`.

## Where to add things

| To add…         | Change                                                                                                 | Guard                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| A setting       | an entry in `settings/registry.ts` (group, label, `appliesTo`, `shared`, `identity`, `carry`, `unset`) | `settings-registry.test.tsx` fails for a control without one |
|                 | and its control in the element's panel, labelled `settingLabel(key)`                                   | the test also checks the control sits in the entry's group   |
| An element type | an entry in `elements/registry.tsx` (`typeLabel`, `name`, `settings`, optional `palette`)              | the mapped type fails `tsc` for a missing node type          |
| A command       | an entry in `commands/list.ts` (keys, label, group, `run`, `enabled`, menu flags)                      | `commands.test.ts`, `editor-commands.test.tsx` (guide table) |
| A save warning  | a `SaveCheck` in `session/saveChecks.ts` (title, `lines`)                                              | `save-checks.test.ts`                                        |
| A page edit     | a pure function in `model/`; an `Operation` in `operations/` when it selects, announces, or is refused | unit tests without rendering                                 |

## Layout

- **Session** (`session/store.ts`): one Zustand store per dialog (`createEditorSession`, never
  persisted) with the history, save issues, and announcement, plus the switch stash. Every change
  goes through `change(update, meta)` (plain page edit) or `run(operation)` (may be refused, select,
  and announce; one undo step). History (`session/history.ts`) keeps 100 `{ draft, selection }`
  snapshots with structural sharing; edits with the same `coalesceKey` (`<nodeId>:<props>`) within
  800 ms are one step. Components read slices with `useEditorState(selector)`; the dialog, which
  sits outside its providers, reads the store directly.
- **Operations** (`operations/`): `(draft, selection) => OpResult` with an `Announcement` descriptor
  the session translates (a name for one element, a count for several; a group selected with its own
  element counts once). `selection.ts` (remove, duplicate, move by command, `canMoveSelection`),
  `structure.ts` (insert at, place at, commit drag), `switches.ts` (kind and source switches),
  `multi.ts` (set operations: `removeNodes`, `duplicateNodes`, `insertNodesAt`, `placeNodes`,
  `moveEachByCommand` — up/down move each within its parent from the edge inwards, out / in /
  columns all or nothing).
- **Edits** (`session/useNodeEdits.ts`): `NodeEdits` binds the `model/` field, option, catalog, and
  column functions to the session for the panels (`useNodeEdits()`); `SelectionEdits` writes shared
  settings and same-type field settings to every selected element in one coalesced step;
  `useSelectionActions` gives the move / duplicate / remove buttons.
- **Commands** (`commands/`): `list.ts` is the one registry (spec 023) — keys matched on
  **`KeyboardEvent.code`** (a Russian layout sends `я` with `KeyZ`), the "?" character, clipboard
  bindings, clicks, labels, groups, menu flags, and `run` / `enabled`. `keys.ts`
  (`matchEditorShortcut`, `shortcutHandlers`, `useEditorShortcuts` on the dialog content via a
  callback ref), `menu.ts` (`createMenuSource`: the element menu, disabled for the same reason the
  keys do nothing), the shortcut list, the toolbar's undo/redo, and the guide's `#arranging` table
  all read it. Text-editing keys stay with a focused field; Apple platforms also remove with
  Backspace. Escape clears a selection (`clear-selection`) before it closes the editor.
- **Model** (`model/`): `EditorDraft = CustomTemplate`; pure tree operations with structural sharing
  (`tree.ts`: insert, move, update, remove, placement, `materializeColumns`), `clone.ts`
  (`cloneWithFreshIds` for duplicate and paste: fresh ids for nodes, columns, entry fields, options;
  keeps bridged coordinates; drops custom value keys on the same page, keeps them on another page
  unless taken; remaps the copy's formulas and display conditions), `factories.ts` (`newField` and
  node factories, empty and copied drafts), `fields.ts`, `tables.ts`, `catalogs.ts`, `page.ts`
  (description, retarget), `selection.ts` (`{ ids, anchor }`; click, Ctrl/⌘+click toggle,
  Shift+click sibling range; `normalizeSelection`: existing ids, ancestors win, page order),
  `moveTargets.ts` (keyboard move targets; column moves materialize columns first), `clipboard.ts`.
- **Issues** (`issues/`): `draftIssues.ts` (`collectDraftIssues`, spec 022) gives `nodeId` and
  `setting: { group, key }`, where `key` is the control's `data-setting` (`label`, `maxFrom`,
  `entry.label`, `column:<id>.<key>`, `option:<i>`, `preset:<i>`, `tracker`, …);
  `checkFieldSettings` checks page fields, table columns, and entry fields alike; formula wording
  comes from `checkFormulaInput` (`features/sheet/data/formulaCheck.ts`). `schemaIssues.ts`:
  `issueLocation` maps a schema path to node and setting (groups from the setting registry);
  `useSchemaBackstop` parses on open and 300 ms after typing pauses and lists rules the specific
  checks miss ("{Setting} has a value that is not allowed"). Save is disabled by specific issues
  only; a refused save maps the Zod error the same way and `reportUncoveredIssues` reports
  `template-draft-invalid` — add a specific check for it. `session/useDraftIssues.ts` derives the
  lists, per-group counts, and marked nodes; issue buttons select, open the group and `<details>`,
  and focus `[data-setting]`.
- **Settings** (`settings/`, `panels/`): `ElementSettings` (`panels/ElementSettings.tsx`) shows the
  actions row, kind chip, and name, then `mergeGroups` of the parts from the element registry plus
  placement, in the fixed order Content, Value, Limits and formulas, Look, Visibility and help
  (empty groups skipped; open state per session through `SettingsGroupStateContext`; closed groups
  show issue counts). Parts are plain functions returning `GroupedSettings` (`fieldSettings`,
  `primitiveSettings`, `elements/containers.tsx`, `elements/collections.tsx`) — no hooks in them; a
  part must not return a component that renders `null`. Building blocks: `SettingField` (visible
  `<label htmlFor>`, help link, hint, message, `data-setting`), `FormulaField`, `KeyField`,
  `inputClasses`. Row editors sit in `[data-setting-list]`. Table columns render a nested
  `FieldEditor` with keys prefixed `column:<id>.`, the list entry field with `entry.`. With 2+
  selected, `MultiSettings` (`panels/sharedSettings.tsx`) shows names, actions, and the registry's
  shared settings every selected node supports (Mixed when they differ); fields all of one type get
  `fieldSettings` in its `several` mode (`MixedSettingsContext`).
- **Switches** (`elements/kinds.ts`, `elements/sources.ts`, `settings/keepSettings.ts`): group and
  list kinds are presentation (Group · Section / Card, List · Entries / Table); `switchGroupKind`,
  `switchListKind` (entry field ↔ first column; other column types become text; `tableKindBlocked`
  refuses game and catalog lists; dropping columns asks first), and the source builders keep every
  `carry` setting the new element has (`keepSettings`), stash the others for the session, restore
  them on the way back, and announce the dropped ones by label.
- **Saving** (`session/useTemplateSave.ts`): explicit save/discard; a default id saves through
  `setDefaultOverride`, everything else through `saveTemplate` then `onSaved`. `saveEffects` runs
  the save checks (kinds, list entries, trackers); any lines, or documents a retarget releases
  (`planTemplateRetarget`, T-070: the header's "Type and setting" select moves a page to any system
  kind, user type, or a user setting's core definition; `lockTarget` and shipped overrides keep
  theirs), open one confirmation titled by the first check with lines.
- **Clipboard** (`session/clipboard.ts`, `model/clipboard.ts`, spec 023): `CopiedElements` JSON
  (format `ttgamer-template-elements`, version 1) through the dialog's `copy` / `cut` / `paste`
  events (not in text boxes or over a text selection) plus a per-tab memory slot; a keydown fallback
  covers WebKit without a text selection. Pasted text is untrusted: `parseCopied` refuses newer
  versions and nodes the schema rejects (`template-clipboard-invalid`); `pasteCopied` inserts with
  fresh ids after the last selected element, at the end of a selected group, or at the page end,
  falling back outward at the depth limit; paste reveals the copy (`revealNode` opens folded
  ancestors through header toggles, never `aria-haspopup` triggers).
- **Frame** (`components/`): three areas (`EditorPanes`: outline, page, settings; tabs below `md`;
  `PaneDivider`s resize the side areas, stored by `usePaneWidths` in localStorage
  `template-editor-panes`), `EditorToolbar` (Edit / Preview, help, shortcuts, undo / redo),
  `EditorTemplateFields` (name, target, description), `EditorFooter` (issues, announcer, save),
  `EditorConfirms`, `EditorProviders` (every context, each value stable until what it describes
  changes; the coordinate `<datalist>` once).
- **Page overlay**: `EditorPage` renders the real `DeclarativeSheetView` (deferred draft) on a
  scratch sample document inside `TemplateEditorOverlayContext`
  (`features/sheet/declarative/editorOverlay.ts`); condition-hidden nodes are marked, not dropped.
  `EditorNodeFrame` (chip, grip, insertion slot) skips re-rendering when its node, placement, and
  sample `version` are unchanged, and reads its own marks with `useNodeSelection(id)`. One delegated
  click selects the innermost frame; hover is one delegated `pointerover`.
- **Element menu** (`components/EditorContextMenu.tsx`): one Radix Context Menu per surface, opened
  by right click, touch long press, the menu key, or Shift+F10; a touch menu keeps the selection for
  Add to selection; focus returns to the grip or row.
- **Drag** (`components/useEditorDrag.ts`, spec 022): mouse and pen only; a grip of a selected
  element drags the normalized selection. Past 5 px `nearestPlacement` picks the nearest accepted
  slot (`[data-insert-slot]` / `[data-outline-slot]`); after 320 ms on one target the page and
  outline render the uncommitted result (8 px hysteresis); release commits one step, Escape / blur /
  pointercancel drop it. Marks are DOM attributes (the module remembers the marked elements); the
  dwell end sets the User Timing mark `template-editor:preview`, which the browser timings read.
  `dragTransition` and `nearestPlacement` are pure and unit-tested.
- **Add menu** (`components/AddElementMenu.tsx`): the registry's `PALETTE` — Group (a section at the
  root, a card inside a container), Field, List, Tracker; built only while open.
- Performance rules: tree operations keep untouched nodes' identity; `localizeTemplate` caches per
  locale by identity; panels read draft-derived data from `EditorModelContext` /
  `EditorFillTargetsContext` (`session/EditorModel.tsx`).
- In-editor help (T-068): `EditorHelp` links the guide `docs/template-editor/` (en + ru, explicit
  `\{#anchor}` ids) through `EDITOR_GUIDE`; `tests/docs/template-editor-guide.test.ts` fails when an
  anchor disappears.
- Tests: unit tests of the parts in `tests/sheet_manager/template-editor/`; dialog flows in
  `tests/sheet_manager/template-editor.*.test.tsx` and `editor-*.test.tsx`; helpers in
  `tests/sheet_manager/helpers/editor.ts` (`renderEditor`, `pressShortcut`, `openSettingsGroups`,
  pointer drags).
- **Row order on the sheet** (spec 022): `components/controls/RowMoveControls.tsx` (grip, "Move
  {name} up/down", Alt+↑/↓, focus kept) serves template tables, own lists, game lists, system rows,
  and the editor's table columns; hidden when the document is read-only.
