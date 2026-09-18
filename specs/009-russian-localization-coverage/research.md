# Research: Complete Russian Localization with Verified Coverage

Findings from three code surveys (i18n infrastructure, catalogs and pickers, sheet rows and
templates) on 2026-09-19. Each decision lists what was chosen, why, and what was rejected.

## Current state (baseline)

- **Pipeline (T-020).** `translations/source/<locale>/{ui,data}/**/*.yaml` → `scripts/build-translations.ts`
  → `i18n/<locale>/code.json` (`ttgamer.ui.*` ids merged with Docusaurus `theme.*` keys),
  `src/i18n/generated/uiMessages.ts` (descriptor tree with English messages), and
  `src/i18n/generated/catalogTranslations.ts` (every locale). `validate-translations.ts` checks key
  mirroring and `{placeholder}` parity; `validate-i18n.ts` checks docs page parity for
  `star-wars-wod-2e` and `wod-v5` plus Docusaurus JSON key parity. Neither detects Russian values
  identical to English, hard-coded literals in code, or catalog coverage.
- **Gate gap.** `validate:i18n` runs only in `prebuild`. `.husky/pre-commit` runs `verify:full` only on
  master/main, so on working branches nothing checks translations.
- **Untranslated surface (grep estimate).** sheet_manager 14 files / ~88 lines; `src/data/*Config.tsx`
  13 / ~82; dice_roller 6 / ~27; shared 5 / ~24 (`DataCatalog` chrome is all English); pages 2 / ~14
  (`src/pages/index.tsx` fully English); plus about 140 `label:/title:` literals in sheet_manager `.ts`,
  many of which are fallbacks paired with `labelMessage`.
- **Catalog data.** Only `attributes` and the eight Hunter catalogs have Russian YAML. The Star Wars data
  (14 files, ~345K characters) has no Russian at all. `terminologyData.ts` holds 81 en/ru term pairs.
- **Pickers.** `pickLabel` already produces "Русский (English)" in declarative suggestions, rows
  catalogs, and catalog selects. The legacy `bodyEquipmentCatalogs.ts` builders and `useBodyHandlers`
  use raw English names and copy English text into the document. `CatalogSuggest` matches with
  `toLowerCase()` substring on the displayed name (no ё/е folding). `DataCatalog` searches English
  accessors only. `CatalogBrowser` (Hunter docs) is localized but uses `entryLabel`, so English search fails.
- **Docs.** en and ru trees mirror exactly (root `index.mdx` + 45 Star Wars + 25 V5 pages). A heuristic
  found no English prose in ru pages. The root `docs/index.mdx` is outside the validator's roots.
  Star Wars pages embed `DataCatalog` with English `*Config.tsx` columns and English filter labels.
- **Templates.** Nodes carry a literal `label` (English fallback) plus optional `labelMessage`
  (`ttgamer.ui.*` or `catalog:<catalog>/<entry>`). The editor deletes `labelMessage` on rename
  (`draft.ts:283`, `:652`, `sourceNodes.ts:67`). `DeclarativeSheetView.tsx:78-87` drops `labelMessage`
  when it bridges a rating field. Star Wars abilities, virtues, and Force skills have no `labelMessage`.
- **Rows.** `StatLabel` renders a bare `<span>` with no `min-w-0`; `TraitRowWithInput` gives the
  specialization input `flex-1 min-w-5`, so long labels squeeze it to almost nothing.
- **Plurals.** None; messages use "document(s)".
- **Tooling.** `typescript` 6.0 is a devDependency (compiler API available); `yaml`, `tsx` present;
  `@babel/parser` only transitive; no `ts-morph`.

## D1 — Verifier engine: TypeScript compiler API over the whole `src/`

- **Decision**: a new `scripts/i18n-verifier/` (entry `scripts/verify-i18n.ts`) that builds one
  `ts.createSourceFile` per `.ts/.tsx` file (no type checker, no program) and walks the AST with a set
  of rules. It also loads translation sources through the existing `translation-source.ts`, catalog
  declarations through the plugin registry, and docs through the existing `validate-i18n.ts` helpers.
- **Rationale**: parsing gives exact positions and context (JSX text vs. `className` vs. import path),
  which the spec requires (FR-007). Per-file parsing without a checker keeps a full scan to a few
  seconds (SC-008). `typescript` is already a direct dependency.
