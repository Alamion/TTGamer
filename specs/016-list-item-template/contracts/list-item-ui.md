# Contract: List entry UI

## Sheet: one entry (`ListEntryRow`)

The control is `templateFieldControl(item.type)`. It receives the entry's coerced value and
these props:

- `nameSlot`: named lists only. It holds the name input, replacing the item label at the item's
  label position.
    - With a list catalog, the input is a `CatalogSuggest`; otherwise it is a plain text input.
    - Its placeholder is the list title. Its accessible name is "{list title} — name".
- `rollLabel`: rating items only. It is the entry name, or the item label on unnamed lists. The
  die button reads "Roll {rollLabel}".
- `removeSlot`: the `ListEntryRemove` button. It is absent when the sheet is disabled or
  read-only.
- `ratingDetail` and `onDetailChange`: rating items only, stored in `entry.detail`.
- `catalogOptions`, `pickedLabel`, and `catalogEmpty`: catalog-bound choice items. The picked name
  is stored in `entry.pickLabel`.
- `documentOptions` and `onOpenDocument`: reference items.

On an unnamed list, the item label is shown as the entry label. When the item label is empty,
no label is shown, and the control's accessible name is "{list title}, entry {n}".

## Remove control placement

Row-shaped items are:

- rating;
- number;
- toggle;
- single-line text;
- single choice;
- resource;
- reference.

For these, the remove button is the last element in the control's row, after the die on a
rating.

Block-shaped items are:

- multi-line text;
- image;
- multiple choice.

For these, the remove button is at the right end of the label row. When there is no label row
(an unnamed list with an empty item label), a header row holds only the button. It never
overlaps inputs.

The button itself:

- is an icon button with a Lucide `X` icon;
- has the accessible name "Remove {name}", or "Remove {list title}, entry {n}" when the entry
  has no name;
- is a 32 px target;
- uses the focus ring shared with other icon buttons.

## Sheet: the list

- The existing settings keep working:
    - the title (`showTitle`);
    - the frame (`framed`);
    - columns 1–4, where block-shaped entries fill their column.
- An add button adds an entry with an empty value, and an empty name when the list is named.
    - At 1000 entries the add button is disabled, with the hint "At most 1000 entries".
    - It is absent on read-only sheets.
- A preset adds an entry with the preset's name, and with its value when the item holds a number
  (named lists only).

## Editor: list settings (`ListConfig`, custom lists)

The settings appear in this order:

1. **Title**: unchanged.
2. **Source**: unchanged.
3. **"Entries are named"**: a toggle, on by default.
4. **"Entry"**: a `<details>` block, open for a new list. It contains:
    - the entry type select, which lists the eight types and never formula;
    - the `FieldEditor` for the item with `itemOfList`, which hides the value key, visibility
      condition, required, and placement;
    - for a choice item, the catalog binding without fills.
5. **Catalog** (`ListCatalogPicker`):
    - on unnamed lists it is disabled, with the note "Suggestions need entry names";
    - "Value from" lists only the columns that fit the item type, and none for image, reference,
      or choice items.
6. **Columns, show title, framed**: unchanged.
7. **Presets**: hidden on unnamed lists.

## Editor: save confirmation

A non-empty `listItemChangeReport` opens a `ConfirmDialog`:

- **Title**: "Change list entries?"
- **Body**: one line per list, for example "Skills: 12 values in 3 sheets will no longer be
  shown" or "Contacts: 8 names will no longer be shown". Then one note: "The values stay stored;
  changing the entry back shows them again, except for entries edited in between."
- **Buttons**: Confirm, which saves, and Cancel, which keeps the draft open.

When a retarget is also pending, a single dialog shows both parts.

## Strings

All new strings go under `ui/sheet/templates.yaml` (en and ru): the entry type labels
reuse the existing field type names.

## Storybook

Stories for list entries:

- one custom list per item type (8), each named, except image and multi-line text, which are
  unnamed;
- one named list with a catalog and "value from";
- the legacy list, with no item.
