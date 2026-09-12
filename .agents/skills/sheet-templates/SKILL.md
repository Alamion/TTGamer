---
name: sheet-templates
description: Current-state reference for sheet_manager page templates — node tree, value storage and coordinates, bindings, formulas, page resolution, editor, import/export, diagnostics, extension checklists, and known debts. Load before touching anything template-related.
---

# Sheet Templates — Current State

This file is the **single current-state description** of the template system. Specs 003–006
are change history: read them only for the rationale behind a decision, never to learn how
the system works today. When code and this file disagree, the code wins — fix this file in the
same change.

## Mental model

A **template** is a declarative page: a recursive tree of nodes rendered by
`DeclarativeSheetView` against the current document. Templates never contain executable code.
Every rendered value lives in exactly one of two places:

| Storage                   | What goes there                                                 | Written by                            |
| ------------------------- | --------------------------------------------------------------- | ------------------------------------- |
| `document.templateValues` | Custom values: flat bag keyed by **coordinate** (valueKey)      | `documentStore.updateTemplateValues`  |
| `document.data`           | System data (traits, pools, identity, lists, equipment, health) | `updateDocumentData` / `useCharacter` |

The template itself lives in one of three places, and **the renderer does not care which**:

| Source          | Location                                                                      | Identity                                       |
| --------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| User template   | `templateStore.templates` (`universal-template-storage`, v3)                  | user id                                        |
| Shipped default | `SystemPlugin.defaultTemplates` (`systems/star-wars-wod/defaultTemplates.ts`) | view id (`full-sheet`, `droid-sheet`, `brief`) |
| Edited default  | `templateStore.defaultOverrides[viewId]`                                      | view id                                        |

Always pass the **resolved template object** around (the store write path takes it); never
re-look a template up by id — `getTemplate(id)` only sees user templates.

## Node tree (`types/template.ts`, schema v3)

- Containers: `section` (CollapsibleBlock, no background, `docsPath`, `columns` 1–4) and `group`
  (SectionCard surface, opt-in `collapsible`). Accents alternate by sibling parity, never stored.
- Leaf fields (`TemplateField`): `text`, `number`, `toggle`, `image`, `formula`, `select`,
  `rating`, `resource`, `reference`.
- Other leaves: `table` (columns are fields; rows stored under `tableValueKey`), `list`
  (exactly one of `valueKey` or `bindingKey`), `primitive` (`bindingKey` into system data).
- Guardrails (`TEMPLATE_LIMITS`, `collectTreeIssues`): depth 10, 200 nodes, one id namespace
  across the whole tree; identifiers are lowercase kebab-case.
- Node and field schemas are a `z.discriminatedUnion('type', …)` of plain objects;
  cross-property rules (bounds, unique option/column ids, list storage mode) run in
  `refineField` / `refineNode`. Unknown types yield one `invalid_union_discriminator` issue.
- `TEMPLATE_FIELD_TYPES` and `TEMPLATE_STRUCTURE_TYPES` are the canonical type lists;
  `isTemplateField` / `isContainerNode` are the only leaf/container predicates. Type-level
  guards (`TemplateFieldTypesAreComplete`, `TemplateNodeTypesAreComplete`) fail typecheck when a
  list and the schema disagree.
- `systemId` defaults to `star-wars-wod`; compatibility is `systemId` + `documentKind`.
- Layout and presentation:
    - `column` (1–4) on any node places it in its parent's column layout; when any child of a
      multi-column container sets it, children stack inside their column instead of flowing
      row by row (unplaced children go to column 1). Renderer grids use `grid-cols-1`
      (`minmax(0,1fr)`) tracks so wide rows shrink instead of clipping.
    - Groups: `hideTitle` (no header, never collapsible), `docsPath` (help link), opt-in
      `collapsible`.
    - Fields: `hideLabel` (kept for screen readers); text fields `placeholder` +
      `placeholderMessage`; formula fields `prefix`/`suffix`, rendered as "label … value" rows.
    - Primitives: `hideLabel`; pool resources `part: 'max'` edits the maximum (current is capped
      to it). Compact pools render `current / max` boxes, compact ratings number boxes.
