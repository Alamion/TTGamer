# Research: Entity Sheet Templates and Docs Embed Migration

Phase 0 output for [plan.md](./plan.md). Each entry resolves an unknown found while mapping the spec onto the current code (feature 006 state, branch `007-entity-sheet-templates`).

## Baseline findings (what the code does today)

- Creature (`creature`), vehicle (`vehicle`), and fodder group (definition `fodder-group`, kind `group`) render through built-in view components (`features/sheet/views/{Creature,Vehicle,Fodder,BriefDocument}Sheet.tsx`) via `registry/builtInBlockRegistry.ts`. Their `brief` view resolves to the character-kind `brief` default, is rejected by kind, and falls to `BriefDocumentSheet`.
- Template bindings (`systems/star-wars-wod/documentBindings.ts`) are character-only; every primitive reads through `useCharacter()`, which requires the `character` capability. `track:vehicle-damage` is declared for vehicles but points at a non-existent top-level `damage` key (tracks live in `members[].damage`).
- Entity data: fixed 7-slot tracks (`.length(7)`), `members` 1–24, vehicle arc is free text, fodder `willpower` is a single int, no fodder track length / leader, no vehicle category / reroll / crew / modifications / systems damage.
- Catalog selects already overwrite mapped targets (`DeclarativeSheetView.tsx:113-132`) but: a missing detail writes `undefined` (clears the target); fills write only the value bag even for bridged coordinates; only scalar details; no `creatures` / `vehicles` catalogs registered.
- Reference fields ignore `targetKinds`, cannot open the target, and silently show "—" for deleted targets.
- Formulas are numeric only and can read bound numbers only for kinds that have bindings. No conditional visibility exists.
- `docsEmbeds.tsx` exposes `TemplateFragment` / `TemplatePreview` / `presetCharacterDocument` / `healthPreviewDocument`; no MDX uses them yet. `TemplateFragment` renders nothing without a matching current document. `tests/sheet_manager/docs-embeds.test.tsx` scans en + ru MDX and validates `template`/`node` attributes.
- `validate:i18n` requires equal import sets between en and ru MDX files (not equal component usage).
- Legacy-only code: 9 files in `features/sheet/blocks/`, `components/viewer/CharacterViewer.tsx`, `registry/builtInBlockRegistry.ts`, `views/{Creature,Vehicle,Fodder,BriefDocument,BriefCharacter}Sheet.tsx`, `views/StarWarsSheetSupport.tsx`, `builtInBlocks.*` UI strings (except `builtInBlocks.other`, reused by `defaultTemplates.ts`).

## R1 — How templates read and write non-character entity data

- **Decision**: Introduce **data-lens bindings**: a binding descriptor kind whose read/write is a declared path lens over `document.data`, resolved through the document source (`useDocumentSource`) instead of `useCharacter()`. The shared template layer knows only the lens contract (path, value shape, optional numeric reading, optional options); the Star Wars system module declares the lens descriptors per kind (creature, vehicle, group). Writes go through `updateDocumentData`, so every write re-parses with the kind's schema (Principle II).
- **Rationale**: keeps `document.data` the typed owner of rules-relevant values (FR-008, no data move), makes bridging, formulas, and catalog fills work for any kind, and is exactly the seam a D&D or cyberpunk setting needs (FR-010/011). Character bindings stay as they are (no regression risk); convergence is a later option, recorded as a follow-up.
- **Alternatives considered**: (a) move entity data into `templateValues` — breaks FR-008 and system-owned rules; (b) give entities a pseudo-`character` capability — couples non-character kinds to character internals and to one setting; (c) per-kind React primitives — reintroduces the ready-made page path being retired.

## R2 — Multi-member tracks, lettering, removal confirmation, defeated state

