# Sheet Templates — Editor

Reference for the `sheet-templates` skill: the template editor
(`components/dialogs/template-editor/`).

## Editor (`components/dialogs/template-editor/`)

Three areas (spec 012): **Outline** (`OutlineTree.tsx`), **Page** (`EditorPage.tsx`), and
**Settings** (`ElementSettings.tsx`, the selected element only); below `md` they are tabs. On
desktop two `PaneDivider`s (`role="separator"`, arrows / Shift / Home / double click) resize the
side areas; `usePaneWidths` keeps them in localStorage `template-editor-panes` (outline 160–420,
settings 260–560, page ≥ 360; only a CSS variable moves while dragging). The toolbar switches Edit /
Preview (`EditorPreview.tsx`) and has Undo / Redo and the shortcut list.

- `draft.ts`: `EditorDraft = CustomTemplate`; pure tree ops with structural sharing (`insertNode`,
  `moveNode`, `updateNode`, `removeNode`, `duplicateNode`, placement helpers `placeNode` /
  `insertAtPlacement` / `materializeColumns`), node factories, `moveTableColumn`, and
  `collectDraftIssues` (spec 022): issues carry `nodeId` and `setting: { group, key }`, where `key`
  is the control's `data-setting` (`label`, `maxFrom`, `entry.label`, `column:<id>.<key>`,
  `option:<i>`, `preset:<i>`, `tracker`, …). `checkFieldSettings` runs the same field checks on page
  fields, table columns, and list entry fields; column and entry issues select their table or list.
  Formula wording comes from `checkFormulaInput` (`features/sheet/data/formulaCheck.ts`), shared
  with the inline message under formula boxes. Two elements on one bridged system coordinate are not
  duplicates.
- `issues.ts`: `issueLocation(draft, zodPath)` maps a schema path to the nearest node and setting;
  `useSchemaBackstop` parses the draft with `CustomTemplateSchema` on open and 300 ms after typing
  pauses (~20 ms on the full sheet) and lists every rule the specific checks miss as "{Setting} has
  a value that is not allowed". Save is disabled by specific issues only; a refused save maps the
  Zod error the same way (raw schema text never reaches the author) and `reportUncoveredIssues`
  reports `template-draft-invalid` — add a specific check for it. Issue buttons call `goToIssue`:
  select, open the group, open `<details>`, focus `[data-setting]`. `cloneWithFreshIds` (Duplicate
  and paste) re-issues ids for nodes, table columns, entry fields, and options, keeps bridged
  coordinates, drops custom value keys on the same page (keeps them on another page unless taken
  there), and remaps the copy's formulas and display conditions to the copy's own coordinates
  (`renameFormulaCoordinates` in `declarative/formula.ts`, token-based).
- `history.ts`: every change goes through the dialog's `change` / `applyOp` into a bounded (100)
  history of `{ draft, selection }`; edits with the same `coalesceKey` (`<nodeId>:<props>`) within
  800 ms are one step.
- **Selection** (`selection.ts`, spec 023): `{ ids, anchor }` in each snapshot (undo restores it).
  Click selects one, Ctrl/⌘+click toggles, Shift+click adds the anchor's sibling range (across
  parents just the two). Every command uses `normalizeSelection` (existing ids, ancestors win, page
  order). `multiOps.ts` has the one-step set operations: `removeNodes`, `duplicateNodes`,
  `insertNodesAt`, `placeNodes` (drag of a set), `moveEachByCommand` (Alt+↑/↓ move each within its
  parent from the edge inwards, edge elements stay; out / in / columns all or nothing). Escape
  clears a selection through `Dialog.Content onEscapeKeyDown` before it closes the editor. With 2+
  selected the settings area is `MultiSettings` (`sharedSettings.tsx`): names, actions, and the
  `SHARED_SETTINGS` descriptors every selected node supports (Mixed = indeterminate / placeholder);
  a change writes every node in one coalesced step. Identity settings (value key, options, columns,
  entry field, type, kind) never get a descriptor. Fields all of one type (`sameTypeFields`) instead
  get `fieldSettings` in its `several` mode: every setting of the type (type included) except name,
  source, value key, options, catalog, and term hint, written to each field; `MixedSettingsContext`
  makes `SettingField`/`ToggleRow` show "Mixed".
