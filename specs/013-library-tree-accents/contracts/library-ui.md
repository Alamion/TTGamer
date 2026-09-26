# Contract: Library dialog interaction

This is the user-facing contract of `LibraryDialog`. Component tests assert these behaviors.

## Layout

- The dialog is a Radix Dialog labelled "Library", with focus trapped. Escape closes it or first
  cancels an open form, and focus returns to the toolbar button.
- The header holds three things:
    - the mode switch **Browse / Export / Import** (`aria-pressed`, with primary accent for the
      active mode);
    - search;
    - filter **All / Only yours / Edited shipped**.
- The body has two layouts, with the breakpoint at `md`:
    - at `md` and above, the tree on the left and the details on the right;
    - below `md`, two tabs, **Tree** and **Details**. Selecting a row switches to Details, and
      Details has a "Back to tree" control.

## Tree (`role="tree"`, `aria-label` "Library")

- **Rows**: `role="treeitem"`, with `aria-level` 1–4, `aria-expanded` on containers, and
  `aria-selected`. One row is tabbable (roving `tabindex`).
- **Row content**:
    - a level icon and the name;
    - badges: _yours_; _edited_ on an edited shipped page; ★ on the default page; _no setting_ on
      "Rules only"; _unavailable_ (also the whole "Unavailable" group shown last when a stored
      setting's ruleset is not registered);
    - a count (documents, or settings/types for containers);
    - a "⋯" button (`aria-label` "Actions for {name}").
- **Keyboard**:

    | Key                       | Action                      |
    | ------------------------- | --------------------------- |
    | ↑ / ↓                     | Previous / next visible row |
    | → on a collapsed row      | Expand                      |
    | → on an expanded row      | First child                 |
    | ← on an expanded row      | Collapse                    |
    | ← on a collapsed row      | Parent                      |
    | Home / End                | First / last row            |
    | Printable characters      | Type-ahead                  |
    | Enter on a page           | Open in the editor          |
    | Enter elsewhere           | Toggle expand               |
    | Shift+F10 / Menu          | Context menu                |
    | Delete on a deletable row | Delete confirmation         |

- **Search and filters**: they keep the ancestors of matching rows and expand them. When nothing
  matches, an empty state names the query and offers "Clear search".
- **Drag**: only movable rows are `draggable`, as defined by `canMove` in
  [data-model.md](../data-model.md). While a row is dragged:
    - valid targets show a primary outline on hover;
    - invalid targets show no drop cursor;
    - a drop on itself, its descendant, or its current parent does nothing.

    A drop that changes the system opens the move confirmation. Any other drop moves the row
    immediately, then shows a toast and briefly highlights the row where it landed.

## Details by level

| Level   | Always shown                                                                                         | Actions (user item / shipped item)                                                                               |
| ------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Ruleset | Name, description, dice summary, the core character ("present in every user setting on these rules") | New setting                                                                                                      |
| Setting | Ruleset path, description, counts; "Rules only" note; shipped note                                   | New type (not in "Rules only"); rename, description, Move…, Export, Delete / none for shipped                    |
| Type    | Path, description, document count, the default page, fallback note (stored values / "Rules only")    | New page; rename, description, Move…, Export, Delete / New page only for shipped and core types                  |
| Page    | Path, description, "default" state, "edited" state                                                   | Open in editor, Duplicate, Make default, Export; Rename, Move…, Delete (user page) / Reset (edited shipped page) |

- **Create forms** appear inline in Details. They have a name (required, 1–80 characters) and a
  description (optional, up to 500 characters). "New page" also has a start: **Blank** or
  **Copy of {page}**, from the pages of the same type. Creating a setting or type selects it and
  creates no page. Creating a page opens the editor.
- **Move…** shows a picker. Targets are listed as buttons with their path, and a badge _other
  rules_ marks targets where the system changes. It also shows:
    - the consequence note from `MovePlan`;
    - a warning callout when `crossesSystem` is true. The callout uses the secondary accent, never
      violet, and names the counts `documentsMoving`, `documentsStaying`, and `pagesStaying`.
    - a **Move** button, disabled until a target is chosen.
- **Delete** opens a confirmation dialog that names the document count and says the documents
  stay. A page delete says that documents return to their default page.

## Context menu

- It is a Radix Popover with `role="menu"`. It holds the actions of the selected row's level,
  the same ones as in Details, in the same order. Arrow keys move through the items, Enter
  activates one, and Escape closes the menu and returns focus to the row.

## Export mode

- Each exportable row gets a tri-state checkbox (`aria-checked` `true` / `false` / `mixed`).
  Shipped rows that have nothing exportable below them show no box.
- Rows added automatically show a **tertiary** (violet) checked box and the note "added for
  {child}". This is the only violet in the library (FR-023).
- The details pane becomes a summary. It shows the counts per level, the list of addresses, a
  collapsible JSON preview, and **Save file**, which is disabled while nothing is picked.

## Import mode

- **Choose file** opens a file input limited to `.json`. A rejected file shows `role="alert"`
  with the reason (parse / format / version / schema + entry) and changes nothing.
- The preview tree shows every entry with a state badge: _new_, _already present_, _conflict_, or
  _unavailable_, plus its reason.
    - A conflict row has a two-option switch, **Replace / Keep both**.
    - _Already present_ and _unavailable_ rows cannot be ticked.
    - A picked child auto-ticks a new parent in tertiary.
- **Import selected** writes everything and shows a summary toast ("Imported 1 setting, 3 types,
  4 pages"). **Cancel** writes nothing.

## Help

The header "?" link points to the guide page `template-editor/library` and follows the locale.
The Move, Export, and Import panels link to their own anchors (`EDITOR_GUIDE` keys `library`,
`libraryMove`, `libraryExport`, `libraryImport`).
