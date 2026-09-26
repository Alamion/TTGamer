# Quickstart: validating rating parity

## Automated

```bash
yarn vitest run tests/sheet_manager/rating-row.test.tsx tests/sheet_manager/template-schema.test.ts \
  tests/sheet_manager/document-template-values.test.ts tests/sheet_manager/storybook.test.tsx \
  tests/sheet_manager/declarative-sheet.test.tsx tests/sheet_manager/template-editor.test.tsx
yarn verify:full
```

Expected results:

- **Schema**: a `'boxes'` rating parses as `'dots'`.
- **Value bag**: `#detail` entries validate against a rating field. Values up to 100 pass above
  the static maximum.
- **Rolls**: rating rolls equal `traitPool` for value 0–10 × flags on Star Wars and V5 (SC-002).
- **Storybook**: the guard lists every rating option.
- **Build**: the build passes in both locales.

## Manual (dev server at http://localhost:3000, check it is running first)

1. **Layout (US1)**: open `/docs/dev/storybook/template-elements`.
    - Each rating has its label on the left of the dots, on one line.
    - Numbers appear only on the "numbers" story.
    - The text-input story wraps the input under the label at phone width (DevTools, 400 px).
2. **Side by side with a trait (SC-001)**: open a Star Wars character's full sheet and a
   storybook rating of max 5.
    - The dot size, spacing, and label position match.
3. **Roll (US2)**: in the storybook, on the Star Wars sandbox, set the die rating to 4 and click
   the die.
    - The dice panel queues `4d10>=6f=1`.
    - With S on, it queues `4d10>=6f=1!`.
    - The roll details name the rating.
    - On a V5 document, the same rating queues `4d10>=6`.
4. **Computed maximum (US3)**: set "Number" to 30.
    - All 30 dots of "Rating, maximum from 'Number'" are selectable (SC-003).
    - Then set "Number" to 12: 12 dots show, the marker "(30)" appears, and setting "Number" back
      to 30 restores the value.
5. **Hitboxes (US4)**: on the 30-dot rating, click between two dots.
    - One of them is set, and there is no dead zone.
    - Narrow the window: the dots become pills on one row, and the page does not scroll sideways.
6. **Editor (US5)**: open the template editor on a page with a rating.
    - Toggle every switch and watch the live page.
    - Switch the style to Number: the S/P/E toggles disappear.
    - Import a template file that has `"presentation": "boxes"`: it loads as dots with no issue.
