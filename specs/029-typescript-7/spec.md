# Feature Specification: TypeScript 7

**Branch**: `029-typescript-7` | **Created**: 2026-10-08 | **Status**: Draft

**Input**: "Prepare the spec for TypeScript 7 and typescript-eslint, the last open item of T-088, if
the facts allow it."

## Context

TypeScript 7 is the native (Go) rewrite of the compiler; `typescript@7.0.2` ships a `tsc` binary
only, and its JavaScript API is reduced to `typescript/unstable/*` entry points.
[T-088](../../TODO.md) kept it open because typescript-eslint, the one tool here that needs the
classic compiler API, still declares `typescript >=4.8.4 <6.1.0` (latest 8.71.1, canary
8.71.2-alpha.1). A trial on 2026-10-08 showed what moving only the type check would take: with
`baseUrl` removed from the five tsconfig files (TypeScript 7 rejects it; the inherited
`@docusaurus/tsconfig` also sets it), `tsc -b --force` over all four projects (816 source files)
passes in 1.6 s instead of 16 s, and a planted type error is reported. Everything else that mentions
`typescript` (cosmiconfig inside Docusaurus's postcss loader) only loads it optionally. So the
choice is between waiting for typescript-eslint and running two TypeScript versions side by side.

## User Scenarios & Testing

### User Story 1 - The type check is fast and equivalent (Priority: P1)

A maintainer runs `yarn typecheck` (and the pre-push hook and CI run it) and gets the same verdict
as before, in a fraction of the time, from TypeScript 7.

**Why this priority**: The type check is part of every push; a ten-fold speedup is the reason to
move, and a different verdict would be a regression.

**Independent Test**: Run the old and the new type check on the repository and on a set of planted
errors; compare verdicts and the reported files and lines.

**Acceptance Scenarios**:

1. **Given** the repository, **When** `yarn typecheck` runs, **Then** it passes and takes at most a
   third of the time it takes today.
2. **Given** planted errors (wrong type, unused local, missing import, `erasableSyntaxOnly`
   violation, JSX type error) in `src`, `tests`, `scripts`, and `tests-e2e`, **When** it runs,
   **Then** each is reported with its file and line, as before.
3. **Given** a dependency change in `yarn.lock`, **When** `yarn typecheck` runs, **Then** it still
   checks every file once (spec 026's forced rebuild rule).
4. **Given** the pre-push hook and the CI job, **When** they run, **Then** they use the same command
   and need no extra step.

---

### User Story 2 - Editor, lint, and build keep working (Priority: P1)

A maintainer opens the project in WebStorm, runs ESLint, `yarn start`, `yarn build`, and the tests.
Nothing changes except speed: types in the editor, lint rules that need type information, and the
Docusaurus build behave as before.

**Why this priority**: A type check that is fast but breaks lint or the editor would cost more than
it saves.

**Independent Test**: `yarn verify:full` passes; ESLint reports the same findings on a planted
type-aware violation; the editor guidance names which TypeScript each tool uses.

**Acceptance Scenarios**:

1. **Given** the change is merged, **When** `yarn lint` runs, **Then** it passes and reports a
   planted rule violation exactly as before.
2. **Given** `yarn verify:full`, **When** it runs, **Then** every check passes with no test removed.
3. **Given** a new contributor reading the guidance, **When** they look for the TypeScript version,
   **Then** it says which tool uses which version and when the single-version setup returns.

---

### User Story 3 - The upgrade path is recorded and reversible (Priority: P2)

A maintainer can see why two TypeScript versions exist, what removes the split (typescript-eslint
supporting TypeScript 7), and can revert to one version by editing one place.

**Why this priority**: A temporary split without an exit condition becomes permanent.

**Independent Test**: The backlog entry names the exit condition; reverting is one dependency and
one script change.

**Acceptance Scenarios**:

1. **Given** the merged change, **When** the backlog is read, **Then** T-088 (or its successor)
   names the condition under which the second version is removed.
2. **Given** a typescript-eslint release that supports TypeScript 7, **When** a maintainer follows
   the guidance, **Then** the split ends by changing one dependency line and one script.

### Edge Cases

- Removed or changed compiler options (`baseUrl`, `ignoreDeprecations`, `moduleResolution`
  variants): configuration moves to the replacements TypeScript 7 names, with identical module
  resolution for `@site/*` paths.
- Incremental build info (`node_modules/.tmp/*.tsbuildinfo`) written by one major must not make the
  other major skip files.
- Differences in diagnostics between the Go and JavaScript compilers: any case where one accepts
  what the other rejects is listed, with the decision (fix the code, or keep the stricter tool).
- Tools that read `typescript` by package name (ESLint parser, the IDE): they keep resolving to the
  version they support.

## Requirements

### Functional Requirements

- **FR-001**: `yarn typecheck` MUST run TypeScript 7 over all four projects (app, node, test, e2e)
  and MUST fail on any error the current check fails on.
- **FR-002**: The tsconfig files MUST drop options TypeScript 7 removed, with `@site/*` resolution,
  JSX, `erasableSyntaxOnly`, and `verbatimModuleSyntax` behavior unchanged.
- **FR-003**: ESLint (typescript-eslint, type-aware rules) MUST keep running on a TypeScript version
  it supports until it supports TypeScript 7.
- **FR-004**: The forced full check after a `yarn.lock` change MUST still work, and the incremental
  state of one TypeScript major MUST NOT be reused by another.
- **FR-005**: The pre-commit, pre-push, and CI entry points MUST keep calling the same scripts.
- **FR-006**: Guidance (`AGENTS.md` stack and commands, the `typescript` skill) and the backlog MUST
  state which tool uses which TypeScript version and the condition that ends the split.
- **FR-007**: The migration MUST land in steps that each keep the checks green.

## Success Criteria

- **SC-001**: `yarn typecheck` on a cold cache takes at most one third of the pre-upgrade time (16 s
  today), best of three runs.
- **SC-002**: 100% of planted type errors are reported by the new check with correct file and line.
- **SC-003**: `yarn verify:full` passes with no test removed or weakened.
- **SC-004**: `yarn outdated` lists no TypeScript entry for the type-checking version, and the
  remaining older version is listed in the guidance with its exit condition.
- **SC-005**: The split can be reverted to a single version in at most two file edits.

## Assumptions

- `typescript-eslint` does not yet support TypeScript 7 (checked 2026-10-08: latest and canary both
  declare `<6.1.0`); this spec is written to fit that and to be simplified when it does.
- The IDE keeps using the project's `typescript` package, which stays the version typescript-eslint
  supports, so editor behavior is unchanged.
- `@types/node` stays on the 24 line (spec 026); a Node upgrade is a separate decision.
- Declaration output, emit, and watch mode are not used (`noEmit`, no `tsc --watch` script), so
  their differences in TypeScript 7 do not matter here.
- This is a regular spec rather than a small change because it touches the build pipeline, the
  hooks, and every contributor's tooling.

## Clarifications

### Session 2026-10-08

- Q: Which structure for TypeScript 7 now? → A: Run TypeScript 7 only for `yarn typecheck`, next to
  TypeScript 6 for typescript-eslint and the editor; keep T-088 open with the exit condition
  (typescript-eslint supports TypeScript 7).
