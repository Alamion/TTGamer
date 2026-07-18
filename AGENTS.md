# TTGamer - Project Cheat Sheet

## 1. Overview

Docusaurus site hosting docs and modular React modules (character sheet manager, dice roller) for a Star Wars WEG/WoD hybrid TTRPG system.

**Routes:**
| Route | Purpose |
| --- | --- |
| `/` | Homepage |
| `/universal_sheet` | Character Sheet Manager |
| `/docs/*` | Documentation |

## 2. Tech Stack

| Area            | Technology                       |
| --------------- | -------------------------------- |
| Package Manager | yarn@1.22.22                     |
| Site Framework  | Docusaurus 3.10 (preset-classic) |
| Frontend        | React 19 + TypeScript 6 (strict) |
| State           | Zustand 5 (persist middleware)   |
| Styling         | Tailwind CSS 3 + clsx            |
| Forms           | React Hook Form + Zod            |
| Persistence     | localForage (IndexedDB)          |
| Icons           | Lucide-react                     |
| Components      | Radix UI primitives              |
| Dice Logic      | moo (lexer), nearley (parser)    |
| 3D Rendering    | Three.js + cannon-es             |
| Testing         | Vitest                           |
| i18n            | Docusaurus i18n (en, ru)         |

## 3. Development Commands

| Command                             | Purpose                              |
| ----------------------------------- | ------------------------------------ |
| `yarn start`                        | Start Docusaurus dev server          |
| `yarn build`                        | Production build                     |
| `yarn serve`                        | Preview production build             |
| `yarn typecheck`                    | TypeScript check                     |
| `yarn lint` / `yarn lint:fix`       | ESLint + Prettier (check / auto-fix) |
| `yarn format` / `yarn format:check` | Prettier only (write / check)        |
| `yarn test`                         | Run Vitest tests                     |
| `yarn test:watch`                   | Vitest watch mode                    |
| `yarn test:coverage`                | Vitest coverage report               |
| `yarn deploy`                       | Deploy to GitHub Pages               |
| `yarn clear`                        | Clear Docusaurus cache               |

## 4. Code Conventions

- **Prettier:** `semi: true`, `singleQuote: true`, `tabWidth: 2`
- **ESLint:** React hooks + a11y focused, strict ESM (no `require()`)
- **Styling:** Tailwind + `clsx` for conditional classes
- **Icons:** Lucide-react
- **No comments** unless explicitly requested
- **Imports:** separate `import type { ... }` from value imports; sorted alphabetically
- **Types:** Prefer `interface` for object shapes, `type` for unions/intersections; avoid `any`
- **Config files:** `tailwind.config.cjs` and `postcss.config.js` must be CommonJS (`module.exports`) for Docusaurus webpack

## 5. Accessibility Rules

- Icon-only buttons **must** have `aria-label`
- Table headers **must** have `scope="col"`
- Collapsible sections must have `aria-expanded`
- Error messages should have `role="alert"`

## 6. Feature Roadmap

### Done

- [x] Character sheet — sentient/droid (9 attributes, 30 abilities, Force, Virtues, health, inventory, derived stats)
- [x] 3D dice roller (WebGL + cannon-es physics, sound, 2D SVG fallback, roll history)
- [x] Inline dice rolls in docs
- [x] Data catalogs — searchable/sortable/filterable tables (species, Force powers, abilities, merits/flaws, backgrounds, equipment, vehicles, creatures, terminology)
- [x] Full documentation — 29 files: core rules, character creation (10-step), combat, vehicles, GM section, bestiary, example of play
- [x] Character context & viewer mode (multi-character, read-only view, presets)
- [x] i18n docs translation (en/ru)

### In Progress

- [ ] UI i18n (extract English strings to JSON files)
- [ ] WoD (VtM 2e) system docs — structure started (clans, disciplines, Blood Points, Humanity)
- [ ] Data file i18n (add `ru` fields to data entries)

### Planned

- [ ] Vehicle sheet
- [ ] Other systems sheets (D&D, Pathfinder)
- [ ] Database + authentication layer
- [ ] Lazy loading for Three.js / cannon-es
- [ ] Discord webhooks for dices (backend required)
- [ ] Dice pool tabs for Pathfinder/Cthulhu

## 7. Project Structure

```
├── src/
│   ├── dice_roller/           # Dice roller module (logic, UI, 3D renderer)
│   │   ├── dice-logic/        #   Lexer (moo), parser (nearley), evaluator, renderer
│   │   ├── components/        #   Dice pool, history, 2D/3D dice, InlineRoll
│   │   └── store/             #   Zustand store
│   ├── sheet_manager/         # Character sheet manager
│   │   ├── components/        #   Modal, viewer, StatDot, TraitRow, collapsibles
│   │   ├── features/sheet/    #   Sheet blocks (Attribute, Skill, Health, Force, etc.)
│   │   ├── store/             #   Zustand + IndexedDB persistence
│   │   ├── types/             #   Zod schemas + TS types
│   │   └── context/           #   CharacterContext (multi-character)
│   ├── data/                  # Data layer (29 files) — all catalogs
│   ├── shared/                # DataCatalog, EntityCard, TWWrapper, hooks, utils
│   ├── pages/                 # Docusaurus pages
│   ├── theme/                 # Theme swizzles (Root, NavbarItem)
│   └── css/                   # Global CSS + Tailwind
├── docs/                      # Documentation (MDX)
│   ├── star-wars-wod-2e/      # 29 files — fully written
│   └── wod/                   # VtM 2e structure — in progress
├── i18n/                      # Translations (en, ru)
├── tests/                     # Vitest tests (dice_roller)
└── static/                    # Images, sounds (dice impacts, surfaces)
```

## 8. Key Skills (`.opencode/skills/`)

| Skill                    | When to Load                                                 |
| ------------------------ | ------------------------------------------------------------ |
| `dice-logic`             | Working on dice lexer, parser, evaluator, or renderer        |
| `sheet-manager`          | Working on character schema, store, derived stats, or blocks |
| `docusaurus-integration` | Adding pages, navbar items, theme config                     |
| `tailwind-theming`       | Using colors, dark mode, palette variables                   |
| `mdx-documentation`      | Writing MDX docs — admonitions, cross-refs, dice notation    |
| `typescript`             | Before writing any `.ts`/`.tsx` — code style & optimization  |
