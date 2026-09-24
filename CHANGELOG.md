# Changelog

## v3.9.1

### Fix

- **Erased sheet stats no longer label the next roll (F-006)**: clicking a stat, erasing the notation, and clicking another stat used to name both stats in history and Discord; emptying the input now drops the queued stat labels as well as the roll source, however it was emptied

## v3.9.0

### Minor feat

- **V5 dice are counted for you (spec 011)**: the dice panel's WoD tab gets a Classic / V5 mode; in V5 each pair of 10s counts as four successes, Hunger and Desperation dice are rolled as special dice (own colour in 3D, listed separately in history and Discord), and the roll names a Desperation 1, a messy critical, or a bestial failure — phrased conditionally when no Difficulty is given; both behaviours are switches, and Classic mode rolls as before
- **V5 sheets roll V5 pools**: clicking a hunter's trait builds `Nd10>=6` (no subtracted ones, no explosions) and a roll from the sheet or from the header's pending-roll button is read as V5 with the character's line, while rolls made in the panel follow the panel's tab and line; Star Wars sheets, the Standard and D&D tabs, and documentation rolls behave as before
- **The WoD tab says whether a roll succeeded**: set the successes needed (V5 Difficulty, or the new Classic "successes needed") and every success-pool roll from the tab reports success with its margin or failure with the shortfall in the toast, history, and Discord; Classic's threshold can now be left unset too, and nothing changes while a value is unset
- **Notation errors point at the mistake**: instead of "Invalid notation" the input highlights the offending part and says what was expected or which limit was hit, in English and Russian, announced once to screen readers
- **Two neutral notation building blocks**: a `:h` label marks a pool's special dice, and a set bonus `x{N}[.{K}]{cp}` adds successes for every complete set of matching dice across a whole pool (`x2=10` for V5 criticals)

### Fix

- **A bare `f` or a wrong number of `@` values is reported while typing**: `5d10>=6f` and `2d10@1` used to validate and fail or be ignored later; the dice panel now also remembers its tab and new settings get their defaults after an update

### Chore

- **Game-system dice rules live with the system**: `SystemPlugin.dice` declares stat pools and readings; the Star Wars pool moved from `shared/` to `systems/wod-like/`, and the system registry loads on demand so it stays out of the shared bundle
- **Constitution 1.4.1**: a publisher badge appears once, where the material is presented, and game mechanics need no notice
- **Reference material**: `context/` is organized by module with a map in `context/AGENTS.md`, now including the rpg-dice-roller sources and notation guide

## v3.8.0

### Minor feat

- **The 3D dice engine leaves the critical path (spec 010)**: `three` and `cannon-es` are downloaded on the first 3D roll instead of with every page — the shared bundle every route loads drops from 1.44 MB to 793 KB; when the chunk cannot be fetched the roll still resolves in 2D, says so once, and retries on the next roll
- **Long catalog pickers are searchable**: a template field bound to a catalog with more than 12 entries (species, creatures, vehicles, Force techniques, gear) becomes a search field with «Русский (English)» labels instead of a drop-down of hundreds of options; the stored value, catalog fills, and short lists are unchanged
- **Catalog pickers work without a mouse**: arrow keys, Home/End, Enter, and Escape drive the suggestion list of every catalog picker, including the equipment pickers that already used it
- **The rating clear control is visible**: the cross that removes a trait is red at rest, stronger on hover and keyboard focus, and announces "Remove" to screen readers instead of carrying only a tooltip

### Chore

- **Dead code cannot accumulate**: `yarn audit:dead-code` (knip) runs inside `yarn verify` and fails on any unused file, export, or dependency; the last two findings are resolved (the `TemplateValuesBagSchema` alias is gone, the stale generated-translations ignore is removed), and a deliberate export without importers is exempted at its declaration with `@knipignore` and a reason (constitution 1.4.0)

## v3.7.0

### Major feat

- **Russian interface without English leftovers (spec 009)**: the home page, dice roller (panel, settings, history, sharing), Discord delivery messages, shared components (catalog tables, panels, difficulty and scale charts), docs catalog columns and filters, sheet controls, and the weapon, armor, inventory, and implant cards are translated; counts use Russian plural forms («1 документ / 3 документа / 5 документов»)
- **Translation coverage verifier**: `yarn i18n:verify` parses the code (TypeScript AST) and checks user-facing literals, missing or copied translations, plurals, catalog coverage, bilingual pickers, glossary consistency, label overflow, and Russian docs; runs in `verify:fast`, with reviewed exceptions in `translations/i18n-exceptions.yaml` and a coverage table in `yarn i18n:status`
- **Book-term hints for players who learned from the English books**: hover, focus, or tap a trait name to see its English book name (one delegated popover per sheet, no persistent marker, a one-time tip); a "Game terms" preference switches between Russian with hints, English book names, and Russian without hints
- **Term links survive re-skins**: renaming a trait in the template editor keeps its book term, with a per-field "Show book name hint" switch; exported templates keep both
- **Bilingual pickers**: every catalog picker shows «Русский (English)» and finds entries by either name, ignoring case, ё/е, and diacritics; picked equipment keeps a catalog reference and shows its name in the reader's language until renamed
- **Star Wars catalogs in Russian**: names, short descriptions, specialties, rating scales, and enumerated labels of every Star Wars catalog (species, merits and flaws, abilities, Force powers and skills, backgrounds, weapons, armor, gear, vehicles, creatures, virtues); abilities, Force skills, and virtues on the sheet read Russian
- **Glossary**: `translations/glossary/` records the English and Russian form of every sheet term (Star Wars, V5, Hunter) with proposals for review

