# Data Model: Document references scoped to the template's setting

No stored shape changes. Templates, documents, and library files keep their schemas and versions.
Everything below is derived at read time.

## Reference field (unchanged)

| Property      | Type                   | Notes                                                              |
| ------------- | ---------------------- | ------------------------------------------------------------------ |
| `targetKinds` | `DocumentKind[]`, 1–20 | Kind ids. Kept as stored even when the scope no longer offers one. |
| `multiple`    | boolean                | Unchanged.                                                         |

The value stays a document id, or an id list when `multiple`.

## Setting scope (derived)

`catalogScopeOf(registry, template).setting`, with one of these shapes:

- `{ settingId }`: a user setting. Its system is the setting's `systemId`, which is a ruleset.
- `{ systemId, moduleId }`: a shipped line.
- `{ systemId }`: a shipped system, or a ruleset's own pages.

## Reference target (derived)

```ts
interface ReferenceTarget {
    kind: string; // document kind id
    label: string; // localized name; setting name added only when two targets would read the same
}
```

`referenceTargetsOf(registry, template): ReferenceTarget[]` follows the rules in research R2. It
returns one entry per kind: shipped types first in registry order, then user types by name.

Each target in a field's `targetKinds` is in one of two states:

- **available**: its kind is in `referenceTargetsOf`;
- **stale**: stored in the field, but not in the scope. Stale targets are kept, shown as
  unavailable, and reported.

## Document option (extended)

```ts
interface DocumentOption {
    value: string; // document id
    label: string; // title
    kind?: string;
    inScope?: boolean; // NEW: in the template's setting scope (R3); absent = in scope (preview/story data)
}
```

`inScope` is true when all of these hold:

- the document's system equals the scope's system;
- the document's `metadata.settingId` equals the template's user setting, or both are absent;
- the document's kind is one of the scope's target kinds.

## Reference entry (derived, per stored id)

| State        | Condition                                                 | Shown as                                                                                                      |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| in scope     | the option exists, `inScope`, and its kind is a target    | the title and an open button, as today                                                                        |
| out of scope | the option exists, and it is not in scope or not a target | the title, an "outside this setting" note, an open button, and the `reference-target-out-of-scope` diagnostic |
| missing      | no option has the id                                      | the missing placeholder and the `reference-target-missing` diagnostic, as today                               |

Remove shows in every state when the sheet is editable. The search offers only options that are
in scope, have a target kind, and are not already selected.

## Sheet diagnostic (new code)

`reference-target-out-of-scope`, with `{ fieldId, documentIds }`. It is reported once per set of
out-of-scope ids, and never in the preview, like `reference-target-missing`.

## Template issue (new code)

```ts
| { code: 'reference-target-unavailable'; nodeId: string; key: string /* kind */ }
```

`validateTemplateReferences` emits this issue once per stale target of each reference field. It
covers page and group fields, table cells, and custom list items. It is not blocking.

`validateTemplateReferences(template, options?)` takes `{ referenceScope?: boolean }`, which
defaults to `true`. Library file parsing passes `false`, because its own types and settings are not
installed yet (research R5). Every other caller keeps the default.
