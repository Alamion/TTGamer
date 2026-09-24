# Sheet Manager Module

## Scope

The universal sheet implementation supports Star Wars WEG/WoD characters, droids, creatures, vehicles, and fodder groups. Definitions own their schemas and named views; do not fold kind-specific state into the shared document envelope.

## Structure

```text
src/sheet_manager/
├── components/               # reusable UI, grouped by visual responsibility
│   ├── controls/             # generic inputs: checkbox, textarea, catalog picker
│   ├── dialogs/              # create/manage/confirm/import-conflict/template modal flows
│   │   └── template-editor/  # template editor subcomponents + pure draft model
│   ├── sections/             # collapsible panels, cards, tables
│   └── stat-fields/          # atomic traits, dots, labels, Force and merit/flaw rows
├── context/                  # read-only CharacterContext
├── data/                     # bundled character presets
├── features/sheet/           # the assembled interactive sheet
│   ├── shell/                # toolbar, view selector, workspace-level import/export state,
│   │                         # template library entry, template file transfer module
│   ├── body/                 # character equipment and implant editors
│   ├── declarative/          # template page renderer: fields, tables, primitives, member
│   │                         # tracks, bound document access, page hook
│   ├── registry/             # template field type → control mapping
│   ├── data/                 # sheet-local catalog adapters + catalog binding registry
│   └── hooks/                # sheet-local behavior hooks
├── hooks/                    # useCharacter and update helpers
├── systems/                  # neutral contracts (registry, types, view, templateBindings,
│   │                         # catalogs, policies) + one folder per system plugin:
│   ├── star-wars-wod/        # Star Wars WoD 2e (ruleset + setting in one plugin until T-041)
│   └── v5/                   # V5 ruleset (`ruleset/`) + supernatural modules (`modules/hunter/`)
├── templates/                # setting-neutral template node builders
├── store/                    # documentStore (polymorphic documents, v3) + templateStore (library, v3)
└── types/                    # generic contracts, template schema, templateValues bag
```

`components/` must never become a catch-all folder. Put a component in `stat-fields/`
only when it renders one concrete stat/trait value; put a complete document or a
top-level section in `features/sheet/`. Shell controls and their dialogs belong in
`features/sheet/shell/` and `components/dialogs/`, respectively.

## Composition Scale

Use dependency direction, not component size, to classify sheet UI:

1. **Atoms** (`components/controls`, `components/stat-fields`) render one input or value.
   They receive values and callbacks, and must not read document context, stores, systems,
   or persistence. Generic inputs live in `controls/` (e.g. `CatalogSuggest`, which owns its own
   keyboard navigation because its input sits outside the portalled list); `stat-fields/` renders
   one concrete stat. Extend an existing atom with an optional prop before adding a new one.
2. **Molecules** (`components/sections`) combine atoms into one reusable interaction such
   as a trait group, resource group, condition track (optional strip layout and −/+ length
   regulator), or editable table. They may accept
   definition/profile data but must not select the current document.
3. **Bound elements** (`features/sheet/declarative`, `features/sheet/body`) adapt document data
   to molecules through bindings (`useBoundDocument`, `useBodyHandlers`). They must not decide
   which document view is active or render a workspace shell.
4. **Views** are shipped templates (`systems/<system>/templates/`): declarative trees composed
   from bound elements. There are no hand-written view components; a new page is a template.
5. **Shells** (`features/sheet/shell`) own collection, import/export, toolbar, and active-view
   concerns. They do not contain system mechanics.

Book-term labels (spec 009) live in `components/terms/`: `TermLabel` is an atom-level renderer
with no state or listeners of its own; `TermHintProvider` (one per sheet view) owns the
delegated listeners and the single hint popover. Whether a label is a book term is glossary
data, never a system conditional.

Document definitions own the available views, each backed by a shipped template of the same id
and kind. A brief is a representation, not a document kind: every definition registers its own
brief view (aliases `brief`/`npc-card` where older data may use them). Keep obsolete persisted view
IDs as definition-owned aliases until their data can no longer exist. View labels are
definition-owned translation descriptors; shells must not maintain view-ID label maps.

Prefer capability adapters for related payloads. For example, sentient and droid documents
share character trait/equipment blocks; the droid adapter maps its mechanical `damage` track
to the shared condition capability without changing persisted field names. Labels and track
profiles remain definition-owned configuration. Shared views route by capability presence
(`capabilities.character`), never by `definitionId` string matching. Retired pre-template
blocks and views are archived for reference in `context/sheet-manager/legacy-sheet-components/`.

## Character Access

Bound template elements use `useBoundDocument()` (any kind, including `dataKey` equipment);
Star Wars equipment and legacy-shaped character helpers use `useCharacter()`:

- viewer context wins when present;
- otherwise the editable Zustand character is used;
- updates are ignored in read-only context.

Do not read `currentCharacter` directly inside a reusable sheet element. Direct store access is appropriate for layout/manager operations that explicitly manage the collection.

## Systems, Modules, and Publisher Notices

- A new game system is a `SystemPlugin` folder under `systems/`; generic code must not import
  it (ESLint). Plugins declare catalogs, policies, templates, and bindings; nothing is
  special-cased for Star Wars.
