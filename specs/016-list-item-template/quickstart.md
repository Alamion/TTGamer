# Quickstart: Custom list item template

## Automated

```bash
yarn vitest run tests/sheet_manager/list-items.test.tsx tests/sheet_manager/list-item-change.test.ts
yarn vitest run tests/sheet_manager/template-editor.test.tsx tests/sheet_manager/storybook.test.tsx
yarn verify:full
```

## Manual walkthrough (dev server at http://localhost:3000/universal_sheet)

1. **Legacy list.** Open a sheet whose template has an old custom list (a Hunter or V5 user
   page with "Custom skills"). The rows look as before: name, five dots, S/P/E, die, and ×.
   Toggle S, then reload: S stays on. This is new; before, it was dropped.
2. **Resource entries.** In the editor, add a custom list and name it "Bonds". Open "Entry", pick
   Resource, and set the maximum to 10. Save. On the sheet, add three entries, name them, and
   change the current values. Reload: every value is kept, and each entry shows "/ 10".
3. **Unnamed images.** Add a list named "Mementos", turn "Entries are named" off, and pick Image.
   On the sheet, add two images. There is no name box. Each entry's × sits at the right of its
   label row and does not cover the picture.
4. **Multi-line notes.** Add an unnamed list with the Text entry type in the multi-line mode and
   an empty label. The × sits in a header row above the text box. Tab to it and press Enter:
   the entry is removed.
5. **Catalog on number entries.** Add a named list with a Number entry and bind a catalog with a
   number column as "Value from". On the sheet, type two letters and pick a suggestion: the name
   and the number fill in. Switch the list to unnamed in the editor: the catalog picker is
   disabled and shows the note.
6. **Type change warning.** Take the list from step 2 and change its entry type to Image, then
   save. The confirmation names "Bonds" and counts the values. Cancel: the draft stays open.
   Change the type back to Resource and save: no dialog appears, and the sheet still shows the
   values.
7. **Phone width.** Narrow the window to 400 px. Every × in steps 2–4 is on screen, and the page
   does not scroll sideways.
8. **Read-only.** Open a sheet read-only. No × or add button is shown.
9. **Storybook.** Open `/docs/dev/storybook/`. Lists appear for all 8 entry types, named and
   unnamed, plus the legacy list.
