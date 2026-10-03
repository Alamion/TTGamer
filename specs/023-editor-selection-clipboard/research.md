# Research: copy, paste, multi-selection, and the element menu (spec 023)

## R1. Selection in history

- **Decision**: `EditorSnapshot.selectedId` becomes `selection: { ids: readonly string[]; anchor:
string | null }`. `ids` is in click order, deduplicated; `anchor` is the last element clicked
  without Shift (the start of a Shift range and the paste place). A helper `primaryId(selection)`
  returns the anchor when exactly one element is selected, so today's single-element code (settings
  panel, issue focus, reveal) keeps one id to work with. Every command reads
  `normalizeSelection(draft, ids)`: ids that no longer exist are dropped, an id inside another
  selected container is dropped (the ancestor wins, spec US2 #6), and the rest are sorted by page
  order (depth-first walk).
- **Rationale**: undo must restore the previous selection (edge case "Undo after a multi-element
  action"), so the selection stays in the snapshot as today. Keeping click order lets Shift+click
  find its anchor; normalizing at use keeps the stored state simple.
- **Alternatives**: a separate selection store outside history (undo would leave stale selections);
  a `Set` in the snapshot (no order, no anchor).

## R2. Clipboard transport

- **Decision**: Ctrl/⌘+C, X, and V are handled through the `copy`, `cut`, and `paste` events on the
  editor's content element, not as keydown shortcuts. When the event target is not a text box, the
  handler calls `preventDefault()` and uses `event.clipboardData`: `setData('text/plain', json)` on
  copy and cut, `getData('text/plain')` on paste. Copy also stores the envelope in a module-level
  memory slot (`lastCopied`). The context menu's Copy and Cut call `navigator.clipboard.writeText`
  inside the click (best effort; rejection is ignored) plus the memory slot; the menu's Paste uses
  the memory slot only.
- **Fallback (WebKit)**: Safari does not dispatch `copy`/`cut`/`paste` when the focus is on a
  non-editable element and no text is selected. The keydown handler therefore also sees
  Ctrl/⌘+C, X, V (physical `KeyC`, `KeyX`, `KeyV`, not while typing) and arms a one-shot check:
  if the matching clipboard event has not run by the next task (`setTimeout(0)`), it performs the
  same action itself — copy and cut through `navigator.clipboard.writeText` (allowed inside the
  key gesture; rejection ignored) plus the memory slot, paste from the memory slot. A clipboard
  event that does arrive cancels the check, so the action runs once. On WebKit, pasting a copy made
  in another tab or by another author therefore needs a browser that dispatches `paste`; the menu
  and same-tab pastes always work.
- **Rationale**: clipboard events carry `clipboardData` synchronously with no permission prompt in
  every browser, follow the platform's own key bindings (⌘ on Mac, any layout), and leave text
  boxes untouched. Reading the clipboard from a menu click needs `navigator.clipboard.readText`,
  which Firefox and Safari gate behind a prompt or refuse; the memory slot covers the menu. The
  memory slot also keeps the copy when the system clipboard write fails (spec Assumptions).
- **Alternatives**: keydown + async Clipboard API (permission prompts on read, Safari refuses
  outside a user-gesture promise chain); a custom MIME type (`web application/…`, Chrome only);
  localStorage (copies would outlive the session and leak across profiles' tabs unexpectedly).
- **Note**: the content element must contain the focus for the events to reach it. Outline rows
  and page grips are buttons; a click that selects an element on the page moves the focus to the
  page area (`tabIndex={-1}`). Clicks the page leaves to sample value controls (`VALUE_CONTROLS`
  in `EditorPage.tsx`) never move the focus.

## R3. Envelope, validation, and identity

- **Decision**: the clipboard text is JSON
  `CopiedElements` (format `ttgamer-template-elements`, `formatVersion` 1, `source`, `nodes`; see
  [data-model.md](./data-model.md)). Parsing:
  `JSON.parse` → envelope shape check (format, integer version ≤ 1) → nodes parsed with the
  template node schema by wrapping them in a throwaway `CustomTemplateSchema` parse (the same way
  the tests build templates), so every node rule and `TEMPLATE_LIMITS` bound applies → the target's
  node count and depth limits are checked by the insert operation. Any failure refuses the paste
  with one message ("These copied elements could not be read") and reports
  `template-clipboard-invalid` with the failing stage; nothing changes. Text that is not JSON or
  has another `format` is ignored silently on the page (it is not a copy of elements: spec edge
  case), and pasted normally in text boxes.
- **Identity**: every pasted subtree goes through `cloneWithFreshIds` (today's Duplicate path):
  new ids for nodes, columns, options, entry fields. Value keys:
    - same page (`source.templateId === draft.id`): custom value keys are dropped, as Duplicate
      does, so the copy stores its own values (FR-003);
    - another page: custom value keys are kept unless the target draft already uses that
      coordinate, in which case they are dropped. A kept key is the author's own name for the value
      and lets documents that move between pages of one type keep the value (shared value key, as
      designed).
    - coordinates that address the system's data are always kept (today's rule).
- **Reference remap**: after renewal, a map `old coordinate → new coordinate` of every node inside
  the copy is applied to the copy's formula settings (`formula`, `maxFrom`, `minFrom`,
  `maxMinFrom`) and display conditions (`visibleWhen.coordinate`). Formulas are rewritten token by
  token through the formula lexer (identifiers only), never by string search. References to
  elements outside the copy are left as they are; on another page the draft issues report the
  ones that do not resolve (FR-006). Duplicate gets the same remap, fixing copies whose formulas
  read their own children.
- **Rationale**: the template schema is already the trust boundary for imported templates
  (constitution II); reusing it keeps one set of rules for untrusted input (clarification Q1).
- **Alternatives**: a separate node schema export (duplicates the template schema's refinements);
  keeping ids when the target lacks them (ids collide with later inserts and undo).

## R4. Context menu primitive

- **Decision**: `@radix-ui/react-context-menu` 2.x (React 19 peer range). One `ContextMenu.Root`
  per surface (page, outline), with the surface as the trigger. A capture `contextmenu` handler on
  the surface finds `closest('[data-editor-frame]')` / `[data-outline-row]`, selects it when it is
  not already in the selection, and records the target; a right click on no element targets the
  page root (Paste at end, FR-015). Inside the settings area there is no trigger, so text boxes keep
  the browser menu; on the page, a right click inside a sample input still opens the editor menu
  (the page is the element's preview, not a settings box).
- **Rationale**: Radix gives menu roles, roving focus, typeahead, pointer-up selection, touch long
  press (it opens on a held touch), the keyboard `contextmenu` event (menu key, Shift+F10), and
  focus return, matching the project rule for new modal behavior. One root per surface avoids a
  menu instance per frame on a 200-element page.
- **Alternatives**: a Popover anchored at the pointer (re-implements the menu pattern); one trigger
  per frame (hundreds of instances, slower renders).

## R5. Shortcut matching and notation

- **Decision**: `commands.ts` lists every command once: `id`, `keys` (physical `code` plus
  modifiers, or `clipboard: 'copy' | 'cut' | 'paste'`, or a `key` character for "?"), label message,
  group (Edit, Selection, Arrange, History), `available(context)`. `matchEditorShortcut` iterates
  the registry. Notation comes from one formatter: on Apple platforms (`navigator.userAgentData
.platform` or `navigator.platform` matching Mac/iPhone/iPad) ⌘ ⌥ ⇧, elsewhere Ctrl Alt Shift.
  The "?" shortcut matches `event.key === '?'` (Shift+7 on Russian layouts, Shift+/ on US) or
  `code === 'Slash' && shiftKey`, and never while typing.
- **Rationale**: one owner for keys keeps the menu, the list, and the handler in agreement (SC-004);
  "?" is a character, so the character is what authors press on any layout.
- **Alternatives**: hand-written list in the dialog (drifts); `code`-only "?" (wrong key on the
  Russian layout).

## R6. Shared settings

- **Decision**: a descriptor list, not an intersection of rendered panels. Each descriptor has
  `key` (the `data-setting` key of spec 022), `group`, `appliesTo(node)`, `read(node)`,
  `write(node, value)`, and a control kind (boolean, number, text, condition, docs link). The panel
  shows descriptors whose `appliesTo` holds for every selected node; equal `read` values show the
  value, otherwise "Mixed" (an indeterminate checkbox, an empty box with a "Mixed" placeholder).
  Initial descriptors: display condition, documentation link, Required, book name hint, column
  span, compact, hide title (cards), columns (containers), start folded (groups), minimum and
  maximum (when every node is the same numeric type). Identity settings (value key, options, table
  columns, entry field, type, kind) have no descriptor (FR-011).
- **Rationale**: settings parts render for one node and call single-node callbacks; reusing them
  for N nodes would need a fake node and mixed-value support in every control. A short descriptor
  list is explicit about what "the same setting" means across kinds (open question from the
  clarify session): only settings whose meaning is identical for every kind they apply to.
- **Alternatives**: render the first node's panel and broadcast changes (shows non-shared settings,
  no Mixed state).

## R7. Multi-element drag and moves

- **Decision**: `useEditorDrag` takes the normalized selection when the grip belongs to a selected
  element, else just that element. A slot is refused when it lies inside any dragged subtree or
  when inserting the set there breaks a limit. `placeNodes(draft, ids, placement)` removes the set
  and inserts it at the placement in page order (index adjusted for removed earlier siblings);
  preview and commit use it, so the preview shows the whole set (FR-010). Alt+↑/↓ use
  `moveEachByCommand`: each node moves one place within its own parent, processed from the edge
  inwards so adjacent selected siblings move as a block; nodes at the edge stay (clarification Q2).
  Alt+←/→ and column moves run only when every node has a target.
- **Rationale**: one placement function serves drag, preview, and paste placement.
- **Alternatives**: moving nodes one by one through `placeNode` (indices shift between steps).

## R8. Selection marks and performance

- **Decision**: `EditorSelectionContext` carries `selected: ReadonlySet<string>`, `anchor`, and
  `issueNodeIds`; frames read `selected.has(node.id)`. Frames are memoized on their props, and the
  context change re-renders consumers, so a selection change costs one pass over the frames'
  cheap headers, as today. Measured in the performance suite with every element selected.
- **Alternatives**: DOM attributes set imperatively (as the drag marks): unnecessary unless the
  measurement says otherwise.

## R9. Escape: selection before closing

- **Decision**: the editor's Radix `Dialog.Content` gets `onEscapeKeyDown`: when the selection is
  not empty and the key did not come from a text box or an open menu or dialog, it calls
  `preventDefault()` and clears the selection; otherwise the dialog closes through
  `requestClose` as today (asking about unsaved changes). The drag's own Escape (window capture,
  spec 022) still runs first and cancels a drag without touching the selection.
- **Rationale**: Escape already closes the editor; letting it also clear a selection without this
  order would ask "discard changes?" when the author only wanted to deselect (consistency review
  H1).
- **Alternatives**: Escape never clears the selection (spec US2 #8 asks for it); a separate key
  (no convention).

## Implementation results

- **Placement of the set operations**: `removeNodes`, `duplicateNodes`, `insertNodesAt`,
  `placeNodes`, and `moveEachByCommand` live in `multiOps.ts`, not `draft.ts`: they need
  `resolveMoveTarget`, and `moveTargets.ts` already imports `draft.ts`.
- **Outline attributes**: the anchor keeps `aria-current="true"` on the outline row (existing
  tests and the single-selection look rely on it); every selected row's button has
  `aria-pressed="true"`, and rows and page grips have `aria-haspopup="menu"`.
- **No "nothing in common" text**: every element has the display condition and the column span,
  so the shared list is never empty; the planned message was dropped.
- **Columns are not shared**: changing a container's column count in the single panel moves
  orphaned children into the last column; a bulk write would skip that, so `columns` has no
  shared descriptor.
- **Touch menu keeps the selection**: a long press on an element outside the selection keeps it,
  so **Add to selection** can grow it; the menu's other actions then act on the pressed element.
- **Shortcut hint replaced**: the static hint under the settings (a second list of keys) is gone;
  the toolbar's **Keyboard shortcuts** button and `?` open the list from the registry.
- **Duplicate improved**: Duplicate shares the paste's reference remap, so a duplicated group's
  formulas read its own copies instead of the original's elements.
- **Timings** (jsdom, full Star Wars sheet, every element selected): copy 39 ms, shared setting
  93 ms, remove 220 ms, paste of the whole sheet onto a blank page 1052 ms (a first render of the
  sheet); budget 3 s in jsdom.

### Quickstart walk (2026-10-03, dev server, Chromium through `playwright-cli`)

- **§2 Copy and paste**: Ctrl+C on Attributes and Ctrl+V with Other selected put
  "Attributes (копия)" at the end of Other, selected, with no issues; Ctrl+Z removed it. Copying
  Experience in one tab and pasting on the Brief page in a second tab used the system clipboard
  (the per-tab copy is empty there) and kept the name. Found and fixed: the reveal after a paste
  clicked the first `aria-expanded="false"` button of a folded ancestor, which was a "+" insert
  menu trigger, and opened the add menu; it now clicks header toggles only and does not select
  the block it opens.
- **§3 Multi-selection**: Ctrl+click on two outline rows marked both on the page and showed
  "Выбрано 2 элемента"; dragging Species (with Name selected) into Appearance previewed both,
  the ghost read "2 элемента", and both landed in page order with one announcement. Escape
  closed the menu, then cleared the selection, and the editor stayed open. Found and fixed: the
  outline's deepest rows are wider than the pane, and a drag scrolled the outline sideways; the
  outline pane now hides horizontal overflow (names already truncate).
- **§5 Menu**: a right click on Experience selected it and listed the actions with Ctrl/Alt keys
  and separators, Remove last.
- **§6 Shortcut list**: Shift+? opened it with the Russian layout's labels. Found and fixed: the
  site's table styles made each group's table as wide as its content, so columns did not line
  up; the tables are now full width with a fixed layout.
- **WebKit**: not run — the host lacks WebKit's system libraries (installing them needs sudo).
  The keyboard fallback is covered by `editor-clipboard-ui.test.tsx`.

Left for the maintainer's review: SC-007 (three people find Copy and Paste without being told)
and a check of the clipboard keys in Safari.
