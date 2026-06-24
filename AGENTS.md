# TTGamer - Project Cheat Sheet

## 1. Overview

Docusaurus site hosting docs, blog, and modular React modules (character sheet manager, dice roller) for a Star Wars WEG/WoD hybrid TTRPG system.

**Routes:**
| Route | Purpose |
| --- | --- |
| `/` | Homepage |
| `/universal_sheet` | Character Sheet Manager |
| `/docs/*` | Documentation |
| `/blog/*` | Blog posts |

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
| i18n            | Docusaurus i18n (en, ru)         |

## 3. Development Commands

| Command                             | Purpose                     |
| ----------------------------------- | --------------------------- |
| `yarn start`                        | Start Docusaurus dev server |
| `yarn build`                        | Production build            |
| `yarn serve`                        | Preview production build    |
| `yarn typecheck`                    | TypeScript check            |
| `yarn lint` / `yarn lint:fix`       | ESLint                      |
| `yarn format` / `yarn format:check` | Prettier                    |
| `yarn deploy`                       | Deploy to GitHub Pages      |
| `yarn clear`                        | Clear Docusaurus cache      |

## 4. Code Conventions

- **Prettier:** `semi: true`, `singleQuote: true`, `tabWidth: 2`
- **ESLint:** React hooks + a11y focused, strict ESM (no `require()`)
- **Styling:** Tailwind + `clsx` for conditional classes
- **Icons:** Lucide-react
- **No comments** unless explicitly requested
- **Imports:** separate `import type { ... }` from value imports; sorted alphabetically
- **Types:** Prefer `interface` for object shapes, `type` for unions/intersections; avoid `any`

## 5. Accessibility Rules

- Icon-only buttons **must** have `aria-label`
- Table headers **must** have `scope="col"`
- Collapsible sections must have `aria-expanded`
- Error messages should have `role="alert"`

## 6. Feature Roadmap

- [/] Droid & Vehicle character support
- [/] i18n internalization (en, ru)
- [x] Dice roll UI/UX (dice pool, history)
- [x] 3D Dice visualization
- [ ] Database + Auth layer
- [/] Trait system catalog (data layer complete, mechanical effects pending)
- [ ] Item / Vehicle / Creature catalogs
- [ ] WoD (VtM) systems

## 7. Project Structure

```
├── src/
│   ├── dice_roller/           # Dice roller module (logic, UI, 3D renderer)
│   ├── sheet_manager/         # Character sheet manager module
│   ├── pages/                 # Docusaurus pages (wrapped in <Layout>)
│   ├── components/            # Shared Docusaurus components
│   ├── theme/                 # Docusaurus theme swizzles
│   ├── css/                   # Global CSS + Tailwind setup
│   └── @types/                # Docusaurus type augmentations
├── docs/                      # Documentation (MDX)
├── blog/                      # Blog posts
├── static/                    # Static assets
├── i18n/                      # Translations (en, ru)
├── context/                   # TTRPG source reference docs
├── tests/                     # Tests (dice_roller)
├── docusaurus.config.ts
├── sidebars.ts
├── tailwind.config.cjs        # CommonJS (required for webpack)
├── postcss.config.js          # CommonJS
└── tsconfig.json              # Solution → tsconfig.app.json + tsconfig.node.json
```
