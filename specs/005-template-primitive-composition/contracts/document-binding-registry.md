# Contract: Document Binding Registry

**Feature**: 005-template-primitive-composition | **Status**: designed (Phase 1)

## Registry API

```ts
// systems/star-wars-wod/documentBindings.ts (pattern: features/sheet/data/catalogBindings.ts)
export interface DocumentBindingDescriptor {
    key: string;
    kind: 'trait' | 'list' | 'resource' | 'track' | 'field';
    label: string;
    documentKinds: ReadonlySet<string>;
    read(data: unknown): unknown;
    write(data: unknown, value: unknown): unknown; // pure transform; parse-on-write upstream
    meta?: {
        minimum?: number;
        maximum?: number; // trait/rating bounds (profile-owned)
        trackId?: string; // 'health' | 'vehicle-damage' | …
        listId?: 'customTalents' | 'customSkills' | 'customKnowledges';
        derived?: boolean; // e.g. willpower (virtue-derived display)
    };
}

export function listDocumentBindings(
    systemId: string,
    documentKind: string
): readonly DocumentBindingDescriptor[];
export function resolveDocumentBinding(
    systemId: string,
    documentKind: string,
    key: string
): DocumentBindingDescriptor | undefined;
```

## star-wars-wod key set (closed; phase one)

- `trait:<group>:<TraitKey>` — every trait of every profile group (`starWarsWodProfile`):
  attributes (physical/social/mental), abilities (talents/skills/knowledges), force-skills,
  virtues, vehicle-systems. Bounds from the profile (`trait(key, min)`), labels localized at
  render via the profile/catalog localization chain (same as AttributeBlock today).
- `list:customTalents` / `list:customSkills` / `list:customKnowledges` — character-kind lists
  (presets-capable).
- `resource:willpower` (pool, virtue-derived display), `resource:force-points` (pool),
  `resource:dark-side-resistance` (rating).
- `track:health` (character/creature kinds), `track:vehicle-damage` (vehicle + mechanical
  variants).
- `field:<identity-key>` — identity fields per kind: character (name, concept, player, nature,
  adventure, demeanor, age, description…), creature (name, species, type, owner, size…), vehicle
  (name, model, owner, crew, length, cargo, passengers, consumables, speed…), group (concept,
  notes).

Unknown keys resolve to `undefined` → renderer degradation; foreign-kind keys are filtered out of
`listDocumentBindings` and never match `resolveDocumentBinding` for the wrong kind.

## Rules

- Templates store the key string only; descriptors are never persisted into templates.
- Registry lookups are pure and side-effect free; all writes flow through
  `updateDocumentData`/`updateCharacter` capability paths (parse-on-write upstream).
- A new setup ships its own registry module; shared code never branches on system ids.