- **Alternatives**: the regex approach of `context/localization_example/validator.js` (rejected: it
  only sees one call pattern and cannot tell user-facing positions from identifiers); `ts-morph`
  (rejected: new dependency for no gain); ESLint rule such as `i18next/no-literal-string` (rejected:
  it covers only literals, not catalogs/docs/glossary, and would split the report across two tools;
  an ESLint rule can be added later on top of the same position rules if in-editor feedback is wanted).

## D2 — What counts as a user-facing literal

- **Decision**: a literal is reported when it contains at least one Latin word of two or more letters
  and sits in a user-facing position:
    1. JSX text;
    2. a string (or template literal without only-expression content) in a JSX attribute from the
       user-facing prop list: `aria-label`, `aria-description`, `title`, `placeholder`, `alt`, `label`,
       `description`, `emptyText`, `searchPlaceholder`, `header`, `tooltip`, `confirmText`, `cancelText`;
    3. the first argument of user-facing sinks: `toast`, `toast.*`, `window.confirm`, `alert`;
    4. object properties `label`, `title`, `header`, `description`, `placeholder`, `shortDescription` in
       files under `src/**/components`, `src/**/features`, `src/pages`, `src/data/*Config.tsx`,
       **unless** the same object literal also has `labelMessage` (template fallback) or the file is a
       catalog data file (covered by the catalog rule instead).
       Ignored everywhere: `className`/`class`/`style`/`key`/`id`/`data-*`/`href`/`to`/`src` props, import
       and export specifiers, `console.*`, `new Error(...)` and diagnostics codes, test files, `src/i18n/generated`,
       `context/`. Matching text that looks like notation (`/^[\dd+\-*>=<()fk!. ]+$/i`), a URL, a CSS value,
       or a single all-caps abbreviation of ≤4 letters is ignored.
- **Rationale**: rules are explicit and live in one module (`positions.ts`), as FR-007 requires; the
  labelMessage sibling rule avoids ~140 false positives on template fallbacks.
- **Alternatives**: flagging every Latin string (rejected: thousands of identifiers); a type-aware rule
  checking `ReactNode` targets (rejected: needs a full program, too slow for the pipeline, and props
  typed `string` still leak).

## D3 — Exceptions and rollout: one YAML exception list, rules gated per area

- **Decision**: `translations/i18n-exceptions.yaml` with entries `{rule, file?, match, reason}`;
  unmatched entries are reported as warnings (FR-008). Each rule area (`interface`, `keys`,
  `identical`, `catalog`, `docs`, `pickers`, `glossary`, `plural`, `overflow`) has a level in
  `scripts/i18n-verifier/config.ts`: `report` while that area is being migrated, `error` once its
  migration batch lands. The feature is complete when every area is at `error`.
- **Rationale**: the verifier is the worklist for this feature (US2); a big-bang baseline file with
  hundreds of entries would hide the real exceptions. Per-area levels match the constitution's
  "small domain batches" wording in T-021.
- **Alternatives**: a generated baseline snapshot (rejected: it becomes a permanent dumping ground);
  inline `// i18n-ignore` comments (rejected: exceptions scattered across the codebase and invisible
  in review; allowed only for a line where the YAML entry would be ambiguous — not needed now).

## D4 — Where the verifier runs

- **Decision**: `yarn validate:i18n` = existing docs parity + existing mirror validation + new
  verifier. `verify:fast` gains `validate:i18n` (after `build:translations --check`, which fails if
  generated files are stale instead of rewriting them). `yarn i18n:status` prints the verifier's
  per-area coverage table (FR-010).
- **Rationale**: today translations are only checked on master; working branches must catch gaps
  too. A `--check` mode keeps the pre-commit hook read-only.
- **Alternatives**: keep it only in `prebuild` (rejected: the regression that started this spec).

## D5 — Glossary: YAML source, refs are the join key

- **Decision**: `translations/glossary/<system>.yaml` (`star-wars-wod.yaml`, `v5.yaml`,
  `v5-hunter.yaml`). Each term: `id`, `en`, `ru`, optional `ruShort`, optional `note`, and `refs` — the
  `ttgamer.ui.*` ids and `catalog:<catalog>/<entry>` references that display this term.
  `build-translations.ts` generates `src/i18n/generated/bookTerms.ts`: a map ref → `{ en, ruShort? }`.
  **A label is a book term exactly when its ref is listed in the glossary**; that drives the hint,
  the "Game terms: English" mode, and glossary consistency (FR-025). The first version is seeded from
  `terminologyData.ts` (81 pairs), the attribute/skill/Force profiles, and the V5/Hunter YAML.