- Labels: every labelled node may carry `labelMessage` — a UI message id (`ttgamer.ui.…`) or a
  catalog entry (`catalog:<catalogId>/<entryId>`, e.g. attribute names). `DeclarativeSheetView`
  renders `localizeTemplate(template, locale)` (`features/sheet/declarative/localizeTemplate.ts`);
  the stored `label`/`title` is the fallback. Editing a label or title in the editor drops the
  reference. Shipped defaults attach references in one pass (`withLabelMessages` in
  `defaultTemplates.ts`; new keys live under `ui.sheet.templates.defaults`). Unknown references
  are `unknown-label-message` reference issues.

## Coordinates and value storage

- A field's coordinate is `valueKey ?? id` (`fieldValueKey`, `tableValueKey`, `listValueKey`).
  Equal coordinates in different templates **share one value** (document-global bag).
- **Bridging**: `resolveDataBindingByCoordinate` — if a field's coordinate equals a system data
  address (kebab trait key like `strength`/`self-control`, resource id, identity field key),
  the field renders as the matching primitive and reads/writes `document.data`, ignoring the
  field's own type. Default templates rely on this; a custom field named `name` is bridged too.
- Write path (`documentStore.updateTemplateValues(documentId, template, updater)`):
    - validates only **changed** keys that match a field/table coordinate of the given template
      (`validateTemplateValue`); unchanged stale values never block writes to other keys;
    - keys the template does not declare (orphans) pass through untouched — never deleted;
    - `undefined` from the updater clears a key;
    - rejections report `template-value-write-rejected` with `key` and `reason`.
- Read path: `coerceStoredValue` converts values stored before a field type change; the store
  data is never mutated by rendering.
- Images: `{source:'device', blobId}` (IndexedDB via `persistence/portraitStorage.ts`) or
  `{source:'url', url}` (HTTPS only). Device values are stripped from JSON exports.

## Bindings and the system boundary

Contract: `systems/templateBindings.ts` (system-independent). Each plugin declares
`SystemPlugin.templateBindings`; generic code queries them with `listDocumentBindings`,
`resolveDocumentBinding`, `resolveDataBindingByCoordinate`, `listNumericCoordinates`,
`readBoundNumber`, and `createListEntry`. Descriptors carry every data path (`map`, `dataKey`,
`coordinate`, `defaultValue`, `entryShape`, track `levels` with translation descriptors), so
generic code never computes a system's data shape. An ESLint `no-restricted-imports` rule
fails any import of `systems/star-wars-wod` from declarative, editor, hooks, types, or
`wod-like` code.

WoD-family systems build trait/resource/track bindings from their profile with
`systems/wod-like/templateBindings.ts` (`buildWodTraitBindings`, `buildWodResourceBindings`,
`buildWodTrackBindings`, `toCoordinate`). Star Wars declarations: `systems/star-wars-wod/documentBindings.ts`.

| Kind        | Key shape                                                | Star Wars data                                                        |
| ----------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| `trait`     | `trait:<groupId>:<TraitKey>`                             | `attributes`/`skills`/`virtues`/`forceSkills`                         |
| `resource`  | `resource:willpower\|force-points\|dark-side-resistance` | `willpower`/`forcePoints` pools, rating number                        |
| `track`     | `track:health`, `track:vehicle-damage`                   | `health`, `damage`                                                    |
| `field`     | `field:<key>`                                            | any data path (`path`, `valueType`, optional `constrain` / `adapter`) |
| `list`      | `list:<listId>`                                          | `dataKey` (`forcePowers` → `forcePowerItems`)                         |
| `equipment` | `equipment:inventory\|armor\|weapons\|implants`          | body sections via `useBodyHandlers`                                   |

