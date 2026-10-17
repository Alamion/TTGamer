# Design: Template-Editor Parity for the Vampire Mechanics

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-17

## Approach

Every 037 mechanic moves from a system binding into the template: the binding layer keeps only where
data lives (traits, resources, fields, lists, rows), and the template says what is computed, shown,
and done. One formula language carries all of it: derived values, display conditions, and button
rolls, conditions, and changes. Delivery order follows the dependencies:

1. **US2** formulas (rounding, comparisons, `if`, text, `&`, `rating()`, row values) and formula
   display conditions — every later story uses them.
2. **US1** the Button element and row buttons, writing through the page's `applyWrites`.
3. **US3** From catalog on text fields. 4. **US4** marks from the end on the pool tracker.
4. **US5** Parent columns in user catalogs and Limit by parent.
5. **US6** rebuild the vampire templates on 1–5, add Remorse, delete the code-only mechanics.

## Decisions

- **D1 — One formula language for everything**:
  [formula.ts](../../src/sheet_manager/features/sheet/declarative/formula.ts) gains `ceil`, `floor`,
  `round`, `abs`; comparisons `< <= > >= = !=` (1 or 0); `and`, `or`, `not`; `if(cond, a, b)`;
  string literals `"…"`; `&` joining texts; `rating(list, "Name")`; and `row.<column>` inside rows.
  Results are `number | string`; arithmetic on a text is the existing `non-numeric` error. _Why_:
  Blood Potency tables, potency range, and Rouse re-roll rules are all small expressions; one parser
  keeps the editor's checks and pickers. _Rejected_: a lookup-table element — a second language for
  what `if` already says.
- **D2 — Shipped texts in formulas are translated by key**: a formula field may carry `textMessages`
  (literal → message id); the sheet shows the translation when the result equals a literal. User
  templates write plain text. _Why_: the formula stays readable in the editor and shipped templates
  stay bilingual. _Rejected_: message ids inside formulas — unreadable for authors.
- **D3 — `rating(list, "Name")`**: sums the ratings of the list's entries whose name matches the
  name — for a list that follows a catalog, any name (English, Russian, the book name) of the
  catalog entry with that name; 0 when absent. Works on template lists and built-in lists
  (`list:disciplines`). _Why_: replaces 037's `disciplineDots` coordinates. _Rejected_: hidden
  computed coordinates per discipline — code-only again.
- **D4 — Display condition by formula**: `VisibleWhen` becomes `{coordinate, equals, not?}` or
  `{formula}` (shown while non-zero / non-empty); the editor's "Show when" offers both. _Why_: the
  rituals block needs a sum, without a helper field on the page. _Rejected_: forcing a visible
  derived field to test.
- **D5 — Button is a node, row buttons are a list on tables and rows**: a `button` node in the "+"
  menu; `rowButtons` on `table` nodes and on built-in rows primitives (`rows:*`) — not a table
  column, because columns are value fields. One `ButtonSpec` for both. _Rejected_: a `button` field
  type — it would get a value key, label position, and required flag it cannot use.
- **D6 — Button run is a pure function plus a thin component**: `runButton(spec, context)` in
  `features/sheet/declarative/button/` evaluates availability, count, notation (`{formula}` segments
  substituted), rolls through `useSheetDiceActions` (the existing sheet → dice adapter, constitution
  III), counts successes as total ≥ `successAt`, re-rolls a failed roll once while `rerollWhen`
  holds, and returns the writes and a message. Changes clamp to the target's bounds (binding range,
  field min/max). A cancelled roll returns the writes of finished rolls only. _Why_: testable
  without React; reuses 037's tested flow.
- **D7 — Undo**: the result toast (react-hot-toast, as today) carries an Undo button for 8 s; it
  writes the old values back for every target still holding the value the button wrote, and says
  which it skipped. _Rejected_: a confirmation before rolling — slow for frequent Rouse checks.
- **D8 — Game dice opt-in**: `roll.gameDice` (default false) passes the document's `specialDice`
  (Hunger) to the roll source; off strips it as 037's ActionButton did.
