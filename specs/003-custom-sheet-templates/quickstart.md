# Quickstart: Custom Character Page Templates

End-to-end validation guide for `/specs/003-custom-sheet-templates`. Prerequisites: repo
checkout, `yarn install`, Node ≥ 20. The dev server usually runs at `http://localhost:3000/`
(check before starting a new one: `yarn start`).

## Commands

```bash
yarn start                 # dev server → open http://localhost:3000/universal_sheet
yarn verify:fast           # lint + typecheck (any small edit)
yarn verify                # + full test suite (schema/persistence/import edits — required here)
yarn build:translations    # after touching translations/source YAML
yarn validate:i18n         # en/ru parity gate after YAML changes
```

## Validation scenarios

### 1. Author & save a template (US1)

1. Open `/universal_sheet` → template manager button in the sheet toolbar.
2. "New template" → choose base: _Standard character skeleton_ (or Empty / duplicate).
3. Add a section "Kit", add a fields block with a text field " insignia" and a table block
   "Weapons" with two columns; rename the template "My Kit"; Save.
4. **Expected**: template appears in the library under its document kind, with name +
   description; reopening the editor shows the exact saved structure.
5. **Negative**: try two fields with the same id → save is rejected naming the duplicate;
   leave the editor with unsaved changes → confirmation prompt, saved version untouched.

### 2. Use it as a character page (US2)

1. Create/open a character of the template's document kind → page selector lists "My Kit".
2. Select it → page renders sections/blocks/fields in order; fill several fields.
3. Reload the app (and restart if convenient) → same page, same values.
4. Switch to a built-in page and back → values retained. Read-only viewer context shows all
   content, nothing editable.

### 3. Catalog-backed field auto-fill (US3)

1. Edit "My Kit": on the table's item column attach catalog _Melee weapons_ → default fills
   offered (e.g. name → notes field); remap one detail, disable another; Save.
2. On the character page open the column's options → localized catalog entries (not a manual
   list).
3. Pick "Vibroblade" → linked fields populate instantly and stay editable.
4. Replace with "Sword" → fields re-copy Sword's data. Clear selection → copied values stay.
5. Editing another field is unaffected by any of the above.

### 4. Import / export (US4)

1. Template manager → export "My Kit" → downloads `ttgamer_template_my-kit.json`.
2. Delete the template locally (confirm; characters show fallback page + notice, values kept).
3. Import the file → template restored identically (structure + bindings).
4. **Collision**: import again → Replace / Duplicate / Cancel offered; Cancel mutates
   nothing; Duplicate creates an independent copy.
5. **Invalid**: hand-edit the JSON (`format` → `"x"`, or duplicate section id) → import
   rejected with a specific reason, library unchanged.
6. **Degradation**: change the file's `catalogId` to `"no-such-catalog"` → import succeeds;
   that column degrades to a manual list; notice names the affected field.

### 6. Shared value across templates (FR-25)

1. Author two templates for the same kind; give a text field in each the same
   `valueKey` (e.g., `appearance-color`) via the editor's "Shared value key" input.
2. Assign template A to a character, set the field to "ice blue".
3. Switch the page to template B → the field reads "ice blue"; edit it to "crimson".
4. Switch back to template A → reads "crimson" (one coordinate, two pages).
5. Rename the key in the editor → the old value stays orphaned; renaming back restores it.

### 5. Localization & a11y spot checks (FR-23/24)

- Switch site language ru ↔ en: all feature chrome (library, editor, notices, dialogs)
  follows; authored template labels stay verbatim; catalog option labels localize.
- Keyboard-only pass: tab through the editor and the custom page; dialogs trap focus,
  Escape closes and restores focus; errors are announced (`role="alert"`); icon-only
  buttons have accessible names.

## Artifact references

- File format rules: [contracts/template-file-format.md](./contracts/template-file-format.md)
- Binding registry rules: [contracts/catalog-binding.md](./contracts/catalog-binding.md)
- Store/envelope/merge semantics: [contracts/store-and-envelope.md](./contracts/store-and-envelope.md)
- Entities & state machines: [data-model.md](./data-model.md)
