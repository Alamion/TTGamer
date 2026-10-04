# Quickstart: validating spec 024

Run on the maintainer machine from the repository root unless noted.

1. **Commit check (SC-001)**
    1. Change two source files.
    2. Run `time git commit` five times, amending and resetting between runs.
    3. Expect a median under 15 s.
    4. Repeat with a docs-only change and expect formatting only.
2. **Type check coverage (SC-002)**
    1. Add `const x: number = 'a';` to `src/pages/index.tsx`.
    2. `yarn typecheck` fails and names the file.
    3. Revert.
    4. A second clean run finishes in seconds (warm cache).
3. **Test suite (SC-003, SC-004)**
    1. Run `yarn test` five times. Each run takes at most 60 s with zero failures.
    2. Run `yarn test:perf` five times. Every run passes.
    3. `grep -rn "performance.now\|Date.now" tests --include=*.test.*` returns only perf files.
4. **Import weight**
    1. Run `yarn vitest run tests/sheet_manager/rating-row.test.tsx` with import durations printed.
    2. The import tree contains neither `TemplateEditorDialog` nor `LibraryDialog`.
5. **Pre-push**
    1. Push a branch with one source change.
    2. The hook runs the type check and the related tests only, in about a minute.
6. **CI and Vercel (SC-005)**
    1. Push the feature branch.
    2. GitHub Actions shows one result per check command, with perf non-blocking.
    3. A Vercel preview of the branch builds from a clean checkout without manual steps.
7. **Lean spec-kit (SC-006)**
    1. In a new session in this repository, run `/speckit-plan` on a scratch spec.
    2. The project version runs: its marker is visible, and it produces `design.md` with no research, data-model, contracts, or quickstart files.
    3. Delete the scratch spec.
8. **Guidance (SC-007, SC-008)**
    1. `wc -l .agents/skills/sheet-templates/SKILL.md` is at most 300.
    2. Each rule in the owner table (research R11) appears in full in exactly one file.
9. **Translations (SC-009)**
    1. Add a UI string to the en and ru YAML.
    2. `git status` shows two changed files.
    3. `yarn ci:validate` runs one i18n check under 20 s.
    4. Break an `{#id}` anchor in a ru page; the check reports it.
    5. Revert.