- **Clipboard** (`clipboard.ts`, spec 023): `CopiedElements` JSON (format
  `ttgamer-template-elements`, `formatVersion` 1, `source`, `nodes`) through the browser's `copy` /
  `cut` / `paste` events on the dialog content (not in text boxes or over a text selection), plus a
  per-tab memory slot (`rememberCopied`). A keydown fallback runs the action when no clipboard event
  follows (WebKit without a text selection). Pasted text is untrusted: `parseCopied` ignores other
  text, refuses newer versions and nodes the template schema rejects (`template-clipboard-invalid`),
  and `pasteCopied` inserts with fresh ids after the last selected element, at the end of a selected
  group, or at the page end, falling back outward when the depth limit refuses. Paste reveals the
  copy, opening folded ancestors (header toggles only, never `aria-haspopup` triggers).
- `commands.ts` (spec 023): the one registry of editor commands — keys, clipboard bindings, clicks,
  the "?" character, label, group, menu flags. `matchEditorShortcut` (`shortcuts.ts`), the element
  menu, the shortcut list (`ShortcutList.tsx`), and the guide's `#arranging` table (checked by
  `editor-commands.test.tsx`) all read it; add a command there first. `matchEditorShortcut` matches
  **`KeyboardEvent.code`** (layout-independent: a Russian layout sends `я` with `KeyZ`); "?" matches
  the character. Text-editing keys stay with a focused field; Apple platforms also remove with
  Backspace. `useEditorShortcuts(element, handlers)` listens on the dialog content (a callback ref:
  portalled content mounts after the first render).
- `moveTargets.ts`: keyboard move targets (`resolveMoveTarget`); column moves in a flowing container
  call `materializeColumns` first so siblings keep their visible columns.
- **Page overlay**: `EditorPage` renders the real `DeclarativeSheetView` (deferred draft) on a
  scratch sample document (open document copy → first `definition.examples` entry → blank) inside
  `TemplateEditorOverlayContext` (`features/sheet/declarative/editorOverlay.ts`). The renderer wraps
  each node via `renderFrame` in `ChildrenGrid.renderNode`, renders condition-hidden nodes marked
  instead of dropping them, uses `editor-`-prefixed collapse keys, and asks the overlay for
  end-of-list slots and empty-column zones. `EditorNodeFrame` (chip, grip, insertion slot) skips
  re-rendering when its node, placement, and `version` (sample values + formula results) are
  unchanged — this keeps a keystroke on the full sheet ~40 ms in jsdom. One delegated click listener
  selects the innermost frame (value controls edit the sample); hover is one delegated `pointerover`
  setting `data-hover`.
- `editorActions.ts`: stable `select(id, origin, mode)` / `insertAt` / `moveTo` actions and the
  selection context (`selected` set, `anchor`, issue node ids).
- **Element menu** (`EditorContextMenu.tsx`, spec 023): one Radix Context Menu per surface (page,
  outline), opened by right click, touch long press, the menu key, or Shift+F10; the dialog's
  `EditorMenuSource` selects the target (a touch menu keeps the selection for Add to selection) and
  builds the items with disabled states from dry runs; focus returns to the grip or row.
- **Drag** (`useEditorDrag.ts`, spec 022): pointer events, mouse and pen only (touch uses the move
  buttons). A grip of a selected element drags the whole normalized selection (`draggedWith`,
  `placeNodes`; spec 023). Grips (`data-drag-handle`, test ids `page-grip-<id>` / `grip-<id>`) start
  it; past 5 px `nearestPlacement` picks the nearest accepted slot of the innermost container under
  the pointer (page: `[data-insert-slot]` keys `<parent|root>:<index>:<column|->` and frame
  rectangles; outline: `[data-outline-slot]` rows); `placeNode` on the draft the surface shows
  refuses own-subtree, depth, and no-op slots. After 320 ms on one target the page and outline
  render the uncommitted result (`view.preview`; 8 px hysteresis); release commits it as one history
  step, Escape / blur / pointercancel drop it. Marks are DOM attributes re-applied after renders
  (`data-drop-target`, `data-origin-slot`, `data-previewing`); the context value is stable so frames
  never re-render for a pointer move. `dragTransition` and `nearestPlacement` are pure and
  unit-tested.