- Rulesets shared by several lines keep shared mechanics in `ruleset/` and lines in
  `modules/<line>/` (see `.agents/skills/sheet-manager/SKILL.md`). A document carries one module.
- Publisher policies come from `systems/policies.ts`; `SheetWorkspace` renders only the badge
  (`PolicyBadges`, linking to the policy's docs page) outside the template tree so no template
  can remove it, and exports carry `notices`. The full text lives on one docs page.
- Dice mechanics belong to the ruleset (`SystemPlugin.dice`): `traitPool` builds a stat's
  notation (a plugin without it shows no stat dice button; Star Wars declares the classic
  `systems/wod-like/dicePool.ts`, V5 its own 6+ pool), and an optional `reading` (V5:
  `systems/v5/ruleset/dice.ts`) adds critical pairs and reads special-dice outcomes. Each V5
  module contributes its dice line (`modules/hunter/dice.ts` Desperation,
  `modules/vampire/dice.ts` Hunger, awaiting the vampire sheet). Primitives resolve the builder
  with `useDocumentTraitDiceRoll()`; `StatDot` sends the document as the roll source
  (`useDocumentRollSource()`), and `SheetWorkspace` publishes the shown document
  (`integrations/sheet-dice/shownDocument.ts`). Publisher badges never appear on dice surfaces.
- Shipped view ids are unique across systems (prefix them with the system, e.g.
  `v5-hunter-sheet`); composite keys for overrides are T-046.

## Schema and Import/Export

- `DocumentEnvelopeSchema` plus the registered definition schema are the runtime boundary for current JSON imports. Untagged legacy character JSON is validated with `BaseCharacterSchema` and migrated explicitly.
- Blank/missing character names normalize to `''`; the UI displays `New Character` where a label is required.
- IDs are opaque non-empty strings, not necessarily UUIDs, because presets and compatibility data may use stable textual IDs.
- Numeric resource and dot values must be finite integers within their schema limits.
- `forcePowerItems` is the single Force-power representation. Retired `forcePowers` and `customForcePowers` keys are stripped as unknown input.
- Zod object parsing strips unknown keys by default. Do not change schemas to `.passthrough()` without a migration/security reason.
- An import that collides with a stored ID must offer Replace, Duplicate (new ID), or Cancel.
- Export names start with `ttgamer_`; a blank title uses the document definition ID.

Persistence uses a Zustand version and migration strategy. Invalid legacy or current entries are retained in the bounded recovery collection instead of being silently discarded.

Generic documents use validated open-ended kind identifiers so non-character records do not require a core enum change. Built-in systems register code-owned shipped templates; user templates use the bounded declarative schemas in `types/template.ts` and must never contain executable code.

## Custom Page Templates

The current-state reference is `.agents/skills/sheet-templates/SKILL.md` — load it before any
template change. Specs 003–006 are change history, not a description of today's system; do not
duplicate template facts here. Invariants that must never be broken:

- Templates are declarative trees and never contain executable code; they never enter document
  definition schemas.
- Custom values live in the flat `templateValues` bag keyed by coordinate (`valueKey ?? id`);
  system values live in `document.data`. Orphaned values are never deleted.
- Pass the resolved template object to the store write path; never look templates up by id
  (`getTemplate` sees only user templates, not shipped defaults or overrides).
- Every graceful-degradation path (rejected write, quarantine, unresolved binding, missing
  catalog, broken formula) reports through `diagnostics.ts` `reportSheetIssue`. Silent fallbacks
  are bugs.
- A template change is not done until the skill reflects it.

## Derived State

- `calculateHealthPenalty()` uses the deepest marked health level.
- Virtues define the minimum Willpower (`min(passion + self-control, 10)`) and Dark Side Resistance (`max(0, min(5 + conscience - passion, 10))`); the default template shows these minimums as read-only Derived Stats, while the editable resources live in the Force section's Resources group. Merits/flaws may raise the stored values.
- Current Force Points may legitimately be zero.
- Detailed formulas are in `.agents/skills/sheet-manager/SKILL.md`.

## UI Rules

- Reuse proven sheet primitives before creating type-specific equivalents. New definitions should compose existing collapsible sections, trait/dot controls, health/resource trackers, equipment editors, and documentation-link patterns. If a primitive is nearly reusable, extract or parameterize it at the narrowest system-independent boundary instead of cloning a weaker implementation.
- Model WoD-family differences as definition-owned configuration and block composition (trait groups, resource tracks, special-power blocks, labels, limits), not copied sheet pages. Reserve bespoke React blocks for genuinely different interaction models.
- `TraitRowWithInput` is controlled by `specializationText`; parent/store changes must appear immediately.
- Icon-only actions require accessible labels.
- Use Radix primitives for new modal behavior. A modal must label itself, trap focus, close on Escape, and restore focus to its trigger.
- Portrait URLs accept only HTTPS or site-relative resources and must use `referrerPolicy="no-referrer"`. Local portraits are resized, quota-bounded IndexedDB blobs; never put image data URLs or blob contents in Zustand/localStorage JSON.

## Testing

Run schema/import/derived-stat tests for changes to `types/`, persistence, or import/export. Run `yarn verify` before handoff. Load `.agents/skills/sheet-manager/SKILL.md` for schema, store, or derived-stat changes and `.agents/skills/sheet-templates/SKILL.md` for pages, bindings, or docs embeds.
