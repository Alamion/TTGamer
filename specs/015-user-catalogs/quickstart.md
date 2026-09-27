# Quickstart: validating user catalogs

## Automated

```bash
yarn vitest run tests/sheet_manager/user-catalogs.test.ts tests/sheet_manager/catalog-edit.test.ts \
  tests/sheet_manager/library-tree.test.ts tests/sheet_manager/library-moves.test.ts \
  tests/sheet_manager/library-file.test.ts tests/sheet_manager/library-import.test.ts \
  tests/sheet_manager/library-dialog.test.tsx tests/sheet_manager/catalog-use-sites.test.tsx \
  tests/sheet_manager/document-type-store.test.ts tests/sheet_manager/storybook.test.tsx
yarn verify:full
```

Expected results:

- **Store**: the v2 → v3 migration works.
- **Scope**: `catalogScopeOf` returns the right owners for a user setting, Rules only, Hunter,
  and Star Wars.
- **Editing**: `catalogEdit` handles paste and retype conversions.
- **Tree**: catalogs are placed under rulesets and settings, with shipped catalogs read-only.
- **Moves**: loss detection covers ruleset → setting and setting → other ruleset.
- **File**: v2 round-trips, and v1 still imports.
- **Use sites**: picks fill targets on the field, list, and table row, and `#label` shows after a
  delete.
- **Storybook**: the guard sees the three use sites.

## Manual (dev server at http://localhost:3000; check it runs first)

1. **Create (US1)**: open the library and select "Ashen Realms". Choose New catalog "Relics", add
   the columns Power (number) and Cursed (toggle), and paste
   `Bone Flute\t2\tno` / `Black Mirror\t4\tyes` / `Broken\tx`. Two entries are added and one
   line is rejected. Reload: everything is kept.
2. **Ruleset scope**: on "World of Darkness 5th Edition", create "Common firearms". Open a Hunter
   page in the editor: the picker lists "Common firearms" but not "Relics". Open an Ashen Realms
   page: both are listed.
3. **Field (US2)**: bind "Relic" to Relics, and map Power → "Relic power" and Cursed →
   "Relic cursed". On a document, pick Black Mirror: 4 and on. Rename it to "Dark Mirror": the
   document follows.
4. **List and table (US3)**: in a custom list bound with Value from Power, type "Bo" and pick:
   the name and 2 are set. In a table choice column, pick in row 2: only row 2 fills.
5. **Library actions (US4)**: move "Relics" to a Star Wars setting and confirm the named
   templates. Delete it: the documents still show "Black Mirror". Export Ashen Realms with a
   catalog, delete both, import: the preview shows the catalog as new, then everything is
   restored.
6. **Guide (US5)**: the "?" beside the catalog picker opens the catalogs section in the reader's
   language.
