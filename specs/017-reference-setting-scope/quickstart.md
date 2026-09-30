# Quickstart: Document references scoped to the template's setting

## Automated

```bash
yarn vitest run tests/sheet_manager/reference-scope.test.ts tests/sheet_manager/reference-scope.test.tsx
yarn vitest run tests/sheet_manager/template-editor.test.tsx tests/sheet_manager/storybook.test.tsx
yarn verify:full
```

The runs should show:

- the offered types per setting, as in [research R2](./research.md#r2-which-document-types-a-scope-offers);
- no foreign documents in the sheet's search;
- out-of-scope entries shown with their note, openable, and removable;
- stale targets kept and reported.

## Manual, on the dev server (http://localhost:3000/universal_sheet)

1. **Setup**: create a Star Wars character, a Hunter character, and a V5 mortal. Create a user
   setting on V5 with one user type and one document of it.
2. **Hunter page**: open the Hunter page in the template editor and add a document reference. The
   types offered should be Character (Hunter), Mortal, and V5-level user types only. There should
   be no Star Wars types and no user types from the user setting.
3. **Hunter sheet**: on the Hunter sheet, target Character and search. Only Hunter characters
   should appear.
4. **Out-of-scope entry**: in the dev tools, store a Star Wars character's id in that field, then
   reload. The entry should show the character's title with "outside this setting", should open,
   and should be removable. After removal, the search should not offer it.
5. **Stale target**: import a template whose reference targets the user setting's type into
   Hunter. The editor should show the target as "(unavailable)", the problems panel should list
   it, and unchecking it should clear the problem.
6. **Star Wars vehicle**: on a Star Wars vehicle, the crew stations should offer Star Wars
   characters only.
