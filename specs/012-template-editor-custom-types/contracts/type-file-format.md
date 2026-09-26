# Contract: Type files and documents with embedded types

> **Change record.** The library export of spec 013 (`ttgamer-library` v1) supersedes the type-file export; type files are still read by the library import, and documents keep embedding their type. Current behavior: `.agents/skills/sheet-templates/SKILL.md` ("Library").

## Type file

Filename: `ttgamer_type_<slug-of-name>.json`.

```json
{
    "format": "ttgamer-document-type",
    "version": 1,
    "type": {
        "id": "user-a1b2c3d4",
        "name": "Organization",
        "description": "…",
        "owner": { "systemId": "star-wars-wod" },
        "defaultTemplateId": "tpl-9x8y7z6w",
        "createdAt": "…",
        "updatedAt": "…"
    },
    "setting": { "id": "user-setting-…", "name": "…", "systemId": "wod-2e", "pages": {} },
    "templates": [
        {
            "id": "tpl-9x8y7z6w",
            "documentKind": "user-a1b2c3d4",
            "systemId": "star-wars-wod",
            "…": "…"
        }
    ],
    "notices": ["…"]
}
```

- `setting` is present only when `type.owner` is a user setting.
- `notices` holds the publisher notices of the owner system and module, as in template files.
  It is ignored on import.
- `templates` is non-empty. The template `defaultTemplateId` must be in it, and every template
  must have `documentKind` = `type.id`.

### Import validation (all before any state change)

1. `format` must match, and `version` must be exactly 1. Otherwise the version error is shown,
   as for template files.
2. `type` and `setting` pass their schemas, and `templates[]` pass `CustomTemplateSchema` and
   `validateTemplateReferences`.
3. An unknown `owner.systemId` or `setting.systemId` gives the existing `system` error (FR-025).
4. Unavailable catalogs are stripped to manual choice and listed in the degradation report.
5. Identity conflicts:

    | Situation                                  | Result                                                                                               |
    | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
    | type id unknown                            | install type (+ setting) + templates                                                                 |
    | same id, same content                      | nothing to do; reported as already installed                                                         |
    | same id, different content                 | Replace / Keep both / Cancel (the existing conflict dialog)                                          |
    | template id collides with another template | that template gets a fresh id; references to it (`defaultTemplateId`, `setting.pages`) are rewritten |

    **Keep both** re-issues the type id (and the setting id when present) and rewrites
    `documentKind`, `settingId`, and every reference inside the file.

## Document file of a user type

The existing document export (the raw envelope plus `notices`) gains an optional top-level
`documentType` key with the type file payload, minus the `format` and `version` fields:

```json
{
    "id": "…",
    "kind": "user-a1b2c3d4",
    "systemId": "star-wars-wod",
    "definitionId": "user-a1b2c3d4",
    "data": {},
    "templateValues": { "…": "…" },
    "metadata": { "…": "…" },
    "notices": ["…"],
    "documentType": { "type": { "…": "…" }, "setting": { "…": "…" }, "templates": ["…"] }
}
```

- The envelope parse strips unknown keys, so builds without this feature ignore
  `documentType`. On such builds the document itself then fails to parse, because its
  definition is unknown, and goes to recovery as today.
- On import:
    1. the embedded type is validated and installed, following the type-file conflict rules;
    2. then the envelope is parsed (it does not depend on the type, research R11);
    3. then the existing document conflict dialog runs.

    If the user picks **Keep both** for the type, the document's `kind` and `definitionId` are
    rewritten to the new id before it is stored.

- Exporting a document of an orphan type (its type was deleted) writes no `documentType`. The
  file imports anywhere and opens on the fallback page. Importing a type file with the same
  identity later restores its page. No snapshot of a deleted type is kept.
- Documents of shipped types never carry `documentType`.

## Template files

Unchanged. The format stays version 3, and the optional `settingId` is additive. The import of
a template whose id equals a shipped view id now gets a fresh id instead of shadowing the
shipped page.
