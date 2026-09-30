# Quickstart: validating configurable trackers

## Prerequisites

- The dev server is running at <http://localhost:3000/>. Check before starting a new one
  (`yarn start`).
- For automated checks, run `yarn test` for the targeted files listed below, then
  `yarn verify:full`. The full check is needed because the docs and translations change.

## Automated

| Area                                                                                                            | Test file (tests/sheet_manager/)                                                                                                    |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Schema: config limits, the table column rejection, legacy readability                                           | `tracker-schema.test.ts` (new)                                                                                                      |
| Rules: cycle, total, out, lengths, folding, parity with `cohort.ts`                                             | `tracker-rules.test.ts` (new)                                                                                                       |
| Own tracker on the sheet: displays, copies, lengths, read-only, write rejection, unreadable report              | `tracker-field.test.tsx` (new)                                                                                                      |
| Built-in trackers: overrides keep game values, extra columns, members, legacy display mapping, the SW total row | `tracker-builtin.test.tsx` (new)                                                                                                    |
| Editor: palette, source switch, settings, move up and down, value-loss confirmation                             | `template-editor.test.tsx` (extended)                                                                                               |
| Parity: the fodder rebuild against the shipped group                                                            | `tracker-parity.test.tsx` (new)                                                                                                     |
| Storybook guard                                                                                                 | `storybook.test.tsx` (extended)                                                                                                     |
| Existing tracks unchanged                                                                                       | `cohort-track.test.tsx`, `template-layout.test.tsx`, `primitives.test.ts`, `primitive-parity.test.tsx`, `entity-templates.test.tsx` |

## Manual scenarios

1. **Own tracker on a user type (US1)**
    1. In the library, open a page of a user document type in the editor.
    2. Add a Tracker.
    3. Check the default: seven levels, two marks, Damage column, total row.
    4. Open a document of that type, click "Hurt" twice (╱ then ×), and reload.

    Expected: the marks persist, and the total reads −1.

2. **WoD 20th marks (US2)**
    1. In the tracker's settings, pick Start from → Three marks.
    2. Click one box four times.

    Expected:
    - The box steps ╱ → × → ✱ (violet) → empty.
    - The legend lists three marks with centered symbols.
    - After a switch to dark theme, the violet follows the theme.

3. **Own mark and order (US2)**
    1. Add a fourth mark with an own color.
    2. Move it up with ↑, and back down with ↓.

    Expected: the click order follows. Stored marks stay on their kinds, and saving asks nothing.

4. **Removing drops values (FR-026)**
    1. Remove a mark kind that a document uses.
    2. Save.

    Expected:
    - A confirmation names the tracker and says how many marks and documents it affects.
    - Cancel keeps the draft.

5. **Display (US3)**
    1. Switch through Table, Strip, and One line.
    2. Open the shipped Star Wars fodder group (its brief uses the old compact).

    Expected: the fodder group looks as before.

6. **Columns and copies (US4)**
    1. Add a text column "Trigger" covering the first 3 levels, and make the marks column
       repeatable, up to 4.
    2. On the sheet, add copies up to D, then remove B.

    Expected: the copies are relabeled A, B, C, and adding is disabled at 4.

7. **Lengths and out (US5)**
    1. Turn on lengths 3 / 5 / 7 as in the fodder group, and turn on out.
    2. Mark the last level of copy A.
    3. Shorten with marks on hidden levels.

    Expected:
    - Copy A is struck through, and its total reads "out".
    - Shortening asks first, then the heaviest mark lands on the new last level.

8. **Built-in tracker (US6)**
    1. On the Star Wars character page, open the health tracker's settings.
    2. Rename "Hurt", add a text column "Source", and recolor Lethal.
    3. Mark boxes, then open the same character with the brief page.

    Expected:
    - The total penalty row shows, and the other levels keep their penalties.
    - The marks are the same on the brief page, and "Source" shows only on the edited page.

9. **V5 (US6)**
    - Open a Hunter sheet.

    Expected: health and willpower look as before. The legend names Superficial and Aggravated.
    The −/+ length control still works.

10. **Parity (US7)**
    - Open the draft storybook's template-elements page, `TrackerParity` widget.

    Expected: both trackers match at 3, 5, and 7.

11. **Read-only**
    - Covered by `tracker-field.test.tsx` and `tracker-builtin.test.tsx`: the app has no manual
      read-only sheet with a user page.

    Expected: the marks show, and nothing can be changed.
