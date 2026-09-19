# Implementation Plan: Complete Russian Localization with Verified Coverage

**Branch**: `009-russian-localization-coverage` (work currently on `testing`) | **Date**: 2026-09-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-russian-localization-coverage/spec.md`

## Summary

Finish the Russian build and make its coverage provable. A new **translation coverage verifier**
parses `src/` with the TypeScript compiler API and also checks the YAML sources, catalog data, docs,
and a new **glossary**. It reports every gap by location, and each area moves from report mode to a
failing gate once its migration batch lands. The remaining interface strings (home page, dice
roller, shared components, catalog configs, equipment cards) move into the YAML sources. Russian
plurals are added. Every catalog picker switches to "Русский (English)" with ё/е-insensitive
search. The Star Wars catalogs get Russian names, short descriptions, and enumerations. For
veterans of the English books, labels that are glossary terms get an **on-demand English hint**:
one delegated popover per sheet, no persistent marker, a one-time notice, and a "Game terms"
preference. Each such label keeps a **term link** that survives renaming in the template editor
and has a per-field hint switch. Long labels get glossary **short forms** through a CSS container
query, and the specialization input gets a minimum width.

## Technical Context

**Language/Version**: TypeScript ~6.0 (strict), React 19, MDX (Docusaurus 3.10.1), Node scripts run with `tsx`

**Primary Dependencies**: Docusaurus i18n (`translate`, `<Translate>`, `usePluralForm`), `typescript`
compiler API (already a devDependency), `yaml`, Radix Popover (already used), Zustand 5, Zod 3, Tailwind

**Storage**: translations and glossary as YAML in the repository; reader preferences in `localStorage`;
documents and templates unchanged in IndexedDB (optional fields only, no version bump)

**Testing**: Vitest (`yarn test`), verifier fixture tests, `yarn validate:i18n`, `yarn verify:full`,
manual quickstart walk in both locales

**Target Platform**: static web site, desktop and mobile browsers, offline-first

**Project Type**: single web application (Docusaurus site with React modules) plus Node build scripts

**Performance Goals**: verifier full scan < 30 s (SC-008); hints add ≤ 5% sheet render time and 0
network requests (SC-009); no new runtime dependency

**Constraints**: no second localization runtime (T-021); Russian text only under `translations/` and
`i18n/ru/`; catalog prose in the project's own words (Principle VIII, T-037); no migration of edited
templates (clarification Q3)

**Scale/Scope**: ~45 `.tsx` files and ~50 `.ts` files with literals; 15 Star Wars catalogs (~345K
characters, of which names/short descriptions/enumerations are in scope as a gate); ~300 glossary
terms; 71 docs pages per locale; 6 shipped sheet templates

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                       | Check                                                                                                                                                                                                                                                                                                  | Status |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| I. Modular Semi-Autonomy        | Hint components live in `sheet_manager/components/terms`; reader prefs and search normalization in `shared` (no feature imports); the verifier is a standalone script; dice and site strings stay in their modules' YAML domains. No system-specific conditionals: book terms come from glossary data. | ✅     |
| II. Explicit Contracts          | New YAML shapes (plural, arrays, `_labels`, glossary, exceptions) validated at build; template `termRef`/`termHint` and item `entryRef` added to Zod schemas; contracts in `contracts/`.                                                                                                               | ✅     |
| III. Pleasurable Interactions   | Picker → sheet row keeps the entry ref, so the name follows the locale; the notice links to the preference; errors from the verifier are actionable, with file and line.                                                                                                                               | ✅     |
| IV. Code Quality                | Pure `resolveTerm` and `normalizeSearchText`; one provider instead of per-label logic; the verifier's position rules in one module.                                                                                                                                                                    | ✅     |
| V. Risk-Proportional Testing    | Schema edits (template, items) → round-trip and import/export tests; verifier fixture tests per rule; `resolveTerm` truth-table tests; provider interaction tests; shipped-template label tests extended; perf comparison test.                                                                        | ✅     |
| VI. Consistent, Accessible      | The feature _is_ this principle's i18n rule, now enforced. Hint is keyboard reachable, uses `aria-describedby`, Escape closes; Radix popover; Lucide only if an icon is needed (none planned). Spec and plan English-only.                                                                             | ✅     |
| VII. Performance                | No per-label components; the popover is created on first use; container-query CSS instead of measuring; the generated `bookTerms` map is small (~300 entries); `verify:full` required (new shared store and generated file).                                                                           | ✅     |
| VIII. Third-Party Material      | Russian catalog text is paraphrased; long descriptions without a reviewed paraphrase fall back to English; no official Russian translations are copied; trait names are allowed.                                                                                                                       | ✅     |
| Governance (current-state docs) | `AGENTS.md`, `src/sheet_manager/AGENTS.md`, and the i18n/sheet skills describe the verifier, glossary, `TermLabel`, and the new YAML shapes; TODO entries T-021/022/023/060/061/062 are updated when their slices land.                                                                                | ✅     |

**Post-design re-check (after Phase 1)**: still ✅. One tradeoff is recorded, not a violation. Hint
labels become tab stops while hints are on (research D6); the constitution requires keyboard reach,
and "Russian without hints" removes the stops. The reader preference uses `localStorage` instead of
IndexedDB (research D8). This is in line with Principle VII, whose IndexedDB rule covers character
and history data. Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/009-russian-localization-coverage/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── verifier-cli.md
│   ├── term-hint.md
│   └── translation-sources.md
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
scripts/
├── build-translations.ts            + --check mode, bookTerms.ts generation, plural/array/_labels support
├── translation-source.ts            + glossary + exceptions loaders, array leaves, plural flag
├── validate-translations.ts         catalog id check generalized from `attributes` to every catalog
├── validate-i18n.ts                 + root docs/index.mdx
├── translation-status.ts            + verifier coverage table
├── verify-i18n.ts                   NEW entry
└── i18n-verifier/                   NEW
    ├── config.ts                    area levels, prop/sink lists, globs, overflow budgets
    ├── positions.ts                 user-facing position rules (research D2)
    ├── report.ts                    findings, summary table, --json
    ├── types.ts                     Rule, Finding, AreaSummary
    └── rules/{interface,keys,identical,plural,catalog,pickers,docs,docsTerms,glossary,overflow,exceptions}.ts

translations/
├── source/{en,ru}/ui/{site,dice,shared,integrations,catalogs}/**.yaml    NEW domains
├── source/{en,ru}/ui/sheet/items.yaml                                  NEW (T-060)
├── source/{en,ru}/data/<15 Star Wars catalogs>.yaml                    NEW
├── glossary/{star-wars-wod,v5,v5-hunter}.yaml                          NEW
└── i18n-exceptions.yaml                                                NEW

src/i18n/generated/bookTerms.ts      NEW generated
src/shared/
├── store/readerPrefsStore.ts        NEW
├── utils/normalizeSearchText.ts     NEW
└── components/DataCatalog.tsx       chrome strings via YAML; normalized global filter
src/pages/index.tsx                  translated
src/data/*Config.tsx                 headers/filters as descriptors; cells via entryText/entryEnumLabel
src/dice_roller/components/**        strings via YAML
src/integrations/discord/**          user-facing errors via YAML
src/sheet_manager/
├── types/template.ts                + termRef, termHint
├── systems/catalogs.ts              + entryList, entryEnumLabel; pickLabel search text
├── systems/star-wars-wod/templates/character.ts   abilities/virtues/Force skills get catalog labelMessage
├── components/terms/                NEW TermHintProvider, TermLabel, resolveTerm, TermHintNotice
├── components/stat-fields/{StatLabel,TraitRow}.tsx   TermLabel; min-w-0 label, min-w-[8ch] input
├── components/controls/CatalogSuggest.tsx            normalized search; translated empty state
├── components/dialogs/template-editor/{draft,sourceNodes,FieldEditor,PrimitiveConfig}.ts(x)  term link + hint toggle
├── features/sheet/declarative/{localizeTemplate,DeclarativeSheetView,primitives,rowsCatalog}.ts(x)  prefs, bridge fix, TermLabel
├── features/sheet/data/bodyEquipmentCatalogs.ts      pickLabel/entryText, translated subtitles
├── features/sheet/hooks/useBodyHandlers.ts           entryRef on pick
├── features/sheet/shell/{SheetWorkspace,SheetToolbar,GameTermsMenu}.tsx  provider, notice, menu
└── features/docs/CatalogBrowser.tsx                  pickLabel search text
src/css/set_tailwind_styles.scss     .term-label container query rules

i18n/ru/docusaurus-plugin-content-docs/current/**      first-mention "ru (en)"; catalog embeds with descriptors
docs/star-wars-wod-2e/**/*.mdx                         catalog embeds pass descriptors instead of literals
package.json                                           i18n:verify script; verify:fast gains i18n checks

tests/
├── scripts/i18n-verifier/*.test.ts          NEW fixture per rule (planted gaps), exceptions, exit codes
├── sheet_manager/term-hint.test.tsx         NEW provider interactions, a11y attributes, prefs modes
├── sheet_manager/resolve-term.test.ts       NEW truth table
├── sheet_manager/term-hint.perf.test.tsx    NEW hints on/off comparison (reported)
├── sheet_manager/template-term-link.test.ts NEW rename keeps termRef; export/import round-trip
├── sheet_manager/equipment-entry-ref.test.ts NEW localized display vs. user override
├── shared/normalize-search-text.test.ts     NEW
└── sheet_manager/template-labels.test.ts    extended: every shipped trait has a glossary ref

AGENTS.md, src/sheet_manager/AGENTS.md, .agents/skills/{sheet-templates,sheet-manager,mdx-documentation}/SKILL.md
```

