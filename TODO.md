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
- [ ] 🚫 **T-011 — WoD (VtM 2e) system docs** (none) — closed 2026-09-19: the unfinished `docs/wod` drafts (core rules, VtM 2e character pages) duplicated the V5 section visually and were removed; classic VtM returns with T-043. (task for roadmap path `core-book-docs`)
- [ ] ⬜ **T-012 — Database + auth** (none) — players and GMs optionally sync and share sheets across devices with authenticated accounts while keeping an offline-first local cache and explicit conflict/recovery behavior. (task for roadmap path `multiplayer-groups`, `online-forum`)
- [ ] ⬜ **T-037 — Third-party text audit & licensing notices** (none) — readers and rights holders get documentation and catalog text written in the project's own words, with each system's required notices shown where its material is used. (task for roadmap path `core-book-docs`)
    - Verbatim 8-word overlap scan (2026-09-15): docs prose ≤10% per page; catalogs higher — `meritsFlawsData.ts` (VtM Players Guide 2nd + SW WEG→WoD conversion), `abilities.ts`, `backgroundsData.ts`, `vehicleData.ts` (WEG D6). Trait-name lists are false positives; paraphrase is not detected.
    - Notices become system/ruleset metadata rendered automatically (Dark Pack for WoD-engine content, per-publisher policies for others); no notice on unrelated pages.
    - 2026-09-15: the metadata exists (spec 008, used by V5); the official Dark Pack badge is in `static/img/`, shown bottom-left on hunter sheets and with the full statement on `docs/wod-v5/dark-pack`. Still open: the badge where donations are solicited; decide whether the Star Wars WoD conversion declares the Dark Pack policy.
- [ ] 🟡 **T-038 — V5 ruleset + Hunter: the Reckoning 5e player character** (none) — players create, edit, and export a validated H:tR 5e hunter sheet built on a reusable V5 ruleset layer, and can re-skin it for a homebrew setting through the template system. (task for roadmap path `multi-system-sheets`)
    - Highest priority: a table game runs on it within 1–2 weeks of 2026-09-15; keep scope to what that session needs.
    - Source: `context/Hunter the reckoning 5e.pdf` (image-only scan; read pages visually). Sheet structure and trait names only — no verbatim rules text.
    - In scope: minimal ruleset/module/setting split (V5 engine as ruleset, Hunter as module) sized so VtM 5e (T-039) fits beside it; hunter full + brief templates; Dark Pack notice wherever H:tR material is shown or exported.
    - The homebrew fantasy re-skin is a user template exported to a file, not a shipped/published template.
    - Out of scope: V5 dice automation (T-045; counted manually for now), NPCs and other entities (T-040), personas (T-044).
    - 2026-09-15: implemented by spec 008 (V5 ruleset + Hunter module, full/brief sheets on the existing WoD elements, Dark Pack badge, V5/Hunter docs en + ru); remaining: in-app review of the quickstart scenarios and the newcomer hallway test before marking done.
- [ ] ⬜ **T-039 — Vampire: the Masquerade 5e player character** (T-038) — players maintain VtM 5e vampire sheets on the shared V5 ruleset, adding only the Vampire module. (task for roadmap path `multi-system-sheets`)
- [ ] ⬜ **T-040 — V5 non-player entities** (T-038) — GMs track H:tR/VtM 5e NPCs, creatures, and organizations as documents instead of free-form markdown notes; planned as its own spec. (task for roadmap path `gm-notes-templates`)
- [ ] ⬜ **T-041 — Ruleset / module / setting layering for existing systems** (T-038) — the Star Wars WoD system migrates from one combined `systemId` to a ruleset (WoD-like engine) + setting (Star Wars) + module list, so settings and supernatural types compose without per-combination code. (task for roadmap path `multi-system-sheets`)
    - A character carries one supernatural module by default; crossovers are built by extending the sheet through templates rather than stacking modules.
    - Existing persisted documents migrate through the versioned envelope migrations; no data loss.
- [ ] 🚫 **T-042 — Shared entity library with tags and links** (T-041) — closed: superseded by T-052; entity organization returns to a file-system structure rather than a tag-sliced link graph.
    - The scale requirement carries over to T-052: thousands of entities, indexed IndexedDB queries instead of loading everything into memory, virtualized lists, and search/filter-first navigation.
