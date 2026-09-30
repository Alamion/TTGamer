# Research: Configurable trackers

All unknowns from the Technical Context are resolved here. Paths are relative to the repository
root; line numbers are from 2026-09-30 and are only hints.

## R1. One tracker model for own and built-in trackers

**Decision**: a single configuration shape, `TrackerConfig`, describes what the author sets:

- display;
- marks;
- levels;
- value column;
- columns;
- total;
- lengths;
- out.

It serves two element types:

- the new `tracker` **field**: own values;
- the existing `primitive` **track node**, bound to a `TrackBinding`, as an optional `tracker`
  option.

Both are normalized at render time into one `TrackerModel`: levels, mark kinds, columns with
copies and their marks and texts, the visible length, and the total per copy. One molecule
renders the model.

**Rationale**: FR-020 asks for the same settings on both, and the maintainer wants full parity.
Today three renderers overlap:

- `ConditionTrackTable` / `ConditionTrackStrip`;
- `CohortTrack`'s own table, which duplicates the mark buttons;
- the orphan `CompactConditionTrack`.

`CohortTrack` also ignores `trackLayout`. A normalized model removes the duplication and makes
FR-012 hold for every tracker.

**Alternatives considered**:

- A separate own-tracker component beside today's track renderers. This doubles the look and
  behavior, and parity would have to be kept by hand.
- Turning built-in trackers into own-value fields. That breaks FR-022: marks must stay in the
  document's data, which other pages and the docs embeds read.

## R2. A field type, not a new node type

**Decision**: `tracker` joins `TEMPLATE_FIELD_TYPES` and the `TemplateFieldSchema` union, with
the `fieldBaseShape`: id, label, `hideLabel`, placement, `valueKey`, and so on. It is excluded
from:

- `LIST_ITEM_TYPES` (spec 016): the maintainer decided against it;
- table columns. `TableNodeSchema.columns` reuses `TemplateFieldSchema` (`template.ts:453`), so a
  refinement rejects `tracker` there, and the table column type picker filters it out.

**Rationale**: fields already come with the whole pipeline:

- the value key and `templateValues` storage;
- write validation (`validateTemplateValue`);
- read coercion (`coerceStoredValue`);
- the control registry (`declarativeFieldRegistry.ts`, which is exhaustive);
- the field editor and the palette type picker;
- the storybook guard (`REQUIRED_VARIANTS` includes every field type).

The compile-time guards `TemplateFieldTypesAreComplete` and the exhaustive switches point at every
place to update.

**Alternatives considered**: a new node kind next to `primitive`. It needs its own value plumbing,
and the guards would not catch missing cases.

## R3. Stored value of an own tracker

**Decision**: `templateValues[valueKey]` holds a `TrackerValue`:

```text
{ tracker: 1,
  length?: number,                       // index into config.lengths
  columns: { [columnId]: TrackerCopyValue[] } }
TrackerCopyValue = { id: string,
                     marks?: { [levelId]: markId },
                     texts?: { [levelId]: string } }
```

- Levels, mark kinds, columns, and copies have stable generated ids. The `tracker: 1` tag makes the
  object unambiguous inside the `TemplatePageValuesSchema` union and versions the shape.
- Copy labels (A, B, C…) come from the copy's position, so a removal relabels without a write.

**Rationale**:

- **Reordering loses nothing.** Keyed by id, marks follow their level and kind when either is
  moved, so reordering never needs a warning (edge cases). Only removals drop values (FR-026).
- **Hidden values survive.** Values on levels a column no longer covers, or a length hides, stay
  stored and reappear (edge cases).
- **The formulas follow-up can use it (FR-030).** The total of a copy is a pure function of
  (config, value) and needs no second stored field.

**Alternatives considered**:

- Positional arrays like the built-in `ConditionMark[]`. Reordering would move marks to another
  level.
- Storing mark weights. Weight is the kind's position in the config, so storing it would
  duplicate that.

## R4. Built-in trackers: what the page may override

**Decision**: `PrimitiveNode.tracker` is a partial `TrackerOverride`. It holds:

- `display`;
- `marks`: per game mark (`slash`, `cross`), the name, symbol, and fill;
- `levels`: per level index, an optional name and value;
- `valueColumn`;
- `columns`: extra columns only;
- `total`;
- `valueKey`: for the extra columns' values.

