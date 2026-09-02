# TODO

The product's execution task queue. Path-level intent and statuses live in
[ROADMAP.md](ROADMAP.md); tasks here reference paths by slug and never restate their
scope. Every entry has a stable `T-###` identifier — assigned once, never reused for
a different entry, never renumbered (gaps after removals are permanent) — and exactly
one status.

## Legend

| Encoding | Status                                            |
| -------- | ------------------------------------------------- |
| `[x] ✅` | done                                              |
| `[ ] 🟡` | in progress                                       |
| `[ ] ⬜` | not started                                       |
| `[ ] 🚫` | closed — declined or superseded (entry names why) |

Required per entry: identifier, one-line name, status, area section, scope (what
becomes possible and for whom), dependencies (or "none"). Optional: effort, impact
estimates, open questions. Priority ordering lives only in the section grouping.

### Major

- [x] ✅ **T-001 — Docusaurus documentation** (none) — contributors and players read the full Star Wars WEG/WoD 2e rules on the site instead of the PDF. (task for roadmap path `core-book-docs`)
    - 45 English documents with matching Russian paths.
- [x] ✅ **T-002 — Sentient & droid characters** (none) — players maintain separate validated sentient and droid definitions with editable full sheets and compact views. (task for roadmap path `multi-system-sheets`)
- [x] ✅ **T-003 — Vehicle characters** (none) — players track vehicles as characters: separate schema, factory, editable full sheet, compact view, and reusable damage cohort tracking.
- [x] ✅ **T-004 — Creature & fodder sheets** (none) — GMs run creatures and fodder groups from PDF-derived definitions with editable traits, equipment, notes, and independently tracked cohort members.
- [x] ✅ **T-005 — Dice rolls** (none) — players roll visually: 3D physics dice with sound, a 2D SVG fallback, and roll history.
- [x] ✅ **T-006 — Trait system** (none) — GMs and players build characters from a data catalog of species, backgrounds, merits/flaws, Force powers, and abilities.
    - Mechanical effects integration pending.
- [x] ✅ **T-007 — Item catalog** (none) — players browse ranged/melee weapons, armor, consumables, and tools with search, sort, and filter.
- [x] ✅ **T-008 — Vehicle catalog** (none) — players browse 200+ vehicle entries with scale badges, stat display, and weapon details.
- [x] ✅ **T-009 — Creature catalog** (none) — GMs look up creature stat blocks with scale classification.
- [x] ✅ **T-010 — i18n docs translation** (none) — Russian-reading players and GMs use the full documentation in their language.
- [ ] 🟡 **T-011 — WoD (VtM 2e) system docs** (none) — Vampire: the Masquerade 2e gets the same table-ready documentation as the Star Wars system. (task for roadmap path `core-book-docs`)
    - Structure started: clans, disciplines, Blood Points, Humanity.
- [ ] ⬜ **T-012 — Database + auth** (none) — players and GMs optionally sync and share sheets across devices with authenticated accounts while keeping an offline-first local cache and explicit conflict/recovery behavior. (task for roadmap path `multiplayer-groups`, `online-forum`)

### Minor

- [ ] ⬜ **T-013 — Lazy load 3D packages** (none) — the page loads faster because the 3D dice renderer and its physics engine download only when 3D dice are requested.
- [x] ✅ **T-014 — Inline dice rolls** (none) — readers roll directly from documentation pages.
- [ ] ⬜ **T-015 — Multi-system dice pool tabs** (none) — players keep separate dice pools per game system with favorites, once roll-session isolation and mixed-roll orchestrator tests are complete. (task for roadmap path `multi-system-sheets`)
- [ ] ⬜ **T-016 — Discord webhook backend proxy** (a backend must exist) — roll sharing stops exposing the webhook secret to the browser: an authenticated backend proxy holds it server-side; not a current release blocker.
    - Frontend already complete: bounded messages, mention suppression, coalescing, client rate limiting, structured delivery errors, user-visible feedback.
- [x] ✅ **T-017 — Character context & presets** (none) — players switch between several characters with preset starting states.
- [x] ✅ **T-018 — Empty character name placeholder** (none) — new characters start with a blank name instead of a placeholder string.
- [x] ✅ **T-019 — Separate roll-group syntax** (none) — notation like `(3d10+1d10)>=6f=1` parses with separate roll groups before modifiers.

### Localization

- [x] ✅ **T-020 — YAML i18n foundation** (none) — contributors edit canonical English/Russian YAML sources that generate typed adapters with locale/key/placeholder validation and a status command; the Base-sheet/attribute-name pilot is done.
- [ ] 🟡 **T-021 — UI i18n migration** (T-020) — the whole interface becomes translatable: the remaining sheet, dice, shared, site-shell, catalog, and integration strings migrate in small domain batches using generated descriptors and `<Translate>` where suitable; no second locale runtime.
- [ ] ⬜ **T-022 — Catalog data i18n migration** (T-021) — catalog entries display in the reader's language: user-facing fields of each catalog localize, then DataCatalog detail/search/filter configurations use localized values with English fallback.
- [ ] ⬜ **T-023 — Translation source audit** (T-021, T-022) — literal string IDs and generated-descriptor imports get a static audit once at least two further domains establish the usage patterns; deliberately not a brittle regex scanner.

### LLM Support

- [ ] ⬜ **T-024 — System-plugin skill** (the plugin interface is implemented) — agents get documented guidance for the system plugin interface.
- [ ] ⬜ **T-025 — Character-persistence-migrations skill** (the first store migration exists) — agents get guidance for character persistence migrations.
- [ ] ⬜ **T-026 — Catalog-data-validation skill** (validator rules become contributor-extensible) — agents get guidance for extending catalog validation.
- [x] ✅ **T-027 — ui-i18n skill** (none) — agents follow the established YAML, generated-adapter, and catalog-pilot conventions.

### Verification Backlog

- [ ] ⬜ **T-028 — Boundary check** (the integration-module convention settles) — module boundaries are enforced automatically: `shared` cannot import feature modules and direct feature-to-feature imports are flagged.
- [ ] ⬜ **T-029 — Bundle-budget report** (T-013) — bundle-size regressions are caught against meaningful per-chunk limits once the 3D renderer is lazy-loaded.
- [ ] ⬜ **T-030 — Dead-code/export audit** (none) — unused exports and dead code surface with explicit MDX and Docusaurus entry-point configuration; dependency removal stays human-reviewed.
- [ ] ⬜ **T-031 — AI-context validator reconsideration** (none) — decide whether the AI-context validator returns once the AGENTS/skill structure stabilizes; intentionally stalled for now.
- [ ] ⬜ **T-032 — Store persistence tests** (none) — character data is protected by store hydration/migration fixtures, import-conflict component tests, viewer-context tests for every block, and persistence failure/recovery tests.
- [ ] ⬜ **T-033 — Playwright smoke tests** (none) — homepage, docs, sheet, and dice routes plus keyboard flows get smoke coverage.
- [ ] ⬜ **T-034 — Axe accessibility checks** (none) — dialogs, tables, sheet controls, and the dice panel get automated accessibility checks.
- [ ] ⬜ **T-035 — Property/fuzz tests** (none) — parser/evaluator limits and catalog filter URL round-trips get property-based coverage.