- **Rationale**: joining on refs instead of free text makes consistency checks exact (the Russian
  message at each ref must equal `ru`, or `ruShort` for the short-form slot) and makes "is this a
  game term" a data question, not a code heuristic. Custom traits have no ref, so they get no hint
  automatically (FR-017).
- **Alternatives**: free-text term search across sources (rejected: fuzzy, false positives in prose);
  a `isGameTerm` flag on template nodes (rejected: duplicated on every template, drifts).

## D6 — Hint surface: one delegated popover per sheet

- **Decision**: a `TermHintProvider` wraps each sheet view (full, brief, docs embeds). Hint-bearing
  labels render as `<span data-term-ref="…" tabIndex={0} aria-describedby="…">`. The provider attaches
  **one** set of delegated listeners (`pointerover`/`pointerout` with a 300 ms open delay,
  `focusin`/`focusout`, `click` for touch) on its root and renders **one** Radix Popover anchored with a
  virtual ref to the active label. The popover content is resolved on open from `bookTerms`
  (`en`, plus the full Russian name when the label shows `ruShort`). Screen-reader text: each hint label
  contains a visually hidden `<span id>` with the English name and points `aria-describedby` at it.
  This is one static text node per label (no state, listener, or overlay) and works in every major
  screen reader, unlike `aria-description` (ARIA 1.3 draft) or a shared span rewritten on focus (racy).
- **Rationale**: FR-016b and SC-009 — no per-label components, listeners, or portals; the popover is
  created on first use. The Radix Popover pattern already exists in `CatalogSuggest.tsx`, so no new
  dependency (Radix Tooltip is not installed and does not open on tap).
- **Alternatives**: a Tooltip per label (rejected: 30–80 instances per sheet); native `title`
  (rejected: no touch support, no styling, delayed); showing the hint inline under the label
  (rejected by the user: breaks row width).
- **Keyboard tradeoff**: hint labels become tab stops only while hints are on and the locale is
  Russian. This adds one stop per trait; acceptable because the constitution requires keyboard reach
  for interactive elements, and "Russian without hints" removes them.

## D7 — Term link that survives renaming

- **Decision**: template fields and primitive nodes gain optional `termRef` (same format as
  `labelMessage`) and optional `termHint: false`. The editor's rename paths copy `labelMessage` into
  `termRef` before deleting `labelMessage`; `sourceNodes.ts:67` (switching a field to a custom source)
  clears both. Shipped templates set `labelMessage` only; at render `termRef ?? labelMessage` is the
  book-term ref. The bridge at `DeclarativeSheetView.tsx:78-87` forwards `labelMessage`, `termRef`, and
  `termHint`. `FieldEditor.tsx` and `PrimitiveConfig.tsx` show the linked term (English name) and a
  "Show book name hint" toggle next to "Show label". No template or file version bump: the keys are
  optional and old readers ignore them.
- **Rationale**: FR-016a with the smallest schema change; no migration (clarification Q3).
- **Alternatives**: keep `labelMessage` and add `labelOverride` (rejected: changes the meaning of
  `label` for every existing template and every renderer).

## D8 — "Game terms" preference: small persisted store

- **Decision**: `src/shared/store/readerPrefsStore.ts` — zustand with `persist` to `localStorage`
  (`ttgamer-reader-prefs`), fields `gameTerms: 'ru' | 'en' | 'ru-plain'` (default `'ru'`) and
  `termHintNoticeDismissed: boolean`. The sheet toolbar gets a compact "Terms" menu next to the view
  mode select (this is the sheet's settings surface; there is no separate settings dialog), and the
  one-time notice has a "Change" link to the same menu. `localizeTemplate` receives the preference: in
  `'en'` mode, nodes whose ref is a glossary term keep the English label and the Russian name moves
  into the hint.
- **Rationale**: a UI preference must be readable synchronously on first render (no flash of the
  wrong label), which IndexedDB cannot give; Principle VII's IndexedDB rule is about character and
  history data. `useLocalStorageState` does not sync across components, so a store is needed.
- **Alternatives**: IndexedDB via localForage (rejected: async first render); a per-document setting
  (rejected: it is a reader preference, not document data — spec entity "Game terms preference").

## D9 — Long labels: glossary short forms + container query, no JS measuring

- **Decision**: rows put the label in `min-w-0` and give the specialization input `min-w-[8ch]`
  (FR-021). When the term has `ruShort`, the label renders both forms and a container query on the
  row (`@container` in `set_tailwind_styles.scss`) shows the short form below a width threshold.
  The verifier's `overflow` rule enforces FR-023 with a character budget per row kind (initially
  14 characters for trait-with-specialization rows and 18 for plain trait rows at 360 px, calibrated
  once by measuring the Hunter and Star Wars sheets at 360 px and recorded in the verifier config).
