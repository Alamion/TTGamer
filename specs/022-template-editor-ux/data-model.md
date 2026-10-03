# Data Model: Template editor usability from player feedback

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

No stored shape changes: templates (`CustomTemplateSchema`) and documents keep today's schema
(FR-006, FR-027). Everything below is editor state, presentation, or a new pure function.

## SettingsGroupId

`'content' | 'value' | 'limits' | 'look' | 'visibility'`, rendered in that order with the names
Content, Value, Limits and formulas, Look, Visibility and help.

**Group open state**: `Record<SettingsGroupId, boolean>` per editor dialog session. The defaults are
content, value, and limits open, and look and visibility closed. The state is shared by all element
kinds and is not persisted.

## GroupedSettings

`Partial<Record<SettingsGroupId, ReactNode>>`. This is what each settings part returns: the common
placement part, each node kind's part, FieldEditor, and the tracker parts. `mergeGroups(parts)`
concatenates the parts per group in part order. A group with no nodes is not rendered.

**Group membership for fields and primitives**, per the prototype review:

| Group               | Settings                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Content             | title or label, help text, kind (Group/List), show label, label position, placeholder text, select options, list entry field, table columns, presets                                             |
| Value               | stores value in / source, value key, current/max edits, catalog binding and fills, reference kinds, multiple                                                                                     |
| Limits and formulas | min/max/step, min/max rows, formula, maxFrom, minFrom, maxMinFrom                                                                                                                                |
| Look                | presentation, rating switches and flags, display (dots/tracker), compact, columns and widths, column placement and span, multiline, prefix/suffix, show title, framed, tracker and pool settings |
| Visibility and help | required, book name hint, display condition, documentation link, collapsible and starts collapsed                                                                                                |

## SettingRef and DraftIssue

```text
SettingRef = { group: SettingsGroupId; key: string }
DraftIssue = { message: string; nodeId?: string; setting?: SettingRef }
```

`key` equals the `data-setting` attribute of the control. Examples:

- `label`, `title`, `valueKey`, `formula`, `maxFrom`, `minFrom`, `maxMinFrom`, `docsPath`, `visibleWhen`
- `entry.label` for a list's entry field
- `column:<columnId>.<key>` for a table column
- `option:<index>`, `preset:<index>`, `mark:<index>`, `level:<index>`

**IssueLocation**: `issueLocation(draft, zodPath)` returns `{ nodeId?: string, setting?: SettingRef }`. It walks:

- `children` of the root, sections, and groups
- table `columns[i]`, giving `column:<id>`
- list `item`, giving `entry`
- select `options[i]`, presets, tracker marks, levels, and columns

It stops at the nearest tree node. When nothing matches it returns `{}`, and the issue is then listed without an element.

## Placement and DragState (editor session)

```text
Placement = { parentId: string | 'root'; index: number; column: number | null }   (existing)
DragState =
  | { phase: 'idle' }
  | { phase: 'pending'; nodeId; origin: Placement; start: Point }
  | { phase: 'dragging'; nodeId; origin: Placement; target?: Placement; since: number }
  | { phase: 'previewing'; nodeId; origin: Placement; target: Placement; at: Point }
```

**Transitions:**

1. `pending` → `dragging` once the pointer moves more than 5 px.
2. `dragging` → `previewing` after 320 ms on the same target.
3. `previewing` → `dragging` when the nearest slot differs and the pointer has moved more than 8 px.
4. Releasing with a target calls `moveTo`. That is one undo step, and the state returns to `idle`.
5. Escape, blur, pointercancel, or releasing with no target returns to `idle` and leaves the draft unchanged.

**Preview draft**: `placeNode(draft, nodeId, target)`. It is computed for rendering only and is never committed to history.

## PaneWidths

```text
PaneWidths = { outline: number; settings: number }   (px)
```

- Stored in localStorage under `template-editor-panes`. If the stored value is missing or broken, the defaults are used: outline 240, settings 320.
- Limits: outline 160–420, settings 260–560. The page area keeps at least 360.
- The widths are fitted to the dialog width on every render and on window resize.
- Stored widths are only rewritten after a drag, a key press, or a reset.

## Row order (documents)

- **Table rows**: `moveTableRow(rows: Record<string, Row>, from: number, to: number)` returns a new record. Its keys are `"0"…"n-1"` in the new order; the indexes refer to positions in the sorted row list. Cells keep their column-id keys.
- **Own-value list entries**: array move by position. Entry ids are unchanged.
- **System list entries**: array move on the bound data array.

## Element kinds (presentation)

| Stored `type` | Element | Kind    | Settings only this kind has                                                           |
| ------------- | ------- | ------- | ------------------------------------------------------------------------------------- |
| `section`     | Group   | Section | — (always foldable)                                                                   |
| `group`       | Group   | Card    | `hideTitle`, `collapsible`                                                            |
| `list`        | List    | Entries | `item`, `named`, `presets`, `catalog`, `columns`, `showTitle`, `framed`, `bindingKey` |
| `table`       | List    | Table   | `columns` (fields), `minRows`, `maxRows`                                              |

**KindStash**: `Map<nodeId, Partial<node>>` per dialog. It holds the kind-only settings that were dropped on a switch, and restores them when the author switches back. It is not persisted and is cleared when the dialog closes.

**Conversion rules**: research R8.
