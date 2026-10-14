# Design: Denser Brief Layouts

**Spec**: [spec.md](spec.md) | **Date**: 2026-10-14

## Approach

The brief is not a new view: it is the existing declarative template renderer with `compact`
elements, so the change extends those elements and the group layout (constitution VI: extend an
element before adding one). Three layers, in delivery order:

1. **Foundation: the area.** The sheet view root becomes a named size container (`brief`), and a
   group can lay out its columns from that container instead of from the window. Nothing else uses
   container variants of this name, so full sheets and saved pages stay as they are.
2. **US1 + US3: short labels and the two looks.** A rating in short form shows three letters and its
   value. Narrow areas draw it as a **cell** (one row per rating, groups as columns); wide areas as
   a **pill** (label and value in one chip, chips flowing inside each group). The concept the
   maintainer approved is the visual reference (cells on phone, pills on desktop).
3. **US2: one rhythm.** The other compact forms take their gaps and heading style from one small
   token set, then the shipped briefs are re-laid out. **US4**: editor settings, storybook, user
   guide.

Shipped briefs to re-lay out: Star Wars character and droid (`templates/character.ts`), creature,
vehicle, fodder, V5 core (`systems/v5/core/templates.ts`), and Hunter
(`systems/v5/modules/hunter/templates/brief.ts`); V5 core and Hunter share `compactTraitsGroup`.

## Decisions

- **D1 — Container queries, not window breakpoints.** Tailwind 4 `@container/brief` and `@md/brief:`
  variants on a root wrapper (`container-type: inline-size`). _Why_: FR-006; the same brief must fit
  a card or window beside others (T-051, T-059, T-112). _Rejected_: changing `columnClasses`
  (`md:`/`xl:`) for every group — it would move full sheets (SC-007); a JS `ResizeObserver` — extra
  renders per resize and a flash on first paint.
- **D2 — The unnamed container is taken.** `.term-row` is already an inline-size container, so the
  rating's own queries would see its row, not the area. _Why_: that is why the container is named.
  _Rejected_: reusing `term-row` thresholds — they measure one row, not the brief.
- **D3 — Group option `layout: 'window' | 'area'` (default `window`).** `area` swaps the group's
  column classes for container variants: three columns, folding to one below 260 px; items inside a
  column flow as a multi-column list (`column-width: 5.25rem`) in narrow areas and as wrapping chips
  from 448 px up (`@md/brief`). _Why_: opt-in keeps every saved page unchanged and is an editor
  setting like `collapsible` (FR-009). _Rejected_: inferring it from "all children compact" — hidden
  behavior, and a user page would change its layout on update.
- **D4 — One field setting `shortForm` (boolean) plus optional `shortLabel` text** on rating fields.
  The label shown is `shortLabel` ▸ the glossary's abbreviation for the locale ▸ the first three
  letters of the displayed label, uppercased. _Why_: shipped traits take hand-written values from
  the glossary (clarification), user traits get the rule and can override. _Rejected_: a second
  translated label per node — doubles every `labelMessage` for no benefit; deriving only by rule —
  wrong for Russian (the glossary has «Мощь» for Strength, so «СИЛ» in the concept was wrong; the
  glossary is authoritative: МОЩ). A shipped rating that is not a glossary term (creature pools,
  vehicle stats) leaves `shortForm` off unless its node sets `shortLabel`.
- **D5 — Abbreviations live in the glossary** (`translations/glossary/*.yaml`, spec 009): new
  optional keys `abbr` (English) and `ruAbbr`, generated into `bookTerms` next to `ruShort`. _Why_:
  the glossary already owns per-term short forms, refs, and the verifier. A verifier rule checks
  that every rated term of a shipped brief has both and that they are 2–4 characters. _Rejected_:
  YAML under `ui/` per label — would be a second owner of the same terms.
- **D6 — Uniqueness per group at draw time.** A pure `shortLabelsFor(nodes, locale)` resolves one
  group's labels and, on a clash, returns the full label for the later node (spec edge case); a
  context hands the map to the ratings. A test over every shipped brief in both languages proves no
  clash occurs there. _Rejected_: failing the page on a clash — a user page must always draw.
- **D7 — Accessible name and hint stay the full label.** The short form is a visual layer only: the
  control keeps `aria-label`/`label` = full name; the `TermLabel` hint (book term, English name) and
  `title` show the full name on hover, focus and tap. _Why_: FR-002, SC-004.
- **D8 — Touch hit area by an extended pseudo-element** (`before:absolute before:inset-y-[-4px]`,
  applied under `@media (pointer: coarse)`), not by growing the cell. _Why_: SC-006 without losing
  density; this is how the concept reached ≥32 px at 26 px cells.
- **D9 — Rhythm tokens in one file** (`features/sheet/declarative/briefRhythm.ts`): class constants
  for cell gap (`gap-1`), group gap (`gap-2`), heading style (11 px uppercase primary, hairline),
  label style (10.5 px, `tracking-wide`). Compact resource, text, track, tracker, list, banner and
  section heading import them. _Rejected_: CSS variables on the container — they would not reach
  portaled popovers and add a second system next to Tailwind classes.
