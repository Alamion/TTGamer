# Sheet Templates — Pages, Stores, and Files

Reference for the `sheet-templates` skill: which page a document shows, how templates persist, and
template files.

## Page resolution (`features/sheet/CharacterSheet.tsx`, `systems/view.ts`)

1. `assignedTemplateId(document, settings)` (`systems/userTypes.ts`): `metadata.templateId`, else
   the user setting's page for the definition (`setting.pages[definitionId]`) →
   `resolveCustomTemplate` against user templates. Found and kind matches → render it.
   Missing/foreign → remember a fallback notice.
2. Otherwise the view id (`metadata.preferredViewId`, aliases via `legacyIds`) →
   `resolveEffectiveTemplate`: user template with that id, else the system's shipped default
   (override applied when present, `modified: true`). Overrides are keyed by the canonical view id,
   so a shared alias (`brief`) never picks up another kind's override; user templates must match the
   document kind.
3. Every view is `{ type: 'declarative', templateId }` with a shipped default of the same id and
   kind (asserted for every system by `built-in-templates.test.ts`). If that template is missing
   anyway, a fallback notice renders — never a throw.

Each fallback (`missing` / `kind-mismatch` custom template, `unknown-view`, `no-default`,
`type-missing`) reports `template-fallback` once with `documentId`, `reason`, and `requested`. A
user-type document whose type is not installed renders the stored-values page (`buildOrphanPage` in
`features/sheet/data/orphanPage.ts`: one text field per stored key) under a "type not installed"
notice; before `documentTypeStore` hydrates it renders a loading line and reports nothing
(`useDocumentTypesHydrated`).

Per-kind views (Star Wars): character `full-sheet` + `brief` (alias `npc-card`); droid
`droid-sheet` + `droid-brief`; creature `creature-sheet` + `creature-brief`; vehicle
`vehicle-sheet` + `vehicle-brief`; fodder group `fodder-sheet` + `fodder-brief`. Entity and droid
briefs alias `brief` and `npc-card`.

The selector (`ViewModeSelect`) encodes custom templates as `tpl:<id>`; view ids are plain. It
offers only templates whose `settingId` equals the document's `metadata.settingId` (both absent
counts as equal; `templateMatchesSetting`).

## Stores and persistence

- `templateStore` v5: `templates`, `quarantine` (max 100), `defaultOverrides` keyed by
  `overrideKey(systemId, viewId)` (T-046; v4 bare view-id keys are re-keyed from each override's own
  `systemId` on load). `setDefaultOverride(template)` keys by the template's system and id;
  `clearDefaultOverride(systemId, viewId)`. Entries failing the parse (including all pre-006 shapes)
  move to quarantine and report `template-quarantined` with the Zod summary.
- `documentTypeStore` v3 (`universal-document-type-storage`): user document types (their
  `defaultTemplateId` is optional: a type may have no page), user settings, `defaultPages`
  (`systemId:definitionId` → the view or user template new documents of a shipped type open on;
  `setDefaultPage`, `dropDefaultPagesFor`), user catalogs (spec 015; `saveCatalog`, `removeCatalog`,
  `replaceCatalogs`), and a bounded quarantine shared by all of them.
- `documentStore` v4: flat `templateValues`; v2 nested bags are flattened on load
  (`flattenLegacyTemplateValues`). Unparseable documents go to `recoveryEntries` (max 100) and
  report `document-recovered`.
  `createDocument(systemId, definitionId, { settingId, templateId, preferredViewId })`; creation
  flows ask `newDocumentPage` (`features/sheet/data/libraryPages.ts`) for a shipped type's chosen
  default. `relocateDocuments(changes)` applies the document side of a library move in one write
  (`null` clears; only user-type documents change `systemId`).
- `metadata.seededPresets`: list presets are copied once per document × template (copy-on-assign);
  custom lists seed only when named, through `presetListEntry(item, …)`. The seeding effect in
  `useTemplatePage` writes bag, data, and metadata.

## Import / export (`features/sheet/shell/templateFile.ts`)

`ttgamer-template` wrapper, format version 3 exactly (older and newer are rejected with the version
error). Full validation before any state change; a template of an unregistered system is rejected
(`system` error); unavailable catalogs are stripped to manual choice and listed in the degradation
report (`resolveImportedTemplate`, shared with type files). An imported template whose id equals a
shipped view id gets a fresh `tpl-` id instead of shadowing that page. Files of systems with
publisher policies carry a wrapper-level `notices` array (ignored on import). Filenames:
`ttgamer_template_<id>.json`.
