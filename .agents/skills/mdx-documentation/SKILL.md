---
name: mdx-documentation
description: MDX documentation conventions for this project — admonition syntax, cross-references, dice notation, attribute/skill formatting, and UI element conventions.
---

# MDX Documentation Conventions

## Imports

Import project code with the Docusaurus alias: `import { TWWrapper } from '@site/src/shared/components/TWWrapper';`.
Never use root-absolute (`/src/...`) or relative paths into `src/` — webpack tolerates them, but TypeScript, knip,
and IDEs cannot resolve them. `tests/docs/mdx-imports.test.ts` enforces this and checks every import resolves.

## Admonitions

Use bracket syntax for titles: `:::type[Title]` NOT `:::type Title`:

```mdx
:::tip[Before you begin]
Open the [Character Sheet](/universal_sheet) in a new tab.
:::

:::note[Difficulty reference]
Standard difficulty is 6.
:::

:::caution[Soaking Lethal damage]
PCs always lose at least 1 Health level.
:::

:::info[The 80/20 rule]
This guide covers 20% of rules for 80% of gameplay.
:::
```

Close an admonition with `:::` on its own line, and leave a blank line between a JSX block
(`</TWWrapper>`) and the text after it. Otherwise MDX glues the paragraph to the block, the
closing `:::` becomes text, and the admonition runs to the end of the page
(`tests/docs/admonitions.test.ts`).

## Spacing after embeds (important)

Embedded elements (`TemplateFragment`, `TemplatePreview`, `CatalogBrowser`, `DataCatalog`,
`InlineRoll` blocks) have no bottom margin, so the next paragraph, list, or admonition sticks
to them. Separate them with two line breaks:

```mdx
<TWWrapper>
    <TemplateFragment systemId="wod-v5" template="v5-hunter-sheet" node="attributes" />
</TWWrapper>

<br />
<br />

:::note[Example: Lena]
…
:::
```

Not needed when a heading follows (headings bring their own margin) or when the embed closes an
admonition. Enforced for `docs/wod-v5` by `tests/docs/wod-v5-docs.test.ts`. (Older Star Wars pages use a
single `<br />`.)

## Catalogs in documentation

Show a catalog's entries with `<CatalogBrowser catalogId="…" />` (from
`@site/src/sheet_manager/docsEmbeds`, inside `TWWrapper`): a searchable, filterable table with a
detail panel, localized from the catalog translations. The catalog must declare `browse`
(columns, filters, optional child catalog) in its plugin; a list lives on one page only — link
to it from other pages instead of repeating it.

## Russian terminology

- The first mention of a glossary game term on a Russian page reads «Русский (English)»
  (`Воровство (Larceny)`); later mentions are Russian only. The verifier's `docs-terms` rule
  checks it (terms come from `translations/glossary/`, scoped to the system's docs tree).
- Catalog embeds (`DataCatalog` filters, `EntityGrid` getters) use the exported descriptor-based
  configs from `src/data/*Config.tsx`, never literal labels.

## Cross-References

Use relative links: `[Dice Pools](../core-rules/dice-pools.mdx)` — never absolute.

## Text Formatting

| Element               | Format                     | Example                                |
| --------------------- | -------------------------- | -------------------------------------- |
| Dice notation         | `` `3d6` ``, `` `4d6+1` `` | inline code                            |
| Attribute/skill names | **bold**                   | **Dexterity**, **Blaster**             |
| Character examples    | _italic_                   | _Jax Vorn_                             |
| UI elements           | `` `inline code` ``        | click **New**, fill the **Name** field |

## V5 page format (candidate for all systems)

Pages under `docs/wod-v5/` follow `specs/008-hunter-v5-character/contracts/docs-structure.md`,
enforced by `tests/docs/wod-v5-docs.test.ts`. It is the candidate format for a future rework of
the Star Wars docs (TODO T-047).

- Front matter: `title`, `sidebar_position`, **`description`** (required), optional
  `sidebar_label`; folder index pages add `slug: ./` and `<DocCardList />`.
- Every page opens with `:::tip[In short]` (RU: `:::tip[Коротко]`), 2–4 lines.
- Pages carry no publisher notice. The Dark Pack statement (badge, verbatim notice,
  explanation) lives only on `docs/wod-v5/dark-pack.mdx`:
  `<TWWrapper><PolicyStatement policy="dark-pack" /></TWWrapper>` (import from
  `@site/src/sheet_manager/docsEmbeds`). Sheets show only the badge linking there.
- Guided creation steps (`first-hunter/0N-*`): progress line, In short, "Why it matters at the
  table", "Decide" (questions), optional "Options at a glance", "On your sheet"
  (`<TemplateFragment systemId="wod-v5" template="v5-hunter-sheet" node="…"/>`), a running example
  in `:::note[Example: Lena]`, optional `<details>` questions, `:::info[Checkpoint]`, "Next".
- Dice examples use `InlineRoll` with fixed results and explain criticals in words.
- Own words only: names from the books are fine; explanations, examples, and tables are ours.
