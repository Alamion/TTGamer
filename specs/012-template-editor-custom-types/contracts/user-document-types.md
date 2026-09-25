# Contract: User document types and user settings

The boundary between user-defined types and settings (the `documentTypeStore`) and the
generic sheet code (the registry, page resolution, create and library dialogs). Generic code
never reads the type store directly; it goes through the registry overlay.

## Identity

| Id             | Format                              | Namespace rule                                                                                        |
| -------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| user type      | `user-` + 8 `[a-z0-9]`              | kind = definition id = type id; shipped ids and kinds may not start with `user-` (registry invariant) |
| user setting   | `user-setting-` + 8 `[a-z0-9]`      | stored in `metadata.settingId` and `CustomTemplate.settingId`                                         |
| user-type page | ordinary user template id (`tpl-…`) | view id = template id                                                                                 |

## Registry overlay

`SystemRegistry.setUserDocumentTypes({ types, settings })` replaces the overlay snapshot. It is
called by a `documentTypeStore` subscription in `systems/index.ts`, including once after the
store hydrates.

| Method                                                              | Behaviour for `user-` ids                                                                                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseDocument(raw)`                                                | envelope schema, then `UserTypeDataSchema` when `definitionId` starts with `user-` and the system is registered; **independent of the overlay** |
| `getDocumentDefinition(systemId, id)`                               | synthesized definition (see the data model); an orphan definition when the type is unknown                                                      |
| `listDefinitions()`                                                 | shipped definitions, then user types with an owner in that system; orphans are never listed                                                     |
| `getSystem(id)`                                                     | unchanged                                                                                                                                       |
| `resolveDocumentPolicies(systemId, id)` (moved behind the registry) | system policies + owner module policies                                                                                                         |

Shipped behaviour and invariants are unchanged. A `user-` definition in an unregistered system
is rejected, as any document of an unknown system is today.

## Pages

- A user type's views are the user templates with `(systemId, documentKind = type id)`.
  `defaultViewId` = `type.defaultTemplateId`.
- While `documentTypeStore` has not finished hydrating, a `user-` document renders the
  sheet's loading state: no fallback page and no `template-fallback` report. Only after
  hydration does an unknown type count as missing.
- For a missing definition, `CharacterSheet` renders the fallback page and never returns
  `null`. It reports `template-fallback` with `{ documentId, reason: 'type-missing' |
'no-default', requested }`.
- A document in a user setting resolves `metadata.templateId` first (already the rule), then
  `setting.pages[definitionId]`, then the shipped default view.
- `ViewModeSelect` lists templates whose `settingId` equals the document's `metadata.settingId`
  (both absent counts as equal).

## Create dialog groups

In order:

1. Shipped settings: a system, or a module of a shared ruleset, as today. Each lists its
   shipped definitions, then the user types owned by it.
2. Each engine plugin with `coreDefinitions` lists its core character, labelled as the engine
   ("World of Darkness 2nd Edition", "World of Darkness 5th Edition").
3. User settings, grouped by name. Each lists its ruleset's core definitions, then its user
   types.

Creating a document in a user setting sets `metadata.settingId` and, when the setting has a
page for that definition, `metadata.templateId`.

## Template library

- A new "New document type" action asks for the owner (a shipped setting or a user setting)
  and a name, then opens the editor on an empty draft of the new kind. Saving creates the type
  and its first page in one action.
- A new "New setting" action asks for a ruleset (systems with `coreDefinitions`) and a name.
- The library groups templates by owner and type name, never by raw kind strings.
- Deleting a type confirms with the number of documents that use it (FR-020). Deleting a
  setting confirms with the number of its types and documents. Both keep all documents.
- Export type / Import type use [type-file-format.md](type-file-format.md).

## What a user-type page may use

| Element                                                     | Allowed | Why                                                                          |
| ----------------------------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| every custom field type, table, list with custom entries    | yes     | values live in `templateValues`                                              |
| select fields filled from the owner system's catalogs       | yes     | the catalog picker lists the draft system's catalogs only                    |
| reference fields (kind picker lists shipped and user kinds) | yes     |                                                                              |
| formulas over the page's own numeric coordinates            | yes     |                                                                              |
| primitives or bridged fields bound to system data           | no      | `listDocumentBindings` is empty for `user-` kinds, so the editor offers none |

## Diagnostics

New `reportSheetIssue` reasons or codes:

- `template-fallback` with reason `type-missing`;
- `template-quarantined` for type-store entries;
- `template-reference-invalid` for type files whose templates fail reference checks.

Each is reported once per distinct issue, as today.
