---
name: mdx-documentation
description:
    MDX documentation conventions for this project — admonition syntax, cross-references, dice
    notation, attribute/skill formatting, and UI element conventions.
---

# MDX Documentation Conventions

## Imports

Import project code with the Docusaurus alias:
`import { TWWrapper } from '@site/src/shared/components/TWWrapper';`. Never use root-absolute
(`/src/...`) or relative paths into `src/` — webpack tolerates them, but TypeScript, knip, and IDEs
cannot resolve them. `tests/docs/mdx-imports.test.ts` enforces this and checks every import
resolves.

## Admonitions

Use bracket syntax for titles: `:::type[Title]` NOT `:::type Title`:

```mdx
:::tip[Before you begin] Open the [Character Sheet](/universal_sheet) in a new tab. :::

:::note[Difficulty reference] Standard difficulty is 6. :::

:::caution[Soaking Lethal damage] PCs always lose at least 1 Health level. :::

:::info[The 80/20 rule] This guide covers 20% of rules for 80% of gameplay. :::
```

Close an admonition with `:::` on its own line, and leave a blank line between a JSX block
(`</TWWrapper>`) and the text after it. Otherwise MDX glues the paragraph to the block, the closing
`:::` becomes text, and the admonition runs to the end of the page
(`tests/docs/admonitions.test.ts`).

## Spacing after embeds (important)

Embedded elements (`TemplateFragment`, `TemplatePreview`, `CatalogBrowser`, `DataCatalog`,
`InlineRoll` blocks) have no bottom margin, so the next paragraph, list, or admonition sticks to
them. Separate them with two line breaks:

```mdx
<TWWrapper>
    <TemplateFragment systemId="wod-v5" template="v5-hunter-sheet" node="attributes" />
</TWWrapper>

<br />
<br />

:::note[Example: Lena] … :::
```

Not needed when a heading follows (headings bring their own margin) or when the embed closes an
admonition. Enforced for `docs/wod-v5` by `tests/docs/wod-v5-docs.test.ts`. (Older Star Wars pages
use a single `<br />`.)

## Catalogs in documentation

Show a catalog's entries with `<CatalogBrowser catalogId="…" />` (from
`@site/src/sheet_manager/docsEmbeds`, inside `TWWrapper`): a searchable, filterable table with a
detail panel, localized from the catalog translations. The catalog must declare `browse` (columns,
filters, optional child catalog) in its plugin; the catalog's lazy long texts (summaries, banes)
load on demand into the detail panel. `<CatalogSummaryTable catalogId="…" />` is the short
name-and-summary table for a choice inside a step. A list lives on one page only — link to it from
other pages instead of repeating it.

## Russian terminology

- The first mention of a glossary game term on a Russian page reads «Русский (English)»
  (`Воровство (Larceny)`); later mentions are Russian only. The verifier's `docs-terms` rule checks
  it (terms come from `translations/glossary/`, each file scoped to the docs folders listed in the
  verifier's `glossaryDocs`; a longer term such as «Сила крови» hides the shorter «Сила» inside it).
  Hint only the meaning the term has: «точку в Дисциплине», not «точку Дисциплины (Disciplines)». A
  bilingual glossary page is excepted in `translations/i18n-exceptions.yaml`.
- Catalog embeds (`DataCatalog` filters, `EntityGrid` getters) use the exported descriptor-based
  configs from `src/data/*Config.tsx`, never literal labels.

## Explicit heading ids

When an anchor must match across locales (for example links from the app), give the heading an
explicit id, escaped: `## Shared value key \{#shared-value-key}`. The site runs with `future.v4`,
which drops MDX 1 compatibility, so an unescaped `{#id}` fails the build as a JS expression. Use the
same id in the English page and its Russian mirror.

## Cross-References

Use relative links: `[Dice Pools](../core-rules/dice-pools.mdx)` — never absolute.

## Text Formatting

| Element               | Format                     | Example                                |
| --------------------- | -------------------------- | -------------------------------------- |
| Dice notation         | `` `3d6` ``, `` `4d6+1` `` | inline code                            |
| Attribute/skill names | **bold**                   | **Dexterity**, **Blaster**             |
| Character examples    | _italic_                   | _Jax Vorn_                             |
| UI elements           | `` `inline code` ``        | click **New**, fill the **Name** field |

## Site guide pages

How to use the site (the sheet, documents, the dice roller, the template editor, roll sharing) lives
in `docs/guide/`, apart from the rules of each setting; the app's help links point there. Pages
follow the V5 front matter and In short rules below, describe what the reader sees and does, and
name controls by their visible labels. A page of a setting may link to the guide but never repeats
it.

Show rather than describe: where a control or a result can be drawn by the real code, embed it
instead of adding prose. Real interface goes in `<LiveDemo>` (`shared/components/LiveDemo`):
`kind="live"` (the default) for parts that act on the reader's own data, such as the dice panel
(`DicePanelContent`) or `GameTermsMenu`; `kind="example"` for parts drawn from example data that
nothing saves, such as `ViewsPreview` (a document in each of its views, from `docsEmbeds`) or
`SharedRollPreview` (a post built by the real message code). Notation examples roll in place with
`RollExample` (every die and its marks) and `NotationSandbox` (the panel's own check); neither
reaches the history. Never fork a component for a page: add an option to the real one.

Create buttons: `<CreateCharacterButton systemId="…" definitionId="…" />` (from `docsEmbeds`, in
`TWWrapper`) makes a blank document of that kind and labels itself "New: <kind> (<setting>)";
`exampleId="<id>"` makes a copy of one of the kind's shipped examples ("Copy <name>"), as on the
"Meet" pages of the first-character guides. Both confirm with a message linking to the sheet. The
ids must name an installed kind and one of its `examples`; `docs-create-button.test.tsx` checks
every page. The V5 Storyteller pages (`docs/wod-v5/storyteller/`) preview their examples with
`v5ExampleDocument(id)`; their own terms live in `translations/glossary/v5-storyteller.yaml`, scoped
to that folder.

## V5 page format (candidate for all systems)

Pages under `docs/wod-v5/` follow `specs/008-hunter-v5-character/contracts/docs-structure.md`,
enforced by `tests/docs/wod-v5-docs.test.ts`. It is the candidate format for a future rework of the
Star Wars docs (TODO T-047).

- Front matter: `title`, `sidebar_position`, **`description`** (required), optional `sidebar_label`;
  folder index pages add `slug: ./` and `<DocCardList />`.
- Every page opens with `:::tip[In short]` (RU: `:::tip[Коротко]`), 2–4 lines.
- Pages carry no publisher notice. The Dark Pack statement (badge, verbatim notice, explanation)
  lives only on `docs/wod-v5/dark-pack.mdx`:
  `<TWWrapper><PolicyStatement policy="dark-pack" /></TWWrapper>` (import from
  `@site/src/sheet_manager/docsEmbeds`). Sheets show only the badge linking there.
- Guided creation steps (`first-hunter/0N-*`): progress line, In short, "Why it matters at the
  table", "Decide" (questions), optional "Options at a glance", "On your sheet"
  (`<TemplateFragment systemId="wod-v5" template="v5-hunter-sheet" node="…"/>`), a running example
  in `:::note[Example: Lena]`, optional `<details>` questions, `:::info[Checkpoint]`, "Next".
- Dice examples use `InlineRoll` with fixed results and explain criticals in words.
- Own words only: names from the books are fine; explanations, examples, and tables are ours.
