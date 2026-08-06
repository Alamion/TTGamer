# TTGamer - Project Cheat Sheet

## 1. Overview

Docusaurus site hosting documentation and modular React tools for tabletop roleplaying games. The current production content and character sheet target a Star Wars WEG/WoD hybrid; future systems should integrate through explicit system boundaries instead of adding system conditionals throughout shared code.

**Canonical deployment:** `https://ttgamer.vercel.app`. GitHub Pages settings remain only for repository links and the optional manual deploy command.

**Version source:** `package.json`. Docusaurus exposes it through `customFields.version`; do not hard-code the current version in UI code.

**Source-of-truth pattern:** keep machine-readable facts with one owner. Package version lives in `package.json`, release summaries in the first `CHANGELOG.md` entry, UI/catalog translation sources in `translations/source`, documentation parity in `validate:i18n`, and catalog integrity in `validate:data`. Prose may summarize those facts but must not become a second authoritative source. Roadmap intent remains human-written in TODO files.

**Routes:**
| Route | Purpose |
| --- | --- |
| `/` | Homepage |
| `/universal_sheet` | Character Sheet Manager |
| `/docs/*` | Documentation |

## 2. Tech Stack

| Area            | Technology                          |
| --------------- | ----------------------------------- |
| Package Manager | yarn@1.22.22                        |
| Site Framework  | Docusaurus 3.10 (preset-classic)    |
| Frontend        | React 19 + TypeScript 6 (strict)    |
| State           | Zustand 5 (persist middleware)      |
| Styling         | Tailwind CSS 3 + clsx               |
| Validation      | Zod                                 |
| Persistence     | localForage (IndexedDB)             |
| Icons           | Lucide-react                        |
| Components      | Radix UI primitives                 |
| Dice Logic      | moo lexer + hand-written AST parser |
| 3D Rendering    | Three.js + cannon-es                |
| Testing         | Vitest                              |
| i18n            | Docusaurus i18n (en, ru)            |

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
| `yarn validate:data`                | Validate catalogs and references     |
| `yarn validate:i18n`                | Check English/Russian docs parity    |
| `yarn check:version`                | Check package/changelog/UI version   |
| `yarn verify:fast`                  | Lint and typecheck                   |
| `yarn verify:full`                  | Lint, typecheck, tests, build        |
| `yarn deploy`                       | Deploy to GitHub Pages               |
| `yarn clear`                        | Clear Docusaurus cache               |

## 4. Code Conventions

- **Prettier:** `semi: true`, `singleQuote: true`, `tabWidth: 4`
- **ESLint:** React hooks + a11y focused, strict ESM (no `require()`)
- **Styling:** Tailwind + `clsx` for conditional classes
- **Icons:** Lucide-react
- **Comments:** keep them uncommon; use them for non-obvious constraints or rationale, not narration
- **Imports:** separate `import type { ... }` from value imports; let ESLint sort groups
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
- [x] Star Wars documentation — 45 English files with matching Russian paths
- [x] Character context & viewer mode (multi-character, read-only view, presets)
- [x] i18n docs translation (en/ru)

### In Progress

- [ ] UI i18n (extract English strings to JSON files)
- [ ] WoD (VtM 2e) system docs — structure started (clans, disciplines, Blood Points, Humanity)
- [ ] Data file i18n (add `ru` fields to data entries)
- [ ] Discord webhooks — frontend done (settings modal, subscription, sender); backend proxy pending (security)

### Planned

- [ ] Vehicle sheet
- [ ] Other systems sheets (D&D, Pathfinder)
- [ ] Database + authentication layer
- [ ] Lazy loading for Three.js / cannon-es
- [ ] Dice pool tabs for Pathfinder/Cthulhu

## 7. Project Structure

