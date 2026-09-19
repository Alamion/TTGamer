---
description: 'Task list for complete Russian localization with verified coverage'
---

# Tasks: Complete Russian Localization with Verified Coverage

**Input**: Design documents from `/specs/009-russian-localization-coverage/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: included. Constitution Principle V requires them because this feature edits template and
document schemas, adds a persisted store, and adds a pipeline gate. `tests/setup/sheetIssues.ts`
fails a test on any unexpected sheet diagnostic.

**Organization**: grouped by user story. Spec priorities: US1 P1, US2 P1, US3 P2, US4 P2, US5 P2,
US6 P3. US2 (the verifier) runs before US1 because its report is the worklist for US1.

**Skills to load first**:

- `.agents/skills/ui-i18n/SKILL.md` before any YAML or `translate` task;
- `.agents/skills/sheet-templates/SKILL.md` before template, binding, or editor tasks;
- `.agents/skills/sheet-manager/SKILL.md` before schema or store tasks;
- `.agents/skills/mdx-documentation/SKILL.md` before docs tasks.

**Rules for every task**:

- Russian text lives only in `translations/source/ru/**`, `translations/glossary/**` (the `ru`/`ruShort`
  fields), and `i18n/ru/**`. Code, comments, specs, and TODO stay English.
- Never edit `src/i18n/generated/*` or the `ttgamer.*` keys of `i18n/*/code.json` by hand. Run
  `yarn build:translations` after every YAML change.
- Never construct message ids dynamically. Use explicit descriptor maps (ui-i18n skill).
- Catalog prose is written in the project's own words (Principle VIII). Names may be used.
- Generic code carries no system vocabulary. Book-term status comes from glossary data.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: user story from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: create empty homes for the new sources and scripts, and wire commands

- [x] T001 Create `translations/i18n-exceptions.yaml` with a header comment describing the entry shape `{rule, file?, match, reason}` from data-model §7 and an empty list
- [x] T002 [P] Create `translations/glossary/star-wars-wod.yaml`, `translations/glossary/v5.yaml`, and `translations/glossary/v5-hunter.yaml`, each with a header comment describing the term shape from data-model §3 and an empty list
- [x] T003 [P] Create the empty module skeleton `scripts/i18n-verifier/{config.ts,positions.ts,report.ts,types.ts}` and `scripts/i18n-verifier/rules/index.ts`, exporting a `Rule` type `{ id, area, run(context): Finding[] }` and `Finding`/`AreaSummary` types exactly as in data-model §8
- [x] T004 Add scripts to `package.json`: `"i18n:verify": "node --import tsx scripts/verify-i18n.ts"`; leave `validate:i18n` and `verify:fast` unchanged for now (the verifier is added to `validate:i18n` in T023 and `verify:fast` is wired in T024, so `prebuild` never references a missing script)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: source-format extensions, generated outputs, and shared helpers that every story uses

**⚠️ CRITICAL**: no user story work starts before this phase is complete

### Tests for Foundation

- [x] T005 [P] Write `tests/scripts/translation-source.test.ts`. Use temporary fixture trees under `tests/scripts/fixtures/sources/` and cover:
    - a plural message: `plural: true`, en with 2 `|` forms, ru with 3 forms;
    - string arrays in data YAML;
    - the reserved `_labels` key;
    - glossary loading with duplicate-ref rejection;
    - exceptions loading, where a missing `reason` is an error.
- [x] T006 [P] Write `tests/scripts/build-translations-check.test.ts`: with fixture sources, `--check` exits 1 and lists stale files when the generated output would change; it exits 0 and writes nothing when the output is current
- [x] T007 [P] Write `tests/shared/normalize-search-text.test.ts`:
    - `"Ёж"` and `"еж"` normalize equal;
    - case-insensitive;
    - diacritics are stripped (`"Twi'lek"` still matches `"twi'lek"`);
    - surrounding whitespace is trimmed.
- [x] T008 [P] Write `tests/sheet_manager/catalog-text.test.ts` for the new helpers in `systems/catalogs.ts`:
    - `entryList` returns the localized array or falls back to English;
    - `entryEnumLabel` returns the `_labels` value or falls back to the raw value;
    - `pickSearchText` contains both the localized and the English name.

### Implementation for Foundation

- [x] T009 Extend `scripts/translation-source.ts`:
    - accept `{message, description?, plural?: boolean}` UI leaves and `string[]` data leaves;
    - reserve the `_labels` key in data files, shaped as field → value → text;
    - add `loadGlossary()`, which reads `translations/glossary/*.yaml`, validates `id` uniqueness per file and ref uniqueness across files, and returns terms tagged with their system;
    - add `loadExceptions()`, which reads `translations/i18n-exceptions.yaml` and fails when an entry has no `reason`;
    - export the new shapes as types.
- [x] T010 Extend `scripts/build-translations.ts`:
    - add a `--check` flag that compares every generated output with disk, exits 1 listing stale files, and never writes;
    - generate `src/i18n/generated/bookTerms.ts` (`Record<string, { en: string; ruShort?: string }>` keyed by glossary refs, `en` resolved from the English message or catalog name);
    - emit `_labels` and arrays into `catalogTranslations.ts`;
    - keep plural messages as the raw `|`-joined string in `code.json`.
- [x] T011 Generalize the catalog id check in `scripts/validate-translations.ts` from `attributes` only to every `data/<catalogId>.yaml`. Resolve ids from the plugin catalogs (`src/sheet_manager/systems/star-wars-wod/catalogs.ts`, `src/sheet_manager/systems/v5/modules/hunter/catalogs.ts`) and from the unregistered data arrays listed in research D11 (`abilities`, `forceSkills`, `terminology`). Virtues have no data file yet: T092 first adds `src/data/virtues.ts` (ids, English names, and short descriptions taken from the virtue traits of `src/sheet_manager/systems/star-wars-wod/profile.ts`), and this check resolves `virtues` ids from it. Also check that each array field has the same length as the English array.
- [x] T012 [P] Create `src/shared/utils/normalizeSearchText.ts` (`toLocaleLowerCase`, `ё→е`, NFKD with combining marks removed, trim) so that T007 passes
- [x] T013 Add `entryList(entry, key, lang)`, `entryEnumLabel(catalogId, field, value, lang)`, and `pickSearchText(entry, lang)` to `src/sheet_manager/systems/catalogs.ts`, next to `entryText`; extend `src/data/localizeCatalogEntry.ts` to return arrays and to expose `_labels` lookup so that T008 passes
- [x] T014 [P] Add a plural helper `src/shared/hooks/usePluralMessage.ts`: `usePluralMessage()` returns `(descriptor, count, values?) => string` using Docusaurus `usePluralForm().selectMessage(count, translate(descriptor, { count, ...values }))`
- [x] T015 Run `yarn build:translations` and `yarn test tests/scripts tests/shared tests/sheet_manager/catalog-text.test.ts`; commit the regenerated `src/i18n/generated/*` (bookTerms is still empty)

**Checkpoint**: sources accept plurals, arrays, labels, glossary, and exceptions; `--check` works; helpers exist

---

## Phase 3: User Story 2 — Contributors get a coverage verifier that catches gaps (Priority: P1)

**Goal**: one command reports every translation gap by location; areas are gated one by one

**Independent Test**: quickstart §1 — planted gaps of every kind are reported with locations and exit 1; removing them gives exit 0

### Tests for User Story 2

- [x] T016 [P] [US2] Create the fixture project `tests/scripts/fixtures/i18n-project/`. It needs `src/` with one component per position kind from research D2: JSX text, a user-facing prop, an ignored `className`, a `toast` sink, an object `label` with a `labelMessage` sibling, and a dice-notation literal. It also needs `translations/source/{en,ru}`, `translations/glossary`, `translations/i18n-exceptions.yaml`, and `docs/` plus `i18n/ru/.../current` with one page each. The fixtures should hold one planted gap per rule from contracts/verifier-cli.md.
- [x] T017 [P] [US2] Write `tests/scripts/i18n-verifier/interface.test.ts`:
    - each user-facing position is reported with file and line;
    - each ignored position is not;
    - an object `label` with a sibling `labelMessage` is not reported.
- [x] T018 [P] [US2] Write `tests/scripts/i18n-verifier/sources.test.ts` for the `keys`, `unused`, `identical`, and `plural` rules against the fixture, including placeholder-only messages and exceptions for proper names.
- [x] T019 [P] [US2] Write `tests/scripts/i18n-verifier/content.test.ts` for the `catalog`, `pickers`, `docs`, `docs-terms`, `glossary`, `overflow`, and `exceptions` rules against the fixture.
- [x] T020 [P] [US2] Write `tests/scripts/i18n-verifier/cli.test.ts`:
    - exit codes 0, 1, and 2;
    - a `report`-level area never causes exit 1;
    - `--area`, `--rule`, and `--json` output shapes;
    - the summary table columns `covered/missing/excepted`;
    - a full run over the real repository finishes in under 30 s (SC-008; measured with `performance.now()`, skipped when `CI_SLOW=1`).

### Implementation for User Story 2

- [x] T021 [US2] Implement `scripts/i18n-verifier/config.ts`:
    - the per-area level map with every area at `report`;
    - the user-facing prop list and sink list from research D2;
    - scanned globs (`src/**/*.{ts,tsx}` minus `src/i18n/generated/**` and tests);
    - overflow budgets `{ traitWithSpecialty: 14, trait: 18 }`, marked "calibrate in T074";
    - docs roots including the root `docs/index.mdx`.
- [x] T022 [US2] Implement `scripts/i18n-verifier/positions.ts`, the position classifier for research D2. It takes a `ts.Node` and returns `user-facing | ignored`, with the literal-text heuristics (Latin word ≥ 2 letters, notation regex, URL, CSS value, short all-caps abbreviation).
- [x] T023 [US2] Implement `scripts/i18n-verifier/report.ts` (human and `--json` output, area summary, exit code) and `scripts/verify-i18n.ts`. The entry parses flags, loads sources/glossary/exceptions once, parses each file with `ts.createSourceFile`, runs the rules, applies exceptions, and reports unmatched exceptions as warnings. Then change `validate:i18n` in `package.json` to also run `scripts/verify-i18n.ts` after the two existing scripts.
- [x] T024 [US2] Implement rule `scripts/i18n-verifier/rules/interface.ts` using `positions.ts`, and rule `rules/keys.ts`:
    - `keys` collects `uiMessages.<path>` member chains, `<Translate id>` literals, and `translate({id})` literals;
    - it reports ids missing in any locale and keys present in one locale only.
    - Then wire `verify:fast` in `package.json` to `yarn lint && yarn typecheck && yarn validate:backlog && yarn build:translations --check && yarn validate:i18n`.
- [x] T025 [P] [US2] Implement `scripts/i18n-verifier/rules/unused.ts` (warning only) and `rules/identical.ts`, which flags a ru value equal to the en value for both UI and catalog data unless excepted.
- [x] T026 [P] [US2] Implement `scripts/i18n-verifier/rules/plural.ts`: form counts per locale for `plural: true` messages (en 2, ru 3), the same placeholders in every form, and `(s)` in English messages
- [x] T027 [P] [US2] Implement `scripts/i18n-verifier/rules/catalog.ts`:
    - missing ru `name` is an error; each missing `shortDescription` or `description` is a warning;
    - a catalog whose ru `shortDescription` coverage is below 90% is an error (FR-024, SC-006);
    - array length mismatch;
    - enumerated values used by entries but missing from `_labels`;
    - unknown ids;
    - per-catalog coverage counts for the summary.
- [x] T028 [P] [US2] Implement the structural rule `scripts/i18n-verifier/rules/pickers.ts`:
    - in `src/sheet_manager/**` and `src/data/**`, an object literal with `name` or `label` whose value reads `.name` of a catalog entry, inside a `.map` over catalog entries, must use `pickLabel`/`entryLabel`/`entryText`;
    - a `.filter` whose callback compares option names must call `normalizeSearchText`.
- [x] T029 [P] [US2] Implement `scripts/i18n-verifier/rules/docs.ts`:
    - reuse the page-parity helpers from `scripts/validate-i18n.ts` (export them there);
    - add English-prose detection for ru pages and frontmatter `title`/`sidebar_label`/`description` (Latin words > 50% of the words and ≥ 4 Latin words, outside code fences, imports, and JSX attribute values).
- [x] T030 [P] [US2] Implement `scripts/i18n-verifier/rules/docsTerms.ts` (warning level): for each glossary term with a `ru` form, its first occurrence on a ru page must be followed by ` (<en>)`
- [x] T031 [P] [US2] Implement `scripts/i18n-verifier/rules/glossary.ts`:
    - unresolved refs;
    - `en` ≠ the English text at a ref;
    - the ru text at a ref ≠ `ru` (or ≠ `ruShort` when the ref is a short-form slot);
    - `ruShort` not shorter than `ru`.
- [x] T032 [P] [US2] Implement `scripts/i18n-verifier/rules/overflow.ts`: for each glossary term, find the row kinds where its refs are shown by walking the shipped templates from the plugin registry (`src/sheet_manager/systems/index.ts`): a primitive trait node whose binding has specialties (rendered by `TraitRowWithInput` in `PrimitiveTraitBody`, `src/sheet_manager/features/sheet/declarative/primitives.tsx` around :670) is `traitWithSpecialty`; any other trait or rating node is `trait`. Export this classification as `rowKindOf(node, binding)` from `primitives.tsx`'s pure helpers, or a new `src/sheet_manager/features/sheet/declarative/rowKind.ts`, so the renderer and the rule share it; if `ru.length` exceeds that row kind's budget and `ruShort` is absent, report it
- [x] T033 [US2] Extend `scripts/translation-status.ts` to print the verifier's area summary table after the existing per-locale counts
- [x] T034 [US2] Run `yarn test tests/scripts` until T016–T020 pass. Then run `yarn i18n:verify` on the real repository, tune `positions.ts` against false positives (add fixture cases for each tuned pattern), and save the baseline report to `specs/009-russian-localization-coverage/baseline-report.txt` as the worklist for US1, US3, and US6.

**Checkpoint**: `yarn i18n:verify` prints a full per-area worklist; `verify:fast` runs it in report mode

---

## Phase 4: User Story 1 — Russian reader sees no English interface text (Priority: P1) 🎯 MVP

**Goal**: every interface string in the Russian build comes from YAML in both locales

**Independent Test**: quickstart §2 — route walk in the Russian build shows no English outside exceptions; English build unchanged

### Tests for User Story 1

- [x] T035 [P] [US1] Write `tests/sheet_manager/item-cards-i18n.test.tsx`: render the weapon, armor, inventory, and implant sections (`src/sheet_manager/features/sheet/body/*Section.tsx`) with the `ru` code.json mocked through the existing Docusaurus test stub. Assert that no text node or `aria-label`/`placeholder`/`title` equals its English source message.
- [x] T036 [P] [US1] Write `tests/shared/data-catalog-i18n.test.tsx`: `DataCatalog` search placeholder, "N selected", clear/close/pagination labels, and the empty state come from translation descriptors (render with a ru stub, assert the Russian strings)
- [x] T037 [P] [US1] Write `tests/sheet_manager/plural-messages.test.tsx`: the document manager delete description renders "1 документ", "3 документа", and "5 документов" in ru, and "1 document" / "5 documents" in en

### Implementation for User Story 1

- [x] T038 [P] [US1] Create `translations/source/{en,ru}/ui/site/home.yaml` and migrate `src/pages/index.tsx`: the Layout `title`/`description`, headings, card titles and descriptions, and calls to action go through `translate(uiMessages.site.home.*)`/`<Translate>`
- [x] T039 [P] [US1] Migrate `src/pages/universal_sheet.tsx` and `src/components/NavbarDiceRoller.tsx` into `translations/source/{en,ru}/ui/site/*.yaml`
- [x] T040 [P] [US1] Create `translations/source/{en,ru}/ui/dice/*.yaml` (one file per component group: `panel`, `settings`, `history`, `toast`, `pool`, `inlineRoll`, `sharing`). Migrate every finding under `src/dice_roller/components/**` (`DiceRollerPanel.tsx`, `DiceRollerSettingsModal.tsx`, `DiscordWebhookSubscription.tsx`, `InlineRoll.tsx`, `RollHistory.tsx`, `RollToastContent.tsx`, `dice_pool/**`, `2d_dices/**`) and `src/dice_roller/components/dice-config.ts`.
- [x] T041 [P] [US1] Create `translations/source/{en,ru}/ui/integrations/discord.yaml`. Map the structured delivery errors from `src/integrations/discord/webhook.ts` to messages where they are displayed (the dice roller sharing UI), keeping error codes in code and the text in YAML.
- [x] T042 [P] [US1] Create `translations/source/{en,ru}/ui/shared/*.yaml` and migrate `src/shared/components/DataCatalog.tsx` chrome ('Search...', "N selected" as a plural message, clear search, empty state, "Page X of Y", prev/next and close-detail labels). Also migrate `BottomSheet.tsx`, `SlidePanel.tsx`, `DetailSections.tsx`, `DifficultyTable.tsx`, `EntityCard.tsx`, `EraTags.tsx`, `ScaleChart.tsx`, and `SecretField.tsx`. `searchPlaceholder` stays a prop, and its callers pass translated text.
- [x] T043 [US1] Create `translations/source/{en,ru}/ui/sheet/items.yaml` (T-060). Migrate the weapon, armor, inventory, and implant cards, meaning every string in `src/sheet_manager/features/sheet/body/{Weapons,Armor,Inventory,Implants}Section.tsx` and in the card molecules they render. Move the subtitle strings of `src/sheet_manager/features/sheet/data/bodyEquipmentCatalogs.ts` (`"shots"`, `"Class … | AR …"`) into messages with placeholders.
- [x] T044 [US1] Migrate the remaining findings under `src/sheet_manager/**` into the existing `translations/source/{en,ru}/ui/sheet/*.yaml` files: the controls such as the `CatalogSuggest.tsx` "No matches found", the dialogs, the `StatDot.tsx` dice-button `title`, and the shell. Add new files per component group only when no existing file fits.
- [x] T045 [US1] Convert count messages to plurals: set `plural: true` on `sheet.documents.manager.deleteDescription` and every other `(s)` message reported by the `plural` rule, write 2 en / 3 ru forms, and render them with `usePluralMessage` at each call site (e.g. `src/sheet_manager/components/dialogs/DocumentManagerDialog.tsx:205`)
- [x] T046 [US1] Create `translations/source/{en,ru}/ui/catalogs/<catalog>.yaml` for each `src/data/*Config.tsx`. Replace column headers, filter labels, and detail-section labels with descriptors, and render cell values through `entryText`/`entryEnumLabel` (T013) with `currentLocale`. The files are `abilityConfig`, `armorConfig`, `attributeConfig`, `backgroundsConfig`, `consumableWeaponsConfig`, `creatureConfig`, `forcePowersConfig`, `forceSkillsConfig`, `meleeWeaponsConfig`, `meritsFlawsConfig`, `rangedWeaponsConfig`, `speciesConfig`, `terminologyConfig`, `toolsGearConfig`, and `vehicleConfig`.
- [x] T047 [US1] Update the Star Wars docs pages that pass literal `DataCatalog` filter labels or placeholders, in both `docs/star-wars-wod-2e/**` and `i18n/ru/docusaurus-plugin-content-docs/current/star-wars-wod-2e/**` (e.g. `character/merits-flaws.mdx`), to use exported descriptor-based filter configs from the `*Config.tsx` files instead of literals
- [x] T048 [US1] Record the genuine exceptions (proper names such as Discord and Dark Pack, dice notation examples, brand strings) in `translations/i18n-exceptions.yaml`, each with a reason. Run `yarn build:translations && yarn i18n:verify --area interface` until it reports 0 errors. Then set `interface`, `keys`, `identical`, and `plural` to `error` in `scripts/i18n-verifier/config.ts`.
- [ ] T049 [US1] Run `yarn test` and quickstart §2 in both locales; fix regressions

**Checkpoint**: the Russian interface is complete and the interface gate fails on any new literal

---

## Phase 5: User Story 3 — Pickers show "Русский (English)" names everywhere (Priority: P2)

**Goal**: every catalog picker shows bilingual options, search matches both names, and picked items follow the locale

**Independent Test**: quickstart §3

### Tests for User Story 3

- [x] T050 [P] [US3] Write `tests/sheet_manager/catalog-suggest-search.test.tsx`: `CatalogSuggest` finds entries by the English fragment, the Russian fragment, and an "е" query for an "ё" name; the empty state is translated
- [x] T051 [P] [US3] Write `tests/sheet_manager/equipment-entry-ref.test.ts`:
    - picking a weapon stores `entryRef`;
    - the row displays the localized name while the stored `name` is empty or equals the English name;
    - a user-renamed item keeps its name in both locales;
    - documents without `entryRef` render unchanged;
    - round-trip through export/import keeps `entryRef`.
- [x] T052 [P] [US3] Write `tests/sheet_manager/catalog-browser-search.test.tsx`: `CatalogBrowser` and `DataCatalog` global search match English names in the Russian locale

### Implementation for User Story 3

- [x] T053 [US3] Add optional `entryRef: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/).optional()` to `ItemSchema`, `ArmorItemSchema`, `WeaponItemSchema`, and `ImplantItemSchema` in `src/sheet_manager/types/character.ts`, and to the V5 gear/weapon/armor item shapes in `src/sheet_manager/systems/v5/ruleset/schema.ts`; no version bump
- [x] T054 [US3] Rewrite `buildWeapons/Armor/Inventory/ImplantsCatalog` in `src/sheet_manager/features/sheet/data/bodyEquipmentCatalogs.ts`. They take `locale`, use `pickLabel` for names, `entryText` for subtitles, and the subtitle messages from T043. Pass `locale` from their caller in `src/sheet_manager/features/sheet/declarative/primitives.tsx` (around :456).
- [x] T055 [US3] Update the `find*` helpers in `src/sheet_manager/features/sheet/hooks/useBodyHandlers.ts`. On pick, store `entryRef: "<catalogId>/<entryId>"` together with the English `name` and the copied stats; keep copied numeric fields as today.
- [x] T056 [US3] Add a display-name resolver `resolveItemName(item, locale)` in `src/sheet_manager/features/sheet/data/itemDisplay.ts`. It returns the localized entry name when `entryRef` is set and `name` is empty or equals the entry's English name, and otherwise returns `name`. Use it in the four body sections and in the declarative equipment rows in `primitives.tsx`.
- [x] T057 [US3] Switch `src/sheet_manager/components/controls/CatalogSuggest.tsx` filtering to `normalizeSearchText` over `pickSearchText` (or over the option name when options are plain strings)
- [x] T058 [P] [US3] Use `normalizeSearchText` in `src/sheet_manager/features/sheet/declarative/rowsCatalog.ts` (replace the local `trim().toLocaleLowerCase()` at :14)
- [x] T059 [P] [US3] Make `src/sheet_manager/features/docs/CatalogBrowser.tsx` and the `entryLabel` list in `src/sheet_manager/docsEmbeds.tsx` (around :254) search on `pickSearchText`, and in the Russian locale show `pickLabel` in picker contexts while keeping `entryLabel` for the table name column
- [x] T060 [P] [US3] Give `src/shared/components/DataCatalog.tsx` a custom `globalFilterFn`: it applies `normalizeSearchText` and also matches an optional `searchText(item)` prop, which callers fill with both names. Pass `searchText` from each `src/data/*Config.tsx` catalog.
- [ ] T061 [US3] Replace the plain select used for catalog selects in `src/sheet_manager/features/sheet/declarative/fieldControls.tsx:180` with the searchable `CatalogSuggest` when an option list has more than 12 entries (bilingual labels already come from `declarative/hooks.ts:549-555`)
- [x] T062 [US3] Run `yarn i18n:verify --rule pickers` until it reports 0 errors, then set `pickers` to `error` in `scripts/i18n-verifier/config.ts`. Run `yarn test` and quickstart §3.

**Checkpoint**: all pickers are bilingual and searchable by both names; picked items follow the locale

---

## Phase 6: User Story 4 — A veteran of English books recognizes terms without clutter (Priority: P2)

**Goal**: on-demand English hint on glossary-term labels, one-time notice, "Game terms" preference, and a term link that survives renaming

**Independent Test**: quickstart §4 and §5

### Tests for User Story 4

- [x] T063 [P] [US4] Write `tests/sheet_manager/resolve-term.test.ts` covering every row of the truth table in contracts/term-hint.md, plus the `en` locale
- [x] T064 [P] [US4] Write `tests/sheet_manager/term-hint.test.tsx`:
    - a hover with 300 ms dwell opens the popover showing the English name;
    - focus opens it and Escape closes it;
    - a tap toggles it;
    - clicks on dots or input inside the row never open it;
    - exactly one popover element exists after opening three different labels;
    - labels have `tabindex="0"` and `aria-describedby` pointing to their visually hidden English name only when hints are on;
    - a custom trait without a ref has no attributes;
    - the `en` preference swaps label and hint.
- [x] T065 [P] [US4] Write `tests/shared/reader-prefs-store.test.ts`: defaults, persistence round-trip, corrupt storage falls back to defaults, a throwing `localStorage` does not crash
- [x] T066 [P] [US4] Write `tests/sheet_manager/template-term-link.test.ts`:
    - a rename through `updateField`/`updateNode` in `draft.ts` moves `labelMessage` into `termRef`;
    - a second rename keeps it;
    - switching to a custom source in `sourceNodes.ts` clears both;
    - the `termHint` toggle persists;
    - `serializeTemplateFile` → import round-trip keeps `termRef` and `termHint`;
    - old templates without the fields still parse.
- [x] T067 [P] [US4] Write `tests/sheet_manager/term-hint-notice.test.tsx`:
    - the notice shows once in `ru` with hints on;
    - dismissing it persists the flag;
    - "Show tip again" clears the flag;
    - it never shows in `en` or `ru-plain`.
- [x] T068 [P] [US4] Write `tests/sheet_manager/term-hint.perf.test.tsx`: render the largest shipped sheet (Star Wars character full view) 20 times with hints on and off under React Profiler and log the ratio (assert < 1.5 to catch gross regressions; the 1.05 target is checked manually in quickstart §5)

### Implementation for User Story 4

- [x] T069 [US4] Create `src/shared/store/readerPrefsStore.ts` per data-model §6: zustand `persist` with `createJSONStorage(() => localStorage)`, key `ttgamer-reader-prefs`, version 1, and try/catch-safe storage. Add a `useGameTerms()` selector hook.
- [x] T070 [US4] Add `termRef` (reuse `LabelMessageSchema`) and `termHint: z.literal(false).optional()` to `fieldBaseShape` and `PrimitiveNode` (TS interface and zod) in `src/sheet_manager/types/template.ts`; keep `TEMPLATE_SCHEMA_VERSION` at 3
- [x] T071 [US4] Create `src/sheet_manager/components/terms/resolveTerm.ts` (pure, per the truth table, reading `bookTerms` from `@site/src/i18n/generated/bookTerms`) and `src/sheet_manager/components/terms/TermLabel.tsx` (DOM contract from contracts/term-hint.md: `data-term-ref`, `tabIndex`, `aria-describedby` + visually hidden English-name span with an id from `useId`, `.term-full`/`.term-short` spans, no hooks except reading the preference from context)
- [x] T072 [US4] Create `src/sheet_manager/components/terms/TermHintProvider.tsx`:
    - delegated `pointerover`/`pointerout`/`focusin`/`focusout`/`click`/`keydown(Escape)` listeners on its root, matching only `[data-term-ref]`;
    - a single lazily mounted Radix `Popover` with a virtual anchor, styled like the `CatalogSuggest.tsx` content (`z-50 bg-bgSurface border border-border rounded-lg shadow-xl`);
    - a context that provides `{ gameTerms, locale }` to `TermLabel`.
- [x] T073 [US4] Pass the preference into `src/sheet_manager/features/sheet/declarative/localizeTemplate.ts`: `localizeTemplate(template, locale, gameTerms)` keeps the English label for nodes whose effective ref (`termRef ?? labelMessage`) is in `bookTerms` when `gameTerms === 'en'`, and keeps the ref on the localized node so that `TermLabel` can resolve the hint. Update the call in `DeclarativeSheetView.tsx:598-600`.
- [x] T074 [US4] Fix the bridge in `src/sheet_manager/features/sheet/declarative/DeclarativeSheetView.tsx:78-87` so that `labelMessage`, `termRef`, and `termHint` are forwarded to the `PrimitiveNodeView`. Render the plain field label (around :163-179) through `TermLabel`.
- [x] T075 [US4] Render labels through `TermLabel` in `src/sheet_manager/components/stat-fields/StatLabel.tsx` (replace the `<span>` at :17), in `CompactRating` in `src/sheet_manager/components/stat-fields/CompactSheetFields.tsx`, and in the resource rows in `src/sheet_manager/features/sheet/declarative/primitives.tsx` (around :778, :792). Thread `termRef`/`termHint` from `PrimitiveTraitBody` (around :593-693).
- [x] T076 [US4] Wrap every sheet view in `TermHintProvider`: the full and brief views in `src/sheet_manager/features/sheet/shell/SheetWorkspace.tsx`, and the docs embeds (`TemplateFragment`, `TemplatePreview`) in `src/sheet_manager/docsEmbeds.tsx`
- [x] T077 [US4] Create `src/sheet_manager/components/terms/TermHintNotice.tsx` and `src/sheet_manager/features/sheet/shell/GameTermsMenu.tsx` (Radix popover menu with the three options and "Show tip again"). Add the menu to `SheetToolbar.tsx`/`SheetWorkspace.tsx` next to `ViewModeSelect`. Show the notice above the first sheet view. Put the strings in `translations/source/{en,ru}/ui/sheet/terms.yaml`.
- [x] T078 [US4] Keep the term link in the template editor. In `src/sheet_manager/components/dialogs/template-editor/draft.ts` (`updateNode` around :277-285, `updateField` around :647-654), set `termRef = node.termRef ?? node.labelMessage` before deleting `labelMessage`. In `sourceNodes.ts:67`, also delete `termRef` and `termHint`.
- [x] T079 [US4] Add to `src/sheet_manager/components/dialogs/template-editor/FieldEditor.tsx` (after the "Show label" `ToggleRow` at :136-142) and `PrimitiveConfig.tsx` (after the label override at :70-80): a read-only "Book term: <en>" line and a "Show book name hint" toggle bound to `termHint`, both visible only when the effective ref is in `bookTerms`. Put the strings in `translations/source/{en,ru}/ui/sheet/templates.yaml`.
- [x] T080 [US4] Add the `.term-label` styles to `src/css/set_tailwind_styles.scss`: `cursor: help` under `@media (hover: hover)` only when `[data-term-ref]` is present, a focus-visible ring using the palette variables, and no underline or color change. Run `yarn build:styles`.
- [x] T081 [US4] Seed the glossary refs needed for hints. Fill `translations/glossary/v5.yaml` (attributes and skills from `src/sheet_manager/systems/v5/ruleset/profile.ts`) and `translations/glossary/v5-hunter.yaml` (Hunter trait labels) with `id`, `en`, `ru` (copied from the current ru YAML), and `refs`. Run `yarn build:translations` so that `bookTerms.ts` is filled.
- [ ] T082 [US4] Run `yarn test` and quickstart §4–§5, including the Network check and the manual performance comparison; record the measured ratio in `specs/009-russian-localization-coverage/quickstart.md` under a "Results" heading

**Checkpoint**: Hunter sheets show hints; renaming keeps them; the preference and notice work

---

## Phase 7: User Story 5 — Long Russian labels fit their rows (Priority: P2)

**Goal**: every trait row keeps a usable specialization input; overflowing terms use glossary short forms

**Independent Test**: quickstart §6

### Tests for User Story 5

- [x] T083 [P] [US5] Write `tests/sheet_manager/term-short-form.test.tsx`: `TermLabel` renders both `.term-full` and `.term-short` when `ruShort` exists, the short span is `aria-hidden`, and the hint then includes the full Russian name
- [x] T084 [P] [US5] Extend `tests/sheet_manager/template-labels.test.ts`: every shipped trait node in the Star Wars and V5 templates has an effective ref listed in the glossary, and `yarn i18n:verify --rule overflow` logic (imported from `scripts/i18n-verifier/rules/overflow.ts`) reports nothing for the shipped templates

### Implementation for User Story 5

- [x] T085 [US5] Change the row layout in `src/sheet_manager/components/stat-fields/TraitRow.tsx`: the label container gets `min-w-0` and wraps at most 2 lines; `TraitRowWithInput` (around :136-161) makes the specialization input `min-w-[8ch]` instead of `min-w-5`; the rows become `@container` elements (class `term-row`)
- [x] T086 [US5] Add container-query rules to `src/css/set_tailwind_styles.scss`: `.term-row` shows `.term-short` and hides `.term-full` below the threshold width for each row kind (thresholds derived from the budgets in `scripts/i18n-verifier/config.ts`; document the numbers in a comment). Run `yarn build:styles`.
- [x] T087 [US5] Calibrate the budgets. At 360 px width open every shipped sheet: Star Wars character, creature, fodder, and vehicle, and Hunter full and brief. Find the longest label that still keeps 8 visible characters in the specialization input, then update `overflow` budgets in `scripts/i18n-verifier/config.ts` and the thresholds from T086.
- [x] T088 [US5] Add `ruShort` in `translations/glossary/*.yaml` for every term the `overflow` rule reports (including `animal-ken`). Propose each short form with a `note` for the maintainer review in T100. Rebuild translations, then set `overflow` to `error` in `scripts/i18n-verifier/config.ts`.
- [x] T089 [US5] Run quickstart §6 on a real phone or in devtools at 360 px and fix any row that still squeezes the input

**Checkpoint**: no trait row squeezes its specialization input; "Обращение с животными" shows its short form with the full name in the hint

---

## Phase 8: User Story 6 — Catalog content and terminology are consistent in Russian (Priority: P3)

**Goal**: Star Wars catalogs have Russian names, short descriptions, and enumerations; one reviewed glossary governs every source

**Independent Test**: quickstart §7

### Tests for User Story 6

- [x] T090 [P] [US6] Write `tests/sheet_manager/star-wars-catalog-i18n.test.ts`: every registered Star Wars catalog, plus `abilities`, `force-skills`, `virtues`, and `terminology`, has a ru `name` for every entry, and ru `shortDescription` coverage ≥ 90% (compute it from `catalogTranslations`)
- [x] T091 [P] [US6] Write `tests/sheet_manager/star-wars-trait-labels.test.ts`: the Star Wars character template gives abilities, virtues, and Force skills catalog `labelMessage` refs, and they render Russian in the `ru` locale

### Implementation for User Story 6

- [x] T092 [P] [US6] Create `src/data/virtues.ts` (see T011) and `translations/source/{en,ru}/data/{abilities,force-skills,virtues}.yaml` (`name`, `shortDescription`, `specialties[]`, `scale[]`), and `attributes.yaml` short descriptions. The en files mirror the English data in `src/data/abilities.ts` and `src/data/forceSkills.ts` and the virtue list in the Star Wars profile.
- [x] T093 [P] [US6] Create `translations/source/{en,ru}/data/{species,backgrounds}.yaml` with `name`, `shortDescription`, `_labels.category`, and `_labels.era`. Where a reviewed own-words paraphrase is ready, include `description`.
- [x] T094 [P] [US6] Create `translations/source/{en,ru}/data/merits-flaws.yaml` with `name`, `shortDescription`, `_labels.category`, `_labels.tags`, `restriction`, and `implantType` for all ~134 entries; `description` and `implantEffect` only where paraphrased
- [x] T095 [P] [US6] Create `translations/source/{en,ru}/data/{force-powers,melee-weapons,ranged-weapons,consumable-weapons,armor,tools-gear}.yaml` with `name`, `shortDescription`/`notes`, `effect`, and `_labels` for `category`/`type`
- [x] T096 [P] [US6] Create `translations/source/{en,ru}/data/{vehicles,creatures}.yaml` with `name`, the short text fields (`model`, `category`, `crew`, `passengers`, `cargo`, `consumables`, `type`, `size`, `movement`), nested weapon, attack, and trait names under dotted keys, and `_labels.era`
- [x] T097 [US6] Give abilities, virtues, and Force skills in `src/sheet_manager/systems/star-wars-wod/templates/character.ts` a `labelMessage` of `catalog:<catalog>/<id>` (extend `withLabelMessages` around :651-669 and `ABILITY_GROUPS` around :77-130). Do the same in `creature.ts`, `fodder.ts`, and `vehicle.ts` where they show these traits.
- [x] T098 [US6] Fill `translations/glossary/star-wars-wod.yaml`: seed it from `src/data/terminologyData.ts` (81 pairs), add attributes, abilities, virtues, Force skills, and Force powers with refs to their catalog entries, and fill every ref the `glossary` rule reports as unresolved
- [x] T099 [US6] Draft the V5/Hunter terminology proposals (T-061) in `translations/glossary/v5.yaml` and `v5-hunter.yaml`: module name, Storyteller, Touchstones, Edges/Perks, Creed/Drive, Advantages, gear names. Each proposal gets a `note` with the reasoning, and alternatives are listed in the note.
- [ ] T100 [US6] **Maintainer review** of all three glossary files: go through each term and its `note`, decide `ru` and `ruShort`, remove the notes that were only proposals, and update every ref the `glossary` rule reports so that the sources match the decisions. Then set `glossary` and `catalog` to `error` in `scripts/i18n-verifier/config.ts`.
- [ ] T101 [US6] Russian docs first mentions: fix every `docs-terms` warning in `i18n/ru/docusaurus-plugin-content-docs/current/**` by writing the first mention as "ru (en)"; resolve every `docs` finding; set `docs` and `docs-terms` to `error`
- [ ] T102 [US6] Run `yarn test`, `yarn i18n:status` (catalog coverage: 100% names, ≥ 90% short descriptions), and quickstart §7

**Checkpoint**: every area in `scripts/i18n-verifier/config.ts` is at `error`, except `unused` (warnings by design)

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T103 [P] Update `.agents/skills/ui-i18n/SKILL.md`:
    - the verifier and its rules;
    - exception list governance;
    - plurals with `usePluralMessage`;
    - arrays and `_labels` in data YAML;
    - the glossary and `bookTerms`;
    - `normalizeSearchText`;
    - "never read `entry.name` for display".
- [x] T104 [P] Update `.agents/skills/sheet-templates/SKILL.md` and `src/sheet_manager/AGENTS.md`: `termRef`/`termHint`, `TermLabel`/`TermHintProvider`, and the rule that book-term status comes from glossary refs. Also update `.agents/skills/sheet-manager/SKILL.md`: item `entryRef` and `resolveItemName`.
- [x] T105 [P] Update `.agents/skills/mdx-documentation/SKILL.md` (first-mention "ru (en)" rule, descriptor-based catalog embeds) and root `AGENTS.md` (the `verify:fast` now includes i18n checks)
- [x] T106 [P] Update `TODO.md`:
    - mark T-021, T-060, T-062, and T-023 done;
    - mark T-022 done, with a sub-note that long descriptions are tracked in `yarn i18n:status`, or keep it 🟡 with that note if coverage < 100%;
    - mark T-061 done after T100;
    - add a follow-up entry for long catalog descriptions if any remain.
    - Then run `yarn validate:backlog`.
- [x] T107 [P] Bump the `package.json` minor version and add a `CHANGELOG.md` entry covering:
    - the Russian interface;
    - the translation verifier;
    - bilingual pickers;
    - book-term hints and the "Game terms" preference;
    - short forms;
    - the Star Wars catalogs in Russian.
- [x] T108 Own-words audit of the new Russian catalog text in `translations/source/ru/data/*.yaml` against the Star Wars sources in `context/` (Principle VIII): rewrite any sentence that follows book wording
- [ ] T109 Run `yarn prettier --write` on changed files, then `yarn validate:data`, `yarn validate:i18n`, `yarn audit:dead-code` (review only), and `yarn verify:full`
- [ ] T110 Run the full quickstart.md (§1–§8) in both locales and record the results at the bottom of `specs/009-russian-localization-coverage/quickstart.md`; delete `baseline-report.txt`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories
- **US2 (Phase 3)** depends on Phase 2. Its baseline report (T034) is the worklist for US1, US3, and US6.
- **US1 (Phase 4)** depends on US2 (interface and keys rules for measuring progress) and on T013/T014.
- **US3 (Phase 5)** depends on Phase 2 (`normalizeSearchText`, `pickSearchText`) and on T043 (subtitle messages); independent of US4 and US5.
- **US4 (Phase 6)** depends on Phase 2 (`bookTerms` generation) and on US2 T031 (glossary rule, for T081); independent of US1 and US3.
- **US5 (Phase 7)** depends on US4 (`TermLabel`, glossary refs).
- **US6 (Phase 8)** depends on US1 T046 (Config cells through `entryText`) and on US2. T100 (maintainer review) gates only the `glossary`/`catalog` levels.
- **Polish (Phase 9)** after all stories.

### Within Each User Story

- Tests first and failing, then schema, then pure logic, then components, then wiring, and finally the gate level flip
- Run `yarn build:translations` after each YAML change before running tests

### Parallel Opportunities

- Phase 1: T002, T003
- Phase 2: tests T005–T008; T012 and T014 alongside T009–T011
- US2: tests T016–T020; rules T025–T032 after T021–T024
- US1: tests T035–T037; module batches T038–T042 in parallel; T043–T047 in sequence
- US3: tests T050–T052; T058, T059, and T060 in parallel after T057
- US4: tests T063–T068; T069 and T070 in parallel, then T071–T081
- US6: tests T090–T091; catalog YAML batches T092–T096 in parallel
- US3, US4, and US1 can proceed in parallel once US2 has landed
- Polish: T103–T107

---

## Parallel Example: User Story 1

```text
# Tests (fail first)
T035 item-cards-i18n.test.tsx   T036 data-catalog-i18n.test.tsx   T037 plural-messages.test.tsx

# Module batches (different YAML domains and source trees)
T038 site/home   T039 site/*   T040 dice/*   T041 integrations/discord   T042 shared/*
```

## Parallel Example: User Story 6

```text
T092 abilities/force-skills/virtues   T093 species/backgrounds   T094 merits-flaws
T095 weapons/armor/gear/force-powers  T096 vehicles/creatures
```

---

## Implementation Strategy

### MVP first (US2 + US1)

1. Phase 1 + Phase 2
2. Phase 3 (US2): the verifier in report mode, with a baseline worklist
3. Phase 4 (US1): complete Russian interface; interface gates switched to `error`
4. Stop and validate: quickstart §1–§2. The Russian build ships without English UI text.

### Incremental delivery

1. US3 (pickers) → quickstart §3
2. US4 (hints) → quickstart §4–§5, then US5 (short forms) → §6
3. US6 (catalogs + glossary review) → §7. The glossary review (T100) can happen whenever the maintainer is available; until then the `glossary` area stays at `report`.
4. Each increment ends with `yarn verify`; the last one with `yarn verify:full` and the full quickstart

---

## Notes

- [P] tasks touch different files and have no unfinished dependencies
- Commit after each task or logical group; no attribution lines in commits
- Never copy book text, official Russian translations included; names only (Principle VIII)
- Any fallback, rejected write, or unresolved reference in sheet code must call `reportSheetIssue`
- Do not lower an area from `error` back to `report` without a note in the commit message