- Field bindings: `path` + `valueType` (`string`/`number`/`image`). Bridged fields keep their own
  control (textarea, placeholder, number input); `constrain` keeps the top-level record valid
  (experience: spent ≤ total) and `adapter` maps split values (portrait ↔
  `metadata.portraitId`/`imageUrl`). Numeric field bindings are formula coordinates
  (`experience-total - experience-spent`). Pool resources may set `currentRaisesMax` (Willpower).
- List entry shapes: `trait` `{id,label,value}`, `named-trait` `{id,name,value}`, `merit-flaw`
  `{id,label,points}`. Preset seeding and the list molecules both follow `entryShape`.
- Keys are persisted as plain strings, checked by `validateTemplateReferences`
  (`features/sheet/data/templateReferences.ts`) wherever templates enter the system: editor
  draft issues, file import (reports `template-reference-invalid`), and a test over every
  shipped default. It checks binding keys and list binding kinds, catalog ids, fill details and
  fill targets, and formula/`maxFrom` coordinates against `listTemplateNumericCoordinates`.
- An unknown key, wrong kind, missing character, or missing body handlers renders the labeled
  `DegradedBinding` notice and reports `binding-unresolved` with a `reason`.
- Catalogs (`features/sheet/data/catalogBindings.ts`, `CATALOG_BINDINGS`) are the only path
  from `src/data` into templates: select fields persist `catalogId` + fill mappings (copy on
  select; replace re-copies, clear keeps values) and system lists resolve
  `binding.catalog.catalogId` from the same registry. Unknown catalogs degrade to manual choice
  and report `catalog-unavailable`.

## Document source

Renderers never read the store directly: `useTemplatePage` and `useCharacter` read
`useDocumentSource()` (`hooks/useDocumentSource.ts`). Default = the editable store's current
document. Wrap a subtree in `DocumentSourceContext.Provider` with
`createStaticDocumentSource(envelope)` to render any document read-only (no writes, no preset
seeding) — the seam for documentation previews.

## Formulas (`features/sheet/declarative/formula.ts`)

- Grammar: numbers, coordinates (`kebab` or `pool.current`/`pool.max`), `+ - * /`, parentheses,
  unary minus, and `min(a, b, …)` / `max(a, b, …)`. Pure tokenizer → parser → evaluator.
- One coordinate space: bag numbers plus system traits/pools (`readBoundNumber`, called from
  `resolveBase` in `hooks.ts`).
- `formula` fields are read-only and never stored. `maxFrom` (rating/number/primitive) clamps
  the display; stored values are clamped only when the bounded value itself is edited.
- Errors are labeled in the UI (`unknown-coordinate` names the coordinate, `circular`,
  `division-by-zero`, `non-numeric`). Unparseable formulas also report `formula-error`.
- Cycles are rejected at authoring (`collectDraftIssues`); at render the evaluator in
  `useTemplatePage` re-orders by dependency with its own cycle guard.
- `collectFormulaDependencies` in `types/template.ts` uses a regex, not the parser (import
  cycle workaround) — it can disagree with `parseFormula` on odd input.

## Documentation embeds (`src/sheet_manager/docsEmbeds.tsx`)

The only entry point docs import. Embeds render the **shipped** default template (never an
edited override) so prose and page stay in sync:

- `<TemplateFragment template="full-sheet" node="attributes" />` — a subtree against the
  reader's current document (editable); renders nothing without a compatible document.
- `<TemplatePreview document={presetCharacterDocument(JAX_VORN_PRESET)} node="base" />` — a
  fixed document, read-only (`healthPreviewDocument(levels)` for condition-track examples).
- Embeds use `DeclarativeSheetView embedded` (no page chrome, no preset seeding — a partial
  render must not mark the template as seeded).
- `tests/sheet_manager/docs-embeds.test.tsx` scans en + ru MDX and fails on any embed whose
  template/node does not exist, so renaming a node id breaks the test, not the docs.

## Page resolution (`features/sheet/CharacterSheet.tsx`, `systems/view.ts`)

