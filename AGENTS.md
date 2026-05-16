# TTGamer - Project Cheat Sheet

## 1. Project Overview

A Docusaurus-based site hosting docs, blog, and a modular React character sheet manager for a Star Wars WEG/WoD hybrid TTRPG system. The sheet manager lives in `app/` and is embedded as a page at `/universal_sheet`. Features local-first persistence via IndexedDB (localForage) and supports multiple character types (sentient, droid, vehicle).

**Routes:**
| Route | Purpose |
| --- | --- |
| `/` | Docusaurus homepage |
| `/universal_sheet` | Character Sheet Manager (from `app/`) |
| `/docs/*` | Documentation |
| `/blog/*` | Blog posts |

---

## 2. Tech Stack

| Concern         | Technology                                                                       |
| --------------- | -------------------------------------------------------------------------------- |
| Package Manager | yarn@1.22.22                                                                     |
| Site Framework  | Docusaurus 3.10 (preset-classic)                                                 |
| Frontend        | React 19 + TypeScript (strict)                                                   |
| State           | Zustand 5 (with persist middleware)                                              |
| Styling         | Tailwind CSS 3 + clsx (scoped to `.tailwind-root` to avoid Docusaurus conflicts) |
| Forms           | React Hook Form + Zod                                                            |
| Persistence     | localForage (IndexedDB)                                                          |
| Icons           | Lucide-react                                                                     |
| Components      | Radix UI primitives                                                              |
| Testing         | Vitest + Playwright (in `app/`)                                                  |
| i18n            | Docusaurus i18n (en, ru)                                                         |

---

## 3. Project Structure

```
├── app/                          # Original Vite React app (character sheet)
│   ├── components/
│   │   └── shared/               # Atomic/molecular UI components
│   │       ├── CharacterManagerModal.tsx # Character list modal (load/delete)
│   │       ├── CollapsibleBlock.tsx      # Collapsible section wrapper
│   │       ├── ConfirmDialog.tsx          # Radix UI confirmation dialog
│   │       ├── DataTable.tsx              # Reusable table component with CRUD
│   │       ├── MeritFlawRow.tsx           # Merit/Flaw list editor
│   │       ├── StatDot.tsx                # WoD-style dot selector (1-5 dots)
│   │       ├── StatLabel.tsx              # Label with optional tooltip
│   │       ├── TraitRow.tsx               # Label + StatDot row (simple, with input, custom list)
│   │       └── index.ts
│   ├── features/
│   │   ├── automation/           # Planned: auto-calculated stats
│   │   ├── dice/                 # Planned: dice integration
│   │   ├── manager/              # Planned: character management
│   │   └── sheet/                # Character sheet feature module
│   │       └── components/
│   │           ├── AttributeBlock.tsx     # 9 attributes (Physical/Social/Mental)
│   │           ├── AdvantagesBlock.tsx   # Backgrounds, Merits, Flaws
│   │           ├── BaseBlock.tsx          # Character metadata (name, concept, species...)
│   │           ├── BodyBlock.tsx          # Inventory, Armor, Weapons + Health
│   │           ├── CharacterSheet.tsx     # Main sheet orchestrator
│   │           ├── HealthBlock.tsx        # Bashing/Lethal damage tracker
│   │           ├── OtherBlock.tsx         # Misc fields
│   │           ├── PowerBlock.tsx         # Force Skills, Virtues, Willpower, Force Points
│   │           ├── SheetLayout.tsx        # Layout with universal buttons
│   │           ├── SkillBlock.tsx         # Skills (Talents/Skills/Knowledge)
│   │           └── StatsBlock.tsx         # Derived stats + Experience
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useLocalStorageState.ts         # useExpandedState for collapsible sections
│   │   └── useTraitUpdater.ts              # Generic hook for trait (attribute/skill) updates
│   ├── store/
│   │   └── characterStore.ts               # Zustand store (CRUD, import, persistence)
│   ├── templates/                          # Character templates
│   ├── types/
│   │   └── character.ts                    # Zod schemas + TypeScript types + default factory
│   └── utils/                              # Utility functions
│
├── src/                          # Docusaurus source
│   ├── @types/
│   │   └── docusaurus-theme-augment.d.ts   # Augmented types for @theme/Layout, @theme/Heading
│   ├── components/
│   │   └── HomepageFeatures/               # Homepage feature cards
│   ├── css/
│   │   ├── custom.css                      # Global CSS + Tailwind imports + CSS variables
│   │   └── sheet-reset.css                 # Tailwind base reset scoped to .tailwind-root
│   └── pages/
│       ├── index.tsx                       # Homepage (wrapped in <Layout>)
│       └── universal_sheet.tsx             # Sheet Manager page (imports from app/)
│
├── docs/                         # Docusaurus documentation (MDX)
├── blog/                         # Docusaurus blog posts
├── static/                       # Static assets (served at root)
├── i18n/                         # Internationalization (en, ru)
│
├── docusaurus.config.ts         # Site configuration
├── sidebars.ts                  # Docs sidebar configuration
├── tailwind.config.cjs          # Tailwind config (CommonJS for webpack)
├── postcss.config.js            # PostCSS config (CommonJS)
├── tsconfig.json                # Solution file (references tsconfig.app.json)
├── tsconfig.app.json            # App tsconfig (extends @docusaurus/tsconfig)
└── tsconfig.node.json           # Node-side tsconfig (config files, plugins)
```

