# TTGamer - Project Cheat Sheet

## 1. Overview

Docusaurus site hosting documentation and modular React tools for tabletop roleplaying games. The
current production content and character sheet target a Star Wars WEG/WoD hybrid; future systems
should integrate through explicit system boundaries instead of adding system conditionals throughout
shared code.

**Canonical deployment:** `https://ttgamer.vercel.app`. GitHub Pages settings remain only for
repository links and the optional manual deploy command. The same site also ships as a Docker image
for the backend's stack (`deploy/AGENTS.md`).

**Version source:** `package.json`. Docusaurus exposes it through `customFields.version`; do not
hard-code the current version in UI code.

**Source-of-truth pattern:** keep machine-readable facts with one owner. Package version lives in
`package.json`, release summaries in the first `CHANGELOG.md` entry, UI/catalog translation sources
in `translations/source`, documentation parity in `validate:i18n`, and catalog integrity in
`validate:data`. Prose may summarize those facts but must not become a second authoritative source.
Roadmap intent remains human-written in TODO files.

**Running server:** Usually user is already running dev server of app on http://localhost:3000/, so
check fo it existence before killing processes or creating new one.

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
| Frontend        | React 19 + TypeScript 6/7 (strict)  |
| State           | Zustand 5 (persist middleware)      |
| Styling         | Tailwind CSS 4 + clsx               |
| Validation      | Zod                                 |
| Persistence     | localForage (IndexedDB)             |
| Icons           | Lucide-react                        |
| Components      | Radix UI primitives                 |
| Dice Logic      | moo lexer + hand-written AST parser |
| 3D Rendering    | Three.js + cannon-es                |
| Testing         | Vitest (happy-dom), Playwright      |
| i18n            | Docusaurus i18n (en, ru)            |

## 3. Development Commands

| Command                             | Purpose                                                                |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `yarn start`                        | Start Docusaurus dev server                                            |
| `yarn build`                        | Production build                                                       |
| `yarn serve`                        | Preview production build                                               |
| `yarn typecheck`                    | TypeScript 7 `tsc -b` over every project; full after a lockfile change |
| `yarn lint` / `yarn lint:fix`       | ESLint + Prettier with caches (check / auto-fix)                       |
| `yarn format` / `yarn format:check` | Prettier only (write / check)                                          |
| `yarn test`                         | Vitest `unit` project (default run, no timing assertions)              |
| `yarn test:perf`                    | Vitest `perf` project: timing tests, one file at a time                |
| `yarn test:watch`                   | Vitest watch mode                                                      |
| `yarn test:coverage`                | Vitest coverage report                                                 |
| `yarn test:e2e`                     | Playwright on the built site: smoke tests, then browser timings        |
| `yarn e2e:install`                  | Install the Chromium build Playwright uses (once per machine)          |
| `yarn build:translations`           | Generate UI/catalog translations (runs before start/test/build)        |
| `yarn validate:data`                | Validate catalogs and references                                       |
| `yarn audit:dead-code`              | knip: unused files/exports/deps                                        |
| `yarn validate:contract`            | Cloud API contract: valid OpenAPI 3.1, semver, snake_case fields       |
| `yarn contract:report`              | Where the frontend's schemas match or differ from the contract         |
| `yarn validate:i18n`                | One check: docs en/ru pairs and structure, YAML sources, coverage      |
| `yarn check:version`                | Check package/changelog/UI version                                     |
| `yarn release <minor\|patch>`       | Bump the version and draft the CHANGELOG entry (at merge)              |
| `yarn ci:*`                         | The runner-independent checks (§11); `verify:*` compose them           |
| `yarn ci:docker`                    | Build the site image and run the browser smoke tests on the container  |
| `yarn readme:screenshots`           | Build, then retake the README images in `attachments/`                 |
| `yarn deploy`                       | Deploy to GitHub Pages                                                 |
| `yarn clear`                        | Clear Docusaurus cache                                                 |

## 4. Code Conventions

