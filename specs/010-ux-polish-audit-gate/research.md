# Phase 0 Research: Small UX polish and dead-code gate

All findings were taken from the current tree on 2026-09-23 (branch `testing`).

## R1 — Verification tier for the dead-code audit

**Decision**: knip runs inside `yarn verify` (Tier 2) and therefore inside
`yarn verify:full`; `yarn verify:fast` stays as it is.

**Rationale**: a measured full knip run on this repository takes ~17 s, which is a
noticeable addition to a pre-commit hook that currently runs on every feature-branch
commit. Tier 1 would also fail on a module that is written but not yet imported, which
is a normal mid-feature state. Tier 2 runs on the main branches' pre-commit hook and
before a merge, which is where dead code actually matters. Confirmed by the user
(Q1 → A).

**Alternatives considered**: Tier 1 (fast feedback, but constant false failures
mid-feature and +17 s per commit); Tier 3 only (effectively never runs); a separate CI
step (this project has no CI gate today, so the pre-commit tiers are the only gate).

**Constitution impact**: "Verification Workflow" currently reads "Advisory audit
(`yarn audit:dead-code`) … reviewed by a human, not a merge gate". That line changes,
so this is an amendment with a MINOR version bump and a Sync Impact Report.

## R2 — The two remaining knip findings

**Finding A — duplicate export.** `src/sheet_manager/types/templateValues.ts:96`
declares `TemplateValuesBagSchema = TemplatePageValuesSchema`; the only importer is
`src/sheet_manager/types/document.ts:3`.

**Decision**: drop the alias and have `document.ts` use `TemplatePageValuesSchema`,
moving the alias's explanatory comment (document-global bag keyed by valueKey) to the
`templateValues` field in `document.ts`, where it describes the actual usage.

**Rationale**: the alias carries no separate schema and no separate type; the
distinction it documented is a property of the field, not of the schema. Nothing that
Zod validates changes.

**Alternatives considered**: keeping the alias and silencing knip (adds configuration
for a name with one importer); giving the bag its own schema object (would be a
different, unnecessary schema).

**Finding B — configuration hint.** knip reports `src/i18n/generated/**` in `ignore` as
removable.

**Decision**: remove that entry from `knip.json`; keep `src/@types/**`.

**Rationale**: verified experimentally — with the entry removed, knip reports no new
findings and the hint disappears, leaving only Finding A. The generated adapters are
reached from real imports, so they no longer need an ignore.

**Verification**: after both fixes, `yarn audit:dead-code` must exit 0 on a clean tree.

**Deliberate exports without importers**: the two template exhaustiveness guards in
`src/sheet_manager/types/template.ts` already carry `@knipignore` with a stated reason;
the `tags: ["-knipignore"]` configuration stays, and that stays the only exemption
mechanism (FR-016).

## R3 — Lazy loading the 3D renderer

**Current shape**: `three` and `cannon-es` are imported only under
`src/dice_roller/dice-logic/renderer/*`. The single runtime importer outside that
folder is `roll-orchestrator.ts`, which statically imports `prepareDiceGeometries` and
`startPhysicsRoll` from `./renderer`; the orchestrator is reached from
`utils/events.ts` → `store/diceRollerStore.ts`. No component imports the renderer.
The public dice API (`dice-logic/index.ts`) does not expose the renderer at all.

**Decision**: replace the two value imports in `roll-orchestrator.ts` with one memoized
`await import('./renderer')`, performed only after the orchestrator has decided the roll
is actually a 3D roll (3D enabled, supported sides present, dice count within
`MAX_PHYSICAL_3D_DICE`). Type-only imports (`DiceGeometryData`, `PhysicsRollHandle`)
stay as `import type` and are erased, so they add no runtime edge.

**Rationale**: `executeUnifiedRoll` is already `async`, so no caller signature changes;
every early-return 2D path already exists above the point where the renderer is first
needed; `processExplosionLoop` already takes `prepareGeometries` as a parameter, so the
loaded module is threaded in rather than re-imported. Memoizing the promise satisfies
"fetched at most once per session" including concurrent requests (FR-004).

**Alternatives considered**: lazy-loading at the component level (no component imports
the renderer, so there is nothing to split there); prefetch on panel open (adds the
download back for readers who never roll in 3D); splitting `three` by sub-path (a
bundler concern that does not remove it from the critical path).

**Failure path (FR-003)**: `dice-logic` must stay free of UI and store dependencies
(Principle IV), so the orchestrator cannot raise a toast. On a failed dynamic import it
logs through `warn(...)`, evaluates the roll in 2D, and returns the result with a new
optional flag on `RollResult`. The UI layer shows the message, following the existing
`manuallyRerolled` precedent (set in the orchestrator at `roll-orchestrator.ts:438`,
consumed in `RollHistory.tsx`).