- [ ] ⬜ **T-043 — Classic World of Darkness lines** (T-041) — players use sheets for the remaining classic WoD lines (VtM, W:tA, C:tD, Wraith, H:tR classic) as ruleset modules, after the V5 lines. (task for roadmap path `multi-system-sheets`)
- [ ] ⬜ **T-044 — Personas and audience-restricted views** (T-012, T-052) — GMs give one document several faces (e.g. a vampire's mortal facade) and choose which face each player sees; until multiplayer exists, hiding sections through templates is sufficient. (task for roadmap path `multiplayer-groups`)
    - Real secrecy requires server-side projection (`project(document, persona)`); client-side hiding is presentation only and must not be presented as protection. No client-side encryption.
- [ ] ⬜ **T-048 — Free-form markdown document element** (none) — template authors place a large free-text element that renders markdown, inline HTML, and image embeds, with a side-by-side rendered preview on desktop. (task for roadmap path `gm-notes-templates`)
    - A bounded set of MDX embeds reuses existing sheet elements inside the text.
    - Security: embeddable components are an explicit allowlist registered in one place; everything else is sanitized, never evaluated. The allowlist is the contract this element declares (Principle II).
    - Narrow screens collapse the preview to a toggle instead of a second column.
- [ ] ⬜ **T-049 — Canvas / map document element** (T-048) — GMs build a spatial canvas inside a document: pasted images, freehand drawing, links to other entities, and embedded elements from other documents. (task for roadmap path `map-notes`)
    - Reference behavior: the Excalidraw canvas in Obsidian.
    - Staged: images and links first; selection, moving, scaling, and rotation after.
    - Needs an explicit scale note (Principle VII): canvas payloads and embeds must not load eagerly with the document list.
- [ ] ⬜ **T-050 — Initiative tracker** (none) — GMs run turn order at the table inside the tool instead of on paper.
    - Open question: where it lives — on a character document, in a separate `group`/party document, or as part of the dice module.
- [ ] ⬜ **T-051 — Shared entity links with brief preview cards** (T-056) — every document type links to other entities through one shared, documented mechanism, and readers see a linked entity's brief card without leaving the page. (task for roadmap path `gm-notes-templates`)
    - The vehicle sheet already implements entity references; that implementation is promoted to a shared contract recorded in `src/sheet_manager/AGENTS.md` and the sheet skills, and reused — not reinvented per document type.
    - Open question: the preview surface — hover popover, the currently free right-hand panel of the sheet, or elsewhere.
    - Main risk is performance (Principle VII): previews resolve on demand and bounded, so a document with many links does not add proportional weight to the page.
- [ ] ⬜ **T-052 — File-system organization of entities** (none) — GMs organize all documents in folders — character sheets beside markdown documents, canvases, and later types — instead of a link graph sliced by tags. (task for roadmap path `note-tree`, `campaigns`)
    - 2026-09-15: reverses the shared-library/tag-graph direction; T-042 is closed as superseded and the `campaigns` roadmap note records the change.
    - Entity links (T-051) remain, but they are cross-references, not the primary navigation structure.
- [ ] ⬜ **T-053 — Guided step-by-step character creation** (none) — players build a legal character through ordered steps with the rules applied as they go: the current step highlighted, allowed ranges shown, and per-category budgets (for example skill dots) enforced instead of a blank sheet. (task for roadmap path `character-creation-flow`)

### Minor

- [ ] ⬜ **T-013 — Lazy load 3D packages** (none) — the page loads faster because the 3D dice renderer and its physics engine download only when 3D dice are requested.
- [x] ✅ **T-014 — Inline dice rolls** (none) — readers roll directly from documentation pages.
- [ ] ⬜ **T-015 — Multi-system dice pool tabs** (none) — players keep separate dice pools per game system with favorites, once roll-session isolation and mixed-roll orchestrator tests are complete. (task for roadmap path `multi-system-sheets`)
- [ ] ⬜ **T-016 — Discord webhook backend proxy** (a backend must exist) — roll sharing stops exposing the webhook secret to the browser: an authenticated backend proxy holds it server-side; not a current release blocker.
    - Frontend already complete: bounded messages, mention suppression, coalescing, client rate limiting, structured delivery errors, user-visible feedback.
- [x] ✅ **T-017 — Character context & presets** (none) — players switch between several characters with preset starting states.
- [x] ✅ **T-018 — Empty character name placeholder** (none) — new characters start with a blank name instead of a placeholder string.
- [x] ✅ **T-019 — Separate roll-group syntax** (none) — notation like `(3d10+1d10)>=6f=1` parses with separate roll groups before modifiers.
- [ ] ⬜ **T-045 — V5 dice pools** (none) — players roll VtM 5e / H:tR 5e pools with automatic success, critical-pair, and Hunger/Desperation outcome handling instead of counting by hand; detail in `src/dice_roller/TODO.md` #15. (task for roadmap path `multi-system-sheets`)
- [ ] ⬜ **T-046 — Composite template keys** (none) — edited default pages stay attached to the right system as more systems ship: default overrides and shipped-template lookups key by `systemId:viewId` with a template store migration, replacing the view-id prefix convention. (task for roadmap path `multi-system-sheets`)
- [ ] ⬜ **T-047 — Star Wars docs in the V5 page format** (T-038) — Star Wars readers get the same page anatomy as the V5 docs (short summary first, guided creation steps with a running example and sheet embeds), if the format proves itself at the table. (task for roadmap path `core-book-docs`)
- [ ] ⬜ **T-054 — Live template editing** (none) — template authors edit a template on the real page layout instead of an abstract tree: an optional preview of the finished sheet, blocks reordered in place, fields added and moved where they will appear. (task for roadmap path `gm-notes-templates`)
    - Column settings add real columns inside the editor and the width control resizes them, rather than only writing configuration.
    - Sections show their characteristic primary/secondary accent bars in the editor.
    - Mostly an interface rework over existing template capabilities; low priority.
- [ ] ⬜ **T-055 — Visible StatDot clear control** (none) — the optional clear cross on StatDot is noticeable: semi-transparent red by default, more opaque on hover and keyboard focus.
- [ ] ⬜ **T-056 — Denser brief layouts** (none) — a brief sheet fits one phone screen or a quarter of a desktop screen: CompactRating labels shorten to three uppercase letters with minimal label-to-value spacing, and the other element kinds tighten the same way, so far more field groups fit without losing information or visible grouping.
    - Prerequisite for the embedded brief cards of T-051 and T-059.
- [ ] ⬜ **T-057 — Back navigation between linked entities** (T-051) — following a link to another entity is reversible: browser back and forward return to the previously viewed document, even though it is physically the same page.
- [ ] ⬜ **T-058 — System/custom template field parity** (none) — system-defined fields offer exactly the same settings as custom template fields (for example a maximum on an attribute such as Strength) and are indistinguishable in the editor UI.
    - Includes writing the parity rule into the constitution as an amendment (Sync Impact Report, version bump, mirrored into `AGENTS.md` and the sheet skills).
- [ ] ⬜ **T-059 — Embedded documentation briefs in sheets** (T-051) — sheet hints show the chosen documentation fragment in place instead of only linking out to it, reusing the brief-embed mechanism and its on-demand loading budget. (task for roadmap path `core-book-docs`)

### Localization

- [x] ✅ **T-020 — YAML i18n foundation** (none) — contributors edit canonical English/Russian YAML sources that generate typed adapters with locale/key/placeholder validation and a status command; the Base-sheet/attribute-name pilot is done.
- [ ] 🟡 **T-021 — UI i18n migration** (T-020) — the whole interface becomes translatable: the remaining sheet, dice, shared, site-shell, catalog, and integration strings migrate in small domain batches using generated descriptors and `<Translate>` where suitable; no second locale runtime.
    - 2026-09-18 review: the home page is still English in the Russian build.
- [ ] ⬜ **T-022 — Catalog data i18n migration** (T-021) — catalog entries display in the reader's language: user-facing fields of each catalog localize, then DataCatalog detail/search/filter configurations use localized values with English fallback.
    - 2026-09-18 review: Star Wars docs pages still show English catalog content in Russian — skills, Force powers, virtues, and smaller embedded lists; the V5/Hunter catalogs are already localized and can serve as the pattern.
- [ ] ⬜ **T-060 — Localized equipment item cards** (T-021) — Russian readers see translated buttons and field labels inside weapon, armor, and inventory item cards on every sheet (Star Wars and V5 share the card molecules); the strings move to the YAML UI sources.
- [ ] ⬜ **T-061 — V5/Hunter Russian terminology review** (none) — Russian readers get consistent, reviewed H:tR 5e terms (module name, Storyteller, Touchstones, Edges/Perks, Creed/Drive, Advantage and gear names) across the sheet UI, catalogs, and `docs/wod-v5`; one glossary decides each term and every source follows it.
    - Terms were chosen during spec 008 without a review; check `translations/source/ru/ui/sheet/v5*.yaml`, `translations/source/ru/data/v5-hunter-*.yaml`, and the Russian `v5/` docs.
- [ ] ⬜ **T-062 — Star Wars pickers with book names** (T-022) — Russian readers pick Star Wars catalog entries (species, merits/flaws, abilities, Force powers, equipment, vehicles, creatures) by names shown and written as "localized (English)", the same way V5 hunter pickers already do (`pickLabel` in `systems/catalogs.ts`); search matches both names.
    - The Star Wars pickers that bypass `defineCatalog` labels (equipment suggestions through `useBodyHandlers`, trait dialogs, DataCatalog-based selectors) move onto `pickLabel` first; names appear bilingual as soon as T-022 localizes each catalog.
- [ ] ⬜ **T-023 — Translation source audit** (T-021, T-022) — literal string IDs and generated-descriptor imports get a static audit once at least two further domains establish the usage patterns; deliberately not a brittle regex scanner.

### LLM Support

- [ ] ⬜ **T-024 — System-plugin skill** (the plugin interface is implemented) — agents get documented guidance for the system plugin interface.
- [ ] ⬜ **T-025 — Character-persistence-migrations skill** (the first store migration exists) — agents get guidance for character persistence migrations.
- [ ] ⬜ **T-026 — Catalog-data-validation skill** (validator rules become contributor-extensible) — agents get guidance for extending catalog validation.
- [x] ✅ **T-027 — ui-i18n skill** (none) — agents follow the established YAML, generated-adapter, and catalog-pilot conventions.

### Verification Backlog

- [ ] ⬜ **T-028 — Boundary check** (the integration-module convention settles) — module boundaries are enforced automatically: `shared` cannot import feature modules and direct feature-to-feature imports are flagged.
- [ ] ⬜ **T-029 — Bundle-budget report** (T-013) — bundle-size regressions are caught against meaningful per-chunk limits once the 3D renderer is lazy-loaded.
- [ ] 🟡 **T-030 — Dead-code/export audit** (none) — unused exports and dead code surface with explicit MDX and Docusaurus entry-point configuration; dependency removal stays human-reviewed.
    - Dead files/functions removed; knip committed (`knip.json`, `yarn audit:dead-code`) and MDX imports normalized to `@site/` so it resolves them. Remaining: review the few leftover unused exports it reports, then decide whether it gates `verify`.
- [ ] ⬜ **T-031 — AI-context validator reconsideration** (none) — decide whether the AI-context validator returns once the AGENTS/skill structure stabilizes; intentionally stalled for now.
- [ ] ⬜ **T-032 — Store persistence tests** (none) — character data is protected by store hydration/migration fixtures, import-conflict component tests, rendering tests for every shipped template page, and persistence failure/recovery tests.
- [ ] ⬜ **T-033 — Playwright smoke tests** (none) — homepage, docs, sheet, and dice routes plus keyboard flows get smoke coverage.
- [ ] ⬜ **T-034 — Axe accessibility checks** (none) — dialogs, tables, sheet controls, and the dice panel get automated accessibility checks.
- [ ] ⬜ **T-035 — Property/fuzz tests** (none) — parser/evaluator limits and catalog filter URL round-trips get property-based coverage.
- [ ] ⬜ **T-036 — Static template images** (none) — template authors place decorative images that are part of the template itself (e.g. template-specific backgrounds or banners), shown identically for every document using the template; complements the per-document image field.
