# Implementation Plan: Template Primitive Composition

**Branch**: `005-template-primitive-composition` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-template-primitive-composition/spec.md`

## Summary

Replace opaque template composition with **document-bound primitives**. A new per-system binding
registry declares the closed set of document data addresses (traits, custom lists, resources,
condition tracks, identity fields); templates place primitive blocks that reference exactly one
binding key and render/edit through the same document data paths built-in pages use. Compact
presentation covers brief-format fields; custom-list primitives support author-defined preset
entries (copy-on-assign seeding). Default templates are rebuilt from primitives where the core
set covers (phased parity — Force/advantages/inventory stay legacy placements until phase two);
the legacy placement path is retained as reference and for hybrid pages, removed only after user
confirmation.

## Technical Context

**Language/Version**: TypeScript 6 (strict, no `any`) on React 19; Docusaurus 3.10 site

**Primary Dependencies**: Zustand 5 (+ persist), Zod, localForage (IndexedDB), Tailwind CSS 3,
clsx, Lucide-react, Radix UI primitives, Vitest

**Storage**: Browser IndexedDB via localForage through Zustand persist — **no new store key**;
primitive data lives in document data (existing envelope), one additive optional
`DocumentMetadata.seededPresets` marker; template file format stays v2

**Testing**: Vitest (`yarn test`); schema/persistence changes run the `yarn verify` tier

**Target Platform**: Modern evergreen browsers (static Docusaurus app, all logic client-side)

**Project Type**: Web SPA module inside a Docusaurus site (`/universal_sheet` route)

**Performance Goals**: Primitive rendering on par with built-in blocks (same molecules); seeding
is a one-time bounded copy; no perceptible delay at max template size

**Constraints**: Local-first; no user code in templates; bindings live in the owning system
module (no cross-system conditionals); async non-blocking persistence; en/ru strings via
`translations/source` YAML pipeline; no new heavy deps

**Scale/Scope**: Single user per device; spans `src/sheet_manager/` (types/template,
systems/star-wars-wod, systems/view, features/sheet declarative + registry, components/dialogs
template-editor, store) plus `translations/source/` and `tests/`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                  | Verdict | Notes                                                                                                                                                                                                                                        |
| ------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                   | PASS    | Binding registry lives in the owning system module (precedent: `catalogBindings.ts`); template schema stores only keys; a future new setup declares its own bindings — no cross-system conditionals.                                         |
| II. Explicit Contracts at Boundaries       | PASS    | Additive schema changes only (`primitive` block variant, optional `metadata.seededPresets`); old templates parse unchanged; seeding writes validated by the existing parse-on-write path; round-trip + seeding + degradation tests mandated. |
| III. Pleasurable Cross-Module Interactions | PASS    | Unknown/foreign binding → labeled placeholder + notice, never a crash; presets appear as ordinary entries; hybrid interim pages keep working.                                                                                                |
| IV. Fit-for-Purpose Code Quality           | PASS    | New registry module single-responsibility; strict TS, no `any`; primitives reuse existing molecules (TraitRow, CustomTraitsEditor, CompactConditionTrack) — no reimplementation.                                                             |
| V. Risk-Proportional Testing               | PASS    | `yarn verify` tier: schema round-trip, seeding idempotency + removal, cross-kind/cross-system degradation, parity tests per rebuilt page, mixed persistence.                                                                                 |
| VI. Consistent, Accessible Experience      | PASS    | A11y floor for picker/config UI; en/ru via YAML pipeline; preset/override labels are author data (not translated) — chrome strings are.                                                                                                      |
| VII. Performance as a Shared Budget        | PASS    | No new deps; molecules reused; binding resolution is a map lookup; seeding is bounded, once per document×template.                                                                                                                           |

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-template-primitive-composition/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions & rationale
├── data-model.md        # Phase 1 output — entities, validation, state
├── quickstart.md        # Phase 1 output — end-to-end validation guide
├── contracts/
│   ├── document-binding-registry.md   # binding registry API + star-wars-wod key set
│   └── primitive-block-and-seeding.md # template schema variant + seeding semantics
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/sheet_manager/
├── types/
│   ├── template.ts               # + PrimitiveBlockSchema variant (bindingKey, label, compact,
│   │                             #   track overrides, presets)
│   └── document.ts               # + optional DocumentMetadata.seededPresets
├── systems/
│   ├── types.ts                  # + DocumentBindingDescriptor type on SystemPlugin surface
│   ├── star-wars-wod/
│   │   └── documentBindings.ts   # NEW — binding registry for the setup: derived from
│   │                             #   profile (traits/resources/tracks) + declared identity
│   │                             #   fields + custom lists; kind-scoped
│   └── view.ts                   # default templates become explicit primitive-composed
│                                 #   definitions (hybrid) — derivation replaced
├── features/sheet/
│   ├── declarative/
│   │   ├── DeclarativeSheetView.tsx   # + PrimitiveBlockView (binding resolution, compact,
│   │   │                              #   degradation)
│   │   ├── primitives.tsx        # NEW — primitive renderers mapping binding kind → molecule
│   │   └── hooks.ts              # + seeding effect (copy-on-assign, once per doc×template)
│   ├── registry/
│   │   └── builtInBlockRegistry.ts    # accent parity helper reused for primitives
│   └── shell/templateFile.ts     # unchanged (v2 parses primitive blocks via schema)
├── components/dialogs/template-editor/
│   ├── BlockEditor.tsx           # + primitive config: binding picker, label override, compact,
│   │                             #   track levels/names, presets editor
│   └── template-editor/draft.ts  # + addPrimitive, updatePrimitive, preset list editing
└── TODO.md                       # phase-two pointer (Force/merits/equipment primitives)

translations/source/              # + picker groups, seeding/degradation strings (en+ru)
tests/sheet_manager/              # NEW: binding registry, primitive schema round-trip, seeding,
                                  # degradation, parity of rebuilt defaults, mixed persistence
```

**Structure Decision**: single-project layout, all feature code inside the existing
`src/sheet_manager` module; no new top-level directories.

## Post-Design Constitution Re-Check (Phase 1)

- Binding registry is system-owned (Constitution I); the template persists only string keys —
  the boundary stays validated and closed.
- All schema changes are additive; the only write outside the template store is preset seeding,
  which flows through `updateDocumentData`'s parse-on-write and is idempotent per
  document×template (Constitution II).
- Primitives reuse the exact molecules built-in pages use — parity by construction, verified by
  parity tests (Constitution VII, V).
- All gates above remain PASS after design.

## Complexity Tracking

> No constitution violations to justify — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| —         | —          | —                                    |