```
├── src/
│   ├── dice_roller/           # Dice roller module (logic, UI, 3D renderer)
│   │   ├── dice-logic/        #   moo lexer, AST parser, evaluator, renderer
│   │   ├── components/        #   Dice pool, history, 2D/3D dice, InlineRoll
│   │   ├── store/             #   Zustand store
│   │   └── utils/             #   Constants, events, types-ext
│   ├── sheet_manager/         # Character sheet manager
│   │   ├── components/        #   Modal, viewer, StatDot, TraitRow, collapsibles
│   │   ├── features/sheet/    #   Sheet blocks (Attribute, Skill, Health, Force, etc.)
│   │   ├── store/             #   Zustand + IndexedDB persistence
│   │   ├── types/             #   Zod schemas + TS types
│   │   └── context/           #   CharacterContext (multi-character)
│   ├── integrations/          # External/cross-feature adapters
│   │   ├── discord/           #   Bounded, queued Discord webhook delivery
│   │   ├── docs-character-rolls/ # Documentation ↔ sheet/dice adapter
│   │   └── sheet-dice/        #   Character stat ↔ dice panel adapter
│   ├── data/                  # Catalog entries, filters, and table configs
│   ├── shared/                # DataCatalog, EntityCard, TWWrapper, hooks, utils
│   │   ├── components/        #   Reusable UI components (SecretField, DataCatalog, EntityCard, etc.)
│   │   ├── hooks/             #   useLocalStorageState, useSessionStorageState, etc.
│   │   └── utils/             #   logging, diceNotation, env
│   ├── pages/                 # Docusaurus pages
│   ├── theme/                 # Theme swizzles (Root, NavbarItem)
│   └── css/                   # Global CSS + Tailwind
├── docs/                      # Documentation (MDX)
│   ├── star-wars-wod-2e/      # 45 files — fully written
│   └── wod/                   # VtM 2e structure — in progress
├── i18n/                      # Translations (en, ru)
├── translations/source/        # Canonical YAML UI/catalog translation sources
├── scripts/                   # Catalog, i18n, and version validators
├── tests/                     # Vitest logic, integration, and component tests
└── static/                    # Images, sounds (dice impacts, surfaces)
```

## 8. Key Skills (`.agents/skills/`)

| Skill                    | When to Load                                                 |
| ------------------------ | ------------------------------------------------------------ |
| `dice-logic`             | Working on dice lexer, parser, evaluator, or renderer        |
| `sheet-manager`          | Working on character schema, store, derived stats, or blocks |
| `docusaurus-integration` | Adding pages, navbar items, theme config                     |
| `tailwind-theming`       | Using colors, dark mode, palette variables                   |
| `mdx-documentation`      | Writing MDX docs — admonitions, cross-refs, dice notation    |
| `ui-i18n`                | Editing YAML UI/catalog translations or generated adapters   |
| `typescript`             | Before writing any `.ts`/`.tsx` — code style & optimization  |

## 9. Module Boundaries

- `dice_roller/dice-logic/index.ts` is the small public API. Internal dice code and tests should import the specific internal file they own.
- `shared/` contains system-independent UI and utilities only. Cross-feature or external-service behavior belongs in `integrations/`.
- Sheet blocks must read through `useCharacter()`, which selects viewer context first and the editable store second.
- Imported character JSON must pass `BaseCharacterSchema`; Zod strips unknown legacy fields.
- Data changes must pass `yarn validate:data`. Star Wars documentation path changes must be mirrored under Russian i18n and pass `yarn validate:i18n`.
- YAML UI/catalog translation changes must pass `yarn build:translations` and `yarn validate:i18n`; do not edit generated `ttgamer.*` entries in `i18n/*/code.json` or `src/i18n/generated/`.

## 10. Verification Scope

- Small code edit: targeted tests plus `yarn verify:fast`.
- Dice parser/evaluator or schema/persistence edit: `yarn verify`.
- Config, dependency, route, generated CSS, or documentation-path edit: `yarn verify:full`.
- The pre-commit hook runs the full verifier on `main`/`master` and the fast verifier on other branches.
