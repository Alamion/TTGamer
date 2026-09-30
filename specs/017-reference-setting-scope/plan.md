# Implementation Plan: Document references scoped to the template's setting

**Branch**: `testing` (spec directory `017-reference-setting-scope`) | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-reference-setting-scope/spec.md`

## Summary

A reference field keeps storing kind ids. What changes is how those kinds and documents are
offered, and both are derived from the template's setting:

- **Setting**: the template's setting comes from `catalogScopeOf` (spec 015), so references and
  catalogs share one rule.
- **Types in the editor**: a pure helper `referenceTargetsOf` lists the setting's types. These are
  the shipped kinds of the line or system, the ruleset's core kinds, and the user types owned by
  the setting (research R2). The editor offers these and marks any other stored target as
  unavailable. `validateTemplateReferences` reports those targets.
- **Documents on the sheet**: the hook flags each document option `inScope` (same system, same
  user setting, and a scope kind). The control searches only in-scope targets. A stored entry
  that is out of scope still shows its title with an "outside this setting" note, so no link is
  lost.
- **Storage**: no schema or data change.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5, Zod 3, Tailwind 3 + clsx, and Lucide. No new
dependency.

**Storage**: unchanged. There are no schema, store, or file version changes.

**Testing**:

- Vitest pure tests: targets per setting, and document scope.
- Component tests: the sheet search, out-of-scope entries, read-only, and list items.
- Editor tests: offered types, stale targets, and issues.
- The storybook guard.
- `yarn verify:full`.

**Target Platform**: browser, desktop and phone widths

**Project Type**: web application (the sheet manager module of the Docusaurus site)

**Performance Goals**:

- The scope is computed once per template render. The document options stay one memoized list
  per sheet.
- The search filter stays linear in the number of documents, as today.

**Constraints**:

- There are no system conditionals: everything is derived from the registry (modules, core
  definitions, user type owners).
- Stored targets and values are never dropped.
- Code and docs are in English, with ru mirrors for the UI and the guide.

**Scale/Scope**:

- 1 new pure module (the reference scope);
- 1 new issue code;
- 1 new optional `DocumentOption` property;
- changes to `ReferenceKindsControl` and the reference control;
- 3 strings;
- 1 story update.

## Constitution Check

_GATE: checked before Phase 0 and re-checked after Phase 1._

| Principle                                    | Assessment                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                     | **Pass.** The scope comes from registry data (modules, `coreDefinitions`, user type owners). There is no `systems/<system>/` import and no system conditional. Everything is in the sheet_manager template code.                                                                                                                                                                                     |
| II. Explicit Contracts at Boundaries         | **Pass.** No schema change. Old templates and documents load as they are (SC-004). The scope rules are one documented pure function (research R2 and R3, `contracts/reference-scope-ui.md`).                                                                                                                                                                                                         |
| III. Pleasurable Cross-Module Interactions   | **Pass.** Nothing is lost: out-of-scope entries stay visible and openable, and stale targets are kept and reported. The missing-target diagnostic is unchanged; out-of-scope entries report `reference-target-out-of-scope` (analysis C1), and the new stale-target issue makes the degradation observable to authors. Library parsing skips the scope check until its own types are installed (R5). |
| IV. Fit-for-Purpose Code Quality             | **Pass.** It reuses `catalogScopeOf`, `kindLabel`, and `targetLabel` and the existing issue pipeline. One helper serves the editor, the issues, and the sheet.                                                                                                                                                                                                                                       |
| V. Risk-Proportional Testing                 | **Pass.** Pure tests cover every R2 row and the R3 document rule. Component tests cover the sheet and the editor, including list items. The storybook guard runs. The final check is `yarn verify:full`, since documentation changes.                                                                                                                                                                |
| VI. Consistent, Accessible Experience        | **Pass.** The note is plain secondary text read with the title. Existing buttons keep their labels. The storybook shows in-scope, out-of-scope, and missing entries, and a stale target (FR-015). Strings come from YAML in en and ru, and the guide is updated in en and ru.                                                                                                                        |
| VII. Performance as a Shared Budget          | **Pass.** There is no dependency, and memoized options stay linear.                                                                                                                                                                                                                                                                                                                                  |
| VIII. Respectful Use of Third-Party Material | **Pass.** No publisher material is involved.                                                                                                                                                                                                                                                                                                                                                         |

**Deviations**: none.

**Post-Phase-1 re-check**: unchanged. The design adds only derived data, an optional option flag,
and an issue code.

## Project Structure

### Documentation (this feature)

```text
specs/017-reference-setting-scope/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── reference-scope-ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/sheet_manager/
├── features/sheet/
│   ├── data/
│   │   ├── referenceScope.ts        # NEW: referenceTargetsOf, isDocumentInScope, targetName (stale labels)
│   │   └── templateReferences.ts    # reference-target-unavailable issue (fields, table cells, list items)
│   └── declarative/
│       ├── hooks.ts                 # documentOptions carry inScope for the current template
│       └── fieldControls.tsx        # DocumentOption.inScope; search in-scope targets; out-of-scope note
├── components/dialogs/template-editor/
│   ├── FieldEditor.tsx              # ReferenceKindsControl: scope targets + stale "(unavailable)"
│   └── draft.ts                     # issue message for reference-target-unavailable
└── storybook/stories.ts             # reference story: in-scope, out-of-scope, missing, stale target

translations/source/{en,ru}/ui/sheet/templates.yaml
docs/template-editor/elements.mdx (Document reference) + i18n/ru mirror
tests/sheet_manager/
├── reference-scope.test.ts          # NEW: targets per setting, document scope
├── reference-scope.test.tsx         # NEW: sheet search, out-of-scope entries, read-only, list item
└── template-editor.test.tsx, storybook.test.tsx (extended)
```

Housekeeping when the work is done:

- the sheet-templates skill (the reference section);
- `src/sheet_manager/AGENTS.md` if references are described there;
- `CHANGELOG.md` 3.15.0;
- `TODO.md` T-075 ✅.

**Structure Decision**: this is the existing single-project layout. The scope logic sits next to
`documentLabels.ts` and `catalogBindings.ts` in `features/sheet/data`.

## Complexity Tracking

No constitution violations to justify.