---

## 4. Architecture Notes

### Docusaurus + App Integration

- The `app/` folder is a standalone Vite React project embedded into Docusaurus via **relative imports** (no workspace or package alias)
- `src/pages/universal_sheet.tsx` imports `CharacterSheet` from `../../app/features/sheet`
- All page components must be wrapped in `<Layout>` from `@theme/Layout` to get navbar/footer
- `app/` retains its own `package.json`, `vite.config.ts`, and tsconfigs for standalone development

### Layout Pattern

`SheetLayout` renders universal controls (Export, Import, Reset, Manage, New Character) that are always visible, plus "No Character Loaded" placeholder when no character is active. `BaseBlock` is the first block rendered and contains all character metadata fields.

### Tailwind Isolation

- `@tailwind base` is **not** in `custom.css` — it would reset Docusaurus/Infima styles globally
- Instead, `src/css/sheet-reset.css` provides the same normalize/reset **scoped to `.tailwind-root`**
- `@tailwind components` and `@tailwind utilities` are global but safe (only apply when class names are used)
- Tailwind `content` in `tailwind.config.cjs` scans both `./src/**` and `./app/**`

### TypeScript Configuration

- `tsconfig.json` — solution file, references `tsconfig.app.json` and `tsconfig.node.json`
- `tsconfig.app.json` — extends `@docusaurus/tsconfig`, sets explicit `baseUrl: "."` and `paths: { "@site/*": ["./*"] }`
- `src/@types/docusaurus-theme-augment.d.ts` — augments `@theme/Layout` (adds `title`, `description` props) and `@theme/Heading` (adds `as` prop)
- Docusaurus virtual modules (`@theme/*`, `@site/*`, `@docusaurus/*`) are typed via `@docusaurus/module-type-aliases`

### Config File Formats

- `tailwind.config.cjs` — **must be CommonJS** (`module.exports`) for Docusaurus webpack
- `postcss.config.js` — **must be CommonJS** (`module.exports`) — root `package.json` has no `"type": "module"`

---

## 5. Theme & Colors (Tailwind)

Custom CSS variables defined in `src/css/custom.css`:

