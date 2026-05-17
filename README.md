# TTGamer

A Docusaurus-based site hosting interactive documentation and a character sheet manager for a **Star Wars WEG/WoD hybrid TTRPG system**.

> **Live site:** [ttgamer.vercel.app](https://ttgamer.vercel.app)

## Current Status

This project is a **work in progress**. Currently available:

- [Character Sheet Manager](https://ttgamer.vercel.app/universal_sheet) — Create, edit, and manage Star Wars characters with attributes, skills, Force powers, inventory, health tracking, and more. Sentient characters fully supported; droid/vehicle support planned.
- [Quick Start Guide](https://ttgamer.vercel.app/docs/star-wars-wod-2e/quick-start) — Interactive documentation to get playing in 15 minutes.
- Full documentation structure in progress (combat, creatures, GM tools, vehicles, and more).

## Features

- **Character Sheet Manager** — Full-featured sheet with 9 attributes, skill trees, Force/Virtues, backgrounds, merits/flaws, inventory, armor, weapons, health tracks (bashing/lethal), and derived stats
- **Local-first Persistence** — Characters saved in IndexedDB via localForage, no account needed
- **Import/Export** — Share characters via JSON files
- **Interactive Documentation** — MDX docs with cross-references, examples of play, and terminology glossaries
- **Internationalization** — English and Russian support

## Quick Start

```bash
yarn install
yarn start
```

Opens the site at `http://localhost:3000`.

## Project Structure

```
├── app/                    # Character sheet React app (embedded in Docusaurus)
│   ├── components/shared/  # Reusable UI components (StatDot, TraitRow, DataTable, etc.)
│   ├── features/sheet/     # Character sheet feature (blocks, layout)
│   ├── hooks/              # Custom hooks (trait updater, collapsible state)
│   ├── store/              # Zustand store (CRUD, IndexedDB persistence)
│   └── types/              # Zod schemas + TypeScript types
├── src/                    # Docusaurus source
│   ├── components/         # Homepage components
│   ├── css/                # Global styles + Tailwind
│   └── pages/              # Site pages (index, universal_sheet)
├── docs/                   # Documentation (MDX)
│   ├── star-wars-wod-2e/   # Star Wars WEG→WoD hybrid system docs
│   └── wod/                # World of Darkness (generic + VtM) docs
├── docusaurus.config.ts    # Site configuration
├── tailwind.config.cjs     # Tailwind CSS configuration
└── sidebars.ts             # Docs sidebar configuration
```

## Commands

| Command          | Description              |
| ---------------- | ------------------------ |
| `yarn start`     | Start development server |
| `yarn build`     | Production build         |
| `yarn serve`     | Preview production build |
| `yarn typecheck` | TypeScript type checking |
| `yarn lint`      | ESLint check             |
| `yarn lint:fix`  | ESLint auto-fix          |
| `yarn format`    | Prettier format          |
| `yarn clear`     | Clear Docusaurus cache   |

## Tech Stack

| Concern         | Technology                            |
| --------------- | ------------------------------------- |
| Site Framework  | Docusaurus 3.10 (preset-classic)      |
| Frontend        | React 19 + TypeScript (strict)        |
| State           | Zustand 5 (with persist middleware)   |
| Styling         | Tailwind CSS 3 + clsx                 |
| Forms           | React Hook Form + Zod                 |
| Persistence     | localForage (IndexedDB)               |
| Icons           | Lucide-react                          |
| Components      | Radix UI primitives                   |
| Testing         | Vitest + Playwright                   |
| i18n            | Docusaurus i18n (en, ru)              |

## Roadmap

- [ ] Droid & Vehicle character support
- [ ] Complete documentation (combat, creatures, GM section, vehicles)
- [ ] 3D and ordinary dice rolls
- [ ] Database + authentication
- [ ] Trait/item/creature/vehicle catalogs
- [ ] Additional WoD systems (VtM, etc.)