- **Kinds** (`elementKinds.ts`, spec 022): presentation only — `section`/`group` are Group · Section
  / Card, `list`/`table` are List · Entries / Table (`nodeKindLabel`). `switchGroupKind` and
  `switchListKind` convert (entry field ↔ first column; other column types become text) and keep the
  other kind's settings in a per-dialog `KindStash`; `tableKindBlocked` refuses game and catalog
  lists; dropping columns asks first; `kindChangeReport` joins the save confirmation when documents
  hold values of the earlier kind.
- `AddElementMenu.tsx`: Radix popover of Group (a section at the root, a card inside a container),
  Field, List (entries), Tracker; items are built only while open.
- `ElementSettings.tsx` (spec 022): the actions row above the kind chip and the full name, then
  `mergeGroups` of settings parts in `SettingsGroup`s in the fixed order Content, Value, Limits and
  formulas, Look, Visibility and help (empty groups skipped; open state per dialog session through
  `SettingsGroupStateContext`; closed groups show issue counts from `IssueGroupCountsContext`).
  Parts are plain functions returning `GroupedSettings` (`fieldSettings` in `FieldEditor.tsx`,
  `primitiveSettings` in `PrimitiveConfig.tsx`, section, group, table, list, and placement parts) —
  no hooks in them; the components they return may use hooks. A fragment whose children are all
  nothing counts as empty, so a part must not return a component that renders `null` (check first,
  as with `hasTermHint`). Building blocks in `settings/`: `SettingField` (visible `<label htmlFor>`
  = accessible name, help link outside the label, hint, message, `data-setting`), `FormulaField`
  (fx, monospace, coordinate datalist, inline `checkFormulaInput` message), `KeyField` (`#`), one
  `inputClasses`. Row editors (options, presets, columns, tracker marks) sit in
  `[data-setting-list]` and may name inputs by `aria-label`. Table columns render a nested
  `FieldEditor` with keys prefixed `column:<id>.`, the list entry field with `entry.`. The catalog
  picker lists the draft system's catalogs only (validation stays global).
- Editor performance rules: tree ops keep untouched nodes' identity; `localizeTemplate` caches
  localized nodes per locale by identity; `useTemplatePage` returns one memoized object; panels read
  draft-derived data from `EditorModelContext` / `EditorFillTargetsContext`; the coordinate
  `<datalist>` is rendered once by the dialog.
- `TemplateEditorDialog`: explicit save/discard; editing a default id saves through
  `setDefaultOverride`, everything else through `saveTemplate` then `onSaved` (user types and
  settings record their pages). Library: reset clears the override; defaults cannot be deleted.
- Retarget (T-070): the header's "Type and setting" select (`listTemplateTargetGroups`, value
  `system/kind[/settingId]`, `setDraftTarget`) moves a page to any system kind, user type, or a user
  setting's core definition; bindings the target lacks become draft issues (save blocked). On save
  `planTemplateRetarget` (`features/sheet/data/templateRetarget.ts`) releases documents the page can
  no longer render (after a confirmation), moves user setting pages (a core definition without a
  page adopts it), and repoints a type's `defaultTemplateId` to another of its pages. Shipped
  overrides and caller-owned flows (`lockTarget`: a new type's first page, a setting page) keep
  their target.
- In-editor help (T-068): `EditorHelp` puts a "?" next to non-obvious settings, linking the guide
  `docs/template-editor/` (en + ru, explicit `\{#anchor}` heading ids) through `EDITOR_GUIDE`;
  `tests/docs/template-editor-guide.test.ts` fails when an anchor disappears from either locale. A
  new or renamed setting worth explaining gets a guide section and a topic.
- Test helpers: `tests/sheet_manager/helpers/editor.ts` (`resetEditorStores`, `pressShortcut` with
  `code` + layout `key`, `openSettingsGroups`, and pointer drags `startDrag` / `dragOver` /
  `releaseDrag` / `dragNode`, which polyfill `PointerEvent` and stub slot rectangles).
- **Row order on the sheet** (spec 022): `components/controls/RowMoveControls.tsx` (grip, "Move
  {name} up/down", Alt+↑/↓ through `rowMoveKeys`, focus kept; rows `[data-reorder-row]` inside
  `[data-reorder-list]`) serves template tables (`moveRow` rewrites row keys `0…n-1` with
  `moveTableRow`), own lists (`moveItem` on `updateList`), game lists (`CustomTraitList` /
  `MeritFlawList` `onMove`), system `RowsBody`, and the editor's table columns. Hidden when the
  document is read-only.