The game fixes:

- the level count and order;
- a computed length (V5);
- the number and ids of mark kinds;
- the built-in marks column and its members (copies), including the cap and "out";
- the variant lengths (fodder).

Extra columns store a `TrackerValue` in `templateValues[valueKey ?? node.id]`. Their copies:

- **Plain built-in tracks**: one copy per extra column.
- **Member tracks**: extra columns that allow copies are keyed by member id, so each member gets
  its own cell and a member's cells go when the member goes.

**Rationale**: FR-020 to FR-022. Marks keep living in `bound.data[dataKey]`, written through
`useBoundDocument()` exactly as today, so the docs embeds and other pages are unaffected.

**Level overrides keep the game's values** (FR-021). Today `primitives.tsx:845-850` rebuilds levels
with `penalty: null`. The new merge takes the game level and replaces only the name or value the
page sets.

**Legacy `track {levels, names}`** (no shipped template uses it):

- When its count equals the game's, it is read as name overrides.
- When the count differs, it keeps defining the level count, as today, so FR-024 holds. The
  editor then shows the count as "set by an older page" with a "Use the game's levels" action.
  Nothing is rewritten on load.

**Alternatives considered**:

- Dropping legacy count overrides. This breaks FR-024 for saved user templates.
- Allowing count changes on built-in trackers. The game's rules (penalties, fodder variants)
  depend on the count.

## R5. Built-in mark names and defaults

**Decision**: `TrackBinding` gains an optional `marks` list (`slash`, `cross`) with label
translations:

- WoD-like health tracks (`conditionTracks` with id `health`: Star Wars and WoD 2e characters,
  creature and fodder members): Bashing and Lethal;
- the V5 bindings: Superficial and Aggravated.

The default fills are secondary (slash) and error (cross), with the symbols ╱ and ×: today's look.
A binding without `marks` falls back to generic "Slash / Cross" names. The Star Wars
vehicle-damage levels (vehicle members, droid damage) declare no names, so they use the generic
ones: bashing and lethal do not describe damage to machines.

**Rationale**:

- The legend (FR-011) and the accessible names need mark names.
- Declaring them on the binding keeps system knowledge in the systems (constitution I, no system
  conditionals).

**Alternatives considered**: hard-coded names in the renderer. They would be wrong for V5 and would
need system conditionals.

## R6. Display: one setting and the legacy mapping

**Decision**: `TrackerConfig.display` is `'table' | 'strip' | 'line'`. For a track primitive
without `tracker.display`, the display is resolved once in a pure helper `trackerDisplayOf(node,
binding)`:

