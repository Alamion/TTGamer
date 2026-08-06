---
name: sheet-manager
description: Deep reference for the character sheet manager — derived stats formulas, character schema details, store architecture, and import/export flow.
---

# Sheet Manager — Deep Reference

## Derived Stats Formulas

| Stat                         | Formula                                         |
| ---------------------------- | ----------------------------------------------- |
| Minimum Willpower            | `Passion + Self Control` (clamped to 10)        |
| Minimum Dark Side Resistance | `5 + Conscience - Passion` (clamped to 0–10)    |
| Initiative (Standard)        | `Wits + Alertness`                              |
| Initiative (Lightsaber)      | `Initiative (Standard) + Control (Force Skill)` |
| Jumping Distance             | `×min(Control, Telekinesis)`                    |
| Running Speed                | `×min(Control, Telekinesis)`                    |

Virtues provide the minimum values for the editable Willpower and Dark Side Resistance resources in `ForceBlock.tsx`; merits/flaws may raise them. The other formulas are read-only values in `StatsBlock.tsx`.

## Import/Export Flow

Implemented in `SheetLayout.tsx`:

- **Export:** remove the device-local portrait key, then `JSON.stringify()` → `Blob` → download as JSON
- **Import:** `File.text()` → `JSON.parse` → `BaseCharacterSchema.parse()` → collision choice → `importCharacter()`

Uses `Zod.parse()` for runtime validation. Invalid files show error alert.

## Store Architecture

`characterStore.ts` uses Zustand 5 with `persist` middleware:

```typescript
const forageStorage = {
    getItem: async (name) => localforage.getItem<string>(name),
    setItem: async (name, value) => localforage.setItem(name, value),
    removeItem: async (name) => localforage.removeItem(name),
};

export const useCharacterStore = create<CharacterState>()(
    persist(
        (set, get) => ({
            // state + actions
        }),
        {
            name: 'character-storage',
            storage: createJSONStorage(() => forageStorage),
        }
    )
);
```

## Character Schema Details

All types in `types/character.ts`. Key sub-schemas:

- `CharacterMetadataSchema` — name, type (sentient/droid/vehicle), template, player, adventure, concept, nature, demeanor, species, homeWorld, age, setting
- `HealthSchema` — 7-level damage tracker (Bruised → Incapacitated), each level is ConditionMark (empty/slash/cross)
- `TraitValueSchema` — `{ value, specializationText?, specialization?, experienced?, practiced? }`
- Custom skills: `customTalents`, `customSkills`, `customKnowledges` — each is `CustomSkillSchema[]` (id, label, value, flags)
- `createDefaultCharacter()` factory produces fully initialized character with all 9 attributes, 3 virtues, empty arrays, etc.

## Component Data Flow

1. `SheetLayout` reads `currentCharacter` from Zustand store
2. If null → renders "No Character Loaded" placeholder
3. If exists → renders `CharacterSheet` which renders all blocks
4. Each block reads relevant slice from store via `useCharacterStore()`
5. Mutations go through `updateCharacter(id, partial)` — uses shallow merge via spread
6. `useTraitUpdater(path)` provides convenience: `getTrait(path, key)`, `updateTrait(path, key, value)`

## Health Damage Tracking

Health uses 7 levels (`HEALTH_LEVELS` constant), each level is a `ConditionMark` ('empty', 'slash', 'cross'). `calculateHealthPenalty()` returns the penalty from the first non-empty level (Bruised=0 → Crippled=-5). Incapacitated has no penalty (can't act).
