# Contract: Catalogs in the library and at their use sites

## Library tree

- **Rows**:
    - A **ruleset** row's children are its catalogs (user, then shipped read-only), then its
      settings.
    - A **setting** row's children are its catalogs, then its types.
- **Catalog row**: `Table2` icon, the name, the "Yours" badge (user catalogs), and a count
  "N entries" (plural). It is draggable when it is the user's own.
- **Keyboard and search**: catalogs follow the tree's roving focus, type-ahead, and search.
  "Only yours" keeps user catalogs, and "Edited shipped" hides catalogs.
- **Context menu (user catalog)**: Rename, Move…, Export, Delete. Shipped catalogs have no
  actions.
- **Create**: rulesets and settings (user, shipped, Rules only, and lines) offer "New catalog" in
  the details pane and the context menu. The form asks only for a name.

## Catalog details pane

**Header**: the name (rename in place for user catalogs), the owner path ("WoD 5e › Ashen
Realms"), and "Used by N templates".

**Toolbar**: Add entry, Add column, Paste rows, Delete selected. The paste field is a textarea
dialog; its preview lists the rejected lines, and the author confirms.

**Table**:

- First column: Name, required. An empty name shows an error; a duplicate name shows a warning
  badge.
- Then one column per catalog column. Its header holds the name (editable), a type menu (Text,
  Number, Toggle), move left and right, and delete.
- Cells:
    - text: a text input;
    - number: a `NumberInput`;
    - toggle: the `Checkbox` dot.
- Each row has move up and move down (labelled) and delete. Keyboard: Enter and Tab move between
  cells.

**Confirmations** (`ConfirmDialog`):

- retype with losses: "N values will be emptied";
- delete a column used by mappings: lists the templates;
- delete a catalog: lists the templates.

**Limits**: at 1000 entries, 20 columns, or 50 catalogs per owner, the add button is disabled and
an inline note says why.

**Shipped catalogs**: the same table, read-only, showing the entry name and the declared
fillable details.

## Field editor

- **Catalog picker** (choice fields and table choice columns). It groups the options:
    - "This setting" (user);
    - "<Ruleset>" (user, ruleset-owned);
    - "<System> catalogs" (shipped).

    A "?" next to it opens `/docs/template-editor/values#catalogs`.

- **Mapping editor**: reused. A user catalog's details are its columns, labelled with their names.
  For a table column, the target list holds only the sibling columns.
- **List editor**: custom lists (with `valueKey`) get the catalog picker and "Value from" (the
  number columns only, optional).

## Sheet

- **Choice field**: the options are the entries by name, searchable above 12. A pick writes the
  entry id, `#label`, and every fill in one change. A missing entry or catalog shows the `#label`
  text and keeps the value.
- **Custom list**: the name input suggests entries while typing (`CatalogSuggest`), and a pick
  sets the name and the value.
- **Table choice column**: the same as the field, but the fills write only that row.

## Guide

- `docs/template-editor/values.mdx#catalogs` (en and ru) gains "Your own catalogs": where they
  live (setting or ruleset), columns and entries, pasting, binding fields, lists, and table
  columns, and what move and delete do.
- `docs/template-editor/library.mdx` mentions catalogs in the tree.