- **Prettier:** `semi: true`, `singleQuote: true`, `tabWidth: 4`
- **ESLint:** React hooks + a11y focused, strict ESM (no `require()`)
- **Styling:** Tailwind + `clsx` for conditional classes
- **Icons:** Lucide-react
- **Comments:** keep them uncommon; use them for non-obvious constraints or rationale, not narration
- **Imports:** separate `import type { ... }` from value imports; let ESLint sort groups
- **Types:** Prefer `interface` for object shapes, `type` for unions/intersections; avoid `any`
- **Config files:** `postcss.config.js` must be CommonJS (`module.exports`) for Docusaurus webpack;
  Tailwind is configured in CSS (`src/css/custom.css`, `tailwind-theming` skill)
- **Language:** repository-level documents and code (specs, TODO/TOFIX, code comments) are
  English-only; Russian is a localization mirror for user-facing surfaces only (UI strings via
  `translations/source`, docs locales via i18n)

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
│   │   ├── features/template-editor/ # Template editor (session, operations, panels)
│   │   ├── store/             #   Zustand + IndexedDB persistence
│   │   ├── types/             #   Zod schemas + TS types
│   │   └── context/           #   CharacterContext (multi-character)
│   ├── integrations/          # External/cross-feature adapters
│   │   ├── roll-sharing/      #   Queued roll sharing to Discord/Matrix (service registry)
│   │   ├── docs-character-rolls/ # Documentation ↔ sheet/dice adapter
│   │   ├── roll-reading/      #   Game-system dice readings (V5 criticals, special dice)
│   │   ├── sheet-dice/        #   Character stat ↔ dice panel adapter, shown document
│   │   └── cloud-api/         #   Cloud API boundary: wire names, implemented contract version
│   ├── data/                  # Catalog entries, filters, and table configs
│   ├── shared/                # DataCatalog, EntityCard, TWWrapper, hooks, utils
│   │   ├── markdown/          #   Markdown parser to an AST (no HTML ever), the notes' syntax
│   │   ├── components/        #   Reusable UI components (SecretField, DataCatalog, EntityCard, Splitter, FloatingWindow, tree/TreeView, markdown/MarkdownView, etc.)
│   │   ├── hooks/             #   useLocalStorageState, useSessionStorageState, etc.
│   │   └── utils/             #   logging, diceNotation, env
│   ├── pages/                 # Docusaurus pages
│   ├── theme/                 # Theme swizzles (Root, NavbarItem)
│   └── css/                   # Global CSS + Tailwind
├── docs/                      # Documentation (MDX); every tree but dev/ has a ru mirror
│   ├── star-wars-wod-2e/      # Star Wars WoD 2e rules and catalogs
│   ├── wod-v5/                # V5 rules (Hunter: the Reckoning 5e)
│   ├── guide/                 # How to use the site (sheet, documents, dice, template editor,
│   │                          #   roll sharing); the app's help links here, never to rules pages
│   └── dev/                   # Draft-only developer pages (storybook), English only
├── i18n/                      # Translations (en, ru)
├── translations/source/        # Canonical YAML UI/catalog translation sources
├── scripts/                   # Validators, translation build, release script
├── tests/                     # Vitest logic, integration, and component tests
├── tests-e2e/                 # Playwright: smoke/ (blocking), timings/ (reported), readme/ (images)
├── contracts/cloud-api/       # Cloud API contract (OpenAPI), its change log, roll test vectors
├── deploy/                    # Docker stack: nginx config, Caddy edge proxy, compose (+ Dockerfile at root)
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
| `typescript`             | Before writing any `.ts`/`.tsx` — code style, comments, optimization   |

## 8. Module Boundaries

- `dice_roller/dice-logic/index.ts` is the small public API. Internal dice code and tests should
  import the specific internal file they own.
- `shared/` contains system-independent UI and utilities only. Cross-feature or external-service
  behavior belongs in `integrations/`.
