# Design: V5 Storyteller Characters and Groups

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-18

## Approach

Two new definitions on the V5 ruleset, beside the mortal (`systems/v5/core/`): the **Storyteller
character** (kind `storyteller`, id `v5-storyteller`) and the **Group** (kind and id `v5-group`),
both module-less and listed in `coreDefinitions`, so the library tree, the create dialog (spec 039),
and user settings on V5 pick them up with no generic change. Each ships a full page and a brief as
declarative templates built from `ruleset/templateParts.ts`, the parts the mortal, hunter, and
vampire pages use. Data the system must validate, roll, or name (identity, pools, tracks, lists)
lives in a small Zod schema with bindings; free description fields of the group and its members live
in the template (value bag), as the Star Wars entities do. The tracking switch (US4) is one boolean
on the vampire and hunter schemas read by the pages and the Hunger dice line. Order: US1 (schema,
bindings, pages) → US2 (rolls) → US3 (group, members, back-links) → US4 (tracking switch) → US5
(examples, docs) → finish.

## Decisions

- **D1 — Two ruleset kinds, not per line**: `v5-storyteller` and `v5-group` in `systems/v5/core/`
  with `module` unset and both ids in `coreDefinitions`. The group's kind is `v5-group`, not
  `group`, so it never meets the Star Wars fodder group's kind in labels or filters. _Why_:
  clarification 2026-10-18 (once, under the V5 rules); user settings reuse core kinds already.
  _Rejected_: copies in Hunter and Vampire — duplicate kinds and pages.
- **D2 — Standard pools are traits**: `pools.{physical,social,mental}` as `TraitBinding`s (map
  `pools`, 0–15, no specialty or flags) so the trait row's die rolls through `traitPool` and names
  the document like every sheet roll (US2). The page shows them as number ratings (template `rating`
  with `presentation: 'number'` over the bridged coordinates `physical`, `social`, `mental`); if the
  bridged trait primitive ignores the presentation, the primitive gains that option (extend, not
  fork). _Rejected_: three number fields with a button each — three buttons that duplicate what
  trait rows do.
- **D3 — Exceptional pools and powers are system lists**: `exceptional` (`named-trait`, value 0–15)
  and `powers` (`named-trait`, dots 0–5). `ListBinding` gains `maximum?` (default 5) and
  `ListCatalogSupport` gains `catalogIds?` (several catalogs offered together). Pools suggest a new
  shipped catalog `v5-skills` built from `V5_SKILL_GROUPS` labels (translated, no new text); powers
  suggest `v5-vampire-disciplines` and `v5-hunter-edges`; free names stay as typed (clarification).
  _Rejected_: template custom lists — no catalog suggestions over shipped catalogs, and rolls would
  not name the kind's data.
- **D4 — Health and Willpower with a set length**: `TrackBinding`s like the core ones, but the
  length comes from number fields `health-max` / `willpower-max` (1–15) instead of attributes.
  _Why_: the rules give Storyteller characters fixed Health and Willpower. No impairment penalty:
  player sheets apply none either; the spec was corrected during planning (FR-004, US1, US2).
- **D5 — Simple-foe difficulty**: field `difficulty` (0–5, 0 = none). The brief shows it as
  "Difficulty N" and a spec 038 button "Roll 2×N" whose notation is built from the difficulty,
  available only when it is above 0. _Why_: the rules' optional roll for simple foes; buttons
  already roll from formulas. _Rejected_: a new element for simple foes.
- **D6 — Members are a reference field of the group page**: a `reference` field (`multiple`,
  coordinate `members`, target kinds: every V5 kind) on the shipped group pages; descriptive fields
  (kind of group, description, goals, resources, threat 1–5, notes) are page fields too. _Why_:
  references, their picker, missing-target display (`reference-target-missing`), and removal exist
  (spec 017). Reference scope today offers only module-less kinds to a ruleset-level template:
  `referenceScope.scopedKinds` changes so a **ruleset-level** page (no module, no user setting)
  offers every kind of the ruleset, modules included. Line pages keep their scope. _Rejected_:
  members in system data — a second reference mechanism.
