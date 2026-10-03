# Quickstart: validating spec 023

**Feature**: [spec.md](./spec.md) | **Contract**: [contracts/editor-ui.md](./contracts/editor-ui.md)

## 1. Automated

```bash
yarn vitest run tests/sheet_manager/editor-selection.test.ts tests/sheet_manager/editor-clipboard.test.ts \
  tests/sheet_manager/editor-commands.test.ts tests/sheet_manager/editor-shared-settings.test.tsx \
  tests/sheet_manager/editor-context-menu.test.tsx tests/sheet_manager/template-editor*.test.ts*
yarn verify:full
```

What must hold:

- Damaged, newer-version, oversized, and foreign-system clipboard texts are refused or reported
  as the contract says; the page is unchanged after a refusal.
- A pasted copy has no id of the original, and its formulas read its own children.
- The command registry, the shortcut list, and the guide's table list the same shortcuts (SC-004).
- **SC-005**: copy, paste, remove, and a shared-setting change with every element of the full
  Star Wars sheet selected each finish within 1 s in the performance suite.
- **SC-006**: templates saved after these actions parse with the template schema.

## 2. Copy and paste (dev server at http://localhost:3000)

1. Open the Library, edit the full Star Wars sheet, select a section, press Ctrl+C.
2. Select a field in another section, press Ctrl+V. The copy appears after the field, selected,
   named "… (copy)"; one Undo removes it.
3. Close the editor, open a blank page of the same document kind, press Ctrl+V with nothing
   selected. The section is at the end of the page, with its original name and no issues
   (SC-001: time a 10-element block, under 20 s).
4. Open a page of another system and paste. The section is kept; its game-data fields are listed
   as issues, each leading to its setting.
5. Paste `{"format":"ttgamer-template-elements","formatVersion":99,"nodes":[]}` (copied from a
   text editor): the version message appears and nothing changes. Paste plain text on the page:
   nothing happens. Paste it into a label box: the text goes into the box.
6. Copy in one tab, paste in another tab's editor: the elements arrive.
7. Ctrl+X on a field: it disappears; paste it elsewhere.
8. In WebKit (Safari, or `playwright-cli` with WebKit): steps 1–2 and 7 work (keyboard fallback);
   copying in one tab and pasting in another may need the menu's Paste in the same tab.

## 3. Multi-selection

1. Ctrl+click three fields in different groups on the page; the outline marks the same three and
   the settings area says "3 elements selected".
2. Drag one of them into another group. All three move, in page order, and the preview showed all
   three; one Undo returns them (SC-002).
3. Shift+click a range in one group; press Delete; one Undo restores it with the selection.
4. Select the first fields of two groups and press Alt+↓: both move down within their groups;
   select the first and press Alt+↑: nothing moves and the menu's Move up is disabled.
5. Select a group and one of its fields, press Ctrl+D: the group is duplicated once.
6. With elements selected, press Escape: the selection clears and the editor stays open; press
   Escape again: the editor asks to close (when there are changes).

## 4. Shared settings

1. Select five fields with different display conditions: the condition shows "Mixed".
2. Set one condition: all five get it (SC-003); one Undo restores each one's own.
3. Select a field and a section: only the settings both have are shown, the value key is not.

## 5. Context menu

1. Right-click a field: the menu lists the actions with their keys; Paste is disabled before any
   copy. Copy, right-click a group, Paste: the copy is inside the group.
2. Focus an outline row, press Shift+F10: the menu opens; arrows and Enter work; Escape returns
   focus to the row.
3. Right-click empty page space: only "Paste at the end of the page".
4. Right-click inside a settings text box: the browser's menu opens.
5. Phone width (DevTools device mode): long-press a field, choose Add to selection, long-press
   another, Add to selection, then Remove: both go (SC-004).

## 6. Shortcut list

1. Press "?" on the page (also with the Russian layout): the list opens; Escape closes it.
2. The list shows Copy (Ctrl+C) and Move up (Alt+↑); on a Mac ⌘C and ⌥↑.
3. The guide's Arranging section shows the same shortcuts in English and Russian.

SC-007 (three people find Copy and Paste without being told) is checked in the maintainer's review.
