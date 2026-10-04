# TTGamer - Project Cheat Sheet

## 1. Overview

Docusaurus site hosting documentation and modular React tools for tabletop roleplaying games. The current production content and character sheet target a Star Wars WEG/WoD hybrid; future systems should integrate through explicit system boundaries instead of adding system conditionals throughout shared code.

**Canonical deployment:** `https://ttgamer.vercel.app`. GitHub Pages settings remain only for repository links and the optional manual deploy command.

**Version source:** `package.json`. Docusaurus exposes it through `customFields.version`; do not hard-code the current version in UI code.

**Source-of-truth pattern:** keep machine-readable facts with one owner. Package version lives in `package.json`, release summaries in the first `CHANGELOG.md` entry, UI/catalog translation sources in `translations/source`, documentation parity in `validate:i18n`, and catalog integrity in `validate:data`. Prose may summarize those facts but must not become a second authoritative source. Roadmap intent remains human-written in TODO files.

**Running server:** Usually user is already running dev server of app on http://localhost:3000/, so check fo it existence before killing processes or creating new one.

**Routes:**

| Route              | Purpose                 |
| ------------------ | ----------------------- |
| `/`                | Homepage                |
| `/universal_sheet` | Character Sheet Manager |
| `/docs/*`          | Documentation           |

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

| Command                             | Purpose                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `yarn start`                        | Start Docusaurus dev server                                       |
| `yarn build`                        | Production build                                                  |
| `yarn serve`                        | Preview production build                                          |
| `yarn typecheck`                    | `tsc -b` over app, node, and test projects (incremental)          |
| `yarn lint` / `yarn lint:fix`       | ESLint + Prettier with caches (check / auto-fix)                  |
| `yarn format` / `yarn format:check` | Prettier only (write / check)                                     |
| `yarn test`                         | Vitest `unit` project (default run, no timing assertions)         |
| `yarn test:perf`                    | Vitest `perf` project: timing tests, one file at a time           |
| `yarn test:watch`                   | Vitest watch mode                                                 |
| `yarn test:coverage`                | Vitest coverage report                                            |
| `yarn build:translations`           | Generate UI/catalog translations (runs before start/test/build)   |
| `yarn validate:data`                | Validate catalogs and references                                  |
| `yarn audit:dead-code`              | knip: unused files/exports/deps                                   |
| `yarn validate:i18n`                | One check: docs en/ru pairs and structure, YAML sources, coverage |
| `yarn check:version`                | Check package/changelog/UI version                                |
| `yarn release <minor\|patch>`       | Bump the version and draft the CHANGELOG entry (at merge)         |
| `yarn ci:*`                         | The runner-independent checks (§11); `verify:*` compose them      |
| `yarn deploy`                       | Deploy to GitHub Pages                                            |
| `yarn clear`                        | Clear Docusaurus cache                                            |

## 4. Code Conventions

- **Prettier:** `semi: true`, `singleQuote: true`, `tabWidth: 4`
- **ESLint:** React hooks + a11y focused, strict ESM (no `require()`)
- **Styling:** Tailwind + `clsx` for conditional classes
- **Icons:** Lucide-react
- **Comments:** keep them uncommon; use them for non-obvious constraints or rationale, not narration
- **Imports:** separate `import type { ... }` from value imports; let ESLint sort groups
- **Types:** Prefer `interface` for object shapes, `type` for unions/intersections; avoid `any`
- **Config files:** `tailwind.config.cjs` and `postcss.config.js` must be CommonJS (`module.exports`) for Docusaurus webpack
- **Language:** repository-level documents and code (specs, TODO/TOFIX, code comments) are English-only; Russian is a localization mirror for user-facing surfaces only (UI strings via `translations/source`, docs locales via i18n)

## 5. Accessibility Rules

- Icon-only buttons **must** have `aria-label`
- Table headers **must** have `scope="col"`
- Collapsible sections must have `aria-expanded`
- Error messages should have `role="alert"`

## 6. Project Structure

