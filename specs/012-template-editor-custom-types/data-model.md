# Data Model: Visual template editor and template-defined document types

Types are described as shapes. Persisted shapes are Zod schemas in the code, and every new
persisted field is optional and additive unless a store version is named.

## Editor session (in memory, never persisted)

| Entity                 | Fields                                                                                                        | Rules                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `EditorHistory`        | `past: EditorSnapshot[]`, `present: EditorSnapshot`, `future: EditorSnapshot[]`, `lastCoalesce?: { key, at }` | `past` ≤ 100 (oldest dropped); a new change clears `future`; same `coalesceKey` within 800 ms replaces `present` |
| `EditorSnapshot`       | `draft: CustomTemplate`, `selectedId: string \| null`                                                         | snapshots share untouched nodes with their neighbours (structural sharing)                                       |
| `DraftChangeMeta`      | `coalesceKey?: string` (`<nodeId>:<property>`), `announce?: string`                                           | `announce` goes to the live region                                                                               |
| `EditorSelection`      | `selectedId`, `hoverId` (DOM attribute only)                                                                  | a removed node's selection moves to the next sibling, else the previous one, else the parent                     |
| `PreviewData`          | `{ kind: 'open' } \| { kind: 'example', id } \| { kind: 'blank' }`                                            | `open` is offered only when the open document's `systemId` + `documentKind` match the draft                      |
| `SampleDocument`       | an envelope held by the scratch source                                                                        | created at editor open; reset when the draft's kind changes; discarded on close                                  |
| `DraftIssue` (changed) | `message: string`, `nodeId?: string`                                                                          | `nodeId` set whenever the issue belongs to a node                                                                |

## Document source (changed)

`DocumentSource` gains `preview: boolean`.

| Source                              | `readOnly` | `preview` | Writes                                               |
| ----------------------------------- | ---------- | --------- | ---------------------------------------------------- |
| Store (default)                     | false      | false     | store                                                |
| `createStaticDocumentSource`        | true       | true      | none                                                 |
| `createScratchDocumentSource` (new) | false      | true      | the in-memory envelope, same validation as the store |

`preview: true` disables "open document" on reference fields and the
`reference-target-missing` report, which today key on `readOnly`.

## Plugin declarations (changed)

- `DocumentDefinition.examples?: readonly DocumentExample[]`, where
  `DocumentExample = { id: string; label: DocumentViewLabel; create(): DocumentEnvelope }`.
- `SystemPlugin.coreDefinitions?: readonly DocumentDefinitionId[]`: the engine-only definitions
  a user setting may reuse. Registry invariant: each id exists in `documents` and has no
  `module`.
- Registry invariant (new): no shipped definition id or kind starts with `user-`.

## User document type (persisted, `documentTypeStore` v1)

```text
UserDocumentType
  id: "user-" + 8 [a-z0-9]        # also the document kind and definition id
  name: string (1..80)            # the author's own words, not translated
  description?: string (≤ 500)
  owner: { systemId, moduleId? }  # a shipped setting
       | { settingId }            # a user setting (systemId comes from the setting)
  defaultTemplateId: string       # a user template with documentKind = id
  createdAt, updatedAt: ISO string
```

Rules:

- A type exists only with a valid default page. Saving a new type saves its first template
  in the same action.
- `owner.systemId` must be registered; `owner.moduleId`, when given, must be a module of that
  system. An unresolvable owner quarantines the entry (max 100) and reports
  `template-quarantined`.
- A type's views are all user templates with `systemId` = the owner's system and
  `documentKind` = `id`, ordered with the default first.
- Two types may share a name. The create dialog shows the owner group, and under each user
  type its description (or a translated "no description"), so types with the same name can be
  told apart.

## User setting (persisted, `documentTypeStore` v1)

```text
UserSetting
  id: "user-setting-" + 8 [a-z0-9]
  name: string (1..80)
  description?: string (≤ 500)
  systemId: SystemId                              # a system with coreDefinitions (wod-v5, wod-2e)
  pages: Partial<Record<DocumentDefinitionId, string>>  # core definition → user template id
  createdAt, updatedAt
```

