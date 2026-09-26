# Contract: Template editor interaction

This is the user-facing contract of the visual editor: what the author can do, and the stable
hooks that tests rely on. The approved prototype is the reference for the look.

## Areas

| Area     | Content                                                                                                             | Narrow screens (< md) |
| -------- | ------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Toolbar  | template name, setting · type, Edit / Preview switch, preview data picker (Preview only), Undo, Redo, Discard, Save | wraps                 |
| Outline  | one row per node: grip, kind, label, condition marker (◐ met / ◌ not met), issue marker; indented by depth          | tab "Outline"         |
| Page     | the draft rendered by `DeclarativeSheetView embedded` on the sample document, with the editor overlay               | tab "Page" (default)  |
| Settings | `ElementSettings` for the selected node, plus Move up / Move down / Duplicate / Delete and a shortcut hint          | tab "Settings"        |
| Issues   | the list under the areas (`role="alert"`); each issue with a `nodeId` selects its node when activated               | unchanged             |

## Overlay on the page (edit mode only)

- Every rendered node is wrapped in `EditorNodeFrame`, which carries `data-node-id`, a hover
  outline, and a selected outline. The chip shows "⠿ Kind · Label"; the grip is the drag
  source.
- Click selects the node, opens its settings, and scrolls the outline row into view. Clicks on
  value controls (dots, boxes, inputs, checkboxes) edit the sample document and do not change
  the selection.
- Insertion slots appear before each child and after the last one in every container and
  column (`data-insert-slot="<parentId|root>:<index>:<column|->"`, an accessible name like
  "Insert element here"). Activating a slot opens the add menu: Section, Field group, Field,
  Table, List, Tracker. Dropping a dragged node on a slot moves it there.
- An empty column of a multi-column container shows a drop zone
  (`data-drop-zone="<parentId>:<column>"`) with an insertion slot.
- A node whose `visibleWhen` is false on the sample document is rendered hatched, with a note
  naming the coordinate and the expected value. It stays selectable.
- The sample-data note sits above the page: values changed here never reach real documents.
- Section and group collapse state in the editor uses the prefix `editor-` and never touches
  the real page's state.

## Selection sync

| Action                      | Result                                                                           |
| --------------------------- | -------------------------------------------------------------------------------- |
| click a node on the page    | selected; settings shown; outline row scrolled into view (nearest)               |
| click an outline row        | selected; the page scrolls the node to the centre (instant under reduced motion) |
| undo / redo                 | the snapshot's selection is restored                                             |
| delete the selected node    | selection moves to the next sibling, else the previous one, else the parent      |
| click empty page background | selection cleared                                                                |

## Moves and inserts

Every move is one history step and is announced through the polite live region, for example
"Strength moved to column 2 of Attributes".

| Command                   | Pointer                             | Keyboard (physical keys, Ctrl = Ctrl or ⌘)                                 |
| ------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| move among siblings       | drag onto a slot                    | `Alt+ArrowUp` / `Alt+ArrowDown`; buttons in Settings                       |
| move out of the container | drag onto a slot                    | `Alt+ArrowLeft` (placed right after the container)                         |
| move into a container     | drag onto a slot inside it          | `Alt+ArrowRight` (end of the previous sibling container)                   |
| change column             | drag into a column or its drop zone | `Alt+Shift+ArrowLeft` / `Alt+Shift+ArrowRight`; column buttons in Settings |
| insert                    | slot → add menu                     | slot buttons are in the tab order; `Enter` opens the menu                  |
| duplicate                 | Settings button                     | `Ctrl+D` (`KeyD`)                                                          |
| delete                    | Settings button                     | `Delete` (not while typing in a field)                                     |
| undo / redo               | toolbar buttons                     | `Ctrl+Z` / `Ctrl+Shift+Z`, `Ctrl+Y` (`KeyZ`, `KeyY`)                       |

Rules:

- Shortcuts match `KeyboardEvent.code`, so they work with any keyboard layout (FR-011a). They
  are handled on the editor dialog content only and call `preventDefault()` when handled.
- While focus is in a text input, textarea, or select, `Ctrl+Z`, `Ctrl+Y`, `Delete`, and the
  `Alt+Arrow` moves are left to the browser (text undo, deletion, and word jumps).
- Refused moves (into itself, past depth 10 or 200 nodes) leave the draft unchanged and show
  the existing message (`cannotMoveIntoItself`, depth, count) in the live region and the issue
  area.

## Quick preview

- The Preview switch hides the outline, settings, and overlay. It renders the draft with
  `createStaticDocumentSource` and conditions applied, and it mounts only while active.
- Data picker options, in order:
    1. "Open document: <title>" (only when compatible);
    2. each declared example of the draft's definition;
    3. "Blank document".
- If the chosen document disappears, the picker falls back to Blank and says so.

## Undo history

- Bounded to 100 steps per editor session. Typing into the same property of the same node
  within 800 ms is one step.
- Discard with changes asks for confirmation, as today. Save clears nothing until the dialog
  closes.

## Test hooks (stable)

`data-node-id`, `data-insert-slot`, `data-drop-zone`, `data-outline-row="<id>"`,
`data-selected`, `data-condition-hidden`, the test id `grip-<id>` (outline and page chip), and
`data-palette-option` in the add menu. The MIME type for drag and drop is
`application/x-ttgamer-template-node`.
