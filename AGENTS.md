# Holocron Sheet Manager - Project Cheat Sheet

## 1. Project Overview

A modular React-based character sheet manager for a Star Wars WEG/WoD hybrid system. Features local-first persistence via IndexedDB (localForage) and supports multiple character types (sentient, droid, vehicle).

**Routes:** `/` - Main app | `/storybook` - Component playground

---

## 2. Tech Stack

| Concern         | Technology                          |
| --------------- | ----------------------------------- |
| Package Manager | yarn@1.22.22                        |
| Build Tool      | Vite                                |
| Frontend        | React 19 + TypeScript (strict)      |
| State           | Zustand 5 (with persist middleware) |
| Styling         | Tailwind CSS + clsx                 |
| Forms           | React Hook Form + Zod               |
| Persistence     | localForage (IndexedDB)             |
| Icons           | Lucide-react                        |
| Components      | Radix UI primitives                 |
| Testing         | Vitest + Playwright                 |
| Docs            | Storybook 10                        |

---

## 3. Project Structure

```
src/
├── components/
│   └── shared/           # Atomic/molecular UI components
│       ├── StatDot.tsx          # WoD-style dot selector (1-5 dots)
│       ├── StatLabel.tsx        # Label with optional tooltip
│       ├── TraitRow.tsx         # Label + StatDot row (simple & with input)
│       ├── ConditionSquare.tsx   # Health track square (empty/slash/cross/filled)
│       ├── MeritFlawRow.tsx     # Merit/Flaw list editor
│       └── index.ts
├── features/
│   └── sheet/            # Character sheet feature module
│       ├── components/
│       │   ├── CharacterSheet.tsx   # Main sheet orchestrator
│       │   ├── SheetHeader.tsx      # Import/Export/Reset + metadata fields
│       │   ├── AttributeBlock.tsx   # 9 attributes (Physical/Social/Mental)
│       │   ├── SkillBlock.tsx       # Skills (Talents/Skills/Knowledges)
│       │   ├── AdvantagesBlock.tsx  # Backgrounds, Merits, Flaws
│       │   ├── PowerBlock.tsx       # Force Skills, Virtues, Willpower, Force Points
│       │   ├── HealthBlock.tsx      # Bashing/Lethal damage tracker
│       │   ├── InventoryBlock.tsx   # Items, Armor, Weapons
│       │   └── StatsBlock.tsx       # Derived stats + Experience
│       └── index.ts
├── hooks/
│   ├── index.ts
│   └── useLocalStorageState.ts   # useExpandedState hook for collapsible sections
├── store/
│   └── characterStore.ts   # Zustand store (CRUD, import, persistence)
├── types/
│   └── character.ts       # Zod schemas + TypeScript types + default factory
├── App.tsx
└── main.tsx
```

---

## 4. Theme & Colors (Tailwind)

Custom colors defined in `tailwind.config.js` and `src/index.css`:

```css
--rebel-red: #b91c1c /* Health, flaws, accents */ --imperial-blue: #1e40af /* Willpower, virtues */
    --hologram-blue: #0ea5e9 /* Primary actions, force skills */ --cyber-yellow: #eab308
    /* Experience, skills */ --dark-saber: #0f172a /* Dark backgrounds */;
```

---

## 5. Key Components

### StatDot (`src/components/shared/StatDot.tsx`)

WoD-style rating selector with optional flags (Specialization/Practiced/Experienced).

**Props:** `value`, `maxValue` (default 5), `onChange`, `disabled`, `size` (sm/md/lg), `showFlags`, `specialization`, `experienced`, `practiced`, `minimal`

**Behavior:** Click dot N → sets value to N. Click active dot → resets to 0 (or minimal). Toggle S/P/E flags when `showFlags=true`.

### ConditionSquare / ConditionTrack (`src/components/shared/ConditionSquare.tsx`)

Health track cells cycling through: empty → `/` → `X` → `●`

**Marks:** `'empty' | 'slash' | 'cross' | 'filled'`

### TraitRow / TraitRowWithInput (`src/components/shared/TraitRow.tsx`)

- `TraitRow` - Simple label + StatDot
- `TraitRowWithInput` - Label + editable specialization text + StatDot
- `CustomTraitList` - Dynamic list with add/remove (used for custom skills)

### CharacterStore (`src/store/characterStore.ts`)

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

Uses `localforage` via custom storage adapter for persistence.

---

## 6. Character Data Schema (`src/types/character.ts`)

```typescript
const BaseCharacterSchema = z.object({
    id: z.string().uuid(),
    metadata: CharacterMetadataSchema,
    attributes: z.record(TraitValueSchema),   // { Strength: { value, specialization, experienced, practiced } }
    skills: z.record(TraitValueSchema),
    forceSkills: z.record(TraitValueSchema).optional(),
    virtues: z.record(TraitValueSchema).optional(),
    backgrounds: z.array(BackgroundSchema).optional(),
    merits: z.array(MeritFlawSchema).optional(),
    flaws: z.array(MeritFlawSchema).optional(),
    willpower: z.object({ current, max }).optional(),
    forcePoints: z.object({ current, max, bashing, lethal }).optional(),
    darkSideResistance: z.number().optional(),
    health: HealthSchema,
    inventory: z.array(ItemSchema),
    armor: z.array(ArmorItemSchema),
    weapons: z.array(WeaponItemSchema),
    customTalents/Skills/Knowledges: z.array(CustomSkillSchema),
    notes: z.string(),
});
```

---

## 7. Development Commands

```bash
yarn dev              # Start dev server
yarn build            # Production build
yarn storybook        # Storybook on :6006
yarn typecheck        # TypeScript check
yarn lint             # ESLint
yarn lint:fix         # Auto-fix lint
yarn format           # Prettier format
```

---

## 8. Code Conventions

- **Prettier:** `semi: true`, `singleQuote: true`, `tabWidth: 2`
- **ESLint:** React hooks + accessibility focused
- **Styling:** Tailwind + `clsx` for conditional classes
- **Icons:** Lucide-react
- **No comments** unless explicitly requested

---

## 9. Patterns & Tips

### Adding a new attribute/skill block

1. Add constant in block component (e.g., `ATTRIBUTES` in `AttributeBlock.tsx`)
2. Render using `TraitRowWithInput` or `CustomTraitList`
3. Wire to `updateCharacter(id, { [key]: newValue })`

### Import/Export flow (`SheetHeader.tsx`)

- **Export:** `JSON.stringify(currentCharacter)` → Blob → download
- **Import:** FileReader → `BaseCharacterSchema.parse()` → `importCharacter()`

### Collapsible sections

Use `useExpandedState(sectionKey, defaultExpanded)` from `hooks/index.ts`. Persists to localStorage.

### Block colors (by section)

| Section         | Color  | Tailwind class                              |
| --------------- | ------ | ------------------------------------------- |
| Attributes      | Blue   | `text-hologram-blue`                        |
| Skills          | Yellow | `text-cyber-yellow`                         |
| Advantages      | Red    | `text-rebel-red`                            |
| Force/Willpower | Blue   | `text-hologram-blue` / `text-imperial-blue` |

---

## 10. Context Files

```
context/
└── Star_Wars_WEG_to_WoD_Conversion.md  # ~11k line source doc (use grep)
```

---

## 11. Roadmap (Current Status)

- [x] **Phase 1:** Core character engine (attributes, skills, health, import/export)
- [x] **Phase 2:** Template registry + character CRUD (in progress)
- [ ] **Phase 3:** Smart assistant (auto-calculated stats) + Dice integration
