# Sheet Templates — Formulas and Documentation Embeds

Reference for the `sheet-templates` skill: the formula language and sheet embeds in documentation.

## Formulas (`features/sheet/declarative/formula.ts`)

- Grammar: numbers, texts in double quotes, coordinates (`kebab` or `kebab.current` / `kebab.max`),
  `row.<column>` (row buttons only), `+ - * /`, one comparison per part (`< <= > >= = !=`, 1 or 0),
  `&` joining texts, parentheses, unary minus, and the functions `min`, `max`, `ceil`, `floor`,
  `round`, `abs`, `if(cond, a, b)` (only the chosen branch is evaluated), `and`, `or`, `not`, and
  `rating(list, "Name")` (spec 038). Pure tokenizer → parser → evaluator; results are
  `number | string` (`evaluateFormulaValue`), and `evaluateFormula` keeps numbers-only callers
  (bounds, lengths) honest: a text there is `non-numeric`.
- One coordinate space: bag values (texts and choices read as text, toggles as 1/0) plus system
  traits, pools, rating-mode values by bare name, and text fields (`readBoundNumber` and the text
  branch of `resolveBase` in `hooks.ts`). `rating()` reads a template list by value key or a game's
  list by data key (`listRating.ts`: any catalog name, the highest when named twice).
- `formulaState.evaluate(source, { row })` runs any formula on the page: display conditions
  (`visibleWhen: { formula }`, shown while non-zero / non-empty; an empty field hides quietly, other
  errors report `formula-error`), buttons, and From catalog conditions. The editor checks them all
  against `listTemplateFormulaCoordinates`.
- Shipped formula fields translate text results through `textMessages` (literal → message id).
- `formula` fields are read-only and never stored. `maxFrom` (rating/number/primitive) clamps the
  display; stored values are clamped only when the bounded value itself is edited. For a rating the
  resolved maximum also raises the range above the static `max`, up to 100.
- Errors are labeled in the UI (`unknown-coordinate` names the coordinate, `circular` for a real
  cycle or a formula reading itself, `division-by-zero`, `non-numeric` for a stored value that is
  not a number, `parse` for a formula that does not parse, which also reports `formula-error`). A
  missing value is final for the render pass, never a cycle. An empty field reads as unavailable
  (not 0). A `maxFrom` that cannot be computed shows the same reason, naming the value it lacks
  (`MaxState` in `hooks.ts`, `formulaErrorMessage` in `formulaMessages.ts`); the static `max` then
  applies. Behavior tests: `template-formulas.test.ts` (grammar), `derived-values.test.tsx` (sheet),
  the "derived values" block of `template-editor.references.test.tsx` (draft issues and live
  preview).
- Cycles are rejected at authoring (`collectDraftIssues`); at render the evaluator in
  `useTemplatePage` re-orders by dependency with its own cycle guard.
- `collectFormulaDependencies` in `types/template.ts` uses a regex, not the parser (import cycle
  workaround) — it can disagree with `parseFormula` on odd input.

## Documentation embeds (`src/sheet_manager/docsEmbeds.tsx`)

The only entry point docs import. Embeds render the **shipped** default template (never an edited
override) so prose and page stay in sync:

- `<TemplateFragment template="full-sheet" node="attributes" />` — a subtree against the reader's
  current document (editable). Other systems pass `systemId` and their template id
  (`systemId="wod-v5" template="v5-hunter-sheet"`). Without a document of the same system and kind
  it shows a short prompt plus a create button for the definition owning that view.
- `<TemplatePreview document={presetCharacterDocument(JAX_VORN_PRESET)} node="base" />` — a fixed
  document, read-only. Helpers: `healthPreviewDocument(levels)`,
  `vehicleDamagePreviewDocument(levels)`, `exampleDocument('<id>::preset')` (examples in
  `systems/star-wars-wod/examples.ts`, values taken from page prose: `wampa`, `stormtrooper-squad`,
  `red-five`, `lukes-landspeeder`, `millennium-falcon`), and the `JAX_VORN_PRESET` re-export,
  `hunterExampleDocument()` (Lena Varga), `vampireExampleDocument()` (Mirela Voss),
  `PolicyStatement` (full policy statement, used only on the policy's own docs page; embeds show no
  notice), `CatalogSummaryTable` (catalog names with `summary` descriptors or a lazy `summary` text,
  optional `groupBy` and child catalog), and `CreateCharacterButton` (optional `exampleId`; the
  `mdx-documentation` skill). With no compatible document, `TemplateFragment` offers to create one
  of the template's document type. MDX imports sheet content only from `docsEmbeds.tsx`.
- Embeds use `DeclarativeSheetView embedded` (no page chrome, no preset seeding — a partial render
  must not mark the template as seeded).
- `tests/sheet_manager/docs-embeds.test.tsx` scans en + ru MDX and fails on any embed whose
  template/node/systemId or `exampleDocument` id does not exist, and on any MDX import of retired
  sheet modules; every example renders each of its kind's views without degradation.
