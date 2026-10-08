---
name: sheet-templates
description:
    Current-state reference for sheet_manager page templates — node tree, value storage and
    coordinates, bindings, formulas, page resolution, editor, import/export, diagnostics, extension
    checklists, and known debts. Load before touching anything template-related.
---

# Sheet Templates — Current State

This skill (this index plus `references/`) is the **single current-state description** of the
template system. Specs are change history: read them only for the rationale behind a decision, never
to learn how the system works today. When code and this file disagree, the code wins — fix this file
in the same change.

## Load on demand

This index holds the model, the invariants, and the extension checklists. Load a reference only for
the area you change:

| Touching                                                       | Load                            |
| -------------------------------------------------------------- | ------------------------------- |
| Node types, fields, limits, schema version                     | `references/node-tree.md`       |
| Bindings, primitives, trait/resource sources, entity pages     | `references/bindings.md`        |
| Page resolution, template stores, template import/export       | `references/pages.md`           |
| Formulas, `maxFrom`, docs sheet embeds                         | `references/formulas-embeds.md` |
| The template editor (settings, outline, drag, selection, menu) | `references/editor.md`          |
| User document types and settings, the library tree             | `references/library.md`         |

Specs under `specs/` are change history (why), never the current state (what). Tests live in
`tests/sheet_manager/`; find them by name (`ls tests/sheet_manager | grep <area>`).

## Mental model

A **template** is a declarative page: a recursive tree of nodes rendered by `DeclarativeSheetView`
against the current document. Templates never contain executable code. Every rendered value lives in
exactly one of two places:

| Storage                   | What goes there                                                 | Written by                                |
| ------------------------- | --------------------------------------------------------------- | ----------------------------------------- |
| `document.templateValues` | Custom values: flat bag keyed by **coordinate** (valueKey)      | `documentStore.updateTemplateValues`      |
| `document.data`           | System data (traits, pools, identity, lists, equipment, health) | `updateDocumentData` / `useBoundDocument` |

The template itself lives in one of three places, and **the renderer does not care which**:

| Source          | Location                                                           | Identity                                     |
| --------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| User template   | `templateStore.templates` (`universal-template-storage`, v3)       | user id                                      |
| Shipped default | `SystemPlugin.defaultTemplates` (`systems/<system>/…/templates/*`) | view id (`full-sheet`, `v5-hunter-sheet`, …) |
| Edited default  | `templateStore.defaultOverrides[overrideKey(systemId, viewId)]`    | system + view id                             |

Always pass the **resolved template object** around (the store write path takes it); never re-look a
template up by id — `getTemplate(id)` only sees user templates.

## Coordinates and value storage

- A field's coordinate is `valueKey ?? id` (`fieldValueKey`, `tableValueKey`, `listValueKey`). Equal
  coordinates in different templates **share one value** (document-global bag).
- **Bridging**: `resolveDataBindingByCoordinate` — if a field's coordinate equals a system data
  address (kebab trait key like `strength`/`self-control`, resource id, identity field key), the
  field renders as the matching primitive and reads/writes `document.data`, ignoring the field's own
  type. Default templates rely on this; a custom field named `name` is bridged too.
- Write path (`documentStore.updateTemplateValues(documentId, template, updater)`):
    - validates only **changed** keys that match a field/table coordinate of the given template
      (`validateTemplateValue`); unchanged stale values never block writes to other keys;
    - keys the template does not declare (orphans) pass through untouched — never deleted;
    - `undefined` from the updater clears a key;
    - rejections report `template-value-write-rejected` with `key` and `reason`.
- Read path: `coerceStoredValue` converts values stored before a field type change; the store data
  is never mutated by rendering.
- Images: `{source:'device', blobId}` (IndexedDB via `persistence/portraitStorage.ts`) or
  `{source:'url', url}` (HTTPS only). Device values are stripped from JSON exports.

## Diagnostics (debug here first)

`src/sheet_manager/diagnostics.ts` is the single channel for degradation paths:

- `reportSheetIssue({ code, message, details })` — codes: `template-value-write-rejected`,
  `template-value-write-skipped`, `template-quarantined`, `document-recovered`,
  `binding-unresolved`, `catalog-unavailable`, `formula-error`, `template-reference-invalid`,
  `template-fallback`, `reference-target-missing`, `reference-target-out-of-scope`,
  `catalog-detail-out-of-range`, `list-entry-unreadable`, `template-value-unreadable`,
  `template-value-hidden`, `template-incompatible`, `library-placement`, `template-draft-invalid` (a
  save found a schema rule no editor check covers).
- In development each distinct issue is logged once as `[sheet_manager] <code>: …` in the browser
  console. **A silently ignored edit, an empty section, or a "degraded" card → check the console
  first.**
- Tests: `tests/setup/sheetIssues.ts` fails any test that produces an unexpected issue. Tests that
  exercise degradation on purpose call `takeSheetIssues()` and assert on the result.
- New graceful-degradation code (`return`, `catch`, fallback render) must report through this
  channel; a silent fallback is a bug.

## Extension checklists

