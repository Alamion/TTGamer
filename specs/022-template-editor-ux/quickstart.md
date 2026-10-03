# Quickstart: validating spec 022

**Feature**: [spec.md](./spec.md) | **Contract**: [contracts/editor-ui.md](./contracts/editor-ui.md)

## 1. Automated

```bash
yarn vitest run tests/sheet_manager/template-editor*.test.ts* tests/sheet_manager/table-list-order.test.tsx \
  tests/sheet_manager/draft-issues-coverage.test.ts tests/sheet_manager/storybook.test.tsx
yarn verify:full
```

What must hold:

- The editor suites pass, with names updated per the contract.
- **SC-006**: one test template per schema rule shows a named issue and no raw text.
- **SC-005**: the shipped-template round trip is unchanged.
- The performance budget holds for a keystroke, a move, and the issue check on the full Star Wars sheet.

## 2. Settings panel (dev server at http://localhost:3000)

1. Open the Library, edit the full Star Wars sheet, and select Willpower. Check that:
    - the actions sit above the kind and name;
    - the groups appear in the order Content, Value, Limits and formulas, Look, Visibility and help;
    - the value key and Maximum from have visible names;
    - Maximum from has the fx mark (SC-001 check with 3 people).
2. Type `curage + 2` into Maximum from. A message appears under the box. Collapse the group: its header shows an issue badge.
3. Narrow the settings area to its minimum. The full name still shows.

## 3. Save problems

1. Add a List of kind Entries and clear the entry field label. Before Save is pressed, the issue list says "The entry field of list … has no label".
2. Click the issue. The list is selected, Content opens, and the entry label box gets focus.
3. In a table column, clear an option label of a choice column. The issue names the table and the column.
4. With the dev console open, no raw Zod JSON appears anywhere in the UI.

## 4. Dragging

1. Drag a trait into a group in another column, moving over the groups rather than the slots. A marker follows at once.
2. Hold still. The page shows the trait in place, and its old place shows as a dashed line.
3. Release. The page matches the preview, and one Undo returns it (SC-002: 10 tries).
4. Start another drag and press Escape. Nothing changes.
5. Drag near the bottom edge. The page scrolls.
6. Drag a group by its outline grip. The page shows the preview.

## 5. Areas

1. Drag both dividers, close the editor, then reopen it on another template. The widths are the same.
2. Reload the page. The widths are still the same (SC-004).
3. Double-click a divider. It returns to its default.
4. Focus a divider and press the arrow keys. The divider moves.
5. At phone width, the tabs show and no dividers appear.

## 6. Order

1. In the editor, move a table's third column up twice. The page shows it first.
2. On a sheet, fill three rows and move the last one to the top with the buttons and with Alt+↑. Reload: the order is kept (SC-007).
3. Move a custom list entry and a merit (a game list). Both orders are kept after a reload.
4. Drag a row by its grip to another position; the order follows the drop.
5. In a docs embed, no move controls show.

## 7. Kinds

1. The add menu shows Group, Field, List, and Tracker.
2. Switch "Advantages" to Card and back to Section. The title, contents, and columns stay.
3. Switch "Skills" (Entries) to Table: the entry field becomes the first column. Switch it back: the earlier entry settings return.
4. On a catalog list, Table is disabled and the reason is shown.
5. Switch a filled list's kind and save. The confirmation names the list.

Record the results and any refinements in research.md before closing the feature.
