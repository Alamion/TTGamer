# Sheet Templates — Bindings and Document Sources

Reference for the `sheet-templates` skill: how template elements reach system data, and entity pages
of other settings.

## Bindings and the system boundary

Contract: `systems/templateBindings.ts` (system-independent). Each plugin declares
`SystemPlugin.templateBindings`; generic code queries them with `listDocumentBindings`,
`resolveDocumentBinding`, `resolveDataBindingByCoordinate`, `resolveWritableBinding`,
`boundWriteUpdate`, `listNumericCoordinates`, `readBoundNumber`, `trackLevelsFor`, and
`createListEntry`. Descriptors carry every data path (`map`, `dataKey`, `coordinate`,
`defaultValue`, `entryShape`, track `levels` with translation descriptors), so generic code never
computes a system's data shape. An ESLint `no-restricted-imports` rule fails any import of
`systems/star-wars-wod` from declarative, editor, hooks, types, or `wod-like` code.

WoD-family systems build trait/resource/track bindings from their profile with
`systems/wod-like/templateBindings.ts` (`buildWodTraitBindings`, `buildWodResourceBindings`,
`buildWodTrackBindings`, `toCoordinate`). Star Wars declarations:
`systems/star-wars-wod/documentBindings.ts` (character/droid) and `entityBindings.ts` (creature,
vehicle, fodder group — kind `group`). Binding keys repeat across kinds; resolution always filters
by `documentKind`.

**Data access is kind-independent**: bound elements read and write through `useBoundDocument()`
(`features/sheet/declarative/boundDocument.ts`). Documents with a `character` capability go through
it (droids map damage/built-in equipment); every other kind reads `document.data` directly. Writes
merge top-level keys and re-parse with the kind schema; a rejection reports
`template-value-write-rejected` instead of throwing. Equipment bindings without `dataKey` still need
the character capability (`useBodyHandlers`, Star Wars catalogs); with `dataKey` they edit a plain
item array through the same molecules (V5 `weapons`, `inventory`).

| Kind        | Key shape                                                | Star Wars data                                                                                                |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `trait`     | `trait:<groupId>:<TraitKey>`                             | `attributes`/`skills`/`virtues`/`forceSkills`                                                                 |
| `resource`  | `resource:willpower\|force-points\|dark-side-resistance` | `willpower`/`forcePoints` pools, rating number                                                                |
| `track`     | `track:health`, `track:droid-damage`, `track:members-*`  | `health`; member arrays (`members[].health`/`.damage`); V5 `track:health`/`track:willpower` (computed length) |
| `field`     | `field:<key>`                                            | any data path (`path`, `valueType`, optional `constrain` / `adapter`)                                         |
| `list`      | `list:<listId>`                                          | `dataKey` (`forcePowers` → `forcePowerItems`)                                                                 |
| `equipment` | `equipment:inventory\|armor\|weapons\|implants`          | body sections via `useBodyHandlers`, or a `dataKey` item array                                                |
| `rows`      | `rows:<dataKey>`                                         | arrays of string records (`attacks`, `weapons`, `configuration`)                                              |

- Field bindings: `path` + `valueType` (`string`/`number`/`image`/`enum` with `options`); `numeric`
  gives text a formula reading (`'+3D'` → 3, empty → 0); `syncsTitle` renames the document when
  written (entity name/concept).
- Member tracks: a track binding with `members: { trackKey, maxMembers }` renders `CohortTrack`
  (`features/sheet/declarative/CohortTrack.tsx`, pure rules in `cohort.ts`): letters A, B, C… (none
  for a single member), bounded add, confirmation before removing a member with marks, "out of the
  fight" once the last visible level is marked, per-member penalty. `variants` (`lengthPath` +
  `levelsByLength`) shows a subset of the 7 stored slots (visible level i = slot i); the track's own
  −/+ regulator steps through the lengths, and shortening past marks asks first and collapses hidden
  marks into the last visible level. Fodder `trackLength` (3/5/7) parses as 7 for pre-feature groups
  and is created as 3.
- Computed-length tracks: `length: { from, adjustmentKey, adjustmentRange, maxLength }` on a track
  binding (V5 Health = `stamina + 3`). The record stores `{ levels, [adjustmentKey] }`; the
  primitive evaluates `from` itself (a re-skinned template cannot break it) and shows
  `from + adjustment` unlabeled boxes with a −/+ regulator (`resolveComputedTrackLength` in
  `declarative/trackLength.ts`); marks past the length are kept. Node `trackLayout` (`table` |
  `strip`) picks the `ConditionTrack` molecule; default `strip` for compact nodes and computed
  tracks.
- Reuse before adding: new systems extend the existing elements with optional, system-neutral
  features (layout, regulator, row options) instead of shipping new look-alike atoms.
- Trait bindings may declare `row: { specialization?, flags? }` (default both true): hide the
  specialization text input or the specialization/experienced/practiced flags (V5 attributes hide
  both, V5 skills hide the flags).
