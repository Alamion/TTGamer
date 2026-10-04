# Implementation Plan: Development Speed — Process and Tooling

**Branch**: `024-dev-speed-tooling` | **Date**: 2026-10-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/024-dev-speed-tooling/spec.md`

## Summary

Cut the recurring cost of every change:

- staged-file commit checks and a minute-scale pre-push check;
- a type check that covers every file;
- runner-independent `ci:*` commands run by GitHub Actions now and Jenkins later;
- a default test run of at most 60 s, with timing tests in their own group;
- a lean, project-local spec-kit;
- guidance with one owner per rule;
- translation work without generated files in git.

Decisions and measurements are in [research.md](research.md), and the command contract is in
[contracts/check-commands.md](contracts/check-commands.md).

## Technical Context

**Language/Version**: TypeScript 6 (strict), Node 20, yarn 1.22

**Primary Dependencies**:

- Existing: husky 9, ESLint 10, Prettier 3, Vitest 4 with jsdom, knip, Docusaurus 3.10.
- New dev dependency: `lint-staged`.

**Storage**: N/A (no persisted data changes)

**Testing**: Vitest projects `unit` (default) and `perf` (sequential), plus the existing
validators.

**Target Platform**:

- the maintainer machine (20 cores);
- GitHub Actions (`ubuntu-latest`);
- Vercel builds;
- later Jenkins.

**Project Type**: Docusaurus web app; this feature touches tooling, tests, and guidance only.

**Performance Goals**:

- commit check < 15 s;
- type check warm ~4 s;
- default tests ≤ 60 s;
- i18n check < 20 s.

**Constraints**:

- No product behavior change.
- Personal spec-kit skills are not edited.
- Builds on Vercel need no manual step.
- Existing spec folders are not rewritten.

**Scale/Scope**:

- 359 `src` files;
- 186 test files / 2174 tests;
- ~20 guidance files;
- 4 i18n validators → 1.

## Constitution Check

Principles at risk and how the plan keeps them:

- **II Explicit contracts**: generated `ttgamer.*` entries stay generated and are never
  hand-edited. They stop being tracked, so the "not hand-edited" rule becomes structural. Facts
  keep exactly one owner (R11).
- **V Risk-proportional testing**: no test is deleted. Splits and the `perf` group keep every
  assertion. Wall-clock assertions move to `perf` or become same-run ratios. `verify:full`
  (including perf) stays required before merging into `master`.
- **VI Storybook**: unchanged requirement; its owner is the constitution and the other files
  point to it.
- **Verification Workflow / Governance (amended here)**: tiers are redefined as commit, push and
  merge checks over the `ci:*` commands. The embedded Sync Impact Report is removed: the
  amendment history lives in git and CHANGELOG, and the version line remains. The amendment
  bumps the constitution to 1.6.0 (MINOR: materially changed guidance, no principle removed).

No violation needs justification. **Post-design re-check**: still passes. R2 surfaced no hidden
type errors, so FR-003 needs no product fix.

## Project Structure

### Documentation (this feature)

```text
specs/024-dev-speed-tooling/
├── spec.md
├── plan.md                    # this file
├── research.md                # decisions R1–R11 and baselines
├── contracts/check-commands.md
├── quickstart.md
└── tasks.md                   # next step
```

There is no `data-model.md`, because the feature changes no data.

### Source Code (repository root)

```text
package.json                     # ci:* commands, verify:* compositions, release, test:perf, lint-staged
tsconfig*.json                   # references + incremental build info (R2)
vitest.config.ts                 # projects unit / perf (R5)
eslint.config.mjs                # no directory-index imports in sheet_manager (R7)
.prettierrc / .prettierignore    # proseWrap overrides, specs/**/*.html ignored (R11)
.husky/pre-commit, pre-push      # R1, R3
.github/workflows/ci.yml         # R4
.gitignore                       # generated translations (R9)
scripts/
├── i18n-check.ts                # single translation/docs check (R9)
├── translation-build.ts         # merges docusaurus.json, no prettier pass (R9)
├── docs-source.ts               # derived mirrored roots (R9)
└── release.ts                   # version + CHANGELOG skeleton (R10)
translations/source/{en,ru}/docusaurus.json   # Docusaurus-owned code.json keys (R9)
src/sheet_manager/components/index.ts, hooks/index.ts   # deleted (R7)
tests/sheet_manager/
├── template-editor*.test.tsx    # split (R6)
├── library-dialog*.test.tsx     # split; 1000-entry case → perf (R5, R6)
└── helpers/                     # renderEditor, mountSheet (R6)
.claude/skills/speckit-*/        # project-local lean spec-kit (R8)
.claude/settings.json            # skillOverrides for personal speckit-* (R8)
.specify/templates/              # short spec, design, tasks templates (R8)
.specify/memory/constitution.md  # amended (R11)
AGENTS.md, src/*/AGENTS.md, .agents/skills/**   # one owner per rule, skill split (R11)
```

**Structure Decision**: tooling, tests, and guidance only; no product module changes except the
barrel removals and direct imports.

### Delivery order

1. **US1 checks and CI**: R1–R4. Everything else depends on the hooks and commands.
2. **US2 tests**: R5–R7.
3. **US5 translations**: R9. It goes before the guidance pass, so that pass documents the final
   commands.
4. **US3 lean process**: R8, R10.
5. **US4 guidance**: R11, last. It documents the final state of everything above.

Commits go one per story. This spec still uses the old spec-kit phases up to this point; the
lean process applies from spec 025.

## Complexity Tracking

No constitution violations to justify.