- **D9 — From catalog**: text fields get
  `fromCatalog {catalogId, entryFrom (coordinate), text, alternative? {text, when: VisibleWhen}, mode: 'show' | 'suggest'}`.
  Text keys come from the catalog: shipped catalogs declare `texts` (key + label; lazy texts load
  through 037's `useCatalogText`), user catalogs offer their text columns. `fieldFallback.ts`
  becomes the shared reader. _Rejected_: a new "catalog text" element — the field already exists
  (constitution VI).
- **D10 — Marks from the end on the pool tracker**:
  `PoolTrackerOverride.marksFromEnd {coordinate, mark?}`. The pool tracker (spec 020) also draws
  single values — a Rating field with presentation `tracker`, and rating-mode built-in resources —
  boxes up to the value, marks of the second value from the last box, written by the outline action
  (right click, Shift+Enter, long press) and refused on a filled box. `ScoreTrack` and
  `mode: 'score'` go. _Rejected_: keeping ScoreTrack as an element — a near-duplicate of the
  tracker.
- **D11 — Parents**: user catalogs gain column type `entry` (`catalogId` of the parent catalog;
  value = entry id). A catalog-bound select column of a table gets
  `parent {list (coordinate), limit? {level (entry key or column), parentRating}}`; built-in rows
  primitives get `limitByParent` over the parent their binding already declares.
  `RowsCatalogParent.limit` moves to the template. _Rejected_: parent only for shipped catalogs
  (clarification).
- **D12 — Remorse**: a button by Humanity: available when `stains > 0`; roll
  `{max(1, 10 - humanity - stains)}d10>=6`; failure adds -1 to `humanity`; always sets `stains` to 0
  (`always` changes beside success and failure).

## Changed types and data

- `types/template.ts`: `ButtonNodeSchema` (`type: 'button'`, label/labelMessage, `icon` from a small
  Lucide set, `availableWhen`, `roll? {notation, count, rerollWhen, successAt, gameDice}`,
  `onSuccess`/`onFailure`/`always: Change[]` with `Change {target, op: 'add' | 'set', amount}`,
  optional `messages`); `rowButtons` on tables and primitives; `VisibleWhen` formula variant;
  formula `textMessages`; text `fromCatalog`; rating presentation `tracker` + `poolTracker`;
  `PoolTrackerOverride.marksFromEnd`; select `binding.parent`; primitive `limitByParent`. All
  optional: stored templates parse unchanged (zod baseline: additions only).
- `systems/userCatalogs.ts`: column type `entry` with `catalogId`; stored catalogs unchanged.
- `systems/catalogs.ts`: `CatalogBindingEntry.texts`.
- Removed from `systems/templateBindings.ts`: `ActionBinding`/`ActionContext`/`ActionOutcome`,
  `RowsBinding.actions`, resource `mode: 'score'` and `score`, `FieldBinding.readOnly`/`fallback`,
  `BoundMessage`, `RowsCatalogParent.limit`; with them `ActionButton.tsx`, `ScoreTrack.tsx`, and the
  vampire's `rouse.ts`, potency-effect and ritual-dots bindings (`bloodPotency.ts` stays as the test
  oracle only if still imported; otherwise removed).
- Vampire templates (`templates/sheet.ts`, `brief.ts`): Rouse and Remorse buttons, power row button,
  potency effects as formula fields, grants/bane/compulsion via `fromCatalog`, Humanity as a
  rating-mode primitive with `poolTracker.marksFromEnd: 'stains'`, rituals `visibleWhen.formula`.
  037 is unmerged: no migration.
- Translations: editor strings (button settings, formula help, From catalog, marks from the end,
  parent column), button messages (generic change/undo texts), vampire formula `textMessages`.

## Principles at risk

- **VI (editor parity, storybook)**: every new node and option gets editor settings, issue checks,
  and a storybook story. Each `ELEMENT_EDITORS` entry lists the node keys its settings edit
  (`settingKeys`); `tests/sheet_manager/shipped-parity.test.ts` walks every shipped template and
  fails on a defined key outside its node type's list (SC-003).
- **III (handoffs)**: rolls go only through `integrations/sheet-dice`; failures (cancel, bad
  notation, unknown target) show a message and report to `diagnostics.ts`.
- **II (contracts)**: template and user catalog schemas change additively; library items carry
  templates as opaque content, so the cloud contract is unchanged.
- **VII (performance)**: formulas stay one pass in dependency order; the button runtime is a few KB;
  bundle budget +10 KB gzip against `037-vampire-character` (SC-005), measured as in 037.
- **I (modularity)**: no system import in generic code; the vampire's rules live in its templates.

## Tests

- `tests/sheet_manager/formula-functions.test.ts`: each new function, text results, `&`,
  comparisons, `rating()` with catalog names in both languages, `row.*`; old formulas unchanged.
- `tests/sheet_manager/button-run.test.ts`: success/failure changes, clamps and the at-limit
  message, count and re-roll, cancel mid-way, unavailable, bad notation, `always`, game dice.
- `tests/sheet_manager/button-ui.test.tsx`: button and row buttons render, read-only disabled, Undo
  restores and skips hand-edited values.
- `tests/sheet_manager/from-catalog.test.tsx`: show and suggest modes, alternative text, no match,
  lazy text.
- `tests/sheet_manager/pool-tracker-marks-from-end.test.tsx`: marks from the end, refusal, keyboard,
  accessible name; stains shrink when the value rises.
- `tests/sheet_manager/catalog-parent.test.ts`: `entry` columns, broken links, limit filtering and
  the above-parent mark for user and built-in rows.
- `tests/sheet_manager/visible-when-formula.test.tsx`, editor tests for each new setting, and
  `shipped-parity.test.ts` (SC-003).