Every checklist below ends with the element storybook (constitution VI): the new or changed element
and each of its variants appear in the draft-only docs storybook `docs/dev/storybook/`. Handwritten
stories live in `src/sheet_manager/storybook/stories.ts` (containers, fields, catalog choice,
collections, on sandbox documents); built-in parts are generated per system from `bindingSignature`
(a new binding shape needs a case there when it renders differently). A new option or presentation
also gets a tag in `REQUIRED_VARIANTS` of `tests/sheet_manager/storybook.test.tsx`. A new docs
widget gets an example on `docs/dev/storybook/docs-widgets.mdx`; colors come from the `@theme`
tokens in `src/css/custom.css` automatically. States that depend on the reader's own documents get a
fixed-sample widget next to the stories (`ReferenceEntryVariants` in
`features/docs/ElementStorybook.tsx`, on `template-elements.mdx`). A setting's missing element is
added as an editor-configurable template element, preferably as an option on an existing field or
primitive rather than a similar new one.

**New field type** (e.g. `date`): object schema, `fieldObjectSchemas`, the node discriminated union,
`TEMPLATE_FIELD_TYPES`, and `refineField` in `types/template.ts`; the value switches in
`types/templateValues.ts`; a control in `fieldControls.tsx` + the entry in
`registry/declarativeFieldRegistry.ts`; the factory case in `template-editor/model/factories.ts`;
the entry in `template-editor/elements/registry.tsx`; a config branch in `panels/FieldEditor.tsx`
with its settings in `settings/registry.ts`; the `fieldTypes.<type>` label in en/ru YAML +
`yarn build:translations`; tests. The compiler flags every missing piece except the `FieldEditor`
branch and tests (exhaustive switches, `Record<TemplateField['type'], …>` maps, and the editor's
element registry; the type picker and all leaf predicates derive from the canonical list). Where to
add an editor setting, command, or save warning: `references/editor.md`.

**New binding kind**: descriptor interface + union in `systems/templateBindings.ts` (plus
`resolveDataBindingByCoordinate` / `listNumericCoordinates` / `readBoundNumber` if it is bridgeable
or numeric); declarations in the system's bindings file; `PrimitiveNodeView` switch
(`primitives.tsx`); editor sources (`sourceNodes.ts` conversions, `SourceControls.tsx` groups) and
`PrimitiveConfig`.

**New system**: a folder `systems/<system>/` with a `SystemPlugin` (translated `label`, `documents`,
`defaultTemplates`, `templateBindings`, `catalogs`, `policies`, optional `coreDefinitions` for user
settings) registered in `systems/index.ts`. Definitions may declare `examples` (preview data in the
editor). Engines shared by several lines use `ruleset/` (schema shape, bindings builder, page parts)
plus `modules/<line>/` (schema extension, bindings, catalogs, templates, definition with `module`).
Prefix view ids with the system (`v5-hunter-sheet`). Strings go to per-layer YAML
(`ui/sheet/<system>.yaml`, `ui/sheet/<system><Line>.yaml`, `data/<catalogId>.yaml`); tests to
`tests/sheet_manager/systems/<system>/`. No generic file changes are needed for data addressing.

**Terminology**: _full_ and _brief_ are views (shipped templates); _compact_ is a primitive display
mode used inside brief views (for trackers it reads as the `line` display).

**New catalog**: `defineCatalog` in the owning system's `catalogs.ts`, listed on
`SystemPlugin.catalogs` (closed fillable-detail set, optional system-owned `resolveDetails`); lists,
rows, and field suggestions reference it by catalog id.

**New document kind page**: bindings for the kind (reuse field/trait/resource/rows/track shapes), a
template module under the system's `templates/` built with the neutral builders, views declared with
`templateView(id, label, legacyIds)`, labels in YAML, and a row in the settings table
(`references/bindings.md`).

## Known debts (as of 2026-09-13)

- Primitive molecules (trait rows, merit/flaw lists, equipment sections) are WoD-family UI; a
  non-WoD system will need its own molecules behind the same binding kinds. Star Wars equipment
  still goes through the `character` capability (catalog fills); other systems bind `dataKey`
  arrays. Item rules (new items, counter clamps) live in `features/sheet/body/equipmentItems.ts`;
  the section molecules take their name suggestions as a `catalog` prop. `dataKey` equipment
  bindings may declare `catalog: { catalogIds, fills }` (detail key → item field; `name` and string
  details are written localized).
- Catalogs may declare `browse` (columns with header descriptors, `labels`, `filter`, optional
  `children`) for the docs `CatalogBrowser`; `entryText(entry, key, lang)` localizes any string
  property from `translations/source/<locale>/data/<catalogId>.yaml`.
- Vehicle system slots are a bag table capped at 10 rows (not pre-seeded slots); crew-station
  references render placeholders in previews (static sources hold one document).
- Binding keys are not literal types (bindings are built at runtime per system); integrity relies on
  `validateTemplateReferences` rather than the compiler.
- `useTemplatePage` (`hooks.ts`) mixes store wiring, formula evaluation, list/catalog runtime, and
  preset seeding.
- `NodeView` is memoized, but a template change still re-renders every node of the real sheet (the
  page API changes with the template); only the editor frames skip unchanged nodes.
- Retired pre-template blocks, viewers, views, and `DocumentSheetSections` are archived (reference
  only) in `context/sheet-manager/legacy-sheet-components/`.
