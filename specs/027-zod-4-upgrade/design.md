# Design: Zod 4 Upgrade

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-08

## Approach

Zod is used by 14 files in `src/sheet_manager`, `scripts/validate-data.ts`, and 4 test files; the
installed 3.25 also ships the v4 API under `zod/v4`. The work is a behavior-preserving migration, so
the order is: first pin down current behavior, then change the dependency, then clean the API.

1. **Baseline** (no dependency change): a characterization test captures accepted/rejected outcomes,
   parsed values (defaults, stripped keys), and error `path`/`code` for the shipped templates,
   user-type and catalog fixtures, legacy character imports, and a set of malformed variants. It
   also records the sheet route's JS bytes and the schema parse time from `yarn build`/the existing
   editor perf test. It runs green on Zod 3.
2. **Bump** `zod` to the latest 4.x with the minimum code changes to compile (step 3 items that
   cannot compile otherwise). Run the baseline; every diff is investigated and either fixed in the
   schema or listed as an accepted difference.
3. **Clean-up** of deprecated calls, one commit per group, each green: see D2.
4. **Guidance and backlog**: `src/sheet_manager/AGENTS.md`, the `sheet-manager` and `typescript`
   skills, `TODO.md` T-088.

## Decisions

- **D1 — Import path**: `import { z } from 'zod'` stays (4.x root exports v4). _Why_: no path churn
  and later patch releases need no edits. _Rejected_: `zod/v4` subpath (a leftover of the 3.25
  transition) and `zod/v3` compatibility (keeps removed behavior alive, violates FR-001).
- **D2 — Known call-site changes** (found by search; the type check finds the rest):
    - `z.record(valueSchema)` (character.ts) → `z.record(z.string(), valueSchema)`; v4 requires the
      key schema.
    - `z.ZodIssueCode.custom` in `template.ts`, `userCatalogs.ts` → `code: 'custom'`.
    - `.strict()` (`templateValues.ts`, `userTypes.ts`, `userCatalogs.ts`) and `.passthrough()`
      (`validate-data.ts`) → `z.strictObject` / `z.looseObject`. These still work; they are
      deprecated, so FR-001 asks for the change.
    - `z.string().url()` → `z.url()` with the same `https://` prefix rule, checked by test: v4's URL
      check differs from v3's.
    - `z.ZodType<T>`/`ZodTypeAny` (`systems/types.ts`, `template.ts`, `v5/ruleset/schema.ts`, one
      test) → v4's `z.ZodType<Output, Input>` and `z.ZodType`; the recursive `templateNodeSchema` is
      redone with v4's getter-based recursion only if `z.lazy` stops compiling or loses error paths.
    - `ZodIssue` → `z.core.$ZodIssue` (`schemaIssues.ts`); `ZodError` stays.
    - `.default()` semantics: v4 returns the default without parsing it and applies it only for
      `undefined`. Each `.default()` (`userTypes.ts`, `userCatalogs.ts`, template schemas) is
      checked by the baseline with missing, `undefined`, and `null` input. _Why_: a named list makes
      the review small. _Rejected_: the community codemod run over the repo (rewrites more than
      needed and hides behavior changes in a large diff).
- **D3 — Error assertions**: baseline and existing tests assert `path` and `code` (clarified:
  wording may change). Messages that users see come from translations, not from Zod text
  ([schemaIssues.ts](../../src/sheet_manager/features/template-editor/issues/schemaIssues.ts),
  `useTemplateSave.ts`), so only developer diagnostics (`diagnostics.ts`, `reportUncoveredIssues`,
  clipboard `schema` stage, `validate-data`) show Zod text. _Rejected_: pinning message strings.
- **D4 — Custom messages**: the two `'Duplicate … id'` messages and any other schema-supplied text
  move to the v4 `error:` parameter if the old option no longer applies. _Why_: they are our text
  and must survive.
- **D5 — Unknown keys**: strip-by-default stays (guidance rule in `src/sheet_manager/AGENTS.md`);
  the baseline proves it for `BaseCharacterSchema` and the envelopes.
- **D6 — One spec step per risk**: no schema is restructured or tightened in this spec, even where
  v4 allows a simpler form. _Why_: FR-002/FR-008.

## Changed types and data

- Schema files listed in D2: API calls only; exported inferred types must stay mutually assignable
  (FR-005), checked by `yarn typecheck` plus a few type-equality assertions in the baseline test for
  `Character`, `CustomTemplate`, `UserDocumentType`, and catalog entry.
- `SystemPlugin.schema` type changes with Zod's `ZodType` generics; plugins keep working because
  they only pass schemas.
- Stored data and persisted versions: none. No migration.

## Principles at risk

- II. Explicit contracts at boundaries: import and persistence envelopes are the boundary; the
  baseline test is the contract check, committed before the bump.
- IV. Fit-for-purpose code: no compatibility shim and no wrapper around Zod is added.
- V. Risk-proportional testing: this touches schema and persistence, so the full `yarn verify` runs
  after every step and `yarn verify:full` before the final commit.
- VII. Performance: schema parsing is on the editor's keystroke path; parse time and sheet bytes are
  compared with the baseline (SC-004).

## Tests

- `tests/sheet_manager/zod-baseline.test.ts` (new): fixtures accepted/rejected, parsed output
  snapshots, defaults for missing/`undefined`/`null`, strict-key rejection, unknown-key stripping,
  URL values, recursive template errors with `path` and `code`, type assertions.
- Existing: `character-schema`, `import-export`, `library-import`, `document-system`,
  `user-document-types`, `draft-issues-coverage`, `issue-location`, `built-in-templates`,
  `entity-bindings`, `yarn validate:data`; none edited except for type names.
- Editor schema-backstop timing: existing perf run before/after (best of several warm runs).

## Manual walk

1. Open `/universal_sheet` with the stored characters from before the upgrade → all load, same
   values.
2. Import an old export file and a hand-broken one → first imports, second is refused with the usual
   message and nothing is saved.
3. In the template editor, make a duplicate id and an invalid URL, then save → issues are shown
   against the right element; no raw Zod text.
4. Create a user document type and a user catalog with duplicate column ids → refused.
5. Reload each page after saving → data persists.

## Results

- Baseline (Zod 3.25.76, 2026-10-08): sheet JS and CSS 3,663,519 bytes; an edit on the full shipped
  sheet 12 ms (browser timings, `yarn test:e2e`); open the sheet 113 ms.
- Characterization snapshots: `tests/sheet_manager/fixtures/zod-baseline/` (`cases.json`,
  `legacy-templates.json`, `shipped-templates.json`), written on Zod 3.

## Accepted differences

Found by the baseline on Zod 4.6.5; parsed values, defaults, and issue paths are identical, only
issue codes were renamed by the library (nothing in `src` branches on them):

- `invalid_string` → `invalid_format` (ids, kinds, URLs).
- `invalid_enum_value` → `invalid_value`; `too_small` for an empty record key → `invalid_key`.
- `invalid_union_discriminator` → `invalid_union` (same path `children.N.type`).
- A strict object inside a union reports `invalid_union` at the union's path instead of the inner
  `unrecognized_keys`; a non-finite catalog number reports `invalid_union` instead of `not_finite`.

## Implementation notes

- D2 gap: Zod 4 `.default()` returns its value without parsing it, which would drop the inner
  defaults of the V5 trait/track blocks, `CatalogBinding.fills`, tracker `valueColumn`, and the
  document `templateValues` bag. These use `.prefault()` (Zod 3 behavior); the baseline covers them.
  `templateValues` also lost `.optional()`, which in v4 would make its output type optional.