### Minor feat

- **Long labels fit their rows**: the specialization input keeps room for 8 characters, narrow columns move it to its own line, and long Russian terms switch to glossary short forms on phones
- **Docs terms**: Russian docs write a game term's first mention as «Русский (English)»

## v3.6.0

### Major feat

- **Hunter: the Reckoning 5e (spec 008)**: create, edit, export, and import hunter characters with a full sheet in the printed sheet's order and a brief at-the-table view — Creed and Drive with suggestions, Edges and Perks tables with book suggestions (Perk suggestions follow the hunter's Edges; a picked Perk fills its Edge in the reader's language), specialization text per skill, advantages and flaws, touchstones, experience, biography, Despair, and the cell's Desperation and Danger
- **V5 ruleset layer**: `systems/v5/ruleset` (attributes, skills, Health/Willpower, advantages, experience, shared page parts) with the Hunter line as a module, so Vampire 5e can be added as another module
- **Hunter pages laid out for the screen**: sections of related groups (Hunter with portrait and folded biography, Condition, Attributes, Skills, Edges and Perks, Aims and Convictions, Advantages and Flaws, Equipment, Experience and Notes), rules links on group headers, and a brief view of compact groups
- **Type and setting**: document lists show the type ("Character") and the setting ("Hunter: the Reckoning 5e", "Star Wars (World of Darkness 2e)") in separate columns; the create dialog groups by setting
- **Equipment for any system**: equipment bindings with a `dataKey` edit a plain item array with the weapon and inventory cards (V5 hunters), sharing item rules with Star Wars
- **Hunter catalogs**: Merits, Backgrounds, and Flaws; weapon types; armor; gear — browsable in the docs (`CatalogBrowser`, search, filters, details) and suggested on the sheet (advantage and flaw names, weapon damage and gear effects filled from the catalog)
- **Hunter reference without repeats**: Creeds/Drives and Edges are listed once (steps 3 and 6); new reference pages for Advantages and Flaws and for Weapons, Armor, and Gear
- **Docs polish**: two line breaks after embeds (documented and tested); doc cards use the site palette in the dark theme
- **Docs admonitions**: fixed notes that ran to the end of the page when a paragraph followed an embed without a blank line; a test now guards every page
- **Hunter sheets reuse the WoD elements**: dot rows for traits, Desperation, and Danger; the condition track for Health and Willpower (click a box: Superficial ╱, Aggravated ×)
- **Condition track additions**: computed length from a formula plus a player adjustment, a −/+ length regulator (also replaces the fodder "Health levels" select), and a `trackLayout` choice (table of levels or line of boxes) in the template editor
- **Publisher notices**: policy metadata (`systems/policies.ts`, Dark Pack) with the official Dark Pack badge in the bottom-left corner of every hunter page (including custom templates), one full statement page (`docs/wod-v5/dark-pack`), and `notices` in document and template exports
- **V5 and Hunter documentation (en + ru)**: shared V5 rules, a Hunter start page with three paths, a quickstart, a nine-step guided creation path for complete newcomers with the example hunter Lena Varga and live sheet embeds, and a reference (sheet map, Desperation/Danger/Despair, Creeds, Drives, Edges, glossary)

### Minor feat

- **Registry-driven creation**: the create dialog lists every system and document type; the template library groups templates by system and kind and creates new templates for any of them
- **Plugin-declared catalogs**: every system (Star Wars included) declares its catalogs on its plugin; catalog entry names localize from `translations/source/<locale>/data/<catalogId>.yaml`
- **Template building blocks**: hidden rows columns, row reordering, trait row options (no specialization input / no WoD flags), boolean and range-bound field bindings, text suggestions from catalogs, list polarity
- **Failed imports are kept**: a readable document file that fails validation lands in the recovery collection
- **One boundary rule for all systems**: ESLint forbids generic sheet code from importing any concrete system folder

### Fix

