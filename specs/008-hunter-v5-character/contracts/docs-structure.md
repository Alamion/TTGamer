# Contract: V5 and Hunter Documentation Structure and Page Format

Boundary: documentation (`docs/v5/**`, `i18n/ru/.../current/v5/**`) ↔ readers and the sheet
(embeds). Research D9–D11. The format is new and deliberately looser than the Star Wars section; if
it proves itself, the Star Wars docs can be reworked to match in a later task.

## Design principles

1. **Two front doors, one house.** Experienced players take the quickstart; newcomers take the
   guided path. Both land on the same reference pages and the same sheet.
2. **Say it short first.** Every page opens with the gist in 2–4 lines, so a reader can stop there.
3. **Teach at the table, not in the book.** Each concept is explained by what it does in play,
   before any number.
4. **One running character.** Lena Varga appears in every example, so choices build on each other.
5. **The page is the sheet.** Newcomer steps embed the reader's own sheet part; reading and filling
   are the same act.
6. **Own words only.** Names from the book are fine; explanations, examples, and tables are ours.
   No page copies book prose, tables, or art (Principle VIII).

## Tree

```text
docs/v5/                                   sidebar: "World of Darkness 5th Edition" (position 3)
├── index.mdx                              What V5 is, which lines are available (Hunter now)
├── rules/                                 Shared V5 mechanics (linked by every V5 line)
│   ├── index.mdx
│   ├── dice-pools.mdx                     pools, difficulty, successes, criticals, messy/total failure basics, Willpower rerolls
│   ├── attributes-skills.mdx              9 attributes, 27 skills, specialties, untrained rolls
│   └── damage-willpower.mdx               Health and Willpower tracks, superficial vs aggravated, impairment, recovery basics
└── hunter/
    ├── index.mdx                          START HERE: what the game is in 3 paragraphs + three doors
    ├── quick-start.mdx                    Play a first scene in 20 minutes
    ├── first-hunter/                      Newcomer path ("Your first hunter")
    │   ├── index.mdx                      What you'll do, what you need, create your hunter button
    │   ├── 01-what-is-a-hunter.mdx        The Reckoning, cells, the hunt — the premise in plain language
    │   ├── 02-concept-ambition-desire.mdx
    │   ├── 03-creed-drive.mdx
    │   ├── 04-attributes.mdx
    │   ├── 05-skills-specialties.mdx
    │   ├── 06-edges-perks.mdx
    │   ├── 07-advantages-flaws.mdx
    │   ├── 08-touchstones.mdx
    │   ├── 09-finishing-touches.mdx       Health, Willpower, Desperation/Danger/Despair, experience, weapons and inventory
    │   └── 10-meet-lena.mdx               The complete example hunter, read-only, with a "what now" list
    └── reference/
        ├── index.mdx
        ├── reading-the-sheet.mdx          Every sheet section → one-line meaning → link to its page
        ├── desperation-danger-despair.mdx
        ├── advantages-flaws.mdx           CatalogBrowser over v5-hunter-advantages (revised 2026-09-16)
        ├── weapons-gear.mdx               CatalogBrowser over weapons, armor, gear (revised 2026-09-16)
        └── glossary.mdx                   V5/H:tR terms, en ↔ ru
```

Creed/Drive tables live only in step 3 and the Edge catalog only in step 6 (the former
duplicate reference pages were removed, 2026-09-16). Embeds followed by content are separated by
two `<br />`.

Russian mirror: identical paths and component imports under
`i18n/ru/docusaurus-plugin-content-docs/current/v5/`; category labels in `current.json`.
`scripts/validate-i18n.ts` checks both roots.

## Front matter

```yaml
---
title: Your First Hunter — Creed and Drive
sidebar_label: 3. Creed & Drive # short labels keep the sidebar scannable
sidebar_position: 3
description: Choose why your hunter fights and what keeps pulling them back to the hunt.
---
```

`description` is required (feeds `DocCardList` cards on index pages and link previews).

