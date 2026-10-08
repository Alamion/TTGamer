# Tasks: TypeScript 7

**Input**: [spec.md](spec.md), [design.md](design.md)

## Foundation

- [ ] T001 Record in design.md "Results": cold `yarn typecheck` time (best of three, after deleting
      `node_modules/.tmp/*.tsbuildinfo`), installed versions, and the TypeScript 6 verdicts on five
      planted errors (kept as a script in the scratchpad).

## User Story 1 - The type check is fast and equivalent (P1)

**Check**: planted errors reported with file and line; cold check at most a third of 16 s
(SC-001/2).

- [ ] T002 [US1] Add `typescript-native` (`npm:typescript@^7.0.2`) to `package.json`
      devDependencies.
- [ ] T003 [US1] Remove `baseUrl` from `tsconfig.json`, `tsconfig.app.json`, `tsconfig.test.json`,
      `tsconfig.node.json`, `tsconfig.e2e.json`; set `"baseUrl": null` in app and test; drop
      `ignoreDeprecations` where neither major needs it. Check both majors pass (`tsc -b --force`).
- [ ] T004 [US1] Point `scripts/typecheck.ts` at `node_modules/typescript-native/bin/tsc` and add
      the compiler version to the stamp; keep `--force` behavior.
- [ ] T005 [US1] Run the planted errors with the new script; run `yarn typecheck` cold three times;
      run `yarn verify` and commit, `feat(deps): TypeScript 7 for the type check (spec 029, US1)`.

## User Story 2 - Editor, lint, and build keep working (P1)

- [ ] T006 [US2] Plant a type-aware ESLint violation and confirm `yarn lint` still reports it;
      confirm `yarn start` and `yarn build` are unaffected (`yarn verify:full`).

## User Story 3 - The upgrade path is recorded and reversible (P2)

- [ ] T007 [US3] Update guidance, one owner per rule: root `AGENTS.md` (stack row, `typecheck`
      command row), the `typescript` skill (which tool uses which version, exit condition and the
      two edits that end the split), `.github/workflows/ci.yml` comment if it names `tsc -b`.
- [ ] T008 [US3] Update `TODO.md` T-088 (TypeScript 7 in use for `tsc`; open only for the
      single-version move once typescript-eslint supports 7); `yarn validate:backlog`.

## Finish

- [ ] T009 Run `yarn verify:full`; walk design.md "Manual walk"; record results in design.md;
      commit, `docs: guidance, backlog, and results for TypeScript 7 (spec 029)`.

## Coverage

FR-001 → T003–T005. FR-002 → T003. FR-003 → T006. FR-004 → T004. FR-005 → T004. FR-006 → T007, T008.
FR-007 → commit plan. SC-001 → T001, T005. SC-002 → T001, T005. SC-003 → T009. SC-004 → T007. SC-005
→ T007 (two edits named).