1. `metadata.templateId` → `resolveCustomTemplate` against user templates. Found and kind
   matches → render it. Missing/foreign → remember a fallback notice.
2. Otherwise the view id (`metadata.preferredViewId`, aliases via `legacyIds`) →
   `resolveEffectiveTemplate`: user template with that id, else the system's shipped default
   (override applied when present, `modified: true`).
3. Otherwise the definition's `built-in` layout mounts React blocks through
   `registry/builtInBlockRegistry.ts`. Today this path serves creature, vehicle, and fodder
   pages (and their `brief`), because only character-kind defaults exist.

The selector (`ViewModeSelect`) encodes custom templates as `tpl:<id>`; view ids are plain.

## Stores and persistence

- `templateStore` v3: `templates`, `quarantine` (max 100), `defaultOverrides`. Entries failing
  the v3 parse (including all pre-006 shapes) move to quarantine and report
  `template-quarantined` with the Zod summary. There is no migration of old template shapes.
- `documentStore` v3: flat `templateValues`; v2 nested bags are flattened on load
  (`flattenLegacyTemplateValues`). Unparseable documents go to `recoveryEntries` (max 100) and
  report `document-recovered`.
- `metadata.seededPresets`: list presets are copied once per document × template
  (copy-on-assign). The seeding effect in `useTemplatePage` writes bag, data, and metadata.

## Editor (`components/dialogs/template-editor/`)

- `draft.ts`: `EditorDraft = CustomTemplate`; pure tree ops (`insertNode`, `moveNode`,
  `updateNode`, `removeNode`), node factories, and `collectDraftIssues` (limits, duplicate ids,
  bounds, formula parse errors, cycles, plus every `validateTemplateReferences` issue).
- `ElementEditor.tsx`: recursive panels (grip = move on the left, chevron = collapse on the
  right), palette, bridged-field factories. `FieldEditor.tsx` / `PrimitiveConfig.tsx`: config.
- `TemplateEditorDialog`: explicit save/discard; editing a default id saves through
  `setDefaultOverride`, everything else through `saveTemplate`. Library: reset clears the
  override; defaults cannot be deleted.

## Import / export (`features/sheet/shell/templateFile.ts`)

`ttgamer-template` wrapper, format version 3 exactly (older and newer are rejected with the
version error). Full validation before any state change; unavailable catalogs are stripped to
manual choice and listed in the degradation report. Filenames: `ttgamer_template_<id>.json`.

## Diagnostics (debug here first)

`src/sheet_manager/diagnostics.ts` is the single channel for degradation paths:

- `reportSheetIssue({ code, message, details })` — codes: `template-value-write-rejected`,
  `template-value-write-skipped`, `template-quarantined`, `document-recovered`,
  `binding-unresolved`, `catalog-unavailable`, `formula-error`, `template-reference-invalid`.
- In development each distinct issue is logged once as `[sheet_manager] <code>: …` in the
  browser console. **A silently ignored edit, an empty section, or a "degraded" card → check
  the console first.**
- Tests: `tests/setup/sheetIssues.ts` fails any test that produces an unexpected issue.
  Tests that exercise degradation on purpose call `takeSheetIssues()` and assert on the result.
- New graceful-degradation code (`return`, `catch`, fallback render) must report through this
  channel; a silent fallback is a bug.

## Extension checklists

**New field type** (e.g. `date`): object schema, `fieldObjectSchemas`, the node
discriminated union, `TEMPLATE_FIELD_TYPES`, and `refineField` in `types/template.ts`; the
value switches in `types/templateValues.ts`; a control in `fieldControls.tsx` + the entry in
`registry/declarativeFieldRegistry.ts`; the `baseField` factory in `draft.ts`; a config branch
in `FieldEditor.tsx`; the `fieldTypes.<type>` label in en/ru YAML + `yarn build:translations`;
tests. The compiler flags every missing piece except the `FieldEditor` branch and tests
(exhaustive switches and `Record<TemplateField['type'], …>` maps; the editor type picker and
all leaf predicates derive from the canonical list).

