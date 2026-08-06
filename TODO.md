# TODO

Tasks are grouped by **area** (logical dependency) and ordered by priority within each area.
Each task includes: name, description, priority, effort, impact, and dependencies.

---

## Legend

- ✅ **DONE** — fully implemented (see [CHANGELOG.md](CHANGELOG.md))
- 🟡 **IN PROGRESS** — partially implemented
- ⬜ **NOT DONE** — not started

---

### Major

- [x] **Documentation:** Write Docusaurus docs about the system built
    - ✅ 45 English Star Wars documents with matching Russian paths
- [x] **Sentient & Droid Characters:** Current sheet can store both types; dedicated droid schema/layout remains planned after the plugin boundary
- [ ] **Vehicle Characters:** Build a separate vehicle schema and sheet after the system-plugin boundary exists
- [x] **Dice rolls**: 3D dice roller with physics, sound, 2D SVG fallback, roll history
- [x] **Trait System:** Data catalog for species, backgrounds, merits/flaws, Force powers, abilities — mechanical effects integration pending
- [x] **Item Catalog:** Ranged/melee weapons, armor, consumables, tools with search/sort/filter
- [x] **Vehicle Catalog:** 200+ vehicle entries with scale badges, stat display, weapon details
- [x] **Creature Catalog:** Creature stat blocks with scale classification
- [x] **i18n docs translation:** English and Russian documentation complete
- [ ] **WoD (VtM 2e) System Docs (in progress):** Structure started — clans, disciplines, Blood Points, Humanity
- [ ] **Database + Auth:** Add optional authenticated sync/sharing while retaining an offline-first IndexedDB cache and explicit conflict/recovery behavior

### Minor

- [ ] **Lazy load 3D packages:** three.js, cannon-es lazy loading for perf
- [x] **Inline dice rolls** in documentation
- [ ] **Multi-system dice pool tabs:** Show tabs for D&D, Pathfinder, etc. after roll-session isolation and mixed-roll orchestrator tests are complete
- [ ] **Discord webhooks (frontend complete):** Frontend has bounded messages, mention suppression, coalescing, client rate limiting, structured delivery errors, and user-visible feedback. Add an authenticated backend proxy with server-side secret storage when the backend exists; this is important but not a current release blocker.
- [x] **Character context & presets** (CharacterContext, presets.ts)
- [x] **Empty character name placeholder** (default name is `''` instead of `'New Character'`)
- [x] Add `(3d10+1d10)>=6f=1` syntax support (first separate roll groups, then modifiers)

### Localization

- [x] **YAML i18n foundation:** Canonical English/Russian YAML source tree, generated Docusaurus adapters and typed fallback descriptors, locale/key/placeholder validation, status command, and a Base-sheet/attribute-name pilot.
- [ ] **UI i18n migration:** Migrate the remaining sheet, dice, shared, site-shell, catalog, and integration strings in small domain batches. Use generated descriptors for props and `<Translate>` for suitable rendered JSX; do not add a second locale runtime.
- [ ] **Catalog data i18n migration:** Extend the pilot from attribute names to each catalog's user-facing fields, then teach each DataCatalog detail/search/filter configuration to use localized values with English fallback.
- [ ] **Translation source audit:** Add a static audit for literal `ttgamer.ui.*` IDs and generated descriptor imports after at least two further domains establish the final usage patterns. Do not block the pilot on a brittle regex scanner.

### LLM Support

- [ ] Add a `system-plugin` skill when the plugin interface is implemented.
- [ ] Add a `character-persistence-migrations` skill together with the first Zustand migration.
- [ ] Add a `catalog-data-validation` skill when validator rules become contributor-extensible.
- [x] Add the `ui-i18n` skill now that the YAML, generated-adapter, and catalog-pilot conventions are established.

### Verification Backlog

- [ ] Add `check:boundaries` after the integration-module convention settles, then prevent `shared` from importing feature modules and flag direct feature-to-feature imports.
- [ ] Add a bundle-budget report after Three.js is lazy-loaded so limits can target meaningful chunks instead of the current monolithic asset.
- [ ] Add a dead-code/export audit with explicit MDX and Docusaurus entry-point configuration; keep dependency removal human-reviewed.
- [ ] Reconsider `validate:ai-context` after AGENTS/skill structure stabilizes; it is intentionally stalled for now.
- [ ] Add store hydration/migration fixtures, import-conflict component tests, viewer-context tests for every block, and persistence failure/recovery tests.
- [ ] Add Playwright smoke tests for homepage/docs/sheet/dice routes and keyboard flows.
- [ ] Add axe accessibility checks for dialogs, tables, sheet controls, and the dice panel.
- [ ] Add property/fuzz tests for parser/evaluator limits and catalog filter URL round-trips.