- **System-aware templates**: a custom template of another system with the same document kind is no longer applied to a document (`template-incompatible` diagnostic); documentation embeds only render against documents of their own system
- **Importing document files**: choosing a `.json` file in Import did nothing in Chromium browsers (the file list was cleared before it was read); import, the Replace / Duplicate / Cancel choice, and recovery work again
- **Catalog details on phones**: the space kept free for the details sheet moved from under the catalog to the end of the page, so text after a catalog no longer drops below a large empty gap while details are open
- **Picker names outside English**: catalog suggestions on sheets show and write "localized (English)" names (e.g. «Арсенал (Arsenal)»); advantage and flaw suggestions are localized at all; a picked Perk or Edge no longer writes the English name; Perk suggestions also recognize an Edge by the book name in parentheses
- **Docs paths**: the V5 docs moved from `/docs/v5` to `/docs/wod-v5` (old links redirect); the unfinished `docs/wod` drafts (classic core rules, VtM 2e) were removed
- **V5 system id**: `v5` is now `wod-v5` (unambiguous next to other 5th editions); stored hunters, exported files, and template copies with the old id are read as `wod-v5` (document and template stores re-parse at version 4)

## v3.5.0

### Major feat

- **Entity sheet templates (spec 007)**: creature, vehicle, and fodder group documents render shipped full + brief templates (`systems/star-wars-wod/templates/{creature,vehicle,fodder}.ts`) covering the conversion book sheets plus GM additions — creature merits/flaws, movement, threat tier with tier-dependent soak, description/source; vehicle category, Durability reroll, system slots with damage marker, weapon arcs, crew stations linked to characters, modifications & quirks; fodder quick pools, leader link, bashing-only soak reminder
- **Kind-independent template bindings**: `useBoundDocument()` lets template elements read and write any document kind's typed data (character capability for characters); new `rows` binding kind (attacks, weapons, configuration), enum/numeric/title-syncing field bindings, per-kind `entityBindings.ts`
- **Member tracks**: one condition track per pack/squad/squadron member with letters A–L…, bounded member count, confirmation before removing a damaged member, "out of the fight" state, and fodder health tracks of 3/5/7 levels (new groups 3, existing groups keep 7; shortening collapses hidden marks)
- **Catalog fills overwrite mapped values**: bestiary and vehicle catalogs with Star Wars adapters (dice → dots with clamping, scale names, armor split, arcs); fills write template values and document data in one change; a missing detail no longer clears its target; weapon rows suggest ranged/melee catalog entries
- **Documentation on templates**: all sheet embeds in docs (en + ru) use `TemplateFragment` / `TemplatePreview`; creature and vehicle rules pages show read-only previews (Wampa, stormtrooper squad, Red Five, Luke's Landspeeder, Millennium Falcon, vehicle damage states) instead of static tables; editable embeds prompt to create a character when none is open
- **Legacy sheet retirement**: pre-template blocks, `CharacterViewer`, the creature/vehicle/fodder/brief React pages, and the `built-in` layout path are removed (reference copies in `context/legacy-sheet-components/`); every view is a shipped template
- **Template system (specs 003–006)**: custom page templates with a recursive node tree (sections, groups, fields, tables, lists, primitives), formulas, images, system bindings, editable default templates with overrides, template editor with drag and drop, import/export, and translatable labels

### Minor feat

- **Searchable document references**: reference fields (crew stations, gunners, fodder leader) show chosen documents as chips with open/remove actions and add documents through a search that lists at most eight matches — never the whole campaign
- **Render conditions and collapsed defaults**: any template node can be shown only while a value matches (`visibleWhen`); sections and groups can start collapsed; select options take translated labels; template editor controls for both
- **Per-kind brief views**: `creature-brief`, `vehicle-brief`, `fodder-brief`; saved `brief` / `npc-card` choices resolve to each kind's own brief
- **Observable fallbacks**: new `template-fallback`, `reference-target-missing`, and `catalog-detail-out-of-range` diagnostics; page resolution never throws
- **Setting-neutral authoring**: `src/sheet_manager/templates/builders.ts` + `wod-like/templateBuilders.ts`; shared template layers are guarded against system identifiers by tests

### Fix

- **Default overrides by canonical view**: an edited brief override of one kind no longer applies to other kinds opened through the shared `brief` alias
- **Health preview documents**: `healthPreviewDocument` builds a valid character (the production build failed once it was used)
- **Fodder group layout**: attributes in three columns and abilities beside Willpower (no overlapping ability rows)

## v3.4.0

### Major feat

### Minor feat

- **Discord webhook system**: new `external_apis/discord/` module (`sendToDiscord.ts` barrel + sender), `DiscordWebhookSubscription.tsx` component, `DiceRollerSettingsModal.tsx` with Discord URL/toggle UI, `sessionStorage.ts` utility, `SecretField.tsx` + `useSessionStorageState.ts` hook for secured storage
- **Roll result toast**: subscribe `onRollResult` → `toast()` in `Root.tsx`; moved from top-right to top-center with styled roll result notifications; inline toast extracted to reusable `RollToastContent.tsx`
- **Force Skills data catalog**: new `src/data/forceSkills.ts` + `forceSkillsConfig.tsx` for standalone Force skill table; `force.mdx` now renders skills as `EntityGrid` attribute cards
- **Parser group notation**: `dice-parser.ts` major rewrite (375 lines) — support for `(3d10+1d10)>=6f=1` group syntax with correct modifier precedence; marked done in `src/dice_roller/TODO.md`
- **Roll history & controls**: `RollHistory.tsx` redesigned (115 lines changed) — reversed order, auto-expand latest, close button on roll log, `Result:` line, character name + stat labels in expanded entries, `manuallyRerolled` flag, selectable text; `RollControls.tsx` extended (40 lines); `DiceTabWod.tsx` polish (d6)
- **Character context in rolls**: `StatDot`/`TraitRow` push `statLabel` + `characterName` into sessionStorage; rolls restore character context on click-to-set / right-click-roll; new `RollOptions` (`statLabels`, `characterName`) threaded through store → events → orchestrator
- **Anonymize rolls toggle**: `RollControls` `toggleCharacterStats` reframed as explicit "anonymize rolls" toggle (turns both `includeCharacterName` + `includeCharacterStats` off/on together, indicator reflects anonymized state); right-click title updated to match ("anonymize rolls")
- **Item schema expansion**: `ItemSchema` gains `description`/`effects`/`weight`/`price`/`quantity`/`maxQuantity`/`equipped`; armor `type` → `name`; weapon `ammo` as number + new `maxAmmo`; defaults added to all array fields
- **Trait default constants**: `DEFAULT_TRAIT_VALUE` renamed to `DEFAULT_ATTRIBUTE_VALUE`; new `DEFAULT_SKILL_VALUE` (value 0) so Force/abilities start at 0
- **BodyBlock refactor**: extract `useBodyHandlers.ts` + `InventorySection`/`ArmorSection`/`WeaponsSection`/`ImplantsSection` + shared `catalogs.ts` (494-line block slimmed down)
- **ForceBlock clamping**: willpower clamped to `[0, 10]`, forcePoints clamped to `[0, max]`
- **`useCharacter` stable callback**: `updateCharacter` memoized via refs — no longer recreated per character change, reads fresh values at call time
- **`useSessionStorageState` pub/sub**: module-level subscription syncs state across component instances in the same tab, so `RollControls`/`DiscordWebhookSubscription` re-render immediately when the webhook URL changes

### Fix

- **Doc restructure**: merge `step-6-merits-flaws.mdx` + `step-7-freebie.mdx` into single `step-6-freebie.mdx`; rename `step-8-force.mdx` → `step-7-force.mdx` (en/ru)
- **DiceRollerPanel**: migrate import path to `@site` alias
- **Export/import feedback**: `SheetLayout` replaced inline error banner with toast notifications (per-file success/failure) and added "Exported" confirmation toast
- **CustomTraitList value preservation**: `onLabelChange` signature changed to `(id, value, label)` so backgrounds/custom items no longer reset their value when the label is edited
- **DataCatalog filter select**: new `getFilterDisplayValue` with `optionsMap` — filter select no longer loses its tag; URL params init moved to `useLayoutEffect`; hash preserved on `history.replace`
- **Force point cost filters**: incorrect FP cost filter behavior fixed in Force Powers catalog
- **sessionStorage stat label race**: atomic `takeStatLabels()` (read + clear in one operation) + explicit clear when `rollOptions.statLabels` provided
- **DiscordWebhookSubscription**: removed dead `includeRollContext` ternary branch; stale closure fixed by reading closure value + adding to effect deps
- **`buildDiscordHistoryMessage` type hack**: `details`/`formatted` made optional — removed `undefined as unknown as string` cast
- **sessionStorage logging**: empty catch blocks now log warnings
- **BaseBlock**: removed `.tsx` extension from import path for consistency
- **notation-utils tests**: added coverage for `d%`, fudge dice, custom faces, and new-die-modifier-wins behavior; `mergeDiceNotation`/`splitTopLevel` moved from `StatDot.tsx` to `src/dice_roller/dice-logic/notation-utils.ts` and exported via barrel
- **Docs**: clarify Passion dice are neutral (do not consume Dark Side Resistance); document Merits & Flaws as optional at character creation

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
- **Roll logging refactor**: remove `setupRollLogging()` from shared logging; inline roll subscription in `Root.tsx` via `onRollResult` + `toast()`
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
