# Contract: Library files

This contract replaces the spec 012 type file as the library's export format; it still reads type
files. Documents that carry their type keep the spec 012 document-file contract unchanged.

## Library file

Filename: `ttgamer_library_<slug>.json`. The slug is the single picked setting's or type's name,
or `selection` when several items are picked.

```json
{
    "format": "ttgamer-library",
    "version": 1,
    "exportedAt": "2026-09-26T12:00:00.000Z",
    "settings": [
        {
            "id": "user-setting-a1b2c3d4",
            "name": "Ashen Realms",
            "systemId": "wod-v5",
            "pages": { "v5-character": "tpl-…" },
            "…": "…"
        }
    ],
    "types": [
        {
            "id": "user-e5f6g7h8",
            "name": "Cult",
            "owner": { "settingId": "user-setting-a1b2c3d4" },
            "defaultTemplateId": "tpl-…",
            "…": "…"
        }
    ],
    "templates": [
        {
            "id": "tpl-…",
            "documentKind": "user-e5f6g7h8",
            "systemId": "wod-v5",
            "settingId": "user-setting-a1b2c3d4",
            "…": "…"
        }
    ],
    "overrides": [{ "id": "star-wars-full-sheet", "systemId": "star-wars-wod", "…": "…" }],
    "included": {
        "user-setting-a1b2c3d4": "auto",
        "user-e5f6g7h8": "auto",
        "tpl-…": "picked"
    },
    "addresses": [{ "systemId": "wod-v5", "moduleId": "hunter", "definitionId": "hunter" }],
    "notices": ["…"]
}
```

### Rules

- `settings`, `types`, `templates`, and `overrides` may each be empty, but the file must contain
  at least one entry across the four.
- **Self-contained**: every `type.owner.settingId` must be in `settings` or already installed.
  The same applies to every user `documentKind` of a template, which must be in `types` or
  installed. A reference that is found in neither makes the entry `unavailable`; it does not
  reject the whole file.
- `overrides` are edited shipped pages, keyed by their `systemId` and `id` (the view id). An
  override for an unknown system or view is `unavailable`.
- `included` is informative. It lets the import preview show which parents were added
  automatically. Unknown or missing entries default to `picked`.
- `addresses` is informative. The preview rebuilds the tree from the registry, and addresses
  only name shipped places for a human reading the file.
- `notices` holds the publisher notices of every system and module the file touches (constitution
  VIII). They are ignored on import.
- Shipped settings, types, and pages are **never** serialized. Only their ids appear, through
  `owner`, `systemId`, `documentKind`, and `addresses`.

### Import validation (everything happens before any state change)

1. The file must be JSON, or the error is `parse`.
2. `format` must be one of the following, or the error is `format`:
    - `ttgamer-library`;
    - `ttgamer-document-type`, which is adapted as `{settings: [setting?], types: [type], templates}`;
    - `ttgamer-template`, which is adapted as `{templates: [template]}`.
3. The version must be supported (library 1, type 1, template 3), or the error is `version`.
4. Every entry must pass its schema: `UserSettingSchema`, `UserDocumentTypeSchema`,
   `CustomTemplateSchema`, and `validateTemplateReferences`. Otherwise the error is `schema`,
   and the message names the first failing entry. A single bad entry rejects the file, because a
   half-valid file is a corrupt file.
5. Catalog references that are unavailable here are stripped to manual choice and listed, as for
   template files.
6. Each entry gets a state, as described in [data-model.md](../data-model.md) under "Import
   preview".

### Writing (on confirm)

The writes are applied in dependency order: settings, then types, then templates, then
overrides. One store transaction is used per store.

| Choice    | Effect                                                                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| new       | Installed as is. A template id that collides with an unrelated template is re-issued, and its references follow (the spec 012 rule).                                                                                |
| Replace   | The installed entry with that id is overwritten. For a type, its installed pages that are not in the file are kept.                                                                                                 |
| Keep both | The entry and every picked entry below it get new ids. The name gets the translated suffix "(imported)". The remap covers `owner.settingId`, `settingId`, `documentKind`, `setting.pages`, and `defaultTemplateId`. |

Replacing a type keeps its installed pages, which differs from spec 012's `installTypePayload`.
Pages are now individually selectable, and an unticked page must not be deleted by a Replace of
its parent.

## Backward compatibility

- Spec 012 type files and template files open in the same import preview.
- Documents with an embedded `documentType` still import through the document import (spec 012),
  which is unchanged.
- The single-template export in the editor keeps writing `ttgamer-template` v3. The page's
  "Export" action in the library writes a library file with one template.
