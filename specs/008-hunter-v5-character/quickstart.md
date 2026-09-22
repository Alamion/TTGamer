# Quickstart: Validating the V5 Hunter Feature

Run guide proving the feature end to end. Shapes and rules are in
[data-model.md](data-model.md) and [contracts/](contracts/); this file only lists scenarios.

## Prerequisites

```bash
yarn install
yarn build:translations
yarn start            # http://localhost:3000, sheet at /universal_sheet
```

## Automated gates

```bash
yarn test tests/sheet_manager     # registry, schema, condition tracks, catalogs, bindings, templates, notices, import/export
yarn test tests/docs              # MDX imports, docs embeds, v5 docs anatomy
yarn validate:i18n                # en ↔ ru parity incl. docs/wod-v5
yarn validate:data
yarn verify:full                  # lint + typecheck + tests + production build (new route tree, shared components)
```

Expected: all pass, and `tests/setup/sheetIssues.ts` reports no unexpected diagnostics.

## Scenario 1 — Create and play (US1, US2)

1. `/universal_sheet` → create → under **Hunter: the Reckoning 5e** choose **Character**; Manage
   documents shows type "Character" and the setting in its own column.
2. Expect: all attributes 1, skills 0, Health 4 boxes, Willpower 2 boxes, small Dark Pack badge
   bottom-left under the sheet (links to the Dark Pack docs page).
3. Set Stamina 3, Composure 2, Resolve 3 → Health 6, Willpower 5.
4. Health: click box 1 twice (×) and box 2 once (╱) → `× ╱ _ _ _ _`; press **+** after the track
   → 7 boxes, **−** → 6.
5. Lower Stamina to 1 (fewer boxes), then back to 3 → marks unchanged.
6. Creed: pick _Faithful_ from suggestions; Drive: type a custom value → both saved. Toggle
   Despair; change Desperation and Danger.
7. Edges: add _Sense the Unnatural_. Perks: add a row → suggestions list only its four Perks (all
   Perks while no book Edge is on the sheet); picking one fills the Edge column in the reader's
   language. Move rows up and down.
8. Medicine 3 with specialization `Trauma, Triage` typed next to the skill; no S/P/E flags on V5
   traits.
9. Advantages/Flaws suggest only their own polarity; a weapon picked from the catalog fills name and
   damage (V5 has no magazine capacity, ammo counters stay 0); inventory items add, edit, remove.
10. Try Strength 6 via import or devtools write → rejected, diagnostic reported.
11. Switch to **Brief**: identity, condition, attributes, skills, Edges, weapons visible; change
    Willpower/Despair → switch back, same values.
12. Reload page → everything persists.

## Scenario 2 — Export/import (US3)

1. Export → `ttgamer_<name>.json` contains `"systemId": "wod-v5"`, `"definitionId": "hunter"`, `notices`.
2. Delete, import → identical sheet; import again → Replace / Duplicate / Cancel.
3. Edit file: `"strength": { "value": 9 }` → import shows error; entry appears in recovery.
4. Export a Star Wars character → file has no `notices`; re-import unchanged.

## Scenario 3 — Re-skin (US4)

1. Template library → copy `v5-hunter-sheet` → rename Firearms → _Archery_, Technology → _Alchemy_,
   Creed label → _Oath_, remove Chronicle Tenets section, rename ≥ 10 labels total; save.
2. Apply to the hunter → renamed labels, same dots; Dark Pack badge still shown.
3. Export template → wrapper has `notices`; import on a fresh browser profile; apply to an imported
   hunter → works.
4. Try applying the template to a Star Wars character → refused with a clear message.
5. Shipped template list contains no fantasy/homebrew template.

## Scenario 4 — Ruleset boundary (US5)

Review `src/sheet_manager/systems/v5/`: ruleset files contain no hunter names; the hunter module
only extends the core schema, adds catalogs, bindings, and templates; generic code has no `v5` or
`hunter` string conditionals (`grep -rn "'hunter'\|'v5'\|'superficial'" src/sheet_manager --include=*.ts* | grep -v 'systems/v5\|systems/index.ts'`
returns only registry wiring). Star Wars tests pass unchanged.

## Scenario 5 — Docs (US6)

1. Docs sidebar → _World of Darkness 5th Edition → Hunter_ → entry page shows three doors.
2. Quickstart: dice example, damage basics, Desperation/Despair, 10-minute creation checklist, links work.
3. Newcomer path with an empty sheet store: step 3 shows a create-hunter prompt; create → the
   Creed/Drive fragment becomes editable and writes to the new hunter.
4. Walk steps 1–10; each has In short, Decide, On your sheet, Lena's example, Checkpoint, Next.
5. Switch locale to Russian → every page exists; the Dark Pack statement appears only on its own page.
6. Hallway test (SC-009): a person new to TTRPGs completes a hunter in < 60 minutes without help.

## Scenario 6 — Table readiness (SC-008)

By 2026-09-20 scenarios 1–2 pass on the deployed site; by 2026-09-29 all scenarios pass.

## Results

2026-09-19 — Scenarios 1–5 walked in the app; every bug they surfaced was fixed in the same pass.
2026-09-23 — Scenario 6 (table readiness) met: the maintainer and several other players created and
ran hunters on the deployed site. All of them already knew H:tR, so SC-009 is NOT covered: the
hallway test with a true newcomer is now an acceptance criterion of backlog task T-053 (guided
step-by-step creation and the in-app system quickstart), which owns onboarding.
