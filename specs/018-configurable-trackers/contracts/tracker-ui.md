# Contract: Tracker in the editor and on the sheet

The approved look and behavior are in [prototype.html](../prototype.html). This contract fixes the
parts the tests check. It uses the shapes in [data-model.md](../data-model.md).

## Editor: palette and source

- **Palette.** The "Tracker" item adds an own `tracker` field with the default config:
    - label "Health";
    - seven health levels with the penalties 0, −1, −1, −2, −2, −5, and none;
    - two marks: Bashing ╱ and Lethal ×;
    - one marks column, "Damage";
    - the total row on;
    - Table display.
- **Source.** The settings start with a "Source" select: "Own values", then each track binding
  the page's document kind offers.
    - Switching to a binding converts the field into a track primitive.
    - Switching back converts it into a field.
    - Both keep:
        - the id and label;
        - the display;
        - the value column title and visibility;
        - the extra columns;
        - the total.

## Editor: settings groups

The groups follow the prototype's order. Everything is keyboard reachable, and icon buttons carry
an `aria-label`.

1. **Label**
    - A text input and a "Show label" checkbox (`hideLabel`).
2. **Display**
    - A segmented control with Table, Strip, and One line (`aria-pressed`).
3. **Marks**
    - A "Start from…" select with the three ready sets, which replaces the kinds.
    - One row per kind:
        - a preview box;
        - a name input;
        - a symbol input (max 2);
        - five palette swatches (`aria-pressed`, each with an `aria-label` naming the color);
        - an own color input;
        - "Move up", "Move down", and "Remove" buttons, named "Move mark N up" and so on.
    - "Add mark" is disabled at 5, and "Remove" at 1.
    - **Built-in trackers:**
        - The set select and the add, move, and remove buttons are disabled.
        - A note says the game sets the number of marks.
        - Renaming, changing the symbol, and recoloring stay available.
4. **Levels**
    - A value column title input with a "Show" checkbox.
    - One row per level:
        - a number;
        - a name input;
        - a value input (disabled when the column is hidden);
        - "Move up", "Move down", and "Remove" buttons.
    - "Add level" is disabled at 20.
    - **Built-in trackers:**
        - The add, move, and remove buttons are disabled.
        - Name and value inputs show the game's text as the placeholder, and clearing an input
          restores the game's text.
        - A legacy count override shows "Set by an older page" with a "Use the game's levels"
          button.
5. **Columns**
    - One card per column:
        - kind (Marks or Text);
        - title;
        - "Covers" (All levels, or First N);
        - "Readers add copies (A, B, C…)" with "up to" 1–24;
        - "Remove", which is disabled for the last marks column.
    - "+ Marks column" and "+ Text column" buttons.
    - **Built-in trackers:**
        - The game's marks column shows first, locked.
        - A note says extra columns keep their values on the page.
6. **Readers switch the length** (own trackers only)
    - A checkbox, then a levels × lengths checkbox matrix with a "Shows N" row.
    - "+ Length" is disabled at 6, and "Remove length" at 1.
7. **Reading the marks**
    - "Total row" is shown for every tracker.
    - "Mark a copy as out when its last level is marked" is shown for own trackers only.

## Editor: problems and saving

**Problems panel entries:**

- A length that shows no known level.
- A column that covers as many levels as the tracker has, or more.
- A tracker in a table column, which is only reachable by hand-edited files.

**Save confirmation:**

- When a save would drop stored values, the pending-save dialog lists each tracker. Each entry
  has:
    - the title;
    - the number of documents;
    - the counts of marks, texts, and copies that would stop showing.
- Removed levels, kinds, and columns count as dropped. So do lower copy maximums and copies
  turned off.
- Reordering alone drops nothing and asks nothing.

## Sheet: rendering

**Table display:**

- Header cells:
    - Level;
    - the value column title, when shown;
    - one header per column copy: the title, followed by the copy's letter for repeatable columns.
- Every header has `scope="col"`.
- Levels form the rows. A cell a column does not cover shows "·" and has no control.
- The total row:
    - It comes last, labeled with the value column title (or "Value").
    - It has a 2 px top border in the table's border color and no background.
    - It holds one total per marks copy, or "out".

**Strip display:**

- One row per marks copy: the copy's name, its boxes for the covered levels, and the total when
  on.
- A note says the text columns show in the table only.

**One line display:**

- Small boxes (24 px), with the label inline unless it is hidden.
- There is no length control and no legend.

**Boxes:**

- Size: 32 px, or 24 px on One line.
- Shape: a 2 px border and a 4 px radius.
- A marked box:
    - is filled with the kind's fill, border included;
    - shows the symbol centered, in bold monospace, in white (on `text` fills, `bgBase`).
- An empty box has the border color and the base background, and its border turns primary on
  hover.
- Accessible name: `"{level}{ (copy)}: {mark name | empty}"`.
- The button's title is the level with its value.

**Legend:**

- It shows under Table and Strip when there are 2 or more kinds.
- It holds one item per kind: a small box with the centered symbol, then the name.

**Copies:**

- "+ {column title}" sits next to the length control and is disabled at `max`.
- Each copy header has a "Remove {title} {letter}" button:
    - It is disabled for the last copy.
    - It asks first when the copy holds values.
- A copy that is out has its name struck through.

**Length:**

- "Length − N +", where the minus button has `aria-label` "Shorter" and the plus button "Longer".
- Shortening that hides marks opens the danger confirm dialog. The existing wording is kept, with
  "members" generalized to "copies".

**Read-only:**

- No add, remove, length, or box actions. Boxes render as non-interactive marks.
- Text cells render as plain text.

## Sheet: built-in trackers

- The marks still come from and go to the document's own data, exactly as today.
- The member tracks' members are the copies of the built-in marks column. The cap, the letter
  labels, the confirmations, and the variant lengths all behave as today.
- Page values hold the extra columns only.
- The shipped Star Wars character page shows the total penalty row on health.
- A page with no `tracker` option looks exactly as before, including member tracks, which use
  their default total row.

## Storybook

**`trackers` story** (own trackers) shows:

- every display;
- one, two, three, and own marks;
- a text column covering 3 levels;
- a repeatable column;
- lengths with "out".

**Bound stories** add a built-in tracker with an extra text column and the total row.

**`TrackerParity` widget** shows the shipped fodder group and its rebuild on the same sample marks,
at each length.
