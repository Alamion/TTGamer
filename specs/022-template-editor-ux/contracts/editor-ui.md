# Contract: template editor and sheet UI (spec 022)

The approved look is in [prototype.html](../prototype.html) (rev. 2). This contract fixes the names,
the roles, and the attributes that tests and the issue list depend on.

## Settings panel

- The root element keeps `data-settings-for="<nodeId>"`.
- **Header.** An action row comes first: Move up, Move down, Duplicate, a spacer, then Remove. Each
  button keeps its accessible name. Below the row come the kind chip and the full name, for example
  "Field · Rating" and "Willpower". The name wraps and is never covered by the buttons.
- **Groups.** Each group is a `button[aria-expanded]` followed by a body, with these names and in
  this order: Content, Value, Limits and formulas, Look, Visibility and help. A collapsed group that
  holds an issue for this element shows "{n} issue(s)" instead of its setting count.
- **Every setting.**
    - It has a visible `<label>` above its control, and that label is the control's accessible name.
    - A help link "Help: {setting}" sits next to the label, outside the `<label>`.
    - An optional hint follows the control.
    - The control carries `data-setting="<key>"`. The keys are defined in
      [data-model.md](../data-model.md).
- **Formula fields** have an `fx` mark, use a monospace font, and keep the coordinate datalist.
  Under the box they show the message from `checkFormulaInput`, the same wording as the issue list.
  The box carries `aria-invalid` while the message is an error.
- **Value keys** have a `#` prefix mark.
- **Names that change.** These names change for the user, and tests follow them. English is shown;
  Russian comes from the same YAML keys.

    | Before                                                      | After            |
    | ----------------------------------------------------------- | ---------------- |
    | Shared value key (fields with the same key share one value) | Value key + hint |
    | Field label                                                 | Label            |
    | Help text (optional)                                        | Help text        |
    | Maximum from value or formula (optional)                    | Maximum from     |
    | Minimum from value or formula (optional)                    | Minimum from     |
    | Section title / Group title / Table title / List title      | Title            |
    | Field group (kind name)                                     | Card             |
    | Custom list (kind name)                                     | Entries          |

## Issue list

- `role="alert"` stays. Each issue with an element is a button whose text is the message.
- Clicking an issue selects the element and opens its group, then focuses `[data-setting=key]`.
    - For a table column, the column's details open first.
    - The page frame and the outline row scroll into view.
- Raw error text never appears. Unmapped schema problems read "{Setting} has a value that is not
  allowed." and name the element when one is found.

## Drag (mouse and pen)

- The grips keep their test ids, `page-grip-<id>` and `grip-<id>`. They become pointer handles and
  lose `draggable`.
- While dragging:
    - The page shows a marker line at the target.
    - The target container gets `data-drop-target`.
    - The outline shows an insertion row.
- After 320 ms the page renders the preview. The moved frame gets `data-previewing`, and the old place
  shows a dashed slot with `data-origin-slot`.
- Escape cancels the drag.
- Release commits through `moveTo`, as one undo step announced by the existing live region ("Moved …").

## Pane dividers (desktop width only)

- Each divider is `role="separator"` with `aria-orientation="vertical"` and the accessible names
  "Resize outline" and "Resize settings". It carries `aria-valuenow`, `aria-valuemin`, and
  `aria-valuemax` in px.
- Keys: ←/→ moves by 10 px, Shift moves by 40 px, Home restores the default. A double click restores
  the default too.
- The widths are stored in localStorage under `template-editor-panes`.

## Add menu and kinds

- The menu items are Group, Field, List, and Tracker, each with a one-line hint.
- **Group kind** is a radio group "Kind" with the options Section and Card, each with a hint.
- **List kind** is a radio group "Kind" with the options Entries and Table.
    - Table is disabled for game lists and catalog lists, and its hint gives the reason.
    - Switching Table → Entries with more than one column asks for confirmation in the app's dialog
      and names the columns that will be dropped.
- Outline rows and frame chips read "{Element} · {Kind}", for example "Group · Section" and
  "List · Table".

## Table columns in the editor

- Each column row shows a grip, the label (`data-setting="column:<id>.label"`), and Move up and
  Move down (names "Move {label} up" and "Move {label} down"), then Remove.
- Moving a column changes the page order at once and is one undo step.

## Rows and entries on the sheet

- Editable tables and lists get a leading control cell with a grip, "Move {name} up" and
  "Move {name} down". The first row has no up control and the last row has no down control.
- Alt+↑ and Alt+↓ on a focused row move it.
- Focus stays on the moved row's control after a move.
- Read-only sources show no move controls.
- The new order is saved with the document, through the same write path as the other row edits.
