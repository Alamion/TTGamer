# Changelog

## v3.3.0

### Major feat

- **Vehicle Catalog**: add `src/data/vehicleData.ts` (200+ entries) + `vehicleConfig.tsx` with scale badges, stat display, weapon details, and full detail panel; new `vehicles-list.mdx` doc (en/ru)
- **Implant system**: extend `meritsFlawsData.ts` with 12 cybernetic implant entries (`Implant` type, `implantType`, `implantEffect` fields) — limb, sensory, neural, dermal, combat, communication, life support, respiratory
- **Data Catalog improvements**: add `defaultHiddenColumnIds` prop for column visibility; `isMobile`/`isSmallScreen` responsive page size; reset pagination on screen resize; memoized filter configs; improved detail panel state management
- **Sheet manager `useCharacter` hook**: new unified hook combining Zustand store + CharacterContext; removes all inline `if (readOnly) return` guards from 9 sheet blocks; adds `readOnly` guard inside updateCharacter
- **BaseBlock species autocomplete**: integrate `CatalogSuggest` with species data from `speciesData.ts` for quick species selection
- **Homepage redesign**: replace "Work in Progress" badge with "Active Development — v3.3.0"; update feature cards (3D Dice Roller, Character Sheet, Documentation); remove badge labels; clean up CTA; add v3.3.0 status line with doc count and tech stack
- **New shared components**: `DetailSections.tsx` (`SpecialtiesList`, `ScaleList`), `EraTags.tsx` (era badge groups)
- **Shared data filters**: `dataFilters.ts` with `arrayIncludesAnyFilterFn` and `booleanFilterFn` for TanStack table

### Minor feat

- **Empty character name default**: change `createDefaultCharacter` `name` from `'New Character'` to `''` (placeholder-driven UX)
- **Roll logging refactor**: remove `setupRollLogging()` from shared logging; inline roll subscription in `Root.tsx` via `onRollResult` + `info()`
- **Import path cleanup**: remove all `.ts`/`.tsx` extensions from sheet manager imports; migrate relative paths to `@site` aliases in `Root.tsx` and `DiceRollerPanel.tsx`
- **InlineRoll prop rename**: `hideForced` → `showForced` (inverted default behavior — forced values hidden by default unless opted in)
- **Remove unused `getRandomValues`**: delete `crypto.getRandomValues` wrapper from `shared/utils/random.ts`
- **3D dice physics**: comment out CCD threshold/radius in `shapes.ts` (mitigates high-refresh-rate monitor issue)
- **TODO/TOFIX updates**: mark Vehicle Catalog, Item Catalog, Creature Catalog, Trait System, Character Context as done; restore 165hz monitor note; remove fixed section from TOFIX.md
- **AGENTS.md + README.md**: comprehensive updates reflecting new features and project status
- **Sheet blocks polish**: remove redundant readOnly guards from `BaseBlock`, `AttributeBlock`, `SkillBlock`, `AdvantagesBlock`, `ForceBlock`, `HealthBlock`, `OtherBlock` (now handled by hook)

### Fix

- **Data layer configs**: update `abilityConfig.tsx`, `attributeConfig.tsx`, `backgroundsConfig.tsx`, `forcePowersConfig.tsx`, `meritsFlawsConfig.tsx`, `speciesConfig.tsx` — various column and filter fixes
- **HealthBlock**: extract `HEALTH_LEVELS` to constants in `character.ts` for reuse
- **SheetLayout**: remove commented Russian inline comments; clean up import extensions
- **CharacterManagerModal**: fix import path extension
- **TraitRow**: remove unused import
- **StatsBlock**: minor type/presentation fixes

## v3.2.0

### Major feat

- **Character creation docs**: fill species, creation-steps (10-file step-by-step directory), backgrounds, merits-flaws, virtues-willpower, dark_side_resistance, force, and droids-cyborgs — 8 complete documents with DataCatalog-driven interactive tables
- **Data Catalog dual-filter**: extend `DataCatalog` with `filterColumnId2` prop for category + era dual filtering
- **Data layer**: add 8 new data/config file pairs (`src/data/`) covering species, backgrounds, merits/flaws, force powers, attributes, abilities, alien physiology
- **Sheet manager context & presets**: add `CharacterContext`, `presets.ts`, and `CharacterViewer` component
- **Sheet blocks rewrite**: heavily refactor `BaseBlock` with sub-stats and improved layout; update `BodyBlock`, `CharacterSheet`, `AdvantagesBlock`, `ForceBlock`, `SkillBlock`, `HealthBlock`, `StatsBlock`, `OtherBlock`

### Minor feat

- **3D dice renderer**: improve `renderer.ts` (worker/fallback logic), `scene.ts`, `shapes.ts`
- **i18n**: sync English/Russian translations for new character doc pages
- **Utilities**: enhance `logging.ts`, add `env.ts` shared utility
- **Sheet components**: update `CollapsibleBlock`, `DataTable`, `MeritFlawRow`, `SectionCard`, component barrel
- **Character types**: extend `character.ts` schema and `characterStore.ts`

### Fix

- **creation-steps**: restructure from single stub file to multi-file directory with `_category_.json`
- **Navbar i18n**: update `navbar.json` with new doc category labels

## v3.1.0

### Major feat

- **Data Catalog system**: add abilities & attributes data layer (`src/data/`), DataCatalog component, EntityCard, and DocCharData shared components
- **Documentation restructure**: add core-rules section with attributes-abilities and dice-pools docs, category JSONs, and comprehensive TODO tracking
- **Inline roll component**: add `InlineRoll.tsx` for inline dice notation rendering in docs
- **Dice pool UI refactor**: extract NotationInput and RollControls subcomponents, simplify DicePool layout
- **Sheet manager UX overhaul**: redesign CharacterManagerModal, ConfirmDialog, StatDot, and TraitRow; add NewCharacterButton
- **Vitest migration**: replace Jest config with `vitest.config.ts`, remove old setup file, update all test imports

### Minor feat

- **Shared utilities**: add `diceNotation.ts`, `random.ts` helpers; enhance `logging.ts`
- **Navbar dice roller**: improve layout and interaction in NavbarDiceRoller
- **Theme & layout**: update Root, TWWrapper; remove unused custom.css overrides
- **Tailwind config**: extend with new theme values
- **Sheet blocks**: polish AdvantagesBlock, AttributeBlock, BodyBlock, ForceBlock, SkillBlock
- **Russian i18n**: sync quick-start translation updates
- **Config**: update package.json scripts and eslint config
- **Notation clean util**: add `notation-clean.ts` for input sanitization

### Fix

- **Quick-start docs**: correct broken references and formatting
- **Dice-logic**: fix edge cases in evaluator, parser, renderer, and store
- **Character types**: align type definitions with updated sheet components
- **Tests**: adapt all dice_roller tests to vitest runner
- **Various**: fix constants, events, and small regressions across modules