Rules: `pages` keys must be in the system's `coreDefinitions`, and values must be user
templates with a matching `systemId`, `documentKind`, and `settingId`. A missing page falls
back to the definition's default view.

## Persisted schema changes

| Schema                     | Change                                                                              | Compatibility                                                          |
| -------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `DocumentMetadataSchema`   | `settingId?: string`                                                                | additive; older builds strip it                                        |
| `CustomTemplateSchema`     | `settingId?: string`                                                                | additive; template file stays version 3                                |
| `templateStore`            | version 4 → 5; `defaultOverrides` keyed `` `${systemId}:${viewId}` ``               | migration re-keys from `override.systemId`; parse failures quarantined |
| `documentTypeStore` (new)  | `{ types, settings, quarantine }`, key `universal-document-type-storage`, version 1 | new store                                                              |
| `UserTypeDataSchema` (new) | `z.object({}).strip()` for every `user-` definition                                 | values live in `templateValues`                                        |

## Synthesized definitions (registry overlay, in memory)

| Case                            | Label                                         | Views                                    | `createDefault` | Page                                 |
| ------------------------------- | --------------------------------------------- | ---------------------------------------- | --------------- | ------------------------------------ |
| User type present               | `type.name` (literal)                         | type templates (view id = template id)   | `{}`            | default template                     |
| User type missing (orphan)      | "Unknown type" (translated)                   | one synthetic `fallback` view            | `{}`            | synthesized page of the stored keys  |
| Core definition in user setting | shipped label, grouped under the setting name | shipped views + setting-scoped templates | shipped         | `setting.pages[definitionId]` if set |

A synthesized definition is never listed as a template target or a create-dialog entry for
the orphan case.

## Orphan fallback page (in memory)

A `CustomTemplate` built from the document: one group titled with the document title, then
one `text` field per `templateValues` key (label = key, `valueKey` = key), in key order.
Non-string values render through `coerceStoredValue`. The page reports `template-fallback`
with reason `type-missing` once per document.

## Files

See [contracts/type-file-format.md](contracts/type-file-format.md).

## WoD 2e ruleset

```text
Wod2eCoreShape (engine; systems/wod2e/ruleset/schema.ts)
  metadata core: name, player, chronicle, concept, nature, demeanor, age,
                 appearance fields, biography, portrait
  attributes (9), skills { talents, skills, knowledges }, virtues,
  backgrounds, merits, flaws, willpower, health (7 marks),
  inventory, armor, weapons, experience,
  customTalents, customSkills, customKnowledges, notes

StarWarsShape (setting; systems/star-wars-wod/schema.ts)
  forceSkills, forcePoints, darkSideResistance, forcePowerItems,
  implants, species, homeWorld (+ droid, creature, vehicle, fodder schemas)
```

Invariant: `StarWarsCharacterDataSchema = { ...Wod2eCoreShape, ...StarWarsShape }` parses every
stored Star Wars character to exactly the value it parses to today (parity test on fixtures).
`metadata.setting` defaults to `'Star Wars WoD 2e'` only in the Star Wars definition.

| Plugin              | systemId                 | Definitions                                                                                                                          | Policies                        |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| Star Wars (setting) | `star-wars-wod` (frozen) | character, droid, creature, vehicle, fodder-group (frozen ids and views)                                                             | none (unchanged)                |
| WoD 2e (engine)     | `wod-2e` (new)           | `wod2e-character` (views `wod2e-sheet`, `wod2e-brief`); `coreDefinitions`                                                            | none (Dark Pack covers V5 only) |
| V5 (ruleset)        | `wod-v5`                 | `hunter` (module) + `v5-character` (new; kind `mortal`; views `v5-core-sheet`, `v5-core-brief`); `coreDefinitions: ['v5-character']` | `dark-pack` (unchanged)         |

## State transitions

```text
User type:    (draft in editor) --save--> active --edit pages--> active
              active --delete (confirm, N docs)--> removed; its documents → orphan page
              orphan documents --import type file with same id--> active again

Document of user type: created → edited (templateValues only) → exported (embeds type)
              → imported elsewhere (installs type after conflict choice)

Editor:       open (sample doc) → edit ⇄ preview → save | discard (confirm when dirty)
```