**Where the toast lives** (decided 2026-09-23 after the consistency analysis, finding
D1): a new `src/dice_roller/components/Renderer3DFallbackNotice.tsx` subscribes through
`onRollResult` and raises a translated `toast.error` once per session, mounted in
`src/theme/Root.tsx` beside `DiscordWebhookSubscription`. Not the Zustand store: a store
raising UI side effects contradicts the store discipline of Principle IV, and
`DiscordWebhookSubscription.tsx` is the module's established precedent for exactly this
shape. `react-hot-toast` is already mounted globally in `Root.tsx`, and `Root.tsx`
already subscribes to roll results for the roll toast, so no new wiring is introduced.

**Retry after a failed load**: the memo stores the in-flight promise; a rejection clears
it so a later roll can try again. This is why FR-004 is phrased as "not fetched again
after a successful load" rather than "once per session".

**Measurement (SC-002)**: `yarn build` before and after, comparing the JS assets of the
sheet route; the figures go into the spec's completion note. No bundle-budget tooling is
introduced (that is T-029).

## R4 — Searchable control for long catalog selects

**Current shape**: `SelectFieldControlRender` in
`src/sheet_manager/features/sheet/declarative/fieldControls.tsx` renders a plain
`<select>` from `catalogOptions` (resolved in `DeclarativeSheetView.tsx:160` from
`CatalogFieldRuntime.options`) or from static `field.options`.

`CatalogSuggest` (`src/sheet_manager/components/controls/CatalogSuggest.tsx`) is a
Radix Popover + cmdk text input over `CatalogEntry {id, name}` with
`matchesSearch(value, name, id)` (case-, `ё`-, and diacritics-insensitive). Its
`onChange` carries the typed text and `onSelect` the chosen entry.

**Key difference**: `CatalogSuggest` is built for free-text fields that store a _name_
(see `useCatalogSuggestions`), while a select field stores an option _value_. So this
change cannot use `CatalogSuggest` directly.

**Decision**: add a thin wrapper in `fieldControls.tsx` that owns the query text as
local state, renders `CatalogSuggest` over the resolved options
(`{id: option.value, name: option.label}`), writes `entry.id` through the field's
`onChange` on select, and shows the current value's label — or the raw stored value when
no option matches it (FR-008). An empty input clears the field to `undefined`, matching
the `—` option of the plain select. `ariaLabel` receives `field.label` (FR-009).
Threshold: `options.length > 12` (T-064), applied after the options are resolved, to
single-select fields only.

**Rationale**: reusing the existing control keeps the search semantics and the bilingual
labels identical to the pickers shipped in T-062; the wrapper is the only new behavior
and lives beside the control it replaces.

**Multi-select**: left on the plain `<select multiple>`. `CatalogSuggest` has no
multi-value affordance, and adding one is a control design, not a threshold switch. The
spec's Assumptions are amended accordingly (see the Complexity/Deviation note in
`plan.md`).

**Catalog-fill interaction**: `DeclarativeSheetView` intercepts select changes on bound
fields to apply catalog fills. The wrapper writes through the same `onChange`, so fills
keep working unchanged — a regression test covers it.

**Option list crossing the threshold after first render** (spec edge case): the control
is chosen from the resolved list on each render; because the resolution is memoized per
catalog and locale in `useTemplatePage`, an in-place swap is not expected. Task T042
asserts that a field keeps its control while the user interacts with it, even when the
option list grows past the threshold between renders.

## R5 — Clear control visibility and its accessible name

**Current shape**: `StatDot.tsx:188-205` renders the remove button with
`text-textSecondary opacity-40 hover:opacity-70 hover:text-error` and only a `title`
attribute — no `aria-label`, which the accessibility floor requires for icon-only
buttons (Principle VI).

**Decision**: at rest the control uses the error color at reduced opacity
(`text-error opacity-50`), rising on hover and on keyboard focus
(`hover:opacity-100 focus-visible:opacity-100`) with the project's visible focus ring;
`aria-label` is added from the existing `uiMessages.sheet.controls.statDot.remove` key,
which already exists in both locales (`translations/source/{en,ru}/ui/sheet/controls.yaml`).

**Rationale**: `error` is an existing palette token used elsewhere in the same file's
hover state, so no new design token is introduced; the key already exists, so no
translation source change is needed and `yarn i18n:verify` stays green.

**Size/layout**: the button keeps `flagSizeClasses[size]` and its `ml-auto` placement, so
row layouts — including the narrow brief rows — do not shift (FR-013).
