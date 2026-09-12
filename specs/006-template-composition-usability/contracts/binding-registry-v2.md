# Contract: Document Binding Registry v2

**Feature**: 006-template-composition-usability | **Status**: Draft (Phase 1)
**Owner**: `src/sheet_manager/systems/star-wars-wod/documentBindings.ts`

Extends the feature-005 registry (closed per-setup set; templates persist only keys; the
system owns key → data mapping, labels, limits). All existing keys and behaviors are
unchanged; this contract only adds kinds and coordinates.

## 1. Extended `ListBinding`

`kind: 'list'` grows beyond the skills domain. Each list declares how its entries map to the
shared list-element interface (`{ id, label, value? }`) and which catalog backs copy-on-select:

| `listId`           | Document data                                      | Entry mapping                | Catalog                       |
| ------------------ | -------------------------------------------------- | ---------------------------- | ----------------------------- |
| `customTalents`    | `customTalents[]`                                  | identity (label+value)       | —                             |
| `customSkills`     | `customSkills[]`                                   | identity                     | —                             |
| `customKnowledges` | `customKnowledges[]`                               | identity                     | —                             |
| `forcePowers`      | `forcePowerItems[]` (`name`, `value`, `catalogId`) | name↔label, value, catalogId | `force-powers` (FORCE_POWERS) |
| `merits`           | `merits[]` (`label`, `points`, `catalogId`)        | label↔label, points↔value    | `merits-flaws:merits`         |
| `flaws`            | `flaws[]`                                          | as merits                    | `merits-flaws:flaws`          |
| `backgrounds`      | `backgrounds[]` (`label`, `value`, `catalogId`)    | label↔label, value           | `backgrounds` (BACKGROUNDS)   |

Rendering maps to the proven molecules: `CustomTraitList` (with catalog prop) and
`MeritFlawList` — the same components `ForceBlock` / `AdvantagesBlock` use, so parity is by
construction. Preset seeding (005 semantics: copy-on-assign once per document×template,
`metadata.seededPresets` marker, deterministic ids) applies to every list binding.

## 2. New `EquipmentBinding` (`kind: 'equipment'`)

| Key                   | `sectionId` | Document data | Rendered by        |
| --------------------- | ----------- | ------------- | ------------------ |
| `equipment:inventory` | `inventory` | `inventory[]` | `InventorySection` |
| `equipment:armor`     | `armor`     | `armor[]`     | `ArmorSection`     |
| `equipment:weapons`   | `weapons`   | `weapons[]`   | `WeaponsSection`   |
| `equipment:implants`  | `implants`  | `implants[]`  | `ImplantsSection`  |

Writes flow through `useBodyHandlers` capability paths (the exact handlers `BodyBlock`
uses), keeping the catalog-backed copy-on-select behavior identical to the built-in page.
Kind-scoping follows the 004/005 rule: bindings declare their `documentKinds`; foreign-kind
usage degrades to a labeled placeholder with zero data impact.

## 3. Numeric coordinate exposure (formula support)

The registry exposes each binding's numeric coordinates so the unified coordinate space
(contract: formula-grammar.md) can resolve them:

| Binding kind               | Coordinates exposed                           |
| -------------------------- | --------------------------------------------- |
| `trait`                    | `<trait-coordinate>` → trait value            |
| `resource`                 | `<resourceId>.current` and `<resourceId>.max` |
| `field`                    | none (string metadata — not numeric)          |
| `list`/`track`/`equipment` | none (not scalar numeric)                     |

Trait coordinates are the kebab-case forms already used by `resolveDataBindingByCoordinate`
(e.g. `strength`, `self-control`). Resource coordinates: `willpower`, `force-points`,
`dark-side-resistance` with `.current`/`.max` suffixes.

## 4. Registry API (unchanged signatures, extended payloads)

```ts
listDocumentBindings(systemId, documentKind): readonly DocumentBindingDescriptor[];
resolveDocumentBinding(systemId, documentKind, key): DocumentBindingDescriptor | undefined;
resolveDataBindingByCoordinate(systemId, documentKind, coordinate): DocumentBindingDescriptor | undefined;
// new: numeric coordinate enumeration for the authoring picker
listNumericCoordinates(systemId, documentKind): readonly { coordinate: string; label: string }[];
```

Only `star-wars-wod` registers bindings; other setups declare their own modules (Constitution
I). The system-agnostic template schema never imports any of this.