## Page anatomy — every page

1. `# Title`
2. `:::tip[In short]` — 2–4 lines, the whole page's takeaway.
3. Body.
4. `## Next` (when there is an obvious next page) — one link, one sentence.

No page carries a policy notice; the Dark Pack statement lives only on `dark-pack.mdx`
(`<PolicyStatement policy="dark-pack" />`, revised 2026-09-15).

## Page anatomy — newcomer step (`first-hunter/0N-*.mdx`)

| Block                       | Form                                                                           | Purpose                                          |
| --------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ |
| Progress                    | `Step N of 9` line under the title                                             | the reader knows where they are                  |
| In short                    | `:::tip[In short]`                                                             | the decision in one sentence                     |
| Why it matters at the table | `##` section, ≤ 2 short paragraphs                                             | concrete play moment where this choice shows up  |
| Decide                      | `##` with 2–4 guiding questions                                                | turns rules into questions a newcomer can answer |
| Options at a glance         | compact table or list (own words)                                              | only where the book offers named choices         |
| On your sheet               | `##` + `<TemplateFragment systemId="v5" template="v5-hunter-sheet" node="…"/>` | fill it now; create-hunter prompt if none        |
| Lena's choice               | `:::note[Example: Lena]`                                                       | the running example makes the same decision      |
| Common questions            | `<details>` blocks, optional                                                   | newcomer doubts without cluttering the flow      |
| Checkpoint                  | `:::info[Checkpoint]` checklist                                                | what should be on the sheet before moving on     |
| Next                        | link to step N+1                                                               |                                                  |

Budget numbers (e.g. attribute spread, skill spreads, Edge/Perk picks) are shown as **our own**
compact tables with the numbers only, never as copies of book tables.

## Quickstart anatomy (`hunter/quick-start.mdx`)

1. In short.
2. **What you need** — sheet tab, a handful of d10s (or the site roller), a group.
3. **The one roll you need to know** — pool = attribute + skill, 6+ is a success, pairs of 10s are
   criticals; a fixed `InlineRoll` example with Lena, counted in words.
4. **Hurting and pushing** — Health/Willpower in 5 bullets, superficial vs aggravated, spending
   Willpower to reroll.
5. **The hunter twist** — Desperation dice, Danger, Despair at a glance (links to reference).
6. **Make a hunter in 10 minutes** — compressed checklist of all creation steps with the numbers,
   one `TemplateFragment` for the header and a link per step to the newcomer path for detail.
7. **Your first scene** — a 5-line example exchange at the table.
8. **Where next** — three links: newcomer path, reading the sheet, dice pools.

## Entry page (`hunter/index.mdx`)

- 3 short paragraphs: who hunters are, what a session looks like, what makes it different.
- Three "doors" as cards: _I've never played a tabletop RPG_ → `first-hunter/`; _I know tabletop
  games_ → `quick-start`; _I'm running the game_ → `reference/` + `rules/`.
- `<CreateCharacterButton systemId="v5" definitionId="hunter" />`.

## Components allowed

`TWWrapper`, `InlineRoll` (fixed results only), `CatalogSummaryTable` (catalog names + own-words
summaries), `TemplateFragment` / `TemplatePreview` (never render their own notice)
(`systemId="v5"`), `CreateCharacterButton`, `PolicyStatement` (Dark Pack page only), `@theme/DocCardList`. All imports via
`@site/`. No `CharRoll` (Star Wars shape; T-045).

## Enforcement

- `tests/docs/v5-docs.test.ts`: every `.mdx` under `docs/v5` and the RU mirror has front-matter
  `description` and a `:::tip[In short]` block; only `dark-pack.mdx` has a `<PolicyStatement`; every `first-hunter`
  step has a `TemplateFragment` whose `node` exists in `v5-hunter-sheet` (extends
  `docs-embeds.test`).
- `yarn validate:i18n` covers `docs/v5`; `tests/docs/mdx-imports.test.ts` already covers imports.
