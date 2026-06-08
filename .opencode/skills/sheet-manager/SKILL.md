---
name: sheet-manager
description: Deep reference for the character sheet manager — derived stats formulas, character schema details, store architecture, and import/export flow.
---

# Sheet Manager — Deep Reference

## Derived Stats Formulas

| Stat                    | Formula                                         |
| ----------------------- | ----------------------------------------------- |
| Willpower               | `Passion + Self Control`                        |
| Dark Side Resistance    | `5 + Conscience - Passion`                      |
| Initiative (Standard)   | `Wits + Alertness`                              |
| Initiative (Lightsaber) | `Initiative (Standard) + Control (Force Skill)` |
| Jumping Distance        | `×min(Control, Telekinesis)`                    |
| Running Speed           | `×min(Control, Telekinesis)`                    |

All derived stats are auto-calculated in `StatsBlock.tsx`.

## Import/Export Flow

Implemented in `SheetLayout.tsx`:

- **Export:** `JSON.stringify(currentCharacter)` → `Blob` → download as JSON file
- **Import:** `FileReader` reads file → `JSON.parse` → `BaseCharacterSchema.parse()` validates → `importCharacter()` stores

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