```
├── src/
│   ├── dice_roller/           # Dice roller module (logic, UI, 3D renderer)
│   │   ├── dice-logic/        #   moo lexer, AST parser, evaluator, renderer
│   │   ├── components/        #   Dice pool, history, 2D/3D dice, InlineRoll
│   │   ├── store/             #   Zustand store
│   │   └── utils/             #   Constants, events, types-ext
│   ├── sheet_manager/         # Character sheet manager
│   │   ├── components/        #   Modal, StatDot, TraitRow, collapsibles
│   │   ├── features/sheet/    #   Workspace shell + declarative template renderer
│   │   ├── store/             #   Zustand + IndexedDB persistence
│   │   ├── types/             #   Zod schemas + TS types
│   │   └── context/           #   CharacterContext (multi-character)
│   ├── integrations/          # External/cross-feature adapters
│   │   ├── roll-sharing/      #   Queued roll sharing to Discord/Matrix (service registry)
│   │   ├── docs-character-rolls/ # Documentation ↔ sheet/dice adapter
│   │   ├── roll-reading/      #   Game-system dice readings (V5 criticals, special dice)
│   │   └── sheet-dice/        #   Character stat ↔ dice panel adapter, shown document
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
│   └── template-editor/       # Template editor guide (linked from the editor's help)
├── i18n/                      # Translations (en, ru)
├── translations/source/        # Canonical YAML UI/catalog translation sources
├── scripts/                   # Catalog, i18n, and version validators
├── tests/                     # Vitest logic, integration, and component tests
├── static/                    # Images, sounds (dice impacts, surfaces)
└── context/                   # Local, git-ignored reference material (see context/AGENTS.md)
```

## 7. Key Skills (`.agents/skills/`)

| Skill                    | When to Load                                                           |
| ------------------------ | ---------------------------------------------------------------------- |
| `dice-logic`             | Working on dice lexer, parser, evaluator, or renderer                  |
| `sheet-manager`          | Working on character schema, store, derived stats, or sheet elements   |
| `sheet-templates`        | Anything template-related: tree, values, bindings, formulas, editor    |
| `docusaurus-integration` | Adding pages, navbar items, theme config                               |
| `tailwind-theming`       | Using colors, dark mode, palette variables                             |
| `mdx-documentation`      | Writing MDX docs — admonitions, cross-refs, dice notation              |
| `ui-i18n`                | Editing YAML UI/catalog translations or generated adapters             |
| `backlog`                | Editing TODO.md/TOFIX.md or normalizing raw input into backlog entries |
| `typescript`             | Before writing any `.ts`/`.tsx` — code style & optimization            |

## 8. Module Boundaries

