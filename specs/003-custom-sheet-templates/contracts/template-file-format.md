# Contract: Template File Format (Import/Export)

Scope: JSON files exchanged via template export (FR-18) and template import (FR-19–FR-21).
This is the user-facing file boundary — validation happens fully before any state change.

## File shape

```json
{
    "format": "ttgamer-template",
    "formatVersion": 1,
    "template": {
        "id": "my-homebrew-page",
        "name": "My Homebrew Page",
        "description": "Optional description",
        "documentKind": "sentient",
        "schemaVersion": 1,
        "sections": [
            {
                "id": "identity",
                "title": "Identity",
                "blocks": [
                    {
                        "id": "identity-fields",
                        "type": "fields",
                        "columns": 2,
                        "fields": [
                            {
                                "id": "origin",
                                "label": "Origin",
                                "type": "text",
                                "required": false,
                                "valueKey": "origin"
                            }
                        ]
                    },
                    {
                        "id": "gear-table",
                        "type": "table",
                        "title": "Gear",
                        "minRows": 0,
                        "maxRows": 50,
                        "columns": [
                            {
                                "id": "gear-pick",
                                "label": "Item",
                                "type": "select",
                                "multiple": false,
                                "binding": { "catalogId": "melee-weapons", "fills": {} },
                                "options": [{ "id": "placeholder", "label": "Placeholder" }]
                            },
                            {
                                "id": "gear-notes",
                                "label": "Notes",
                                "type": "text",
                                "multiline": true
                            }
                        ]
                    }
                ]
            }
        ]
    }
}
```

Field-level schema authority: `CustomTemplateSchema` in `src/sheet_manager/types/template.ts`
(sections/blocks/fields/bounds/limits). This document fixes the wrapper and the rules the
schema cannot express.

## Wrapper rules

| Rule            | Value                                                                                                                                                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format`        | literal `"ttgamer-template"`; anything else ⇒ reject: "not a TTGamer template file"                                                                                                                                                                                                            |
| `formatVersion` | positive int; `2` = this contract (adds `systemId` + field `valueKey`). Newer than known ⇒ reject with "file was made by a newer version". v1 files ⇒ accept with `systemId` defaulting to `star-wars-wod` (FR-29; revisited when a second system ships). Never silently accept unknown shapes |
| `template`      | must parse via `CustomTemplateSchema`; unknown/legacy keys stripped, never trusted                                                                                                                                                                                                             |

## Naming convention

Export filename: `ttgamer_template_<templateId>.json` (extends the `ttgamer_` document
convention; document exports remain `ttgamer_<title|definitionId>.json`).

## Import algorithm (validation-first, atomic)

1. Read + `JSON.parse` — parse error ⇒ reject, no state change.
2. Wrapper checks (`format`, `formatVersion`).
3. `CustomTemplateSchema.parse(template)` — failure ⇒ reject with the schema's specific
   message (limit, duplicate id, bounds); nothing imported.
4. Catalog availability scan: for every field with a `binding`, check `catalogId` resolves in
   the binding registry.
    - All resolvable ⇒ import as-is.
    - Some unresolvable ⇒ import succeeds; those fields degrade to manual choice fields
      (binding dropped, existing static `options` used; author notified with the exact field
      labels affected — FR-21). The template's other content is untouched.
5. Identity collision with an existing template (`id` match):
    - **Replace** — overwrite the stored template with the imported one (characters keep their
      values; orphaned-value semantics apply).
    - **Duplicate** — import under a fresh id; the imported `name` gains nothing (names may
      duplicate).
    - **Cancel** — no state change.
6. Success feedback names the template and any degraded fields.

## Export algorithm

1. Take the **saved** template from the library (drafts are never exportable).
2. Serialize `{ format, formatVersion: 1, template }` — a byte-stable representation of the
   definition (no store bookkeeping fields like timestamps).
3. Blob download with the naming convention above.

## System scoping (D4)

Compatibility = `systemId` + `documentKind` (FR-26). An import whose id collides with an
existing template of a _different_ `systemId` still offers Replace (which re-scopes the
template and degrades previously assigned documents per FR-13) / Duplicate / Cancel.

## Round-trip guarantee (SC-004)

Export → import into an empty library yields a template that is structurally identical
(sections/blocks/fields order, settings, bindings). Timestamps/bookkeeping are not part of the
contract. Catalog bindings export with `catalogId` + `fills` verbatim; availability is
re-evaluated on the importing device only.

## What the file does NOT contain

- Character/template **values** — they travel with document (character) exports inside
  `envelope.templateValues`.
- User-UI locale — authored labels are verbatim user data (R9).
- Store metadata (`createdAt`/`updatedAt`) — library bookkeeping, not definition.
