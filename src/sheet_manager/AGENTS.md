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
│   ├── sections/             # collapsible panels, cards, tables, reusable document sections
│   ├── stat-fields/          # atomic traits, dots, labels, Force and merit/flaw rows
│   └── viewer/               # read-only character display adapter
├── context/                  # read-only CharacterContext
├── data/                     # bundled character presets
├── features/sheet/           # the assembled interactive sheet
│   ├── shell/                # toolbar, view selector, workspace-level import/export state,
│   │                         # template library entry, template file transfer module
│   ├── blocks/               # standard-character top-level sections
│   ├── body/                 # character equipment and implant editors
│   ├── views/                # one module per named view (brief, creature, vehicle, fodder)
│   ├── declarative/          # custom-template page renderer: fields/table blocks, page hook
│   ├── registry/             # layout block → component mapping (built-in + declarative fields)
│   ├── data/                 # sheet-local catalog adapters + catalog binding registry
│   └── hooks/                # sheet-local behavior hooks
├── hooks/                    # useCharacter and update helpers
├── systems/                  # system plugins, document definitions, registry
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
   or persistence.
2. **Molecules** (`components/sections`) combine atoms into one reusable interaction such
   as a trait group, resource group, condition track, or editable table. They may accept
   definition/profile data but must not select the current document.
3. **Blocks** (`features/sheet/blocks`, `features/sheet/body`) adapt one document capability
   to molecules. A block may use a capability hook, but must not decide which document view
   is active or render a workspace shell.
4. **Views** (`features/sheet/views`) compose blocks or compact molecules into one named
   representation. Views must not duplicate an atom or molecule that another view needs.
5. **Shells** (`features/sheet/shell`) own collection, import/export, toolbar, and active-view
   concerns. They do not contain system mechanics.

Document definitions own the available views. `brief` is a representation capability, not
a document kind: every built-in definition must register it. Keep obsolete persisted view
IDs as definition-owned aliases until their data can no longer exist. View labels are
definition-owned translation descriptors; shells must not maintain view-ID label maps.

Prefer capability adapters for related payloads. For example, sentient and droid documents
share character trait/equipment blocks; the droid adapter maps its mechanical `damage` track
to the shared condition capability without changing persisted field names. Labels and track
profiles remain definition-owned configuration. Shared views route by capability presence
(`capabilities.character`), never by `definitionId` string matching.

## Character Access

All sheet blocks, including derived and experience blocks, use `useCharacter()`:

- viewer context wins when present;
- otherwise the editable Zustand character is used;
- updates are ignored in read-only context.

Do not read `currentCharacter` directly inside a reusable sheet block. Direct store access is appropriate for layout/manager operations that explicitly manage the collection.

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

Generic documents use validated open-ended kind identifiers so non-character records do not require a core enum change. Built-in systems register code-owned layouts; user templates use the bounded declarative schemas in `types/template.ts` and must never contain executable code.

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

Run schema/import/derived-stat tests for changes to `types/`, persistence, or import/export. Run `yarn verify` before handoff. Load `.agents/skills/sheet-manager/SKILL.md` for schema, store, derived-stat, or block changes.