| Variable           | Value         | Usage                   |
| ------------------ | ------------- | ----------------------- |
| `--primary`        | `220 38 38`   | Accent / rebel red      |
| `--secondary`      | `202 138 4`   | Secondary / droid gold  |
| `--bg-base`        | `24 245 249`  | Page background         |
| `--bg-surface`     | `255 255 255` | Card/surface background |
| `--text-primary`   | `15 23 42`    | Primary text            |
| `--text-secondary` | `71 85 105`   | Secondary text          |
| `--border`         | `226 232 240` | Borders                 |
| `--error`          | `185 28 28`   | Error states            |
| `--warning`        | `245 158 11`  | Warning states          |
| `--info`           | `2 132 199`   | Info states             |
| `--success`        | `21 128 61`   | Success states          |

Star Wars palette: `--sw-jedi-blue`, `--sw-jedi-green`, `--sw-jedi-violet`, `--sw-jedi-red`, `--sw-empire-grey`, `--sw-empire-black`, `--sw-empire-white`, `--sw-droid-gold`, `--sw-droid-orange`, `--sw-droid-rust`, `--sw-mandalorian`, `--sw-hyperjump`

Dark mode overrides `--bg-base`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--border` via `[data-theme='dark']`.

---

## 6. Key Components

### StatDot (`app/components/shared/StatDot.tsx`)

WoD-style rating selector with optional flags (Specialization/Practiced/Experienced).

**Props:** `value`, `maxValue` (default 5), `onChange`, `disabled`, `size` (sm/md/lg), `showFlags`, `specialization`, `experienced`, `practiced`, `minimal`

**Behavior:** Click dot N → sets value to N. Click active dot → resets to 0. Toggle S/P/E flags when `showFlags=true`.

### TraitRow / TraitRowWithInput / CustomTraitList (`app/components/shared/TraitRow.tsx`)

- `TraitRow` — Simple label + StatDot
- `TraitRowWithInput` — Label + editable specialization text + StatDot
- `CustomTraitList` — Dynamic list with add/remove (used for custom skills)

### MeritFlawList (`app/components/shared/MeritFlawRow.tsx`)

List editor for Merits and Flaws with add/remove functionality.

### CollapsibleBlock (`app/components/shared/CollapsibleBlock.tsx`)

Wrapper component for collapsible sections with persistence.

### CharacterManagerModal (`app/components/shared/CharacterManagerModal.tsx`)

Modal dialog for managing characters — displays list, allows loading/deleting. New Character button was moved to `SheetLayout`.

### BaseBlock (`app/features/sheet/components/BaseBlock.tsx`)

First block in character sheet, styled like other blocks with CollapsibleBlock wrapper. Contains all 9 character metadata fields (Name, Concept, Species, Player, Nature, Home World, Adventure, Demeanor, Age) in a 3-column grid layout. Only renders when `currentCharacter` exists.

### SheetLayout (`app/features/sheet/components/SheetLayout.tsx`)

Layout wrapper with universal buttons (Export, Import, Reset, Manage, New Character). Shows "No Character Loaded" placeholder when no character is active. Child blocks only render when `currentCharacter` exists.

### CharacterStore (`app/store/characterStore.ts`)

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

## 7. Character Data Schema (`app/types/character.ts`)

```typescript
const BaseCharacterSchema = z.object({
    id: z.string().uuid(),
    metadata: CharacterMetadataSchema,
    attributes: z.record(TraitValueSchema),
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
    'customTalents/Skills/Knowledge': z.array(CustomSkillSchema),
    notes: z.string(),
});
```

---

## 8. Development Commands

```bash
yarn start              # Start Docusaurus dev server
yarn build              # Production build (Docusaurus)
yarn serve              # Preview production build locally
yarn typecheck          # TypeScript check
yarn lint               # ESLint
yarn lint:fix           # Auto-fix lint
yarn format             # Prettier format
yarn format:check       # Prettier check
yarn deploy             # Deploy to GitHub Pages
yarn clear              # Clear Docusaurus cache
```

Standalone app (inside `app/`):

```bash
cd app && yarn dev      # Start Vite dev server
cd app && yarn build    # Vite production build
```

---

## 9. Code Conventions

- **Prettier:** `semi: true`, `singleQuote: true`, `tabWidth: 2`
- **ESLint:** React hooks + accessibility focused, strict ESM (no `require()`)
- **Styling:** Tailwind + `clsx` for conditional classes
- **Icons:** Lucide-react
- **No comments** unless explicitly requested
- **Types:** Use `DEFAULT_TRAIT_VALUE` from `app/types/character.ts` for default trait values instead of inline objects

---

## 10. Patterns & Tips

### Adding a new attribute/skill block

1. Add constant in block component (e.g., `ATTRIBUTES` in `AttributeBlock.tsx`)
2. Render using `TraitRowWithInput` or `CustomTraitList`
3. Wire to `updateCharacter(id, { [key]: newValue })`

### Import/Export flow (`SheetLayout.tsx`)

- **Export:** `JSON.stringify(currentCharacter)` → Blob → download
- **Import:** FileReader → `BaseCharacterSchema.parse()` → `importCharacter()`

### Collapsible sections

Use `CollapsibleBlock` from `app/components/shared`. Persists expanded state to localStorage via `useLocalStorageState`.

### Generic trait updates

Use `useTraitUpdater(path)` hook from `app/hooks` for standardized attribute/skill/forceSkill/virtue updates:

```typescript
const { getTrait, updateTrait } = useTraitUpdater('attributes');
// getTrait('Strength') returns TraitValue
// updateTrait('Strength', { value: 3, specialization: true })
```

### Block colors (by section)

| Section         | Color  | Tailwind class                              |
| --------------- | ------ | ------------------------------------------- |
| Attributes      | Blue   | `text-hologram-blue`                        |
| Skills          | Yellow | `text-cyber-yellow`                         |
| Advantages      | Red    | `text-rebel-red`                            |
| Force/Willpower | Blue   | `text-hologram-blue` / `text-imperial-blue` |

### Adding a new Docusaurus page

1. Create file in `src/pages/` (e.g., `my_page.tsx`)
2. Wrap content in `<Layout>` from `@theme/Layout`
3. Add navbar link in `docusaurus.config.ts` → `themeConfig.navbar.items`

---

## 11. Context Files

```
ai_context/
└── Star_Wars_WEG_to_WoD_Conversion.md  # ~11k line source doc (use grep)
```

---

## 12. Derived Stats Formulas (`StatsBlock.tsx`)

Derived stats are auto-calculated from attributes, skills, and virtues:

| Stat                    | Formula                                         |
| ----------------------- | ----------------------------------------------- |
| Willpower               | `Passion + Self Control`                        |
| Dark Side Resistance    | `5 + Conscience - Passion`                      |
| Initiative (Standard)   | `Wits + Alertness`                              |
| Initiative (Lightsaber) | `Initiative (Standard) + Control (Force Skill)` |
| Jumping Distance        | `×min(Control, Telekinesis)` (Force users)      |
| Running Speed           | `×min(Control, Telekinesis)` (Force users)      |

---

## 13. Accessibility Rules

**Always** include the following for interactive elements:

- All icon-only buttons **must** have `aria-label`
- Table headers **must** have `scope="col"`
- Expandable/collapsible sections must have `aria-expanded`
- Error messages should have `role="alert"`

```tsx
// Icon button example
<button onClick={handleRemove} aria-label="Remove item">
    <X className="w-4 h-4" />
</button>

// Table header example
<th scope="col" className="text-left py-2">Name</th>
```

---

## 15. Roadmap (Current Status)

- [x] **Phase 1:** Core character engine (attributes, skills, health, import/export)
- [x] **Phase 2:** Template registry + character CRUD
- [x] **Phase 3:** Migrate to Docusaurus site with embedded app
- [x] **Phase 3.5:** Layout refactor (BaseBlock, SheetLayout, universal buttons)
- [ ] **Phase 4:** Smart assistant (auto-calculated stats) + Dice integration
- [ ] **Phase 5:** Automation features