- **Decision**: A **cohort track** primitive mode on track bindings: the lens descriptor names the member array (`members`) and the per-member track key (`health` | `damage`). The primitive renders one track per member, letters them A…L when more than one member exists (single member: no letter), offers add/remove within `[1, maxMembers]` (template-set; fodder 12, creature/vehicle keep the schema's 24), asks for confirmation before removing a member with any mark, and shows a defeated state when the member's last visible level is marked.
- **Rationale**: general-purpose (any kind with a member array), satisfies FR-006, reuses `ConditionTrackBlock`'s proven behaviors without keeping the legacy component.
- **Alternatives considered**: one track node per member letter (12 static nodes; wasteful, count not adjustable); a table with a track column (tables do not support track cells).

## R3 — Selectable fodder track length (3/5/7, default 3)

- **Decision**: Add `trackLength: 3 | 5 | 7` to fodder data with a parse default of **7** (existing groups keep all recorded damage) and a create default of **3**. Storage keeps 7 slots; the setting profile declares **track variants** per length: 3 = Hurt −1, Injured −2, Incapacitated; 5 = Bruised, Hurt −1, Injured −2, Wounded −3, Incapacitated; 7 = full health track. Visible slot _i_ maps to stored slot _i_. Cohort track primitives accept `lengthFrom: <coordinate>`. Shortening with marks beyond the new length requires confirmation; excess marks collapse so the last visible level (Incapacitated) is marked.
- **Rationale**: the length is a rule-owned value (mechanics page) and must be visible to system logic, so it belongs in `document.data`; an additive defaulted field needs no schema version bump or `migrate`. Recorded in spec A2.
- **Alternatives considered**: bag value (cannot distinguish old vs new groups without seeding); relaxing `.length(7)` (reshapes stored arrays, needs migration).

## R4 — Catalog suggestions for creatures, vehicles, armor, weapons

- **Decision**: Register `creatures` and `vehicles` catalogs in `catalogBindings.ts` with **detail adapters** owned by the Star Wars system: dice strings to dots (`'5D'` → 5, clamped to schema bounds with a diagnostic), catalog scale names to scale enum ids (`'Speeder'` → `speeder`), creature willpower to a pair, armor string split into name + rating, arrays mapped to row shapes (abilities → custom abilities, attacks → attack rows, weapons → weapon rows with arc ids, merits/flaws → bag list entries). Fill semantics per FR-005: every **mapped** target is overwritten; a detail the entry lacks (`undefined`) leaves the target untouched; an explicit empty/`null` detail clears it. Fill writes route through the coordinate router, so bridged targets write `document.data`. Inside a table row, a catalog select may fill sibling columns of the same row (used by fodder/creature weapon rows and armor).
- **Rationale**: overwrite was chosen by the author; fixing the "missing detail clears" bug prevents silent data loss; adapters keep setting-specific parsing out of the shared layer.
- **Alternatives considered**: fill-empty-only (rejected by author); a confirmation dialog (extra friction the author did not ask for).

## R5 — Derived soak and tier-dependent reminder

- **Decision**: Soak = formula field `stamina + armor-rating` where `stamina` reads the entity's Stamina via lens and `armor-rating` reads the armor rating lens with a **numeric reading** (leading signed integer of `'+3D'` → 3; non-numeric → formula degrades with `formula-error`). Add a general node property **`visibleWhen: { coordinate, equals }`** (any node, evaluated at render time, never affects storage). The creature page shows two reminder variants of the soak row keyed on `threat-tier`; the fodder page shows the "cannot soak lethal" reminder unconditionally.
- **Rationale**: no text-valued formulas needed; `visibleWhen` is setting-neutral and broadly useful (droid/non-droid, tier-dependent content in other settings).
- **Alternatives considered**: text-valued conditional formulas (grammar expansion, larger test surface); two separate templates per tier (duplication).

## R6 — Reference fields for crew stations and leader

- **Decision**: Reference controls filter options by `targetKinds`, add an "open" action that switches the current document (sheet workspace handoff, context preserved), and render a labeled "missing document" placeholder with a `reference-target-missing` diagnostic when the stored id matches no document (value kept until the user changes it). Crew stations are one field group of references: pilot, co-pilot, engineer, sensors, comms (single) and gunners (multiple), all `targetKinds: ['character']`.
- **Rationale**: FR-004 + edge case "deleted linked document"; no new element type needed.
- **Alternatives considered**: a crew table with reference column (row add/remove adds friction for a fixed role set).

## R7 — Systems list and modifications

- **Decision**: Vehicle systems = bag **table** `vehicle-systems` with columns `system` (text) and `damaged` (toggle), `minRows = maxRows = 10`, seeded labels empty (the 1–0 slots of the paper sheet). Modifications & quirks = bag table `vehicle-modifications` (`name`, `effect`, `quirk` toggle). Existing `configuration[]` remains bound and shown in the systems section as "Configuration" for FR-008 coverage.
- **Rationale**: tables already support toggles and bounded rows; value lists are `{label,value}` only.
- **Alternatives considered**: extending value lists with extra columns (schema change for one use).

## R8 — View identity, brief views, and fallbacks

- **Decision**: Shipped template ids = view ids per kind: `creature-sheet`, `creature-brief`, `vehicle-sheet`, `vehicle-brief`, `fodder-sheet`, `fodder-brief`. Brief views declare `legacyIds: ['brief', 'npc-card']` so stored `preferredViewId` keeps working. Remove the `built-in` layout type: every view is template-backed; a registry test asserts each view has a shipped template of the same kind. User-template resolution checks kind. A new diagnostic code **`template-fallback`** is reported whenever a document falls back (missing/mismatched user template, unknown view id, missing shipped template), alongside the existing `FallbackNotice`.
- **Rationale**: per-kind ids avoid `defaultOverrides` collisions on `brief`; views-as-templates is the uniform model the settings expansion needs; FR-018 requires observable fallback.
- **Alternatives considered**: keeping one shared `brief` id with kind-scoped overrides (store shape change for no user benefit).

## R9 — Setting-neutral template authoring

- **Decision**: Split `defaultTemplates.ts`: neutral node builders (`text`, `number`, `formula`, `select`, `reference`, `table`, `group`, `section`, `primitive`, `visibleWhen` helper) move to `sheet_manager/templates/builders.ts`; WoD-family helpers (`trait` dots, attribute blocks, cohort track helper) to `systems/wod-like/templateBuilders.ts`; Star Wars pages to `systems/star-wars-wod/templates/{character,creature,vehicle,fodder,docs}.ts`. Builders set `labelMessage` explicitly per node (replaces the English-label lookup table, which collides across kinds). The sheet-templates skill doc gains a per-kind "setting-specific vs reusable" table (FR-012).
- **Rationale**: FR-010–012; one file per kind keeps each page reviewable; explicit message ids remove the label-collision risk.
- **Alternatives considered**: keep one file (already ~800 lines; would pass 2000).

## R10 — Documentation embeds

- **Decision**:
    - `docsEmbeds.tsx` is the only docs import for sheet content. It additionally exports `JAX_VORN_PRESET` passthrough (via `presetCharacterDocument`), `exampleDocument(id)` and `vehicleDamagePreviewDocument(levels)`. Example envelopes live in `systems/star-wars-wod/examples.ts` (`::preset` ids, schema-validated in tests, values taken from page prose, e.g. Wampa Willpower 6).
    - `TemplateFragment` without a matching current document renders an actionable prompt reusing `CreateCharacterButton` (FR-016) instead of nothing.
    - Legacy replacement mapping (full-sheet node ids): `BaseBlock` → `base`; `AttributeBlock` → `attributes`; `SkillBlock` → `skills`; `AdvantagesBlock` → `advantages`; `ForceBlock` → `force`; `CharacterViewer` → `TemplatePreview` of `full-sheet` with the Jax Vorn preset; `HealthViewer levels` → `TemplatePreview` node `track-health` with `healthPreviewDocument(levels)`. `accentColor` props are dropped (templates own accents).
    - The docs-embeds test also reads `systemId` and parses multi-line JSX attributes, and asserts no MDX imports from `features/sheet/blocks` or `components/viewer`.
- **Rationale**: single public entry (Principle I); verification catches drift (FR-015).
- **Alternatives considered**: keeping static tables beside previews (two authorities for one example).

## R11 — Archive location and tooling exclusion

- **Decision**: Copy retired files to `context/legacy-sheet-components/` preserving their `src/`-relative tree, with a `README.md` stating source commit, date, and "reference only — not built, linted, or tested". Ensure `context/**` is excluded from root `tsconfig.json`, ESLint, and Prettier checks; add the entry to `context/AGENTS.md`.
- **Rationale**: author's request; archived code must not break verification (spec A7).
- **Alternatives considered**: git history only (author asked for a browsable copy).

## Implementation notes (refinements made while building)

- **R1 — no separate lens kind.** The existing binding kinds already describe data paths, so the
  "lens" became kind-independent data access instead: `useBoundDocument()` reads the character
  capability for character documents and typed `document.data` for every other kind, and the
  existing `trait`/`resource`/`field`/`list`/`track` descriptors are declared for creature,
  vehicle, and group. Additions: field `valueType: 'enum'` + `options`, `numeric`, `syncsTitle`;
  a new `rows` kind for record arrays; `resolveWritableBinding` + `boundWriteUpdate` for fills.
- **R2/R3 — length selector inside the member track.** The 3/5/7 selector lives in the member
  track element (hidden in briefs), so shortening confirmation and mark collapse happen in one
  place; the planned `cohort.lengthFrom` template property was dropped (`cohort.maxMembers` only).
- **R4 — in-row catalog fills via rows bindings.** Instead of a template-level sibling-column fill
  rule, a `rows` binding may declare `catalog: { catalogIds, column, fills }` (fodder weapons).
  Template selects fill any storage coordinate, including bound data coordinates.
- **R5 — conditions and collapsed defaults.** `visibleWhen` gained `not`; sections and groups
  gained `defaultCollapsed`; select options may carry `labelMessage`.
- **R7 — system slots.** A bag table capped at 10 rows (rows are added, not pre-seeded).
- **R8 — overrides by canonical view id.** Resolution now reads `defaultOverrides[canonicalId]`,
  fixing an alias collision found while testing per-kind briefs.
- **R9 — character templates unchanged.** The character/droid trees keep the English-label message
  lookup and are deep-equal to the pre-feature fixture (only the retired `builtInBlocks.other`
  message id moved to `defaults.other`); entity templates pass `labelMessage` explicitly.
- **R11 — archive scope.** `components/sections/DocumentSheetSections.tsx` was used only by the
  retired pages and was archived with them.
- **Scale reference group** from the entity-templates contract was not built (no static-text node);
  the Combat section links to the Combat Scales rules page instead.