**Structure Decision**: single Docusaurus web project. The verifier sits in `scripts/` beside the
existing translation scripts and reuses their loaders. Translation data stays in `translations/`, with
the glossary and exceptions next to `source/`. Runtime hint code is a small `terms/` component group
inside `sheet_manager`, and the only cross-module pieces (reader prefs, search normalization) go to
`shared`.

## Delivery Slices

1. **Verifier and worklist**: verifier with all rules in `report` mode, exception list, `--check` build,
   `verify:fast` wiring, plural support, `normalizeSearchText`, glossary loader plus a seed glossary.
   → Quickstart §1 (with areas in report mode), §8. This produces the per-area worklist for the
   other slices.
2. **Interface coverage (T-021, T-060)**: home page, dice roller, shared (`DataCatalog`), integrations,
   sheet_manager leftovers, equipment cards, catalog config headers; plurals. Flip `interface`, `keys`,
   `identical`, and `plural` to `error`. → §2.
3. **Pickers (T-062)**: legacy equipment builders onto `pickLabel`, `entryRef`, normalized search
   everywhere, `CatalogBrowser` search text. Flip `pickers`. → §3.
4. **Term hint**: `bookTerms` generation, `TermLabel`/provider/notice/menu, reader prefs, term link
   and editor toggle, bridge fix, row min widths, short forms, Star Wars trait refs. Flip `overflow`.
   → §4–§6.