- **D7 — Back-links ("member of") as a reference-field option**: the existing `reference` field
  gains `incoming: true`: read-only, it lists the documents of its `targetKinds` (in the same system
  and setting) whose stored template values name this document — any value equal to its id or
  containing it, so renaming a field's key never breaks the link. The reader,
  `features/documents/linkedFrom.ts`, takes candidates from index entries by kind and loads them by
  id (`loadDocuments`, never a scan of the loaded cache); at most 200 per scope (beyond: the first
  200 by name and a `linked-from-truncated` report); cached per entries list. The template editor
  offers the option on reference fields (constitution VI parity, spec 038 parity test), and the
  storybook shows it. The Storyteller, mortal, hunter, and vampire pages carry such a field ("Member
  of", target kind `v5-group`). _Why_: members stay stored once; one element, configurable by
  authors for any "linked from" need. _Rejected_: a shipped-only element — breaks editor parity;
  storing groups on members — two sources of truth; reading a fixed `members` key — breaks when an
  author renames it.
- **D8 — Tracking switch**: one `trackResources: boolean` (default true) on the vampire and hunter
  schemas, one toggle ("Track Hunger and Willpower") in each page's identity block, and `showWhen`
  on the Hunger, Rouse, and Willpower blocks (hunter: Willpower only). The Hunger dice line returns
  0 when it is false. Stored Hunger and Willpower are untouched. _Rejected_: two switches — the spec
  asks for one; a page variant per state — doubles the shipped pages.
- **D9 — Examples**: own-words examples in `systems/v5/core/examples.ts`: a mortal (police
  detective), a ghoul retainer, an animal (guard dogs), a supernatural creature (a wolf-thing of the
  woods), an antagonist vampire (a Sheriff, vampire kind), and a group (a cult) whose members are
  three of them. Copying the group example (spec 039 `createFromChoice`) copies its member examples
  first and points the copy's references at the new ids (`DocumentExample.companions`). _Rejected_:
  group example with empty members — the docs could not show the link both ways.
- **D10 — Docs**: `docs/wod-v5/rules/storyteller-characters.mdx` and `groups.mdx` (en + ru) with
  embeds of the examples and their copy buttons; the Hunter and Vampire indexes link there. Glossary
  terms (Storyteller character, exceptional dice pools, standard dice pools) join
  `translations/glossary/v5.yaml`.

## Changed types and data

- New: `V5StorytellerSchema` (`name`, `concept`, `type` enum mortal|ghoul|animal|supernatural|
  other, `difficulty`, `pools`, `healthMax`, `health`, `willpowerMax`, `willpower`, `exceptional`,
  `powers`, `notes`, `metadata.imageUrl/portraitId`) and `V5GroupSchema` (`name`, `metadata`;
  everything else in template values). Schema version 1, `migrate` identity.
- Vampire and hunter schemas: optional `trackResources`, default `true`; existing documents read
  unchanged, no migration.
- Reference field: optional `incoming: boolean` (default false) in `ReferenceFieldSchema`; template
  schema version unchanged (an optional field), editor setting and storybook variant added.
- `ListBinding.maximum?`, `ListCatalogSupport.catalogIds?`; `DocumentExample.companions?` (example
  ids created with it, with the reference keys to rewrite).
- `referenceScope.scopedKinds`: ruleset-level pages see module kinds too (D6).
- Catalog `v5-skills` (from the profile labels). Translations: `ui/sheet/v5.yaml` gains
  `storyteller.*` and `group.*` (fields, types, sections, views); examples in `documents.examples`;
  glossary terms.
- Diagnostics: `linked-from-truncated`.

## Principles at risk

- **I/II (boundaries)**: new kinds live in `systems/v5/`; generic code changes are options on
  existing bindings, the reference scope rule, and the back-link reader over the index.
- **VI (consistency)**: pages built from the shared template parts; the new list maximum and catalog
  sets are binding options, shown in the storybook's bound-list story; incoming references and a
  number-shown trait (if D2 needs it) are options of existing elements, set in the editor and shown
  in the storybook.
- **VII (scale)**: back-links load at most 200 linking documents by id (scale note in the spec);
  SC-004 measured with 30 members and 50 groups in a perf test.
- **VIII (third-party)**: examples and docs in our own words; the Dark Pack badge comes from the V5
  plugin's policy as for the other V5 kinds; no published stat block copied.

## Tests

- `tests/sheet_manager/systems/v5/storyteller.test.ts`: schema defaults and limits (clamped pools,
  track lengths), bindings resolve, `v5-skills` catalog in both languages, examples parse.
- `tests/sheet_manager/systems/v5/storyteller-sheet.test.tsx`: pages render; pool, exceptional, and
  difficulty rolls name the document and add no Hunger or Desperation dice.
- `tests/sheet_manager/systems/v5/group.test.tsx`: members across kinds (hunter, vampire,
  storyteller), the group not offered as its own member, a deleted member shows as gone and is
  removable, member-of links on a brief; an incoming reference field built in the editor works.
- `tests/sheet_manager/linked-from.test.ts` and `linked-from.perf.test.ts`: lookup through the
  index, setting scope, a renamed key still found, bound and report, 30 members / 50 groups under
  200 ms.
- `tests/sheet_manager/reference-scope.test.ts` (extend): ruleset-level pages offer module kinds;
  line pages and user settings unchanged.
- `tests/sheet_manager/systems/v5/tracking-switch.test.tsx`: Hunger dice 0 when off, trackers
  hidden, values kept and back when on; hunter Willpower hidden, Desperation unaffected.
- `tests/sheet_manager/create-from-choice.test.ts` (extend): group example copies its members and
  links the copies.
- Existing guards: shipped-template editor parity (spec 038), docs embeds, `validate:data`,
  `validate:i18n`, the brief layout smoke test gains the two briefs at 400 px and 360 px.

## Manual walk

1. **New** → search «рассказчик» → Storyteller character "Detective Ruiz", pools 3/5/4, Health 5,
   Willpower 5, Investigation 7, Firearms 5 → the brief beside a vampire at 400 px, no sideways
   scroll.
2. Click Firearms 5 → five dice, the result names Detective Ruiz, no Hunger dice.
3. Set Difficulty 3 → "Roll 6" button rolls six dice.
4. New Group "Church of the Red Dawn" → add Ruiz, a hunter, and a vampire → each one's brief lists
   the church; delete the hunter → its row says gone and can be removed.
5. A vampire with Hunger 3 → switch tracking off → Hunger and Willpower blocks hide, rolls have no
   Hunger dice; switch on → Hunger 3 again.
6. Docs → Storyteller characters → copy the cult → the cult and three members appear, linked.
7. A user setting on V5 → both kinds listed under it in the create dialog.

## Implementation notes

- **D2/D3 — the look is the game's**: the number look of pools and exceptional pools is a binding
  option (`TraitBinding.presentation`, `ListBinding.presentation`, with `ListBinding.maximum`), not
  a page setting, as trait bounds already are; the `StatDot` atom gained `presentation: 'number'`
  and `TraitRow`/`CustomTraitList` pass it on. The editor needs no new setting (the parity test
  already treats a trait's look as the game's), and the storybook shows the number variants as their
  own binding shapes.
- **D3 — skill names**: the `v5-skills` entries carry `nameMessage` (the sheet's skill label); the
  catalog registry (`features/sheet/data/catalogBindings.ts`) translates such entries, since system
  modules load in Node scripts without `@docusaurus/Translate`. Exception recorded in
  `translations/i18n-exceptions.yaml`.
- **D4 — track length**: no separate "boxes" fields; Health and Willpower are four boxes plus the
  track's own +/− (`bonus` −3…+11, so 1–15 boxes), the control the player tracks already have.
- **D10 — docs folder**: the Storyteller pages go to `docs/wod-v5/storyteller/`, and their terms
  (the pool names, Storyteller character) to `translations/glossary/v5-storyteller.yaml` scoped to
  that folder: "Physical" and "Social" are ordinary words on the damage page.
- **D7 — scope of a shared page**: a shipped page shown for a document of a user setting (a core
  kind without a page of its own) takes the document's setting as its reference scope; otherwise a
  group in a user setting could not name members of that setting.
- **D8 — one field**: `trackResources` on vampire and hunter data (default on), one toggle per sheet
  ("Track Hunger and Willpower", hunter: "Track Willpower").
- **D9 — the Sheriff** is a vampire example (`modules/vampire/antagonist.ts`), a companion of the
  Lantern Choir; a companion that is missing is reported (`create-kind-unavailable`) and skipped.
- **Group brief**: Threat sits on its own row; five dots do not fit a third of a phone.
- **Brief baselines**: the hunter and mortal full sheets grew by the "Member of" section; their
  heights in `tests-e2e/smoke/brief-baseline.ts` were measured again.
- **SC-005 bundle (T030).** Unique JS and CSS the sheet page loads while creating a vampire through
  the dialog, built from `testing` and from this branch: 19 files, 830,435 → 836,423 bytes gzip
  (+5,988, about 5.8 KB) against a 10 KB budget.
- **SC-004.** 50 groups of 30 members: a member's groups are read in well under 200 ms (perf test).
- **Checks.** `yarn verify:full` passed: 3,051 unit, 15 perf, 51 browser tests.
- **Manual walk (2026-10-18, built site in English; scripted with Playwright).** Steps 1–6 pass:
  Ruiz with pools 3/5/4, five boxes of Health and Willpower, Investigation 7 and Firearms 5, his
  brief without sideways scrolling at 400 px; Firearms rolls `5d10>=6`; Difficulty 3 enables the
  simple-foe roll; a group naming Ruiz and a vampire shows in Ruiz's "Member of"; a vampire's
  tracking switch hides and restores Hunger, Rouse, and Willpower; the docs' Lantern Choir copy
  arrives with its three members linked. No page errors. Step 7 (both kinds in a user setting on V5)
  is covered by `storyteller-sheet.test.tsx` and the library tests rather than walked. SC-001 (two
  minutes on the first try) was met by the scripted walk, not by a player.
- **Maintainer review (pages reworked)**: the full sheet put the standard pools in the brief look
  without names, and the simple-foe roll of twice the Difficulty was not explained. The full sheet
  now has one Pools section (named rows, then exceptional pools beside powers), and the simple foe
  its own section with the pool it gives (a formula, `difficulty * 2`), the roll, and a link to the
  docs. The briefs: name and type on one row, the concept on the next, pools as short chips with
  their die, Health over Willpower, exceptional pools as tight rows, the Difficulty after them,
  powers, notes, and "Member of" folded; the group brief shows members one per line with the search
  behind Add, and goals and resources folded. Generic brief behavior came with it (module notes,
  "Brief look"): tight list rows in brief groups, compact text and enum fields in the caption look,
  compact reference lists, a die beside a pool's short chip, and a one-line number look of
  `StatDot`.
- **Second review (composition)**: the maintainer's rule for full sheets (sections of five or more
  fields → cards of three or more → fields; collapsible only for parts that grow without bound or
  that play rarely needs) is now in the `sheet-templates` skill. The Storyteller sheet is two
  sections (the character: portrait and an identity card with the Difficulty, its roll, and "Member
  of"; pools and condition: standard pools with Health and Willpower, exceptional pools, powers,
  notes), the group sheet one; "Member of" moved into the identity card of every V5 full sheet, the
  simple foe's pool field was dropped (the button names the roll). A compact rating among a brief's
  flowing cells had no width of its own (`.term-row` is an inline-size container) and now takes at
  least 12rem. The brief block as its own element is T-125.
