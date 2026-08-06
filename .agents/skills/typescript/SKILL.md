---
name: typescript
description: Project TypeScript and React rules. Read before editing or reviewing .ts, .tsx, or .mts files.
---

# TTGamer TypeScript

## Before Editing

Read the nearest `AGENTS.md`. Dice and sheet code have module-specific invariants. Inspect the existing type/schema before adding a parallel representation.

## Type Rules

- Keep strict TypeScript clean; `yarn typecheck` checks app, scripts, and tests.
- Avoid `any`. Narrow `unknown` at runtime, especially JSON, storage, URL, and network boundaries.
- Use Zod for imported character data and build-time catalog validation.
- Prefer inferred local types. Use `interface` for extensible object/prop shapes and `type` for unions/intersections.
- Use `import type` for type-only imports. ESLint owns import ordering.
- Do not suppress errors unless a third-party boundary makes it unavoidable; prefer `@ts-expect-error` with a short reason.
- Keep IDs opaque unless the schema explicitly guarantees a format.

## React Rules

- Prefer controlled inputs when the parent/store is authoritative.
- Do not mirror props into state through a synchronization effect unless local draft semantics are explicitly required.
- Use functional state updates when the next state depends on the previous state.
- Reusable sheet blocks read through `useCharacter()`, not directly from the collection store.
- Hooks must have complete dependency arrays; restructure unstable values instead of disabling the rule by default.
- Native interactive elements come first. Icon-only buttons need `aria-label`; collapsibles need `aria-expanded`.

## Async and Boundaries

- Use `async`/`await` and `Promise.all` when independent work can run concurrently.
- Bound untrusted or user-controlled strings, arrays, recursion, and numeric values.
- Never log webhook URLs, secrets, imported character contents, or upstream response bodies.
- External-service code belongs in `src/integrations`; shared UI remains service-independent.

## Style and Verification

- Prettier uses four spaces, semicolons, single quotes, 100 columns.
- Comments explain non-obvious rationale or constraints; avoid narrating straightforward code.
- Run targeted tests, then `yarn verify:fast`. Use `yarn verify` for logic/schema changes and `yarn verify:full` for config, route, dependency, or generated-style changes.