**New binding kind**: descriptor interface + union in `systems/templateBindings.ts` (plus
`resolveDataBindingByCoordinate` / `listNumericCoordinates` / `readBoundNumber` if it is
bridgeable or numeric); declarations in the system's bindings file; `PrimitiveNodeView` switch
(`primitives.tsx`); editor palette/bridged factories (`ElementEditor.tsx`) and `PrimitiveConfig`.

**New system**: a `SystemPlugin` with `documents`, optional `defaultTemplates`, and
`templateBindings` (WoD-family: build from the profile with `wod-like/templateBindings.ts`).
No generic file changes are needed for data addressing.

**New catalog**: `defineCatalog` entry in `catalogBindings.ts` (closed fillable-detail set);
lists reference it by `catalog.catalogId`.

## Known debts (as of 2026-09-13)

- Built-in React blocks (`features/sheet/blocks/*`) still back creature/vehicle/fodder pages and
  `CharacterViewer`; catalog copy-on-select is duplicated in `AdvantagesBlock` and
  `primitives.tsx` (`primitive-parity.test.tsx` guards the pair). Retirement waits for
  user-confirmed parity.
- Primitive molecules (trait rows, merit/flaw lists, equipment sections) are WoD-family UI and
  read through the `character` capability (`BaseCharacter`); a non-WoD system will need its own
  molecules behind the same binding kinds.
- The editor does not yet expose `column`, `hideTitle`, `hideLabel`, `placeholder`,
  `prefix`/`suffix`, `part`, or group `docsPath`; edits preserve them, but authors cannot set them.
- Binding keys are not literal types (bindings are built at runtime per system); integrity
  relies on `validateTemplateReferences` rather than the compiler.
- `useTemplatePage` (`hooks.ts`) mixes store wiring, formula evaluation, list/catalog runtime,
  and preset seeding; `draft.ts` and `ElementEditor.tsx` are similarly overloaded.
- Unused exports awaiting cleanup: `listBuiltInBlocks`, `isBuiltInBlockAvailable`, `blockAccentColor`, `newNodeId`,
  `ALL_TEMPLATE_SKELETONS`, `collectPrimitiveNodes`.

## Tests map (`tests/sheet_manager/`)

| Concern                          | File                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Schema, tree guardrails          | `template-schema.test.ts`                                                            |
| Value write path, validation     | `template-value-writes.test.ts`, `document-template-values.test.ts`                  |
| Renderer, bridging, catalogs     | `declarative-sheet.test.tsx`, `shared-values.test.tsx`                               |
| Primitives, parity with built-in | `primitives.test.ts`, `primitive-parity.test.tsx`, `primitive-seeding.test.ts`       |
| Bindings, document source        | `document-bindings.test.ts`, `document-source.test.ts`                               |
| Lists, images                    | `template-lists-images.test.ts`                                                      |
| Formulas                         | `template-formulas.test.ts`                                                          |
| Defaults, overrides, resolution  | `default-templates.test.ts`, `built-in-templates.test.ts`, `view-resolution.test.ts` |
| Stores, quarantine               | `template-store.test.ts`, `template-store-migration.test.ts`                         |
| Editor                           | `template-editor.test.tsx`                                                           |
| References                       | `template-references.test.ts`                                                        |
| File format                      | `template-file.test.ts`, `catalog-bindings.test.ts`                                  |

## History (read for rationale only)

| Spec | What it introduced                                                   | Superseded parts                              |
| ---- | -------------------------------------------------------------------- | --------------------------------------------- |
| 003  | Section → block → field templates, catalog bindings, file format v1  | Fixed hierarchy, file v1 (→ 006)              |
| 004  | Views as default templates, overrides, `built-in` block placements   | View-derived defaults, placements (→ 005/006) |
| 005  | Binding registry, primitives, preset seeding, hybrid defaults        | Hybrid defaults, placement path (→ 006)       |
| 006  | Recursive tree v3, formulas, lists/images, pure defaults, quarantine | —                                             |
