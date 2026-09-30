# Implementation Plan: Rating element parity with trait rows

**Branch**: `testing` (spec directory `014-rating-trait-parity`) | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-rating-trait-parity/spec.md`

## Summary

The template rating becomes a trait row. A new `RatingRow` atom composes the same pieces as
`TraitRow` and `TraitRowWithInput`: `StatLabel`, the specialization-style input, `StatDot`, and
the `term-row` classes. It adds a number style, a "current / maximum" display, and a clamp marker.

**New settings.** The rating gains four optional settings: `textInput`, `showNumbers`, `dice`, and
`flags` (a subset of S/P/E). The die button moves out of `StatDot` into `StatDiceButton`.
`StatDot` gains a per-flag subset, so rolls go through the same `traitPool` path as trait rows.

**Storage.** Text and flags live in a companion bag entry `<valueKey>#detail`, so every reader of
the rating's number stays untouched.

**Other changes.**

- The "boxes" style is aliased to dots at parse time.
- The storage bound becomes the schema limit (100), so a computed maximum decides the range.
- `StatDot`'s dots become gapless cells, which fixes the hitboxes for trait rows too while keeping
  the compressed look.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zod 3, Tailwind 3 + clsx, Lucide. No new dependency.

**Storage**: IndexedDB via localForage. The document envelope's template value bag gains one
value shape and a key limit of 72 instead of 64 (widening only). No store version changes.

**Testing**: Vitest + Testing Library; `yarn verify:full`, because docs and the storybook change

**Target Platform**: Browser (desktop and phone widths), static Docusaurus site

**Project Type**: Web application (single Docusaurus project, sheet manager module)

**Performance Goals**: No regression in the editor keystroke budget (about 40 ms on the full
Star Wars sheet, spec 012). A 100-dot rating renders 100 buttons at most.

**Constraints**:

- No system conditionals: rolls use `dice.traitPool`.
- Stored templates and documents load unchanged (SC-005).
- English code and docs, with ru UI and docs mirrors.

**Scale/Scope**:

- 1 new atom and 1 extracted atom.
- About 8 edited source files.
- 1 new test file, plus edits to 5 test files.
- Guide sections in en and ru.

## Constitution Check

_GATE: checked before Phase 0 and re-checked after Phase 1._

| Principle                                    | Assessment                                                                                                                                                                                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                     | **Pass.** Rolls reach systems only through `SystemPlugin.dice.traitPool` via `useDocumentTraitDiceRoll`. The atoms stay in `sheet_manager/components/stat-fields`, and `shared/` is untouched.                                                                                        |
| II. Explicit Contracts at Boundaries         | **Pass.** Zod carries the schema changes. The `'boxes'` alias is a parse-time preprocess. The new `RatingDetailSchema` is strict. Widening the bag key limit only relaxes parsing. Contracts: `contracts/rating-ui.md` and `data-model.md`.                                           |
| III. Pleasurable Cross-Module Interactions   | **Pass.** Nothing a user stored is lost. Values above the current maximum are kept and marked, and the degraded `maxFrom` notice stays. The roll details carry the rating's label, as they do for traits.                                                                             |
| IV. Fit-for-Purpose Code Quality             | **Pass.** One row atom is used instead of per-style markup. The die is extracted once and reused. The rating's hand-made dot buttons are deleted.                                                                                                                                     |
| V. Risk-Proportional Testing                 | **Pass.** Schema: the alias and the flags. Value bag: `#detail` validation and the new storage bound. Rolls: parity with `traitPool` for Star Wars and V5. UI: layout, hidden label, text input, numbers, clamp marker, hitbox structure, editor switches. Tier 3 `yarn verify:full`. |
| VI. Consistent, Accessible Experience        | **Pass.** The rating uses the same atoms as trait rows. Icon buttons get `aria-label`, and the alerts keep `role="alert"`. en and ru strings go through YAML. The storybook shows every rating option and its guard requires them. The guide gets a `rating` anchor in en and ru.     |
| VII. Performance as a Shared Budget          | **Pass.** No dependency and no new effect. The row is a plain composition.                                                                                                                                                                                                            |
| VIII. Respectful Use of Third-Party Material | **Pass.** No book text is added.                                                                                                                                                                                                                                                      |

**Deviations**: none.

**Dependency note**: TODO lists T-058 as T-073's prerequisite. It stays open, and this feature
does not change system-bound fields (research R9).

**Post-Phase-1 re-check**: unchanged. The design adds:

- four optional template properties;
- one bag value shape;
- one atom (`RatingRow`) and one extraction (`StatDiceButton`).

## Project Structure

### Documentation (this feature)

```text
specs/014-rating-trait-parity/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── rating-ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/sheet_manager/
├── types/
│   ├── template.ts                 # RatingFieldSchema: presentation alias, textInput, showNumbers, dice, flags
│   └── templateValues.ts           # RatingDetailSchema, ratingDetailKey, bag key 72, validateRating bound
├── features/sheet/
│   ├── data/templateValueWrites.ts # validate `#detail` writes against their rating field
│   └── declarative/
│       ├── fieldControls.tsx       # RatingFieldControl → RatingRow; effectiveMax (R3)
│       └── DeclarativeSheetView.tsx# FieldCell: rating renders its own label; passes detail and setter
├── components/stat-fields/
│   ├── RatingRow.tsx               # NEW: row atom (R4)
│   ├── StatDiceButton.tsx          # NEW: extracted die (R5)
│   └── StatDot.tsx                 # flags subset, gapless cells (R5, R6)
├── components/dialogs/template-editor/
│   ├── FieldEditor.tsx             # style without boxes; new switches with help
│   └── EditorHelp.tsx              # EDITOR_GUIDE.rating
└── storybook/stories.ts            # rating stories per option

translations/source/{en,ru}/ui/sheet/templates.yaml   # editor labels and hints; ratingBoxes removed
docs/template-editor/elements.mdx (+ i18n/ru mirror)   # Rating section {#rating}
tests/sheet_manager/
├── rating-row.test.tsx             # NEW
├── template-schema.test.ts, document-template-values.test.ts,
├── storybook.test.tsx, declarative-sheet.test.tsx, template-editor.test.tsx
```

Housekeeping when the work is done:

- `.agents/skills/sheet-templates/SKILL.md`: the rating options and the `#detail` companion.
- `src/sheet_manager/AGENTS.md`, if it describes ratings.
- `CHANGELOG.md` and `package.json`: 3.12.0.
- `TODO.md`: T-073 marked ✅.

**Structure Decision**: this is the existing single-project layout. The new atoms sit next to
`TraitRow` because they are sheet stat fields, not template-only code.

## Complexity Tracking

No constitution violations to justify.