- **D10 — Compact resource becomes one chip** (`WIL 5/6`): short label, current, `/`, maximum, both
  inputs keep their own accessible names. The condition track keeps its `strip` layout (exists for
  compact nodes); only gaps and box size follow the rhythm.

## Changed types and data

- `types/template.ts`: field `shortForm: boolean` (default false), `shortLabel?: string` (1–4
  chars); group `layout: 'window' | 'area'` (default `window`). Additive with defaults, so
  `TEMPLATE_SCHEMA_VERSION` stays 3 and saved pages parse unchanged (FR-012). Template contract
  documents under `contracts/` are checked for a mention; the cloud wire carries templates as opaque
  content, so no contract change is expected.
- `translations/glossary/*.yaml`: `abbr`, `ruAbbr` for every rated trait term (attributes,
  abilities, virtues, Hunter attributes and skills); `scripts/translation-build.ts` and the
  generated `BookTerm` carry them; the i18n verifier gets the rule from D5.
- `features/template-editor/settings/registry.ts`: `shortForm` and `shortLabel` (look group, ratings
  only; `shortLabel` shown while `shortForm` is on, with the derived value as placeholder); `layout`
  for groups. Strings in `translations/source/{en,ru}/ui/…`.
- Shipped templates: `shortForm: true` on brief ratings, `layout: 'area'` on brief groups through
  the builders (`templates/builders.ts`, `compactTraitsGroup`, the Star Wars `briefSheet`).
- No store, persistence, or migration change.

## Principles at risk

- **VI (accessible, consistent, storybook, editor parity)**: full names kept (D7); light/dark by
  project palette tokens only; the settings are editor settings (D3, D4); the storybook gets each
  changed element in both forms and both themes; strings in en and ru.
- **VII (performance)**: container queries are CSS only; the label map is computed once per group
  render (memoized on nodes and locale); the existing sheet timings are the guard (SC-008).
- **Compatibility (II, V)**: additive schema defaults (above); a perf/regression test pins full
  sheet heights.
- **VIII (third-party material)**: abbreviations are short labels of game terms, not book text; the
  glossary notes stay paraphrased.

## Tests

- `tests/sheet_manager/short-labels.test.ts`: order (override ▸ glossary ▸ derived), uppercase,
  fewer than three letters, Cyrillic, clash falls back to the full label.
- `tests/sheet_manager/brief-short-labels.test.tsx`: every shipped brief, en and ru: no clash per
  group, each short control has the full name as accessible name and hint (SC-004), value and edit
  control present (FR-005).
- `tests/sheet_manager/template-schema.test.ts` (extend): new fields default off; a saved page
  without them parses to the same tree.
- `tests/sheet_manager/compact-elements.test.tsx`: resource chip names, text, track, tracker keep
  value, label, control.
- Editor: `editor-shared-settings.test.tsx` extended for `shortForm`, `shortLabel`, `layout`.
- Glossary: verifier rule test for missing or too-long abbreviations.
- `tests-e2e/smoke/brief-layout.spec.ts`: at 375, 640, 1280 px areas the Star Wars character brief
  is ≤700 px / ≤400 px / not taller than at 640, with no horizontal scroll (SC-001 – SC-003); full
  sheet heights at 375 and 1280 within 1% of the recorded baseline (SC-007). Timings reported only.
- `tests/sheet_manager/storybook.test.tsx`: new variants render in both forms.

## Manual walk

1. Open a Star Wars character, switch to the brief on the phone (375 px), light, then dark → cells,
   three-letter labels, groups visible, about one screen; tap a cell → full name shown, value edits.
2. Same on a 640 px window and on desktop → pills, chips flowing in each group, no horizontal
   scroll.
3. Switch to Russian → labels come from the glossary (МОЩ, not СИЛ, for Strength); no two equal
   labels in a group.
4. Hunter, droid, creature, vehicle, fodder briefs → same density and rhythm.
5. Template editor: add a rating, turn on the short form, change its short label → preview and
   storybook match; save, reopen a document on the page.
6. Open a page saved before the change and a full sheet → unchanged.
7. Touch emulation: every edit control reacts to a tap at the edge of its cell (≥32 px).

## Implementation notes

- **Foundation**: `shortForm`, `shortLabel`, and group `layout` are plain optional keys (absent
  means off/`window`), not keys with defaults, so a page saved before the change parses to exactly
  the same tree. The editor factories needed no change for the same reason. The sheet root carries
  `data-template-root` (the template id) so tests measure the sheet itself.
- **Baseline**: heights recorded in `tests-e2e/smoke/brief-baseline.ts` (dev server, 375 and 1280).
  The WoD 2e character brief is not in that list yet (added with US1).
- The area stack is simpler than D3 said: rows when narrow, wrapping chips from `@md/brief`; the
  multi-column list (`column-width`) is not needed because the chips take over before columns would
  help.
- Dev-server runs of the e2e spec report a React "unique key" warning from `Tracker` for the fodder,
  Hunter, and V5 sheets; it comes from existing code and shows in dev builds only.
