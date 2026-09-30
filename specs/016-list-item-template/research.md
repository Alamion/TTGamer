# Research: Custom list item template

All decisions below come from reading the current code (2026-09-27). No open questions remain.

## Current state (what the code does today)

- `ListNodeSchema` (`types/template.ts`) has no item definition. A custom list (no `bindingKey`)
  always renders through `CustomListView` → `TraitListBindingView` → `CustomTraitList`
  (`components/stat-fields/TraitRow.tsx`): a name input (or `CatalogSuggest`), a `StatDot` with
  the maximum defaulting to 5, all three S/P/E flags, a die, and a remove button inside
  `StatDot`.
- Entries are stored under `listValueKey(list)` as `TemplateListEntrySchema[]`:
  `{ id, label (1–120), value? (0–20) }`, not strict.
- `ListView` (`DeclarativeSheetView.tsx`) maps stored entries to `{id, label, value}` before
  rendering. So the S/P/E flags a user toggles are **never stored**: they are dropped on the
  next read. The write path (`templateValueWrites.ts`) does not validate list values; they
  fall through to `validated[key] = value`.
- A new entry starts with `label: ''`. That breaks the envelope schema (`label.min(1)`), which
  only matters when a document is re-parsed (import).
- Table cells already render any field type with `templateFieldControl(type)` plus
  `value`/`onChange` (`TableBlock`). This is the path list entries will reuse.
- The editor edits table columns with `FieldEditor` inside `<details>`. It routes callbacks by
  field id through `fieldCallbacks(callbacks, id)`, and the draft model finds the column by id.
- Template retargeting asks before saving: `planTemplateRetarget` → `ConfirmDialog` in
  `TemplateEditorDialog`.
- Clearing an image field does not delete its device blob; nothing frees blobs per field today.

## R1. Where the entry template lives

**Decision**: `ListNode.item?: ListItemField` and `ListNode.named?: boolean`.