- `dice_roller/dice-logic/index.ts` is the small public API. Internal dice code and tests should import the specific internal file they own.
- `shared/` contains system-independent UI and utilities only. Cross-feature or external-service behavior belongs in `integrations/`.
- Bound sheet elements read through `useBoundDocument()` (character capability for characters, typed document data for other kinds); pages are shipped templates, not React blocks.
- Imported/persisted documents must pass the envelope schema and their registered definition schema; `BaseCharacterSchema` is only the legacy-character import path (Zod strips unknown legacy fields).
- Game systems are layered as ruleset (mechanics) + setting + supernatural module; engines shared by several lines (e.g. V5) are one ruleset. In code: `systems/v5/ruleset/` + `systems/v5/modules/<line>/`, and `systems/wod2e/ruleset/` under the Star Wars setting (`systems/star-wars-wod/`, identities frozen); every plugin declares its `catalogs`, `policies`, `defaultTemplates`, `templateBindings`, `dice`, and optional `coreDefinitions` (engine characters user settings reuse) on `SystemPlugin`; a setting system also names its `ruleset` (Star Wars: `wod-2e`), which the library tree groups by. User document types, settings, and catalogs live in `documentTypeStore` and reach generic code only through the registry overlay (`systems/userTypes.ts`, `systems/userCatalogs.ts`); template code looks every catalog up with `getCatalogBinding`.
- Generic sheet code never imports a concrete system folder: one ESLint `no-restricted-imports` pattern covers every `systems/<system>/` (allowed importers: `systems/index.ts`, `docsEmbeds.tsx`, the legacy path in `store/documentStore.ts`).
- Third-party material: rules and catalog text in our own words (no verbatim book passages); publisher notices (e.g. Dark Pack, which covers V5 material only) come from `systems/policies.ts` metadata declared by plugins/modules and render as a badge on sheets (`PolicyBadges`, linking to the policy's single docs page with `PolicyStatement`) and `notices` in exports — only where that material is used, once per surface in a prominent place, never repeated on dice, toasts, history, or messages; game mechanics alone need no notice (constitution VIII).
- Element storybook (constitution VI): every template element variant, documentation widget, and palette color appears in the draft-only docs storybook `docs/dev/storybook/` (stories in `src/sheet_manager/storybook/stories.ts`, guarded by `tests/sheet_manager/storybook.test.tsx`; widgets on `docs-widgets.mdx`; colors from `tailwind.config.cjs` via `shared/components/Palette`); a new or changed element is not done until it does. A setting's new element is an editor-configurable template element, preferably an option on an existing element rather than a similar new one.
- Data changes must pass `yarn validate:data`. Documentation under `docs/star-wars-wod-2e`, `docs/wod-v5`, and `docs/template-editor` must be mirrored under Russian i18n and pass `yarn validate:i18n`.
- YAML UI/catalog translation changes must pass `yarn build:translations` and `yarn validate:i18n`; do not edit generated `ttgamer.*` entries in `i18n/*/code.json` or `src/i18n/generated/`.
- `yarn verify:fast` runs the translation coverage verifier (`yarn i18n:verify`): user-facing literals, missing keys, plurals, catalog and docs coverage, glossary consistency. New UI text goes through YAML; exceptions need a reason in `translations/i18n-exceptions.yaml`.

## 9. Specs vs Current State

- `specs/NNN-*` are change records: they explain why a feature was built, and later specs amend earlier ones. Never reconstruct current behavior from a spec chain.
- Current behavior lives in module `AGENTS.md` files and `.agents/skills/`. A feature is complete only when those are updated and superseded specs carry a historical banner.

## 10. Reference Material (`context/`)

- Before designing a feature, check `context/AGENTS.md` for references: `context/corebooks/` holds rulebooks for every system; `context/<module>/` holds material for that module (e.g. `context/dice-roller/` has the notation libraries our dice syntax follows).
- `context/` is git-ignored and excluded from every tool; never import from it, and paraphrase rules text (section 8, third-party material).
- New reference material goes into the matching folder and is listed in `context/AGENTS.md`.

## 11. Verification

This section owns the verification rules; other guidance links here.

- **Checks** are `package.json` scripts, the only entry points any runner calls (local hooks,
  GitHub Actions in `.github/workflows/ci.yml`, Vercel's `yarn build`, a later Jenkins pipeline):
  `ci:lint`, `ci:typecheck`, `ci:test`, `ci:test:perf`, `ci:deadcode`, `ci:validate`, `ci:build`.
  `verify:fast` = lint + typecheck + validate; `verify` adds dead code and unit tests;
  `verify:full` adds the perf tests and the build.
- **Commit** (`pre-commit`): lint-staged formats and lints the staged files only (seconds); staged
  backlog or translation files also run their validator.
- **Push** (`pre-push`): the type check and the unit tests related to the pushed changes.
- **By change size**, before committing a story:
    - a small code edit runs its targeted tests;
    - dice parser or evaluator, schema, store, or persistence edits run `yarn verify`;
    - config, dependency, route, generated CSS, or documentation-path edits run `yarn verify:full`.
- **Merge into `master`** requires `yarn verify:full` (§12).
- **CI** runs every `ci:*` command on push and pull requests. Perf tests there are reported, not
  blocking, because shared runners are noisy.
- **Dead code**: knip fails on unused files, exports, or dependencies. A deliberate export
  without importers needs `@knipignore` and a reason.
- **Flaky tests**: a test that fails without a code cause is fixed or quarantined within a day.
  Quarantine means moving it to the `perf` project (for timing) or skipping it with a `TOFIX`
  entry. A longer timeout alone is never the fix.
    - Timing assertions belong only in `*.perf.test.*` files.
    - Perf tests compare against a baseline measured in the same run, or take the best of several
      warm runs.

## 12. Workflow

- **Features** go through the project's lean spec-kit commands: `/ttg-speckit-specify` →
  `/ttg-speckit-clarify` → `/ttg-speckit-plan` (one `design.md`) → `/ttg-speckit-tasks` (one
  planning commit) → `/ttg-speckit-analyze` (four or more stories, or on request) →
  `/ttg-speckit-implement` (one commit per story). The personal `/speckit-*` commands are the
  stock spec-kit and are not used here.
- **Small change path**: a change that has one story, changes no schema, persistence, or
  contract between modules, and stays within ~300 lines of code (tests and docs excluded) skips
  the spec. The steps are: backlog entry → code and tests → guidance update → one commit. If it
  grows past that, escalate to a spec.
- **Prototypes** only when a UI layout is genuinely unknown: one screen, outside `specs/`.
- **Merge** (only when the maintainer says so):
    1. `yarn verify:full`.
    2. `yarn release <minor|patch>`, then rewrite the drafted CHANGELOG entry for readers and
       commit.
    3. Fast-forward `testing` to the feature branch.
    4. `git merge --no-ff testing` into `master`.
    5. Push `testing` and `master`.

    Feature branches do not bump the version.