- A catalog-bound single-select field with more than `SEARCHABLE_SELECT_THRESHOLD` (12) resolved
  options renders the searchable `CatalogSuggest` instead of a `<select>` (`fieldControls.tsx`,
  `usesSearchableSelect`). It stores the option's value exactly as the drop-down did, so catalog
  fills are unaffected, and a stored value the catalog no longer offers keeps its text. Shorter
  lists and static options keep the plain select; a bound multi-select cannot exist (the schema
  rejects it).
- Field bindings: `valueType` also `boolean` (toggle fields); `range` clamps numbers on write;
  `suggestions: { catalogId }` turns a bridged text field into free text with catalog suggestions
  (`useCatalogSuggestions`, localized names).
- List bindings may set `polarity` (`positive`/`negative`) for merit/flaw lists without a catalog
  filter, and `translation` for the title.
- Rows bindings render `RowsBody` (a table over a data array; `enum` columns keep unknown stored
  text visible; `hidden` columns are stored but not shown; rows reorder with labelled move buttons).
  `catalog: { catalogIds, column, fills }` turns the name column into a catalog suggestion that
  overwrites the row's mapped columns. Bridged fields keep their own control (textarea, placeholder,
  number input); `constrain` keeps the top-level record valid (experience: spent ≤ total) and
  `adapter` maps split values (portrait ↔ `metadata.portraitId`/`imageUrl`). Numeric field bindings
  are formula coordinates (`experience-total - experience-spent`). Pool resources may set
  `currentRaisesMax` (Willpower).
- `track:droid-damage` reads droid damage (exposed as `health` by the droid capability) with the
  damage chart's level names and penalties. The shipped `droid-sheet` is the `droid` variant of the
  full sheet: no Force skills/powers or Force Points, per-group free-point fields
  (`droid-free-<group>` bag values), Built-in equipment, and the damage chart.
- Views resolve through the document's own definition (`resolveDocumentView` →
  `resolveEffectiveTemplate`): character and droid share the `character` kind, so the droid
  definition registers its own `droid-brief` view (aliases `brief`, `npc-card`) whose shipped
  template drops Force content and uses the damage strip.
- List entry shapes: `trait` `{id,label,value}`, `named-trait` `{id,name,value}`, `merit-flaw`
  `{id,label,points}`. Preset seeding and the list molecules both follow `entryShape`.
- Keys are persisted as plain strings, checked by `validateTemplateReferences`
  (`features/sheet/data/templateReferences.ts`) wherever templates enter the system: editor draft
  issues, file import (reports `template-reference-invalid`), and a test over every shipped default.
  It checks binding keys and list binding kinds, catalog ids, fill details and fill targets,
  formula/`maxFrom` coordinates against `listTemplateNumericCoordinates`, and reference targets
  against the template's setting (`reference-target-unavailable`, with the field label).
  `{ referenceScope: false }` skips only that last check: library file parsing passes it because the
  file's own types and settings are not installed yet.
- An unknown key, wrong kind, missing character, or missing body handlers renders the labeled
  `DegradedBinding` notice and reports `binding-unresolved` with a `reason`.
- Catalogs are declared by plugins (`SystemPlugin.catalogs`, built with `defineCatalog` from
  `systems/catalogs.ts`; Star Wars in `systems/star-wars-wod/catalogs.ts`, Hunter in
  `systems/v5/modules/hunter/catalogs.ts`). `features/sheet/data/catalogBindings.ts`
  (`CATALOG_BINDINGS`) only aggregates them from the registry (a duplicate id throws); entry names
  localize from `translations/source/<locale>/data/<catalogId>.yaml`, catalog names from
  `ui/sheet/catalogNames.yaml` (`catalogDisplayName`). They are the only path from system data into
  templates: select fields persist `catalogId` + fill mappings and system lists resolve
  `binding.catalog.catalogId` from the same registry. Unknown catalogs degrade to manual choice and
  report `catalog-unavailable`.
- User catalogs (spec 015, `systems/userCatalogs.ts`): `user-catalog-<8>` ids, typed columns
  (`c-<8>`: text / number / toggle) and entries (`e-<8>`, a name plus values by column id; values of
  unknown columns or the wrong type are dropped on parse). The owner is a user setting
  (`{ settingId }`), a shipped setting (`{ systemId, moduleId? }`: Rules only, a line, a setting
  system), or a ruleset (`{ rulesetId }`, shared by every setting on it). They reach generic code
  through the registry overlay (`setUserCatalogs`, synced in `systems/index.ts`; the storybook adds
  `registerSampleCatalogs`) adapted by `userCatalogBinding` to `CatalogBindingEntry`, so every
  consumer goes through **`getCatalogBinding(id, storeCatalogs?)`** (shipped first) — never
  `CATALOG_BINDINGS.get` outside docs embeds. React callers pass the store's `catalogs` so edits
  re-resolve. Scope: `catalogScopeOf(registry, template)` → the template's setting and its ruleset;
  `listCatalogBindingsFor` groups the editor picker (setting / ruleset / shipped),
  `isCatalogInScope` makes an out-of-scope user catalog an `unknown-catalog` reference issue.
  Limits: `TEMPLATE_LIMITS.catalogEntriesMax` 1000, `catalogColumnsMax` 20, `catalogsPerOwner` 50.
  Editing is pure (`features/sheet/data/catalogEdit.ts`: columns, entries, `convertValue`,
  `parsePastedEntries`, `catalogUsage`, `boundCatalogIds`).
