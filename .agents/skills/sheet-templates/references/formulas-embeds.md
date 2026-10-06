# Sheet Templates — Formulas and Documentation Embeds

Reference for the `sheet-templates` skill: the formula language and sheet embeds in documentation.

## Formulas (`features/sheet/declarative/formula.ts`)

- Grammar: numbers, coordinates (`kebab` or `kebab.current` / `kebab.max`), `+ - * /`, parentheses,
  unary minus, and `min(a, b, …)` / `max(a, b, …)`. Pure tokenizer → parser → evaluator.
- One coordinate space: bag numbers plus system traits/pools (`readBoundNumber`, called from
  `resolveBase` in `hooks.ts`).
- `formula` fields are read-only and never stored. `maxFrom` (rating/number/primitive) clamps the
  display; stored values are clamped only when the bounded value itself is edited. For a rating the
  resolved maximum also raises the range above the static `max`, up to 100.
- Errors are labeled in the UI (`unknown-coordinate` names the coordinate, `circular` for a real
  cycle or a formula reading itself, `division-by-zero`, `non-numeric` for a stored value that is
  not a number, `parse` for a formula that does not parse, which also reports `formula-error`). A
  missing value is final for the render pass, never a cycle. Behavior tests:
  `template-formulas.test.ts` (grammar), `derived-values.test.tsx` (sheet), the "derived values"
  block of `template-editor.references.test.tsx` (draft issues and live preview).
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
  `hunterExampleDocument()` (Lena Varga), `PolicyStatement` (full policy statement, used only on the
  policy's own docs page; embeds show no notice), `CatalogSummaryTable` (catalog names with
  `summary` descriptors, optional `groupBy` and child catalog), and `CreateCharacterButton`. MDX
  imports sheet content only from `docsEmbeds.tsx`.
- Embeds use `DeclarativeSheetView embedded` (no page chrome, no preset seeding — a partial render
  must not mark the template as seeded).
- `tests/sheet_manager/docs-embeds.test.tsx` scans en + ru MDX and fails on any embed whose
  template/node/systemId or `exampleDocument` id does not exist, and on any MDX import of retired
  sheet modules; every example renders each of its kind's views without degradation.
