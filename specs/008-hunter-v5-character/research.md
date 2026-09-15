# Research: V5 Ruleset and Hunter: the Reckoning 5e Player Character

Phase 0 decisions for [plan.md](plan.md). Every decision resolves an unknown found while mapping
the current `sheet_manager`, template, and documentation code (2026-09-14).

## D1 — Where the ruleset/module layering lives

- **Decision**: one new `SystemPlugin` with id `v5` is the **ruleset**. Each supernatural line is a
  **module** that contributes one or more `DocumentDefinition`s to that plugin; Hunter contributes
  `hunter` (kind `character`). A document names its ruleset through `systemId: 'v5'` and its module
  through `DocumentDefinition.module.id` (`hunter`). `module.id` is deliberately separate from
  `definitionId`, so T-040 hunter NPC definitions share the same module. `SystemPlugin` gains optional
  `policies` and `catalogs`. No envelope change, no store version bump.
- **Rationale**: the registry already resolves `systemId` + `definitionId`; the envelope,
  persistence, recovery, and migrations work unchanged. Vampire (T-039) adds a `vampire` definition
  from `systems/v5/modules/vampire/` without touching the ruleset. Settings stay out: this feature
  ships none, and the homebrew re-skin is a user template (spec US4).
- **Semantics note (until T-041)**: `systemId` means _ruleset_ for `v5`, but _ruleset + setting_
  for `star-wars-wod`. T-041 introduces explicit ruleset/setting/module fields and migrates
  `v5`/`hunter` one-to-one (`rulesetId: 'v5'`, `moduleIds: ['hunter']`) and `star-wars-wod` into
  `wod-like` + setting `star-wars`. This is recorded in the sheet-manager skill.
- **Alternatives considered**: (a) `systemId: 'hunter-5e'` as its own plugin — duplicates V5 for
  VtM, violating Principle I. (b) New envelope fields `rulesetId`/`moduleIds` now — a store
  migration and a T-041-sized change inside a two-week deadline.

## D2 — Unique view and template ids

- **Decision**: views and shipped templates are `v5-hunter-sheet` and `v5-hunter-brief`.
  Custom-template compatibility is checked on `(systemId, documentKind)` instead of kind alone
  (`systems/view.ts` custom lookup, template library grouping, `isDefaultTemplateId`). The registry
  rejects view ids duplicated across plugins; incompatible templates report a new diagnostics code
  `template-incompatible`.
- **Rationale**: `defaultOverrides` is keyed by view id and `isDefaultTemplateId` spans all systems,
  so reusing `full-sheet`/`brief` would collide with Star Wars. Hunter and Star Wars characters are
  both kind `character`, so kind alone would let a Star Wars template be applied to a hunter.
- **Scaling follow-up**: the `<system>-` prefix plus the registry check is a convention, not a
  namespace. Composite keys (`systemId:viewId`) for `defaultOverrides` and default-template lookups
  need a `templateStore` migration; recorded as a new TODO task (T-046) to land with or before T-041.
- **Alternatives considered**: a new kind `hunter` — rejected; a hunter is a character, and T-040
  NPCs will reuse the kind vocabulary. Composite keys now — a persisted-store migration inside the
  deadline for no user-visible gain yet.

## D3 — Severity tracks (V5 Health and Willpower, reusable by other systems)

- **Decision**: add a generic, system-independent **severity track** binding (`severity:<id>`): an
  ordered list of boxes, each empty or marked with one of N ordered severities. The binding declares
  `severities: [{ id, label, addLabel, healLabel }]` from lightest to heaviest, `escalation`
  (`'upgrade-lowest'` | `'none'`), `lengthFrom` (formula), `maxLength`, and optional `bonusKey`.
  Stored data is `Record<severityId, count>` plus `bonus` — for V5 exactly
  `{ superficial, aggravated, bonus }`. Length = `lengthFrom` clamped to 1…`maxLength` (15 for V5).
  Boxes render heaviest first. Transitions (pure module `severityTrack.ts`):
    - _add(level)_: if marked < length → count[level] + 1; else if `upgrade-lowest` → move one mark
      from the lightest occupied severity that is lighter than the heaviest to the next heavier one;
      else no change.
    - _heal(level)_: count[level] − 1, min 0.
    - _click box i_: cycle that box empty → level 0 → … → level N−1 → empty, then renormalize counts.
    - length shrink: counts kept; display "+N over".
