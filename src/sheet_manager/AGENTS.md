# Sheet Manager Module

## File Structure

```
src/sheet_manager/
├── components/
│   ├── CatalogSuggest.tsx             # Autocomplete from catalog data
│   ├── CharacterManagerModal.tsx      # Character list modal (load/delete)
│   ├── CharacterViewer.tsx            # Read-only character viewer
│   ├── CollapsibleBlock.tsx           # Collapsible section wrapper
│   ├── ConfirmDialog.tsx              # Confirmation modal dialog
│   ├── DataTable.tsx                  # Reusable CRUD table
│   ├── ForcePowerRow.tsx              # Force power row editor
│   ├── index.ts                       # Barrel exports
│   ├── MeritFlawRow.tsx               # Merit/Flaw list editor
│   ├── NewCharacterButton.tsx         # Quick create button
│   ├── SectionCard.tsx                # Collapsible card with header
│   ├── StatDot.tsx                    # WoD-style dot selector (1-5)
│   ├── StatLabel.tsx                  # Label with optional tooltip
│   └── TraitRow.tsx                   # Label + StatDot (3 variants)
├── context/
│   └── CharacterContext.tsx           # React context for read-only mode
├── data/
│   └── presets.ts                     # Character presets (Jax Vorn)
├── features/
│   └── sheet/
│       ├── index.ts
│       └── components/
│           ├── AdvantagesBlock.tsx    # Backgrounds, Merits, Flaws
│           ├── AttributeBlock.tsx     # 9 attributes (Phys/Soc/Mental)
│           ├── BaseBlock.tsx          # Character metadata
│           ├── BodyBlock.tsx          # Inventory, Armor, Weapons, Health
│           ├── CharacterSheet.tsx     # Sheet orchestrator
│           ├── ForceBlock.tsx         # Force Skills, Virtues, Willpower, FP
│           ├── HealthBlock.tsx        # 7-level damage tracker
│           ├── OtherBlock.tsx         # Notes
│           ├── SheetLayout.tsx        # Layout + universal buttons
│           └── StatsBlock.tsx         # Derived stats + Experience
├── hooks/
│   ├── index.ts                       # Barrel exports
│   ├── useCharacter.ts               # Combined store + context hook
│   ├── useLocalStorageState.ts        # Expanded state persistence
│   └── useTraitUpdater.ts            # Generic trait (attr/skill) update hook
├── store/
│   └── characterStore.ts             # Zustand store (CRUD, import, persist)
└── types/
    └── character.ts                   # Zod schemas + TS types + default factory
```

## Component Hierarchy

```
SheetLayout (universal buttons: Export, Import, Reset, Manage, New Character)
  └── CharacterSheet
      ├── BaseBlock          (metadata: name, concept, species, ...)
      ├── AttributeBlock     (9 attributes, 3×3 grid)
      ├── SkillBlock         (Talents/Skills/Knowledge with custom lists)
      ├── AdvantagesBlock    (Backgrounds, Merits, Flaws)
      ├── ForceBlock         (Force Skills, Virtues, Willpower, Force Points)
      ├── BodyBlock          (Inventory, Armor, Weapons)
      ├── HealthBlock        (7-level damage tracker)
      ├── StatsBlock         (Derived stats, Experience)
      └── OtherBlock         (Notes)
```

Blocks only render when `currentCharacter` exists. `SheetLayout` shows "No Character Loaded" placeholder otherwise.

## State Management

```typescript
interface CharacterState {
    currentCharacter: BaseCharacter | null;
    characters: BaseCharacter[];
    setCurrentCharacter;
    updateCharacter;
    loadCharacter;
    createNewCharacter;
    deleteCharacter;
    importCharacter;
}
```

Uses Zustand 5 + `persist` middleware with localForage (IndexedDB) storage adapter. Import via `@site/src/sheet_manager/store/characterStore`.

## Shared Components

| Component               | Key Props                                                                            | Usage                                                 |
| ----------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `StatDot`               | `value, maxValue=5, onChange, size, showFlags, specialization/experienced/practiced` | Click dot N → set to N; click active → reset to 0     |
| `TraitRow`              | `label, value, onChange`                                                             | Simple label + StatDot                                |
| `TraitRowWithInput`     | `label, value, onChange`                                                             | + editable specialization text                        |
| `CustomTraitList`       | `items, onChange`                                                                    | Dynamic list with add/remove                          |
| `SectionCard`           | `title, storageKey?, children`                                                       | Collapsible with header, persistence via `storageKey` |
| `CollapsibleBlock`      | `storageKey, children`                                                               | Wrapper for collapsible sections                      |
| `DataTable`             | `columns, data, onAdd, onDelete, onEdit`                                             | Generic CRUD table                                    |
| `CharacterManagerModal` | N/A (self-contained)                                                                 | Character list modal for load/delete                  |
| `MeritFlawRow`          | `merits, flaws, onChange`                                                            | Merit/Flaw list editor                                |

## Character Schema

```typescript
const BaseCharacterSchema = z.object({
    id: z.string().uuid(),
    metadata: CharacterMetadataSchema,
    attributes: z.record(TraitValueSchema),
    skills: z.record(TraitValueSchema),
    forceSkills,
    virtues,
    backgrounds,
    merits,
    flaws,
    willpower,
    forcePoints,
    darkSideResistance,
    health: HealthSchema,
    inventory,
    armor,
    weapons,
    experience: { total, spent },
    customTalents,
    customSkills,
    customKnowledges,
    notes: z.string(),
});
```

All types/schemas in `types/character.ts`. Use `DEFAULT_TRAIT_VALUE` for defaults instead of inline objects.

## Key Patterns

- **Import paths:** `@site/src/sheet_manager/...` (resolved via tsconfig `paths`)
- **Character access:** use `useCharacter()` hook — combines Zustand store + Context, wraps `updateCharacter` with readOnly guard
- **Trait updates:** use `useTraitUpdater(path)` hook — `getTrait(key)`, `updateTrait(key, partial)`
- **Collapsible persistence:** `SectionCard`/`CollapsibleBlock` persist expanded state via `useLocalStorageState`
- **Import/Export:** `JSON.stringify` → Blob download; FileReader → `BaseCharacterSchema.parse()` → `importCharacter()`
- **Derived stats formulas:** See `.opencode/skills/sheet-manager/SKILL.md`
