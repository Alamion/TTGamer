# Tasks: Zod 4 Upgrade

**Input**: [spec.md](spec.md), [design.md](design.md)

The spec has one dependency change, so the stories are delivery steps: US1 and US2 are proved by the
baseline test written on Zod 3, US3 completes the move. Commits: baseline, bump, then one per
clean-up group (design D2); each passes `yarn verify`.

## Foundation

- [x] T001 Record the baselines in design.md "Results": installed Zod version, the sheet route's
      downloaded JS bytes from `yarn test:e2e` timings (needs a build), and the schema backstop
      timing, best of several warm runs of the editor perf test.
- [x] T002 Capture the fixtures in `tests/sheet_manager/fixtures/zod-baseline/` from current code:
      the shipped templates, a legacy character export with unknown fields, a user document type, a
      user catalog, and malformed variants of each (missing id, duplicate column id, `http://` URL,
      extra key on a strict object, wrong types).

## User Story 1 - Existing data keeps loading (P1)

**Check**: the baseline test passes on Zod 3 and on Zod 4 with the same outcomes and parsed values
(SC-001).

- [x] T003 [US1] Write `tests/sheet_manager/zod-baseline.test.ts` on Zod 3: accept/reject outcome
      and parsed output per fixture; defaults for missing, `undefined`, and `null`; strict-object
      rejection; unknown-key stripping for `BaseCharacterSchema` and the envelopes; `https://` URL
      values; the shipped-template tree; type-equality assertions for `Character`, `CustomTemplate`,
      `UserDocumentType`, and the catalog entry type. Run it green and commit,
      `test: Zod behavior baseline before the Zod 4 upgrade (spec 027)`.
- [x] T004 [US1] Bump `zod` in `package.json` to the latest 4.x with `yarn install`; make the
      minimum edits so `yarn typecheck` passes (`z.record` key argument in
      `src/sheet_manager/types/character.ts`, `ZodType`/`ZodTypeAny`/`ZodIssue` type names in
      `systems/types.ts`, `types/template.ts`, `systems/v5/ruleset/schema.ts`,
      `features/template-editor/issues/schemaIssues.ts`,
      `tests/sheet_manager/entity-bindings.test.ts`).
- [x] T005 [US1] Run `tests/sheet_manager/zod-baseline.test.ts` and the full unit run; for each diff
      fix the schema to restore the old outcome or list it in design.md "Accepted differences" with
      a test (`.default()` semantics, URL checks, recursive `templateNodeSchema` error paths in
      `types/template.ts`).
- [x] T006 [US1] Run `yarn verify` (schema and persistence change, AGENTS.md §11) and commit,
      `feat(deps): Zod 4 (spec 027)`.

## User Story 2 - Errors stay readable (P1)

**Check**: the template save check and the import dialog still show located issues (path and cause)
(FR-004).

- [x] T007 [US2] (done by the `cases.json` snapshot, which records path and code) Extend
      `tests/sheet_manager/zod-baseline.test.ts` (or `issue-location.test.ts`) to assert `path` and
      `code` of issues for a nested template error, a duplicate id, and a bad import; no message
      text.
- [x] T008 [US2] Check the Zod-text consumers still behave: `src/sheet_manager/diagnostics.ts`
      (`issues` array shape), the clipboard `schema` stage in
      `features/template-editor/model/clipboard.ts`, `useTemplateSave.ts` (`ZodError` instanceof),
      `reportUncoveredIssues`, and `scripts/validate-data.ts` output for a broken catalog entry
      (entry and field identified). Fix or note any difference.
- [x] T009 [US2] Run the targeted tests (`draft-issues-coverage`, `issue-location`, `import-export`,
      `library-import`) plus `yarn validate:data`, and commit,
      `test: Zod issue path and cause stay stable (spec 027)`.

## User Story 3 - Dependency is current and no deprecated API remains (P2)

**Check**: `yarn outdated` shows no Zod entry; search finds no deprecated Zod calls (SC-003).

- [x] T010 [US3] Replace `z.ZodIssueCode.custom` with `'custom'` in `types/template.ts` and
      `systems/userCatalogs.ts`; move schema-supplied messages ('Duplicate column id', 'Duplicate
      entry id', template rule messages) to the v4 `error` form where needed. Verify, commit,
      `refactor: Zod 4 issue codes and messages (spec 027)`.
- [x] T011 [US3] Replace `.strict()` with `z.strictObject` in `types/templateValues.ts`,
      `systems/userTypes.ts`, `systems/userCatalogs.ts`, and `.passthrough()` with `z.looseObject`
      in `scripts/validate-data.ts`. Verify, commit, `refactor: Zod 4 object helpers (spec 027)`.
- [x] T012 [US3] Replace `z.string().url().startsWith('https://')` in `types/templateValues.ts` with
      the v4 URL schema keeping the `https://` rule; the baseline URL cases must stay equal. Search
      `src`, `scripts`, `tests` for any other removed or deprecated call (`nativeEnum`, `errorMap`,
      `.format()`, `.flatten()`, `.merge()`, `.deepPartial`, string-format methods) and replace
      them. Verify, commit, `refactor: Zod 4 string formats and leftovers (spec 027)`.
- [ ] T013 [US3] Compare the sheet route's JS bytes and schema backstop timing with the T001
      baseline (SC-004, VII); if the growth exceeds 2%, find why before continuing.

## Finish

- [ ] T014 Update guidance, one owner per rule: the Zod notes in `src/sheet_manager/AGENTS.md`
      (strip-by-default wording), `.agents/skills/sheet-manager/SKILL.md`,
      `.agents/skills/typescript/SKILL.md`, and the root `AGENTS.md` stack row if the version is
      named. No user guide change (no visible behavior).
- [ ] T015 Update `TODO.md` T-088 (Zod done, TypeScript 7 blocked until typescript-eslint supports
      it, Tailwind 4 remains) and run `yarn validate:backlog`.
- [ ] T016 Run `yarn verify:full`; confirm with `yarn outdated` that Zod is current (SC-003); walk
      design.md "Manual walk"; record results and the list of changed messages (SC-005, empty if
      none) in design.md; commit, `docs: guidance, backlog, and results for Zod 4 (spec 027)`.

## Coverage

FR-001 → T004, T010–T012. FR-002, FR-003 → T002–T005. FR-004 → T007–T009. FR-005 → T003, T004.
FR-006 → commit plan above. FR-007 → T014, T015. FR-008 → T003 (fixtures unchanged), T016. SC-001 →
T003, T005. SC-002 → T006, T016. SC-003 → T012, T016. SC-004 → T001, T013. SC-005 → T005, T016.