5. **Catalog data and terminology (T-022, T-061)**: Star Wars catalog YAML (names, short descriptions,
   enumerations, arrays), glossary review with the maintainer, docs first mentions and catalog embed
   descriptors. Flip `catalog`, `glossary`, `docs`, `docs-terms`. → §7.

Slices 2–4 can overlap once slice 1 has landed. Slice 5's glossary review blocks only the
`glossary` gate, not the other slices.

## Risks

| Risk                                                                                     | Mitigation                                                                                                                                      |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| The interface rule is noisy (false positives on identifiers) and people stop trusting it | Start in report mode; tune `positions.ts` against the real codebase in slice 1 before gating; fixture tests for known non-user-facing positions |
| Star Wars catalog volume (345K chars) stalls slice 5                                     | The gate covers names, short descriptions, and enumerations only; long descriptions are tracked in the report, not gated                        |
| Glossary review by the maintainer takes longer than the code                             | The `glossary` rule stays in report mode until the review ends; the other slices do not depend on it                                            |
| Short-form thresholds are wrong on real devices                                          | Budgets are calibrated once at 360 px on shipped sheets and kept in the verifier config; the container query uses the same numbers              |
| Hint tab stops annoy keyboard users                                                      | "Russian without hints" removes them; revisit if feedback says so                                                                               |
| `entryRef` display rule surprises users who typed the exact English name on purpose      | Rule documented in the sheet skill; the stored name is never overwritten                                                                        |

## Scaling Notes

- The verifier and glossary are locale-agnostic: another locale adds a `source/<locale>` tree and a
  glossary column without code changes, apart from its plural form count.
- Book-term status is data (glossary refs), so new systems (VtM 5e, T-039) get hints by adding
  glossary entries.
- Deferred with owners: long catalog descriptions (T-022 follow-up in the coverage report),
  moving Star Wars docs catalogs onto `CatalogBrowser` (T-047), an ESLint front-end for the
  interface rule (optional, T-023 follow-up).

## Complexity Tracking

No constitution violations; nothing to justify.
