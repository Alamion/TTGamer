# Contract: template editor selection, clipboard, and menu (spec 023)

This contract fixes the names, roles, attributes, and text formats that tests, the guide, and other
editors depend on.

## Selection

- Every selected frame on the page has `data-selected`; the select button of its outline row has
  `aria-pressed="true"` (the outline stays a list of buttons, as today).
- The anchor frame and row also carry `data-anchor`; the anchor's outline button keeps
  `aria-current="true"`.
- Clicks on frames and outline rows:

    | Input                    | Effect                                                  |
    | ------------------------ | ------------------------------------------------------- |
    | click                    | select only this element                                |
    | Ctrl+click / ⌘+click     | add or remove this element                              |
    | Shift+click              | sibling range from the anchor                           |
    | click on empty page      | clear the selection                                     |
    | Escape (not typing)      | clear the selection (when a menu is closed)             |
    | Escape, nothing selected | close the editor (asks about unsaved changes, as today) |

- The live region announces "{n} elements selected" (plural rules) when the count changes by a
  modifier click or a menu item, and today's messages for single actions.

## Settings area with several elements

- Root: `data-settings-for="multiple"` and a heading "{n} elements selected".
- A list of the selected names, each a button "Open {name}" that selects only that element.
- The shared action row (Move up, Move down, Duplicate, Remove) as for one element.
- Shared settings in the spec 022 groups, each with its spec 022 `data-setting` key. A mixed
  value: checkbox `aria-checked="mixed"`, text and number boxes empty with the placeholder "Mixed".
- Every element has the placement and display condition settings, so the shared list is never empty.

## Clipboard text

- MIME `text/plain`, UTF-8 JSON as in [data-model.md](../data-model.md) (`CopiedElements`),
  `formatVersion: 1`. The text is stable across releases with the same `formatVersion`; a
  breaking change raises the version, and older editors refuse newer text with the version
  message.
- Messages (YAML, en shown):
    - refused, damaged: "These copied elements could not be read."
    - refused, version: "These elements were copied from a newer version of the editor."
    - pasted: "Pasted {n} element(s)." (announced)
    - cut: "Cut {n} element(s)." (announced)

## Context menu

- Surfaces: the page area (`[data-editor-page]`) and the outline (`[data-outline]`). Opens on
  right click, touch long press, the menu key, and Shift+F10.
- `role="menu"`, items `role="menuitem"`, in this order, with a separator between groups and before Remove (destructive, always last; it
  belongs to the Edit group in the shortcut list):

    | Item                                                  | Shortcut shown (non-Mac / Mac) | Group     |
    | ----------------------------------------------------- | ------------------------------ | --------- |
    | Cut                                                   | Ctrl+X / ⌘X                    | edit      |
    | Copy                                                  | Ctrl+C / ⌘C                    | edit      |
    | Paste                                                 | Ctrl+V / ⌘V                    | edit      |
    | Duplicate                                             | Ctrl+D / ⌘D                    | edit      |
    | Add to selection / Remove from selection (touch only) | —                              | selection |
    | Move up                                               | Alt+↑ / ⌥↑                     | arrange   |
    | Move down                                             | Alt+↓ / ⌥↓                     | arrange   |
    | Move out of the group                                 | Alt+← / ⌥←                     | arrange   |
    | Move into the group above                             | Alt+→ / ⌥→                     | arrange   |
    | Remove                                                | Delete / ⌫ or ⌦                | edit      |

- Disabled items have `aria-disabled="true"` and stay in place.
- On Apple platforms Remove also answers ⌫ (Backspace) outside text boxes; the menu shows ⌫.
- On no element: only Paste ("Paste at the end of the page").
- Closing returns focus to the frame's grip or the outline row it opened on.

## Shortcut list

- Toolbar button "Keyboard shortcuts" (icon `Keyboard`, `aria-keyshortcuts="?"`).
- Radix Dialog titled "Keyboard shortcuts", a `table` per group (Edit, Selection, Arrange,
  History), columns "Keys" and "Action" with `scope="col"`.
- The rows are every command with `keys` or `clipboard`, in registry order, in platform notation.
- `docs/template-editor/index.mdx` (`#arranging` table, en and ru) lists the same commands in the
  non-Mac notation; `tests/sheet_manager/editor-commands.test.ts` compares them.

## Diagnostics

- `template-clipboard-invalid` with `details: { stage: 'version' | 'schema', error }` on a refused
  paste of text that names the elements format.
