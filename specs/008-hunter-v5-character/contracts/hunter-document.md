# Contract: Hunter Document and Template Files

Boundary: `sheet_manager` import/export ↔ user files. Field ranges: [data-model.md](../data-model.md).

## Document export file

```jsonc
{
    "id": "…",
    "kind": "character",
    "systemId": "wod-v5",
    "definitionId": "hunter",
    "schemaVersion": 1,
    "metadata": { "title": "Lena Varga", "templateId": "v5-hunter-sheet", "tags": [] },
    "templateValues": {},
    "data": {
        "name": "Lena Varga",
        "attributes": { "strength": { "value": 2 }, "…": {} },
        "skills": {
            "medicine": { "value": 3, "specializationText": "Trauma, Triage" },
        },
        "health": { "levels": ["slash"], "bonus": 0 },
        "willpower": { "levels": [], "bonus": 0 },
        "creed": "Faithful",
        "drive": "Atonement",
        "edges": [{ "id": "e1", "name": "Sense the Unnatural", "note": "" }],
        "perks": [{ "id": "p1", "name": "Range", "edge": "Sense the Unnatural", "note": "" }],
        "despair": false,
        "desperation": 1,
        "danger": 1,
        // … remaining fields from data-model.md
    },
    "notices": [
        {
            "policy": "dark-pack",
            "text": [
                "Portions of the materials are the copyrights and trademarks of Paradox Interactive AB, and are used with permission. All rights reserved. For more information please visit worldofdarkness.com.",
                "This material is not official World of Darkness material.",
            ],
            "url": "https://www.paradoxinteractive.com/games/world-of-darkness/community/dark-pack-agreement",
        },
    ],
}
```

Rules:

- File name: `ttgamer_<safe title | "hunter">.json` (existing convention).
- `notices` is written for every document whose resolved policies are non-empty and omitted
  otherwise. On import it is ignored (stripped); it never enters the store.
- Import validates envelope → registry lookup (`v5`/`hunter`) → `schemaVersion` ≤ 1 → hunter schema.
  Failure: user-visible error (`role="alert"`), entry retained in recovery, `reportSheetIssue`.
- ID collision: existing Replace / Duplicate / Cancel dialog.
- Unknown `systemId`/`definitionId` (e.g. a future `vampire` file in this version): recovery, not drop.

## Template export file

Existing wrapper, `formatVersion` unchanged (3):

```jsonc
{
    "format": "ttgamer-template",
    "formatVersion": 3,
    "template": {
        "id": "…",
        "name": "Hollow Crown hunters",
        "systemId": "wod-v5",
        "documentKind": "character",
        "schemaVersion": 3,
        "children": [],
    },
    "notices": [{ "policy": "dark-pack", "text": ["…"], "url": "…" }],
}
```

- `notices` is derived from the policies of `template.systemId` (plugin policies). Ignored on import.
- Import of a template whose `systemId` is not registered: rejected with a clear message.
- Applying a template to a document with a different `(systemId, documentKind)`: refused with the
  localized "template does not fit this document" message and reports diagnostics code
  `template-incompatible`.