- Shared UI building blocks (spec 032): nested rows use `shared/components/tree/TreeView` (the
  library and the documents window are its users: differences are slots and options, not forks),
  side-by-side panes use `shared/components/Splitter` (vertical or horizontal; `onCollapse` folds a
  pane dragged 80 px past its minimum or on Enter), floating windows use `FloatingWindow` (its own
  stored place, or an owner's with `layout`/`onLayoutChange`, `zIndex`, and `onFocus` for a stack of
  windows; a keyboard-movable title bar with `moveLabel`; title-bar drags reported for docking). Add
  an option to these instead of copying them; their contract tests in `tests/shared/` run against
  every user. Markdown anywhere renders through `shared/components/markdown/MarkdownView` (spec
  043): the parser builds nodes, never HTML, and callers fill its slots (code spans, embeds, task
  ticks, issues) instead of post-processing its output.
- The document collection is the index: generic code reads `entries` (or `DocumentRef`s) and loads
  one document by id when it needs its data; it never scans the loaded `documents`
  (`src/sheet_manager/AGENTS.md`, "Documents: Storage, Tree, and Window").
- Sheet document access and composition: `src/sheet_manager/AGENTS.md` ("Character Access",
  "Composition Scale"); pages are shipped templates, not React blocks.
- Cloud API (spec 030): `contracts/cloud-api/openapi.yaml` is the authority for the wire, Zod
  schemas for stored data. Contract fields are snake_case on the wire and are renamed only in
  `integrations/cloud-api/wireNames.ts`; opaque content (document `data`, value keys, library item
  content) never is. A contract change follows `contracts/cloud-api/CHANGES.md`.
- Ids made on the device: `generateId()` is a UUIDv7; library item ids are their prefix plus its 32
  hex digits (`compactId()`); ids unique only inside one document or template use `randomToken()`,
  never a slice of `generateId()` (its first digits are the time).
- Imported/persisted documents must pass the envelope schema and their registered definition schema;
  the first-version flat character export (`systems/star-wars-wod/legacyExport.ts`) is the only
  legacy import path, supported until its end date (Zod strips unknown legacy fields).
- Game systems are layered as ruleset (mechanics) + setting + supernatural module; engines shared by
  several lines (e.g. V5) are one ruleset. In code: `systems/v5/ruleset/` +
  `systems/v5/modules/<line>/`, and `systems/wod2e/ruleset/` under the Star Wars setting
  (`systems/star-wars-wod/`, identities frozen); every plugin declares its `catalogs`, `policies`,
  `defaultTemplates`, `templateBindings`, `dice`, and optional `coreDefinitions` (engine characters
  user settings reuse) on `SystemPlugin`; a setting system also names its `ruleset` (Star Wars:
  `wod-2e`), which the library tree groups by. User document types, settings, and catalogs live in
  `documentTypeStore` and reach generic code only through the registry overlay
  (`systems/userTypes.ts`, `systems/userCatalogs.ts`); template code looks every catalog up with
  `getCatalogBinding`.
- Generic sheet code never imports a concrete system folder: one ESLint `no-restricted-imports`
  pattern covers every `systems/<system>/` (allowed importers: `systems/index.ts`, `docsEmbeds.tsx`,
  the legacy path in `store/documentStore.ts`).
- Third-party material and publisher notices: constitution VIII (where the badge lives:
  `src/sheet_manager/AGENTS.md`, "Systems, Modules, and Publisher Notices").
- Element storybook: constitution VI; how to add a story: the `sheet-templates` skill.
- Data changes must pass `yarn validate:data`. Every `docs/*` tree except `docs/dev` is mirrored
  under Russian i18n; `yarn validate:i18n` checks the pairs and their structure.
- UI and catalog strings: the `ui-i18n` skill (YAML sources; generated files are never edited or
  tracked; exceptions need a reason in `translations/i18n-exceptions.yaml`).

## 9. Specs vs Current State

- `specs/NNN-*` are change records: they explain why a feature was built, and later specs amend
  earlier ones. Never reconstruct current behavior from a spec chain.
- Current behavior lives in module `AGENTS.md` files and `.agents/skills/`. A feature is complete
  only when those are updated and superseded specs carry a historical banner.

## 10. Reference Material (`context/`)

- Before designing a feature, check `context/AGENTS.md` for references: `context/corebooks/` holds
  rulebooks for every system; `context/<module>/` holds material for that module (e.g.
  `context/dice-roller/` has the notation libraries our dice syntax follows).