- **Rationale**: zero runtime cost (CSS only), deterministic tests; jsdom cannot measure text, so a
  character budget is the testable proxy.
- **Alternatives**: `ResizeObserver` measuring per label (rejected: per-label observers contradict
  FR-016b); ellipsis truncation (rejected: hides the name for good, violates US5 scenario 1).

## D10 — Pickers and search

- **Decision**: `bodyEquipmentCatalogs.ts` builders move onto `pickLabel`/`entryText`, and their
  subtitles onto translation messages. One `normalizeSearchText` helper in `src/shared/utils/`
  (lowercase with `toLocaleLowerCase`, `ё→е`, NFKD with combining marks stripped) is used by
  `CatalogSuggest`, `rowsCatalog` matching, `DataCatalog`'s global filter, and `CatalogBrowser`.
  `CatalogBrowser` and docs embeds search on `pickLabel` text. Equipment items chosen from a catalog
  store `entryRef: "<catalog>/<entry>"` next to the copied values; a row displays the localized entry
  name while the stored `name` is empty or equal to the entry's English name, and the user's text
  otherwise (FR-015, edge case "documents opened in the other language").
- **Rationale**: the pickers that already use `pickLabel` prove the pattern; `entryRef` is additive
  and optional in the document schema (no store migration).
- **Alternatives**: store only the id and drop `name` (rejected: breaks user renames and existing
  documents).

## D11 — Star Wars catalog localization scope and docs catalogs

- **Decision**: Russian YAML for every registered Star Wars catalog plus `abilities`, `forceSkills`,
  `virtues`, and `terminology`: 100% of `name`, `shortDescription`, and short enumerated fields
  (`category`, `type`, `size`, `arc`, era labels, tags) — enumerations through a shared
  `labels` map per catalog instead of per entry. Long `description` fields are localized where a
  reviewed paraphrase exists and otherwise fall back to English and appear in the coverage report
  (SC-006: ≥ 90% of short descriptions). The data loader accepts string arrays for `specialties[]`
  and `scale[]` with a length-parity check. Star Wars docs pages keep `DataCatalog`, but its chrome
  strings move to YAML and every `*Config.tsx` column header and filter label becomes a translation
  descriptor with cells rendered through `entryText`.
- **Rationale**: matches the clarified readiness rule; moving 15 custom configs onto `CatalogBrowser`
  would be a refactor beyond this feature (vehicles and creatures have bespoke detail renderers).
- **Alternatives**: translate all 345K characters now (rejected: size, and T-037 paraphrase review);
  names only (rejected: SC-006).

## D12 — Plurals

- **Decision**: Docusaurus plural convention — a message holds forms separated by `|` (en: 2 forms,
  ru: 3 forms `one|few|many`), rendered with `usePluralForm().selectMessage(count, translate(...))`.
  The verifier's `plural` rule checks the form count per locale for messages marked
  `plural: true` in YAML, and flags `(s)` in English messages.
- **Rationale**: built into Docusaurus (no second runtime, per T-021).
- **Alternatives**: ICU MessageFormat (rejected: new runtime).

## D13 — Documentation checks

- **Decision**: extend `validate-i18n.ts` roots with the root `docs/index.mdx`. The verifier's `docs`
  rule flags ru prose lines (outside code fences, imports, JSX props) where Latin words make up more
  than half of the words and there are at least four of them. A `docs-terms` rule (gated as `error` once the ru docs are fixed)
  checks that the first mention of each glossary `ru` term on a ru page is followed by `(en)`
  (FR-020). Frontmatter `title`/`sidebar_label` are covered by the same prose rule.
- **Rationale**: the page-parity check exists; content-level checks are the gap.
- **Alternatives**: machine language detection (rejected: dependency, noisy on short lines).

## D14 — Existing-translation review and T-061

- **Decision**: the glossary YAML is drafted by the agent (seed + proposals with `note`), then
  reviewed by the maintainer term by term; the review decisions are the T-061 outcome. The verifier's
  `glossary` rule then makes every source follow it. The `identical` rule catches copied English
  values across all existing YAML.
- **Rationale**: terminology is a product decision that needs a human reviewer.
