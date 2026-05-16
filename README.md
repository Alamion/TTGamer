# TTGamer

A character sheet manager for a Star Wars WEG/WoD hybrid TTRPG system, built with Docusaurus.

## Features

- **Character Sheet Manager** - Create, edit, and manage characters with attributes, skills, force powers, inventory, and more
- **Local-first Persistence** - Characters are saved in IndexedDB via localForage
- **Multiple Character Types** - Support for sentient, droid, and vehicle characters
- **Import/Export** - Share characters via JSON files
- **Documentation** - Comprehensive docs for the TTRPG system
- **Internationalization** - English and Russian support

## Quick Start

```bash
yarn install
yarn start
```

This starts the development server and opens the site at `http://localhost:3000`.

## Project Structure

```
├── app/                    # Character sheet React components (embedded in Docusaurus)
│   ├── components/         # Shared UI components
│   ├── features/sheet/     # Character sheet feature
│   ├── hooks/              # Custom React hooks
│   ├── store/              # Zustand state management
│   └── types/              # TypeScript types and Zod schemas
├── src/                    # Docusaurus source
│   ├── components/         # Homepage components
│   ├── css/                # Global styles
│   └── pages/              # Site pages
├── docs/                   # Documentation (MDX)
├── docusaurus.config.ts    # Site configuration
└── tailwind.config.cjs     # Tailwind CSS configuration
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

- **Docusaurus 3** - Site framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Zustand 5** - State management
- **Tailwind CSS 3** - Styling
- **React Hook Form + Zod** - Form validation
- **localForage** - IndexedDB persistence
- **Lucide React** - Icons
- **Radix UI** - Accessible primitives