- A pick from a user catalog stores the entry id and the name in `<valueKey>#label` (in a table row:
  `<columnId>#label`; `pickLabelKey`); the select shows the live name, or `#label` once the entry or
  catalog is gone. Other use sites: a value-bag list's `catalog: { catalogId, valueFrom? }` (named
  lists only: names suggest entries; `valueFrom` copies a column that fits the item type —
  `catalogKindFitsListItem` — into the entry value; a mismatch reports `unknown-fill-detail`, a
  catalog on an unnamed list `list-catalog-unnamed`), and a table `select` column's `binding`, whose
  fills target sibling column ids and write only that row (`pageApi.setRowValues`). Template import
  keeps user catalog bindings (they may arrive later).
- Fill semantics (`readCatalogDetails` + `pageApi.applyWrites`): picking an entry **overwrites**
  every mapped target in one change — a detail the entry lacks (`undefined`) leaves its target
  untouched, `null`/`''` clears it; clearing the select writes nothing. Fill targets may be field
  ids, value keys, value-key lists, or writable binding coordinates (bridged data: traits,
  resources, fields, rows, lists with a `coordinate`); row-valued details replace the whole
  list/rows. A catalog may declare `resolveDetails` (system-owned adapters, e.g.
  `systems/star-wars-wod/catalogAdapters.ts`: dice → dots with `catalog-detail-out-of-range`
  clamping, scale name → enum, armor label split, arc names). Detail kinds: `text`, `number`,
  `boolean`, `rows`.
- Reference fields belong to the template's setting (spec 017,
  `features/sheet/data/referenceScope.ts`). The setting is `catalogScopeOf`'s (user setting, shipped
  line = system + module, or system). `referenceTargetsOf` lists its kinds once each:
    - user setting: the ruleset's `coreDefinitions` kinds + user types owned by the setting;
    - shipped line: the module's kinds + `coreDefinitions` kinds + user types owned by the module or
      by the system without a module;
    - system without a module: its module-less kinds + user types owned by the system without a
      module; an unregistered system: none.

    Equal labels gain the setting (`targetLabel`); the user's own type of the same name in the same
    setting gets "(yours)". The editor's kind picker lists these, then stored targets outside them
    as "(unavailable)" (`referenceKindName`), kept until unchecked. On the sheet, `useTemplatePage`
    flags each `DocumentOption.inScope` (`isDocumentInReferenceScope`: same system — the user
    setting's ruleset for a user setting —, same `metadata.settingId` or none, a scope kind); the
    search offers in-scope options of the target kinds. A selected id whose document exists but is
    out of scope or not a target kind shows its title, an "outside this setting" note, open and
    remove, and reports `reference-target-out-of-scope` once; a stale id shows the "missing
    document" placeholder and reports `reference-target-missing` once (value kept). Neither is
    reported in previews; an absent `inScope` (story/preview options) reads as in scope. Reference
    list entries (spec 016) render the same control.

## Document source

Renderers never read the store directly: `useTemplatePage` and `useBoundDocument` read
`useDocumentSource()` (`hooks/useDocumentSource.ts`). Default = the editable store's current
document. Wrap a subtree in `DocumentSourceContext.Provider` with:

- `createStaticDocumentSource(envelope)`: read-only (no writes, no preset seeding) — documentation
  previews and the editor's quick preview;
- `createScratchDocumentSource(envelope, definition)`: writable in memory with the store's write
  rules (data re-parsed, template values through `applyTemplateValueWrites` in
  `features/sheet/data/templateValueWrites.ts`) — the editor's sample data. It never reaches the
  store; `scratch.useSource()` subscribes a component to it.

`DocumentSource.preview` (static and scratch sources) disables reference "open document" and the
`reference-target-missing` report; `readOnly` only disables writes.

## Entity pages and other settings (feature 007)

What a future setting (D&D, cyberpunk, …) reuses versus supplies for the same page kinds:

| Kind         | Star Wars–specific (setting supplies)                                                                 | Reusable as-is                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Creature     | combat scales + scale enum, WoD physical/mental traits, tier soak rule, bestiary adapter, rules links | identity/description/source layout, member health track, attacks rows, merits/flaws lists, `visibleWhen` tier switch     |
| Vehicle      | scale enum, vehicle-damage level names, system ratings, hyperdrive/nav fields, arcs, vehicle adapter  | identification/capacity layout, weapons rows, crew-station references, systems/modifications tables, member damage track |
| Fodder group | WoD attributes, quick-pool table, lethal-soak reminder, 3/5/7 health variants                         | member cohort (count, length variants, defeated state), leader reference, shared-stat block                              |

Setting-neutral layers (no system identifiers; guarded by `entity-templates.test.tsx`):
`templates/builders.ts`, `systems/templateBindings.ts`, `features/sheet/declarative/**`.
