# Changelog

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
