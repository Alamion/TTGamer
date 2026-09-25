# Quickstart: validating feature 012

## Prerequisites

- `yarn install`. The dev server usually runs at <http://localhost:3000/>; check it first
  (`curl -sI http://localhost:3000/`) before starting one with `yarn start`.
- A browser profile that already holds Star Wars documents (a character, a droid, a vehicle),
  an edited default page, and one custom template, for the parity checks. Export them once
  **before** switching to the feature build, to compare afterwards.

## Automated gates

```bash
yarn verify:full          # lint, typecheck, translations coverage, knip, tests, build
yarn validate:i18n        # new ui/sheet/wod2e.yaml and editor/type strings in en + ru
```

Targeted suites while iterating:

```bash
yarn vitest run tests/sheet_manager/template-editor.test.tsx
yarn vitest run tests/sheet_manager/template-editor-history.test.ts
yarn vitest run tests/sheet_manager/user-document-types.test.tsx
yarn vitest run tests/sheet_manager/type-file.test.ts
yarn vitest run tests/sheet_manager/template-store-migration.test.ts
yarn vitest run tests/sheet_manager/systems/wod2e
```

## Manual scenarios

### 1. The page is visible while editing (Story 1, SC-001, SC-002)

1. Open the `/universal_sheet` library and edit the shipped Star Wars full sheet.
2. The page area shows the sheet with section accent bars and real columns. Identity is 2:1.
3. Click "Strength" on the page. The outline scrolls to it and the Settings area shows the
   trait's settings.
4. Change the Attributes section to 2 columns, then back to 3. Each change shows at once
   (< 100 ms, with no visible lag while typing a label).
5. The Force section is hatched ("hidden by condition") on sample data that is not
   Force-sensitive, and it is still selectable.
6. Click dots on the page. No real document changes (check the document list afterwards).

### 2. Arranging on the page (Story 2)

1. Drag the "Resources" group by its chip grip into column 1 of Identity. It lands there, and
   the outline shows the new order.
2. Click the "+" slot between two fields, choose Field, and see a new field selected at that
   position.
3. With a trait selected, press `Alt+↓`, `Alt+Shift+→`, `Alt+←` under a **Russian keyboard
   layout**. Each works and is announced. Try dragging a section into its own child: the move
   is refused with the message.

### 3. Preview and history (Story 3)

1. Switch to Preview and pick "Open document", then an example, then "Blank document". The
   page changes each time, has no editor marks, and applies conditions.
2. Delete a section, then press `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Z` (Russian layout too). The
   section is back with its settings, and the selection is restored.
3. Select a group, press `Ctrl+D`. A copy with new ids appears after it, and editing a value
   in the copy does not change the original.
4. Narrow the window below the md breakpoint. The Page / Outline / Settings tabs appear, and
   every action is still reachable.

### 4. A new document type (Story 4, SC-004, SC-005)

1. In the library choose "New document type", owner Star Wars, name "Organization". Add a
   name field, a select from a Star Wars catalog, a rating, and a list. Save.
2. The create dialog shows "Organization" under Star Wars. Create two documents, fill them,
   and reload. The values are kept.
3. Add a second page for the type. The view selector offers both pages.
4. Remove the rating field and save. Re-add a field with the same value key. The old value
   reappears.
5. Delete the type. The confirmation names 2 documents. Both still open, on the fallback page
   that lists their values.

### 5. Sharing (Story 5)

1. Export a user type and one of its documents.
2. In a clean profile (a private window), import only the document. The type is installed,
   the document opens on its page, and the type is in the create dialog.
3. Import the type file again with a changed name. Replace / Keep both / Cancel is offered.
4. Edit a file's `owner.systemId` to `unknown-system`. The import is rejected with the
   unknown-system error.

### 6. User setting (Story 6)

1. Choose "New setting" on World of Darkness 5th Edition, named "Ashen Realms". Give its
   character a page with relabelled traits, and add a user type.
2. The create dialog shows an "Ashen Realms" group. Create a character. It uses the setting's
   page, dice build `Nd10>=6` (V5), and the sheet shows the Dark Pack badge.
3. Repeat on World of Darkness 2nd Edition. The character has no Force content, dice use
   the classic pool, and the sheet shows no policy badge.

### 7. Star Wars parity (Story 7, FR-027b–d, SC-006)

1. Open the profile prepared under Prerequisites. Every document opens on the same page with
   the same values. The edited default page is still applied, and the custom template is still
   listed.
2. Roll a Star Wars attribute. The notation is identical to before.
3. Import the files exported before the switch. All import without errors.
4. The create dialog still shows Star Wars types under the same heading. Star Wars sheets
   carry the same notices as before.

## Documentation to update when complete

- `.agents/skills/sheet-templates/SKILL.md` (editor, user types, overrides v5, history rows).
- `src/sheet_manager/AGENTS.md` (user types, registry overlay, WoD 2e layering).
- `AGENTS.md` section 8 (system layering sentence names WoD 2e).
- A historical banner on the superseded editor parts of specs 006/007.
- `TODO.md`: T-054, T-046, and T-041 statuses; ROADMAP `gm-notes-templates` note.