- `context/` is git-ignored and excluded from every tool; never import from it, and paraphrase rules
  text (section 8, third-party material).
- New reference material goes into the matching folder and is listed in `context/AGENTS.md`.

## 11. Verification

This section owns the verification rules; other guidance links here.

- **Checks** are `package.json` scripts, the only entry points any runner calls (local hooks, GitHub
  Actions in `.github/workflows/ci.yml`, Vercel's `yarn build`, a later Jenkins pipeline):
  `ci:lint`, `ci:typecheck`, `ci:test`, `ci:test:perf`, `ci:deadcode`, `ci:validate`, `ci:build`,
  `ci:e2e` (build, then the browser tests), `ci:docker` (the site image, then the smoke tests on
  it). `verify:fast` = lint + typecheck + validate; `verify` adds dead code and unit tests;
  `verify:full` adds the perf tests and `ci:e2e`.
- **Build beside the dev server**: `yarn build` writes its generated modules to
  `.docusaurus-build/`, not the dev server's `.docusaurus/`, so a check never reloads or breaks a
  running `yarn start`. Keep the two directories apart.
- **Commit** (`pre-commit`): lint-staged formats and lints the staged files only (seconds); staged
  backlog or translation files also run their validator.
- **Push** (`pre-push`): the type check and the unit tests related to the pushed changes.
- **By change size**, before committing a story:
    - a small code edit runs its targeted tests;
    - dice parser or evaluator, schema, store, or persistence edits run `yarn verify`;
    - config, dependency, route, generated CSS, or documentation-path edits run `yarn verify:full`;
    - `Dockerfile`, `.dockerignore`, or `deploy/` edits run `yarn ci:docker`.
- **Merge into `master`** requires `yarn verify:full` (§12).
- **CI** runs every `ci:*` command on push and pull requests. Perf tests there are reported, not
  blocking, because shared runners are noisy.
- **Browser tests** (`tests-e2e/`) serve `build/` on port 3100, never the dev server. A smoke test
  fails on any uncaught or logged error and any failed request to the site. Every page draws in the
  fonts of `tests-e2e/fonts`, not the machine's, so pinned heights hold on any machine. Browser
  timings print next to their budgets and never fail a run. Locate controls by role and label, and
  wait for states, never for fixed delays.
- **Test DOM**: component tests use `// @vitest-environment happy-dom`. A file uses `jsdom` only
  where happy-dom differs, and says why in the docblock (today: style colors read back as
  `rgb(...)`).
- **Dead code**: knip fails on unused files, exports, or dependencies. A deliberate export without
  importers needs `@knipignore` and a reason.
- **Flaky tests**: a test that fails without a code cause is fixed or quarantined within a day.
  Quarantine means moving it to the `perf` project (for timing) or skipping it with a `TOFIX` entry.
  A longer timeout alone is never the fix.
    - Timing assertions belong only in `*.perf.test.*` files.
    - Perf tests compare against a baseline measured in the same run, or take the best of several
      warm runs.

## 12. Workflow

- **Features** go through the project's lean spec-kit commands: `/ttg-speckit-specify` →
  `/ttg-speckit-clarify` → `/ttg-speckit-plan` (one `design.md`) → `/ttg-speckit-tasks` (one
  planning commit) → `/ttg-speckit-analyze` (four or more stories, or on request) →
  `/ttg-speckit-implement` (one commit per story). The personal `/speckit-*` commands are the stock
  spec-kit and are not used here.
- **Small change path**: a change that has one story, changes no schema, persistence, or contract
  between modules, and stays within ~300 lines of code (tests and docs excluded) skips the spec. The
  steps are: backlog entry → code and tests → guidance update → one commit. If it grows past that,
  escalate to a spec.
- **Prototypes** only when a UI layout is genuinely unknown: one screen, outside `specs/`.
- **Merge** (only when the maintainer says so):
    1. `yarn verify:full`.
    2. `yarn release <minor|patch>`, then rewrite the drafted CHANGELOG entry for readers and
       commit.
    3. Fast-forward `testing` to the feature branch.
    4. `git merge --no-ff testing` into `master`.
    5. Push `testing` and `master`.

    Feature branches do not bump the version.