- **UI**: atom `SeverityBox` (one box, `level: number | null`, `levelCount`), atom
  `TrackActionButton` (one labelled action), molecule `SeverityTrack`; all labels come from the
  binding. No V5 vocabulary in generic code.
- **Rationale**: the existing condition track stores per-level marks with WoD wound penalties and a
  fixed length. Other target systems need the same shape with different severities — classic WoD
  (bashing/lethal/aggravated), Blades in the Dark (stress; trauma as a second track), Call of
  Cthulhu HP/Sanity (one severity, no escalation). Counts survive length changes without data loss
  (spec edge case) and make SC-003 one interaction.
- **Alternatives considered**: a V5-only `damage` binding with `superficial`/`aggravated` fields —
  every later system would need its own component; reuse `track:` with `ConditionMark[]` — marks
  misorder when length changes and penalties do not apply; member-track `variants` — reads a stored
  length, not a formula.

## D4 — Skill specialties

- **Decision**: V5 skills store `{ value: 0–5, specialties: string[] }` (≤ 10 entries, each ≤ 60
  chars). The trait primitive gains an optional generic `specialties: 'list'` mode that renders the
  new `TagListInput` atom instead of the single specialization text input; the existing text mode
  stays the default for Star Wars.
- **Rationale**: discrete specialties are what T-045 needs for pool bonuses and what other systems
  with multiple specialties per skill need; `TagListInput` is built anyway for Perks, so the extra
  cost is one primitive option.
- **Alternatives considered**: one `specializationText` string separated by `;` — zero UI work now,
  but every consumer would parse it differently and a later migration would touch player data.

## D5 — Catalogs and Creed, Drive, Edge, Perk suggestions

- **Decision**: catalog definition primitives (`defineCatalog`, `CatalogBindingEntry`,
  `CatalogFillableDetail`) move from `features/sheet/data/catalogBindings.ts` into the neutral
  `systems/catalogs.ts`. Every plugin declares its catalogs on `SystemPlugin.catalogs`: Star Wars
  catalogs move to `systems/star-wars-wod/catalogs.ts`, Hunter catalogs live in
  `systems/v5/modules/hunter/catalogs.ts`. `features/sheet/data/catalogBindings.ts` only aggregates
  catalogs from `systemRegistry` (duplicate ids throw). Dependency direction stays
  `features → systems → systems/catalogs`, never back, so there is no import cycle.
  Hunter catalogs: `v5-hunter-creeds`, `v5-hunter-drives`, `v5-hunter-edges` (with `category`),
  `v5-hunter-perks` (with `edge` id). Creed/Drive are text fields with catalog suggestions (custom
  text allowed). Edges are `rows:edges`: column `name` with `v5-hunter-edges` suggestions whose
  existing `fills` mechanism writes the picked entry id into a hidden `entryId` column; column
  `perks` is a new generic `tags` column whose suggestions come from a catalog filtered by the
  sibling column holding an entry id (`filterByColumn: 'entryId'`, `filterKey: 'edge'`). A custom
  or renamed Edge name never breaks suggestions, because matching uses the id, not the label.
- **Rationale**: generic `features/` code importing Star Wars data is existing debt that would grow
  with every system; id-based dependent suggestions survive re-skins (US4), locale switches, and
  custom names, and are reusable (e.g. VtM Disciplines → powers).
- **Alternatives considered**: keep Star Wars catalogs hardcoded and append plugin catalogs —
  leaves a special case and creates a `features ↔ systems` import cycle; name matching — breaks on
  relabelling and localization; one row per Perk — loses Edge-with-Perks grouping.

## D6 — Publisher policy metadata and notices