- `ListItemField` is `TemplateField` minus `formula`: same schema, same refinements.
- An absent `item` means the legacy item (R5), and an absent `named` means `true`.
- The item keeps a normal field `id` (a template identifier, generated like any field's), so the
  editor's existing id-routed callbacks reach it.
- Readers use two helpers, `listItemField(list)` and `listIsNamed(list)`. They never read the
  raw optional properties.

**Rationale**: the field editor, value validation, controls, and reference checks all take a
`TemplateField`, so none of them needs a list-specific variant. Optional properties keep every
stored template and file valid with no store or file version bump.

**Alternatives**:

- A new `ListItemSchema` with its own settings: this duplicates every field option.
- The item as a child node in `children`: lists have no children. It would also show in the
  outline and be counted and validated as a page field with its own value key.

## R2. How an entry is stored

**Decision**: one entry is `{ id, label?, value?, detail?, pickLabel? }`.

- `label` is the typed name, only for named lists. It may be empty while the user types, with a
  maximum of 120.
- `value` is the item field's value in exactly the shape a field of that type stores:
    - a string or string[] for text, select, and reference;
    - a number for number and rating;
    - a boolean for toggle;
    - `{current, max}` for resource;
    - an image value for image.
- `detail` is `RatingDetail` (text and S/P/E flags), only for rating items.
- `pickLabel` is the picked name of a user-catalog choice (spec 015 R3), only for catalog-bound
  choice items.

The envelope `TemplateListEntrySchema` widens accordingly. Every current entry
(`{id, label, value: 0–20}`) is already a valid rating entry, so stored documents need no
migration.

**Rationale**: the entry mirrors the page bag's own companions (`#detail`, `#label`) as named
properties. The value shape is exactly the field's, so `validateTemplateValue(item, value)` works
unchanged.

**Alternatives**: store entries as table rows (`{rowIndex: {columnId: value}}`). This loses the
array order and the entry ids that presets and catalog suggestions rely on, and would need a
data migration.

## R3. Validation on write

**Decision**: `validateTemplatePageValues` gains a custom-list branch keyed by
`listValueKey(list)` for lists without `bindingKey`. It checks the following:

- the array length is at most 1000, and entry ids are unique;
- the label is at most 120 characters, and is only kept on named lists;
- the value is checked with `validateTemplateValue(listItemField(list), value)`, and
  `undefined` means empty;
- `detail` is checked with `RatingDetailSchema`, rating items only;
- `pickLabel` is checked with `PickLabelSchema`, catalog choice items only.

Only changed entries are checked: an entry that is identical (by reference) to the previous
array's entry with the same id passes through. So a value made unreadable by a type change never
blocks edits to other entries (edge case "stored value that the type rejects").

**Rationale**: this is the same strict-on-change, keep-orphans rule the bag and table rows
already follow.

## R4. Rendering an entry

**Decision**: a new `CustomListView` renders `ListEntryRow` per entry (memoized by entry, with
callbacks that are stable per entry id):

- it builds the control with `templateFieldControl(item.type)` and gives it the entry's value,
  as table cells do;
- it passes `ratingDetail`/`onDetailChange`, `catalogOptions`/`pickedLabel` from the list's
  runtime, and `documentOptions`/`onOpenDocument`;
- it uses `coerceListValue(item, value)` (R6) for display.

A named list puts the name input (`CatalogSuggest` when the list has a catalog, otherwise a
text input) where the item's label goes, and the item's own label is hidden for that entry.
An unnamed list shows the item's label, or none when it is empty.

Two new control props:

- `nameSlot?: ReactNode` replaces the label in the control's label position. For rating it
  becomes `RatingRow`'s label area; for other types `LabeledField` takes it. `LabeledField`
  moves from `DeclarativeSheetView` to a shared module next to the controls, so list entries
  use the same label layout.
- `rollLabel?: string` is the name a rating's die roll uses. It is the entry name, or the item
  label for unnamed lists (edge case "Dice on rating entries").

**Rationale**: every entry type gets its real control with its real settings, and there is no
second rendering path per type.

## R5. The legacy item and visual parity

**Decision**: `LEGACY_LIST_ITEM` is a rating with these settings:

- `presentation: 'dots'`, min 0, max 5 (today's `StatDot` default);
- `flags: ['specialization','practiced','experienced']`, `dice: true`, `labelPosition: 'left'`;
- `id: '<list id>-item'`, derived when read.

A named list with this item renders through `RatingRow` with the name input in its label area,
which is the same row atoms that `CustomTraitList` composes. The storybook shows the old and the
new rendering side by side while this is being built. A component test pins the parts:

- the name input;
- 5 dots;
- the three flags;
- the die;
- the remove control.

Values above 5 (possible today through presets, which allow up to 20) stay stored, since rating
storage allows up to 100, and show five filled dots, which is what `StatDot` does today.

Custom lists stop using `CustomTraitList` / `TraitListBindingView`. System lists keep them.

**Rationale**: FR-013 asks for today's look and behavior. The spec 014 `RatingRow` is already
the shared trait-row composition.

**Note**: flags were never stored before (see Current state). From now on they are stored in
`detail`. No stored flag can be lost, because none exists.

## R6. Coercion when reading, and the type-change report

**Decision**: `coerceListValue(item, value)` (pure) maps a stored value to what the item can
show:

| From                      | To                                                                   |
| ------------------------- | -------------------------------------------------------------------- |
| number                    | number and rating (clamped); resource `{current: n, max: field max}` |
| resource `{current}`      | number and rating: `current`                                         |
| string                    | text; choice (when a valid option id)                                |
| boolean                   | toggle                                                               |
| anything else, or invalid | `undefined` (shown empty)                                            |

`listItemChangeReport(before, after, documents)` (pure) compares each custom list present in both
template versions, matched by list id. It counts:

- the documents and entries whose stored value is set but coerces to `undefined` under the new
  item (`lostValues`);
- for a list that turns unnamed, the entries with a non-empty name (`hiddenNames`).

`TemplateEditorDialog` runs it at save, next to `planTemplateRetarget`. A non-empty report opens
one `ConfirmDialog` that names the lists and counts; if a retarget is also pending, its
description follows. Stored values are not deleted: like orphaned bag keys, they stay until the
user edits that entry, so the UI text says "will no longer be shown", never "lost".

The documents counted are those the template renders: the same effective-template resolution
the sheet uses (an explicit `metadata.templateId`, or the default page of the document's type
and setting). `planTemplateRetarget` counts only explicit assignments, which would miss
documents that use the template as their default page.

On the sheet, an entry whose stored value is set but coerces to `undefined` shows empty and is
reported through `reportSheetIssue` (`list-entry-unreadable`, once per list and render, with the
count) per constitution III. Preview renders do not report.

**Rationale**: this matches retargeting (a count at save, then a confirmation). Keeping the
stored data makes an accidental change reversible by changing the type back.

**Alternatives**:

- Warn at the moment of the type change in the settings panel: that is noisy while an author
  experiments, because nothing is saved yet.
- Rewrite stored values on save: this is destructive and cannot be undone.

## R7. The editor

**Decision**: `ListConfig` gains, for custom lists:

- a switch "Entries are named";
- an "Entry" `<details>` block with a type select, then `FieldEditor` for `listItemField(list)`,
  wrapped in `EditorFillTargetsContext` with an empty target list, so a choice item's catalog
  offers no fills (FR-011).

`FieldEditor` gains an `itemOfList` prop. It hides the settings that cannot apply to repeated
copies:

- value key / shared coordinate;
- visibility condition;
- required;
- span and placement;
- `formula` in the type list.

The draft model's field lookup (`findField` and friends in `draft.ts`) also searches `list.item`.
So `onFieldUpdate`, `onFieldTypeChange`, and the option and catalog callbacks work unchanged
through `fieldCallbacks(callbacks, item.id)`. The first edit of a legacy list materializes
`LEGACY_LIST_ITEM` into `item`.

`ListCatalogPicker` is disabled with a note on unnamed lists. Its "Value from" choices are
filtered by item type (R8).

**Rationale**: this reuses the column-settings pattern from spec 015. The callbacks need no
new plumbing.

## R8. Catalog "value from" per item type

**Decision**: the compatible pairs are:

- a number column → number, rating, resource (`current`);
- a text column → text;
- a toggle column → toggle.

Shipped catalogs expose typed details through `CatalogBindingEntry.details`, and user catalogs
through their column types.

A pick sets the entry name and, when `valueFrom` fits, the value:

- held to the item's range (rating and number min/max, resource max);
- a resource keeps its `max`.

`templateReferences.ts` reports two problems:

- `unknown-fill-detail` for a `valueFrom` that does not fit the item type (FR-012);
- a new `list-catalog-unnamed` for a catalog on an unnamed list. That can happen only in a
  hand-edited or imported file, because the editor prevents it.

## R9. Where the remove control goes

**Decision**: a `ListEntryRemove` atom:

- an icon button with `aria-label` "Remove {name or "{list}, entry N"}";
- a minimum 32 px target on touch;
- not rendered when disabled or read-only.

Controls receive it as `removeSlot?: ReactNode` and place it themselves (FR-006):

| Shape | Types                                                                        | Placement                                                                                                         |
| ----- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Row   | rating, number, toggle, single-line text, single choice, resource, reference | last item of the control's row (after the die for rating)                                                         |
| Block | multi-line text, image, multiple choice                                      | right end of the entry's label row; for unnamed entries with an empty label, a header row holding only the button |

No overlay is used anywhere, so nothing covers inputs, and the page never scrolls sideways at
phone width.

## R10. Performance with 1000 entries

**Decision**:

- `ListEntryRow` is `memo`-ized. Its props are the entry object, the item field, the list
  runtime (memoized per list), and callbacks stable per entry id.
- The callbacks read the current array from the store at call time (the spec 015 CatalogTable
  pattern), not from render closures.
- One edit is one `setValue` of the new array. The array is shallow-copied, and untouched entries
  keep their identity, so R3 checks just the changed one.

## R11. Presets

**Decision**: presets stay `{key, label, value?}` and apply to named lists only. On a named list,
the value applies when the item holds a number:

- number and rating: the value;
- resource: `{current: value, max: field max}`.

The editor hides the presets block on unnamed lists. Stored presets of a list turned unnamed are
kept but ignored. Seeding (`hooks.ts`) builds entries with `createListEntry` from the item.

## R12. Image entries

**Decision**: removing an image entry behaves like clearing an image field: the value is dropped,
and the device blob is not deleted. FR-007 is met by parity; per-field blob cleanup is a
separate, existing gap and is not part of this feature.

## R13. Scope checks

- System lists (`bindingKey`) take no `item` or `named`. The editor hides both for them, and the
  schema refine rejects `item` on a system list.
- Formulas cannot reference list entries (unchanged). A rating item's `maxFrom` may reference
  page values, as a rating field's can. Reference validation checks the item's own references
  like a field's.
- The storybook guard (`storybook.test.tsx`) requires stories for every item type, plus one named
  and one unnamed list (FR-016).
