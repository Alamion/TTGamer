# Implementation Plan: Small UX polish and dead-code gate

**Branch**: `testing` (spec directory `010-ux-polish-audit-gate`) | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-ux-polish-audit-gate/spec.md`

## Summary

Four independent backlog entries batched into one cycle: the 3D dice engine leaves the
critical path and loads on the first 3D roll (T-013); long catalog-bound selects switch
to the existing searchable control (T-064); the rating clear control becomes visible and
gains an accessible name (T-055); and the dead-code audit's last two findings are closed
so knip can gate `yarn verify` (T-030, a constitution amendment).

Technical approach, from [research.md](research.md): one memoized dynamic import inside
`roll-orchestrator.ts` behind the existing 3D decision points, with a failure flag on
`RollResult` that the UI turns into a toast; a thin wrapper around `CatalogSuggest` in
`fieldControls.tsx` that maps option value ↔ label; a class and `aria-label` change in
`StatDot.tsx`; and the removal of a one-importer schema alias plus a stale knip ignore.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5, Zod, Radix UI + cmdk, three +
cannon-es (the packages being made lazy), react-hot-toast, knip 5

**Storage**: IndexedDB via localForage (untouched by this feature; no schema or
persisted-shape change)

**Testing**: Vitest (`tests/dice_roller`, `tests/sheet_manager`)

**Target Platform**: static site (Vercel), modern browsers, phone width supported

**Project Type**: single frontend project (Docusaurus site + React modules)

**Performance Goals**: no 3D rendering or physics code in the initial download of any
route; the first 3D roll loads it once per session

**Constraints**: `dice-logic` stays pure — no UI, DOM, or store dependency; no persisted
data shape changes; no new design tokens; no new translation keys required

**Scale/Scope**: 4 modules touched (`dice_roller`, `sheet_manager`, `theme`/UI shell for
the toast, repo verification config); ~8 source files plus tests and documents

## Constitution Check

_GATE: checked before Phase 0 and re-checked after Phase 1._

| Principle                                    | Assessment                                                                                                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                     | Pass. Each change stays inside one module; the renderer stays behind `dice-logic`'s own folder boundary and nothing new imports another module's internals.                            |
| II. Explicit Contracts at Boundaries         | Pass. `dice-logic/index.ts` keeps its shape (FR-005); the new `RollResult` flag is an additive optional field on an existing contract; the removed schema alias changes no validation. |
| III. Pleasurable Cross-Module Interactions   | Pass. The 3D load failure degrades to a completed 2D roll with a user-visible, translated message and a diagnostics/log report — no silent fallback.                                   |
| IV. Fit-for-Purpose Code Quality             | Pass, with one watch item: the dynamic import must not pull UI or store code into `dice-logic`. The orchestrator returns a flag; the toast lives in the UI layer.                      |
| V. Risk-Proportional Testing                 | Pass. Dice-logic change → full test suite (Tier 2); sheet control change → component tests; presentational change → targeted test; audit change → the gate itself is the test.         |
| VI. Consistent, Accessible Experience        | Pass, and it repairs an existing violation: the clear control gets the `aria-label` the floor requires. The searchable control must stay keyboard-operable and labeled.                |
| VII. Performance as a Shared Budget          | Pass, and it delivers the rule this principle already states ("heavy capabilities MUST be lazy-loaded"). SC-002 records the before/after figures.                                      |
| VIII. Respectful Use of Third-Party Material | Not applicable: no rules text, catalog text, or publisher material changes.                                                                                                            |

**Amendment required**: the "Verification Workflow" section calls `yarn audit:dead-code`
an advisory audit "reviewed by a human, not a merge gate". FR-015/FR-017 change that to
a Tier 2 gate. This is a MINOR amendment with a Sync Impact Report, mirrored into
`AGENTS.md` §10 and the project cheat sheet's command table.

**Post-Phase-1 re-check**: unchanged — the Phase 1 design introduces no new module edge,
no new dependency, and no new persisted shape. The only deviation is recorded below.

## Project Structure

### Documentation (this feature)

```text
specs/010-ux-polish-audit-gate/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── baseline.md          # before/after build and audit figures (SC-002)
├── contracts/           # Phase 1 output
│   ├── lazy-renderer.md
│   ├── catalog-select-control.md
│   └── verification-tiers.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output ($speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── dice_roller/
│   ├── dice-logic/
│   │   ├── roll-orchestrator.ts        # memoized dynamic import of ./renderer (T-013)
│   │   ├── types.ts                    # additive optional RollResult flag
│   │   └── renderer/                   # unchanged; becomes the lazy chunk
│   └── components/Renderer3DFallbackNotice.tsx  # subscriber that reads the flag and toasts
├── sheet_manager/
│   ├── components/stat-fields/StatDot.tsx          # clear control (T-055)
│   ├── components/controls/CatalogSuggest.tsx      # reused unchanged
│   ├── features/sheet/declarative/fieldControls.tsx # select wrapper (T-064)
│   └── types/{templateValues.ts,document.ts}       # schema alias removal (T-030)
└── theme/Root.tsx                                   # mounts the notice beside DiscordWebhookSubscription

tests/
├── dice_roller/integration/roll-orchestrator.test.ts        # lazy load, once-per-session, failure path
├── dice_roller/integration/renderer-sessions.test.ts        # unchanged behavior
├── sheet_manager/declarative-catalog-select.test.tsx        # threshold, search, value, fills
└── sheet_manager/stat-dot-clear.test.tsx                    # clear control accessible name

knip.json          # ignore entry removed (T-030)
package.json       # `verify` gains the audit (T-030)
.specify/memory/constitution.md, AGENTS.md, TODO.md, CHANGELOG.md
```

**Structure Decision**: the existing single-project layout is used as-is. No new
directory is introduced; every change lands in the module that already owns the file.

## Complexity Tracking

| Violation                                                                                                                   | Why Needed                                                                                                                                       | Simpler Alternative Rejected Because                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Multi-select catalog fields keep the plain control instead of following the same threshold rule (spec Assumptions, amended) | `CatalogSuggest` stores one chosen entry and has no multi-value affordance; giving it one is a control design with its own accessibility surface | Forcing multi-select through the single-value control would either lose values or invent an unreviewed multi-value interaction inside a batch of small tasks |