- **Decision**: a generic policy catalog `systems/policies.ts` defines `PublisherPolicy`
  (`id`, `label`, `officialNotice` (verbatim required text), `explanation` translation descriptor,
  `url`, `nonCommercial`). Dark Pack text, verified on 2026-09-14 against the
  [Dark Pack Agreement](https://www.paradoxinteractive.com/games/world-of-darkness/community/dark-pack-agreement):
  "Portions of the materials are the copyrights and trademarks of Paradox Interactive AB, and are
  used with permission. All rights reserved. For more information please visit
  worldofdarkness.com." The agreement also requires stating that the material is not official World
  of Darkness material; both sentences are rendered. `resolveDocumentPolicies(document)` returns the
  union of ruleset (plugin) and module policies.
- **Rendering**: `SheetWorkspace` renders `<PolicyNotice>` under the active view for every document
  whose policies are non-empty — outside the template tree, so user templates cannot remove it.
  Docs pages render the same component once as their footer (see D9); embeds inside docs
  (`TemplatePreview`, `TemplateFragment`) never add their own notice, so a page shows exactly one.
  Document and template exports add a top-level `notices` array; imports ignore it. Policy strings
  live in `translations/source/*/ui/sheet/policies.yaml`, not under a system, because one policy
  (Dark Pack) serves several rulesets.
- **Rationale**: Principle VIII requires machine-readable policy metadata and notices only where the
  material is used. Star Wars declares no policy here; T-037 decides its notices.
- **Alternatives considered**: a notice node in shipped templates — removable by re-skins; hardcoded
  notice on the hunter view — not metadata-driven.
- **Follow-up to verify before release**: whether the Dark Pack logo must accompany the notice on
  the site (T-037 owns logo assets; add if required).

## D7 — Generalising Star Wars-bound entry points

- **Decision**: `DocumentCreateDialog` lists definitions from `systemRegistry` grouped by system,
  with labels from definition-owned descriptors (removing the hardcoded message map);
  `CreateCharacterButton` accepts `systemId`/`definitionId` (defaults unchanged);
  `template-editor/draft.ts` and `templateSkeletons.ts` take the current document's system;
  `docsEmbeds.tsx` exposes hunter example helpers and passes `systemId` through.
- **Rationale**: these are the only places a second plugin is invisible or mis-created; changing
  them is required by Principle I (no system conditionals in generic code).

## D8 — Validation limits

- **Decision**: attributes 1–5, skills 0–5, advantage/flaw dots 1–5, Desperation/Danger 0–5,
  severity counts 0–15, specialties ≤ 10 × ≤ 60 chars, bonus −5…+10, experience 0–9999, text ≤ 200 chars (short fields) or ≤ 10 000
  (notes/history), list lengths ≤ 50 (rows) and ≤ 10 (perks per Edge). Writes that fail the schema
  are rejected and reported through `reportSheetIssue` (existing store path).
- **Rationale**: finite, generous bounds match the constitution's schema discipline and the
  existing Star Wars limits; experienced hunters are not blocked by creation budgets (FR-016).

## D9 — Documentation location and format

- **Decision**: new top-level docs folder `docs/v5/` ("World of Darkness 5th Edition"):
  `rules/` holds V5-shared mechanics (FR-026), `hunter/` holds the line (entry page, quickstart,
  newcomer path `first-hunter/`, reference). Russian mirror at the same paths; `validate-i18n` is
  extended from one hardcoded root to a list (`star-wars-wod-2e`, `v5`). The page format is defined
  in [contracts/docs-structure.md](contracts/docs-structure.md): every page opens with an
  _In short_ summary, newcomer steps follow a fixed anatomy (why it matters → decide → on your sheet
  → running example → checkpoint → next), and every page ends with `<PolicyNotice policy="dark-pack"/>`,
  enforced by a docs test.
- **Rationale**: VtM 5e (T-039) links the same `rules/` pages; the fixed anatomy lets a newcomer
  know where they are on every page and gives the Star Wars docs a model to adopt later (user
  request). `docs/wod/` is the classic-WoD skeleton and stays untouched.
- **Alternatives considered**: `docs/wod/htr-5e/` — mixes V5 into the classic tree whose shared
  rules differ; `docs/hunter-5e/` — no home for shared V5 rules.

## D10 — Dice examples in docs

- **Decision**: examples use `InlineRoll` with fixed results (`5d10>=6@…`) and explain criticals
  (pairs of 10s) and Desperation dice in prose. `CharRoll` is not used (it reads the Star Wars
  character shape); V5 automation is T-045.

## D11 — Running example and presets

- **Decision**: one invented example hunter, **Lena Varga** (night-shift paramedic, Faithful,
  Drive: Atonement), used across the quickstart and the newcomer path. Her document is a docs
  helper in `systems/v5/modules/hunter/example.ts`, rendered read-only with `TemplatePreview`; it is
  not a shipped preset in the create dialog.
- **Rationale**: a consistent character is the main newcomer aid; keeping it out of the preset list
  avoids scope creep before the game.

## D12 — Delivery order under the deadline

- **Decision**: slice 1 (by ~2026-09-20): layering, schema, catalogs (incl. Star Wars move), severity track, full and brief
  templates, create dialog, notice, export — the table can play. Slice 2: re-skin checks (system-aware
  template matching, `tags` column verified in the editor), quickstart. Slice 3: newcomer path,
  reference pages, Russian mirror, skill updates. Docs never block slice 1.