- Updated 037 tests (`vampire-rouse`, `vampire-sheet`, `vampire-blood-potency`, `score-track` →
  tracker test) run against the rebuilt templates (SC-001); e2e vampire brief unchanged.

## Manual walk

1. New vampire, sheet → Hunger 1, Humanity 7; Rouse check → toast with Undo; Undo → Hunger back.
2. Mark 2 stains by right click; Remorse check → stains 0, Humanity 7 or 6; without stains the
   button is disabled with a reason.
3. Blood Potency 3 → effects update; clan Brujah → bane suggestion; variant → variant bane; predator
   type → grants shown, not editable.
4. Auspex ●● → power picker offers levels 1–2; a power's Rouse button with cost; Blood Sorcery ● →
   rituals block appears.
5. Copy the vampire sheet to a user template; in the editor select the Rouse button, a potency
   formula, the bane field, Humanity, and the powers table — each shows its settings.
6. New user template: build a "Spend" button without a roll and a Rouse-like button from the guide.
7. Repeat 1–4 in Russian; brief at 375 and 1280 px.

## Implementation notes

- **Deviations from the design and tasks.**
    - Button files sit in `features/sheet/declarative/` itself (`runButton.ts`, `SheetButton.tsx`,
      `buttonTargets.ts`, `PageScope.ts`), not a `button/` folder: the lint rule against directory
      index imports forbids `../hooks` from a subfolder.
    - `rating()` takes the highest rating when a name is written twice (as 037's discipline dots
      did), not the sum.
    - From catalog's `alternative.when` is a formula, not a `VisibleWhen`; the entry is found by its
      id too, so a catalog choice can name it.
    - Blood Potency effects show numbers, with the unit in the label ("Blood surge, extra dice +2")
      instead of 037's "+2 dice" / "none" messages; the range is a "min–max" text, and a separate
      text shows "Outside this generation's range" by a display formula. Feeding penalties are eight
      whole texts translated through `textMessages`.
    - Tracker marks gained `nameMessage` so a shipped mark name ("Stain") is translated; the brief
      draws Humanity as a strip (a labelled row was cramped on phones).
    - Rating-mode built-in values are formula coordinates by their bare name (`hunger`) besides
      `.current`; the button's context became `PageScopeContext` (trackers of built-in values use it
      too).
    - Marks from the end are set by the trackers' outline action (right click, Shift+Enter, long
      press) and the value by a click or Enter; the arrow keys move between boxes as on every
      tracker, they do not change the value (FR-009 named them).
- **Found by the parity test (SC-003), fixed.** The member cap of group tracks (`cohort`) had no
  editor setting (now "Members at most" on built-in member tracks), and the column span control had
  no `data-setting`. The test lists the properties that are not settings with the reason.
- **Found by the walk and e2e, fixed.** Button messages named values by their English binding
  labels; they now use the localized page labels and mark names. The compact cell width added in
  `ce08f95` (037 brief fix) widened Star Wars brief chips and broke the 400 px brief budget; it now
  applies only to full-label rating rows.
- **SC-005 bundle (T039).** Unique JS and CSS the sheet page loads with a new vampire open, built
  from `037-vampire-character` and from this branch: 21 files, 873,196 → 885,011 bytes gzip
  (+11,815, about 11.5 KB) against a 10 KB budget — over by about 1.5 KB (the button, From catalog,
  and score tracker code; the editor is lazy and not counted). Open for the maintainer.
- **SC-004.** The message shows as soon as the 3D roll settles (no extra wait measured in the walk);
  not timed by a test.
- **Manual walk (2026-10-17, dev server in Russian; scripted with Playwright).**
    1. New vampire → Rouse check → "Проверка жажды: успех"; on a failure the message names the
       Hunger change and offers Undo, which restores it — as expected.
    2. Stains by right click on boxes 10 and 9 → "Пятно" marks; a right click on a filled box →
       "Пятно ставится на пустую клетку: сначала уменьшите значение."; Remorse check → "успех ·
       Пятно 1 → 0" (and "провал · Человечность 7 → 6 · Пятно 2 → 0" on a failure); without stains
       the button is disabled — as expected.
    3. Generation 9 → range "2–5" and "Вне пределов этого поколения" at Blood Potency 1; clan Бруха
       → bane and compulsion suggested in Russian; predator type Alleycat → grants shown — as
       expected.
    4. No disciplines → no rituals block; power limits and power Rouse buttons: unit tests
       (`vampire-sheet`, `vampire-rouse`).
    5. Editor: every shipped element's settings are checked by `shipped-parity.test.tsx`.
    6. SC-002 (an author rebuilds Rouse from the guide in ten minutes) is the maintainer's step; the
       guide names every setting it needs.
    7. Brief at 375, 640, and 1280 px: nothing covers anything; e2e brief budgets pass.