- `compact` → `line`;
- otherwise `trackLayout`;
- otherwise `strip` for a computed length and `table` otherwise (today's default, FR-013).

The editor writes `tracker.display` and clears `compact` and `trackLayout` on track primitives.

`compact` stays in `fieldBaseShape` and on other primitives (trait rows, resources), where it
still means "compact". Only its meaning for trackers moves into `display`.

**Member tracks follow display** as well:

- table: today's multi-member table;
- strip: one strip per member;
- line: small strips with the label inline.

Today they ignore the view; their stored compact placements map to `line` and look as before.

**Rationale**: FR-012 and FR-013. No stored template is rewritten: the store has no migrations while
there is no permanent user base (`templateStore.ts:10-17`), and reading with a fallback is the
established pattern (for example `listItemField`).

**Alternatives considered**: a `z.preprocess` that folds `compact` into `display` for primitives.
The primitive schema is shared by all bound parts, and `compact` must keep working for non-track
primitives.

## R7. Totals, "out", lengths, and folding

**Decision**: pure rules in `features/sheet/data/tracker.ts`, generalizing `cohort.ts`:

- **Mark weight**: the kind's position in the config (the built-in `slash` < `cross` matches
  today's `SEVERITY`).
- **Total**: the value of the deepest marked visible level, or "—". A built-in value is the
  level's penalty, or the page's override.
    - Built-in penalties `0` and `null` both show "—", as `ConditionTrackTable` does today.
    - Own values are text and show as written.
- **Out**: the last visible level of a marks copy is marked.
- **Lengths**: each length lists level ids in level order. Shortening folds the marks of hidden
  levels into the new last visible level, keeping the heaviest, after the existing danger
  `ConfirmDialog` ("Shorten the tracker?"). The rule is today's `shortenMarks` expressed over
  level ids.
- `cohort.ts` keeps its exports for the built-in adapter, reimplemented on top of the new rules, so
  the parity tests compare the two paths.

**Total row defaults**:

- member tracks: on when the document has more than one member, because today only the
  multi-member table shows a total row (a single member renders the plain table without one);
- other built-in tracks: off, so they look as before;
- the shipped Star Wars character page: on (FR-023);
- a new own tracker: on.

**Rationale**:

- One rule set proves parity (User Story 7): the own-tracker rebuild of the fodder group and the
  built-in one run the same folding and total code on different inputs.
- Keeping the "—" for 0 matches today's built-in look (FR-024).

## R8. The editor

**Decision**:

- **Palette.** The "Tracker" item creates an own `tracker` field with the default config: seven
  health levels, two marks, one marks column "Damage", total on. Today it adds a primitive bound to
  the first track binding.
- **Source select.** The tracker's settings start with "Source": "Own values", or each track
  binding the page offers (today's `editor.trackerSource`). Switching converts:
    - between a `tracker` field and a `primitive` track node, keeping the id, label, display, value
      column title and visibility, extra text or marks columns, and the total;
    - own levels and marks are replaced by the game's, and the reverse starts from the game's levels
      and marks.
- **One settings component.** `TrackerSettings.tsx` renders every group of the prototype for both
  element kinds and disables the game-fixed parts with a short note. The groups:
    - Display;
    - Marks (with ready sets);
    - Levels (with move up and down);
    - Value column;
    - Columns;
    - Lengths;
    - Reading the marks.

    `PrimitiveConfig` delegates to it for track bindings; `FieldEditor` delegates to it for
    `tracker` fields.

- **Value loss.** `trackerChangeReport(before, after, documents)` is a pure function in
  `features/sheet/data/trackerChanges.ts`, modeled on `listItemChangeReport`. It counts stored
  marks, texts, and copies that a save would drop (FR-026):
    - removed levels, mark kinds, and columns;
    - copies turned off;
    - a lower maximum.

    `TemplateEditorDialog.handleSave` adds it to the pending-save confirmation next to the list and
    retarget reports. Stored values are never rewritten; dropped ids simply stop showing, as for
    lists.

**Rationale**:

- The prototype is approved.
- One settings component keeps own and built-in settings the same by construction.
- The confirmation reuses the established pending-save flow (spec 016 FR-014).

**Alternatives considered**: a separate "Built-in tracker" palette item. The Source select already
covers it, and it keeps one entry point.

## R9. Colors

**Decision**: a fill is one of the palette keys `secondary | error | tertiary | success | text`,
or a `#rrggbb` string.

- **Palette keys** map to Tailwind classes (`bg-secondary border-secondary`, …), so they follow the
  theme tokens.
- **Own colors** are applied as an inline `background-color` and `border-color`.
- **The symbol** is white, except on `text` (ink), where it uses `bgBase` so it stays readable in
  dark mode.

The native color input is the own-color picker. Radix is not needed.

**Rationale**:

- FR-006 and FR-009: today's mark classes stay the reference look.
- The five colors are already in the storybook palette (constitution VI), so no palette entry is
  added.

## R10. Limits

`TEMPLATE_LIMITS` gains:

| Limit                  | Value |
| ---------------------- | ----- |
| `trackerLevelsMax`     | 20    |
| `trackerMarksMax`      | 5     |
| `trackerColumnsMax`    | 6     |
| `trackerCopiesMax`     | 24    |
| `trackerLengthsMax`    | 6     |
| `trackerTextMax`       | 200   |
| `trackerLevelValueMax` | 12    |
| `trackerSymbolMax`     | 2     |
| `trackerMarkNameMax`   | 40    |
| `trackerLevelNameMax`  | 40    |

- The symbol length is counted in code points, so ✱ and ╱ count as 1.
- The per-copy mark map is bounded by the level count.
- Values over a limit are rejected at the write path with `template-value-write-rejected`
  (reason `bounds`).

**Rationale**:

- The spec's limits (Assumptions).
- The member cap of 24 matches `cohort.maxMembers`.
- The level name limit of 40 matches today's `track.names`.

## R11. Diagnostics

- **Unreadable stored values.** An own tracker value that fails `TrackerValueSchema`, or carries
  ids that break the shape, is read as empty. It is reported once per render as
  `template-value-unreadable` with the field id, a new code in the `SheetIssueCode` union. The
  editor preview skips the report, as `list-entry-unreadable` does.
- **Hidden values are reported.** Marks and texts under ids of removed levels, kinds, columns, or
  copies beyond the column's `max` are hidden on the sheet. Their count is reported once per render
  as `template-value-hidden` (field or node id, count), a second new code; the editor preview skips
  it. The template may have changed outside the editor (a template file, a library replace), so
  the editor's save confirmation alone does not make the fallback observable (spec FR-026a). This
  follows `list-entry-unreadable`, which is reported even after a confirmed item type change.
  Values a column no longer covers, or a length hides, are not counted: they return when the
  coverage or length grows.

**Rationale**: FR-002 and constitution III: no silent fallback.

## R12. Storybook and docs

- **Stories.** A handwritten `trackers` story holds own trackers:
    - each display;
    - one, two, three (WoD 20th), and own marks;
    - a text column covering 3 levels;
    - a repeatable column;
    - lengths and "out".

    The bound-part stories gain a built-in tracker with an extra column and the total row.

- **Guard.** `storybook.test.tsx`'s `variantsOf` tags:
    - `tracker`;
    - `tracker:display:<d>`;
    - `tracker:marks:<n|own>`;
    - `tracker:column:text`;
    - `tracker:copies`;
    - `tracker:lengths`;
    - `tracker:out`;
    - `tracker:total`;
    - `primitive:tracker:columns`.

    `REQUIRED_VARIANTS` requires all of them.

- **Parity widget.** A `TrackerParity` widget on the template-elements storybook page, beside
  `ReferenceEntryVariants`, renders the shipped fodder group and its own-tracker rebuild side by
  side on the same sample marks. Stories target one engine, so two systems cannot share a story.
- **Guide.** `docs/template-editor/elements.mdx` (en and ru) gains a "Tracker" section, and the
  built-in tracker settings move there.

## R13. What stays out

These are follow-ups, recorded in the spec:

- formulas reading a tracker;
- a tracker as a list entry or table column;
- a square toggle look.

There is no document data migration and no change to the shipped fodder group (FR-025). The orphan
`CompactConditionTrack` is left for a cleanup task, so this change stays focused.

## Implementation notes (2026-10-01)

Where the built code differs from the decisions above:

- **Switching the length is positional (R7).** The shipped fodder group stores marks by shown
  position, so its damage keeps its place in the shown order when the length changes. For true
  parity, an own tracker does the same: on a length switch, the n-th shown box keeps its mark and
  the tail folds into the new last level (`remapMarks`). Marks stay stored by level id otherwise.
- **The write path checks shape and copy caps only (R3, R11).** Rejecting unknown level, kind,
  or column ids would block every later write once the author removed a part; they pass, stay
  hidden, and are counted by `template-value-hidden` instead.
- **`cohort.ts` stays positional.** Built-in member marks are `ConditionMark[]` by slot, so its
  rules keep that shape; `tracker-rules.test.ts` pins them against the id rules and
  `tracker-parity.test.tsx` proves the two trackers match end to end.
- **Files.** The own-value control is `declarative/TrackerFieldControl.tsx`; built-in trackers
  render through `declarative/BuiltInTracker.tsx`, which replaces `CohortTrack.tsx`; the editor
  adapter for built-in overrides is `template-editor/builtInTrackerSettings.ts`; config factories
  are `data/trackerDefaults.ts`. The old `ConditionTrackTable`/`ConditionTrackStrip` are removed.
- **Member tracks keep their wording** (Add member, Remove member A, Out of the fight, the member
  cap alert) through the tracker's wording overrides.
- **Legend is opt-in** (maintainer review): the mark legend no longer appears automatically with
  two or more marks. A `legend` flag on the field and on the built-in override turns it on
  ("Name the marks under the tracker"); it is off by default everywhere, built-in trackers too.
- **Settings fit the 20rem panel**: the settings groups are `fieldset`s, whose browser default
  `min-inline-size: min-content` let wide rows push the panel into horizontal scroll; the groups
  and the panel root now use `min-w-0` with a `minmax(0,1fr)` column, and rows wrap.
