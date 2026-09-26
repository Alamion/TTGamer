# Research: Library tree for rules, settings, types, and pages

Phase 0 of [plan.md](./plan.md). The Technical Context had no open unknowns. Each item below
records a design choice the spec leaves to planning.

## R1. Where the ruleset level comes from

- **Decision**: Add an optional `ruleset?: SystemId` to `SystemPlugin`. It names the ruleset a
  setting system plays on, and Star Wars declares `ruleset: 'wod-2e'`. A plugin without `ruleset` is
  a ruleset. The tree is derived in one pure function from four sources: the registry, the user
  stores, the template store, and document counts. Nothing about the tree is stored.
- **Rationale**: Star Wars is its own system with frozen identities (spec 012). The tree must show
  it under WoD 2e without touching stored data. One declared field keeps the grouping a plugin
  fact, not a system conditional in generic code (constitution I).
- **Alternatives considered**:
    - A hard-coded map in the library. Rejected: it is a system conditional in generic code.
    - Moving Star Wars documents to `systemId: 'wod-2e'`. Rejected: frozen identities, and a
      migration of every stored character.

## R2. Settings under a ruleset

- **Decision**: A ruleset shows its settings in this order:
    1. "Rules only": the ruleset plugin's `coreDefinitions`, plus any of its definitions that have
       no module.
    2. One shipped setting per `DocumentModule` of the ruleset plugin (Hunter), holding that
       module's definitions.
    3. One shipped setting per plugin whose `ruleset` names this ruleset (Star Wars), holding all
       of that plugin's definitions.
    4. The user's settings whose `systemId` is this ruleset.

    User types owned by a system go into the matching shipped setting: `{systemId, moduleId}` goes
    to the module, `{systemId: 'star-wars-wod'}` to Star Wars. A type owned by a bare ruleset
    (spec 012 allowed it) goes to "Rules only". It is shown there, but new types cannot be created
    in "Rules only" (FR-006).

    A stored user setting whose `systemId` is not a registered ruleset goes into a final
    "Unavailable" group after the rulesets. It keeps its types and pages, and nothing in it can be
    moved into, created, or exported until its ruleset returns. Imports never create one, because
    unavailable import branches cannot be picked (R8).

- **Rationale**: This reproduces the approved prototype's grouping from existing declarations.
- **Alternatives considered**: A stored "setting" object for shipped settings. Rejected: the
  spec's assumption says "Rules only" is not a new stored object, and neither are shipped
  settings.

## R3. The core character in settings

- **Decision**: The ruleset's core character appears in two places:
    - under "Rules only", with the shipped pages;
    - under every **user** setting on that ruleset, where its pages are the templates with that
      setting's `settingId` and that kind, and its default is `setting.pages[definitionId]`.

    It does **not** appear as an inherited row under shipped settings (Hunter, Star Wars) in this
    feature.

- **Rationale**: A core character document inside a user setting already exists
  (`metadata.settingId`, spec 012). A "V5 mortal in the Hunter setting" has no stored meaning
  today. It would need `metadata.settingId` to name shipped settings, plus a shipped setting's
  page map, which amounts to a new persisted concept. Star Wars is a separate system and could
  never host the WoD 2e core character. Showing a row the user cannot create documents in would
  mislead.
- **Deviation from prototype v3**: The prototype showed "Mortal" as an inherited row under Hunter.
  This is recorded as a follow-up backlog entry: core characters in shipped line settings.
- **Alternatives considered**: Extending `metadata.settingId` to `module:<system>:<module>`.
  Deferred, not rejected: it touches document semantics and the create dialog.

## R4. Default pages

- **Decision**:
    - **User type**: `defaultTemplateId` becomes optional. It is missing when the type has no
      pages, and FR-006 means a type can now exist without one.
    - **Core character in a user setting**: `setting.pages[definitionId]`, as today.
    - **Shipped type**: a new user preference `defaultPages[systemId:definitionId]`,
      kept in `documentTypeStore` (v2). Its value is either a shipped view id or a user template
      id.

    `newDocumentPage()` decides the `preferredViewId`/`templateId` for the create flow. For a
    shipped type the preference applies only to new documents, and existing documents keep their
    page. For a user type or a core character inside a user setting, existing documents without
    their own `templateId` follow the new default as well: they already resolve through
    `defaultTemplateId` / `setting.pages` (spec 012), and the type's details say so. Deleting or
    moving the chosen page drops the preference, and the shipped default applies again.

- **Rationale**: FR-009 says "any type that has pages". Shipped definitions keep their code-owned
  `defaultViewId`, and the preference overlays it, the same pattern as `defaultOverrides`.
- **Alternatives considered**: Rewriting `preferredViewId` on existing documents. Rejected: the
  spec says "new documents of that type open on it".

## R5. Store versions

- **Decision**: `documentTypeStore` v1 → v2 with two changes:
    - it adds `defaultPages: {}`;
    - the parse of an existing type accepts a missing `defaultTemplateId`.

    The migration keeps every stored type and setting unchanged, so the meaning is unchanged. The
    template store keeps v5. Moves only rewrite `systemId`, `documentKind`, and `settingId` of
    existing templates, which are valid v5 shapes. `documentStore` stays v4 but gains one bulk
    action, `relocateDocuments(changes)`, which writes `systemId` and the metadata fields in one
    `set`.

- **Rationale**: Persisted changes are versioned (constitution II). One bulk write keeps a move
  atomic from the UI's point of view.

## R6. Moving

- **Decision**: Moves are pure planners that return every write. The dialog applies them in one
  batch, and nothing is written before confirmation.

    **`planPageMove`**: wraps T-070's `planTemplateRetarget` unchanged.

    **`planTypeMove(type, targetSetting)`**:
    - rewrites the type's `owner`;
    - rewrites `systemId`/`settingId` on its templates;
    - rewrites `systemId` (and `settingId` for user settings) on its documents. User-type data is
      one empty shape (spec 012), so a system change cannot invalidate data.

    **`planSettingMove(setting, targetRuleset)`**:
    - rewrites `setting.systemId`;
    - moves the setting's own types' templates and documents to the new system;
    - leaves the documents of the **old core character** on the old ruleset (FR-015a). It clears
      their `settingId`. A document without its own `templateId` that followed
      `setting.pages[definitionId]` is pinned to that page (`templateId` set), so every document
      keeps opening on the page it used;
    - leaves the old core character's pages behind too. They lose their `settingId` and become
      "Rules only" pages of the old ruleset, so no work is lost and the pinned pages still exist;
    - removes the old core entries from `setting.pages`.

    **Deleting a user setting** also clears `settingId` on the documents of its core character,
    so they open on the ruleset's "Rules only" page instead of pointing at a missing setting.

    **Confirmation**: required whenever the item's `systemId` changes. That covers every move across
    rulesets, and also a Star Wars ↔ WoD 2e user setting move, which stays inside one tree ruleset
    but leaves Star Wars data bindings behind.

- **Rationale**: The consequence the spec warns about is lost bindings. Bindings follow the
  system, not the tree grouping.
- **Alternatives considered**: Deleting the old core character's pages. Rejected: silent loss of
  user work.

## R7. The library file

- **Decision**: The format is `ttgamer-library`, version 1. It holds flat, validated collections
  (`settings`, `types`, `templates`, `overrides`), an `included` map (`picked` / `auto`), and
  informative `addresses` of shipped places. The tree is rebuilt from references at preview time.
  Validation parses everything before any state change (see
  [contracts/library-file-format.md](./contracts/library-file-format.md)). Two older files are
  read through adapters:
    - the spec 012 type file (`ttgamer-document-type` v1);
    - the single template file (`ttgamer-template` v3).

    Documents that carry their type keep their current import path, the document import, which
    already installs the type (FR-020).

- **Rationale**: Flat collections reuse the existing Zod schemas one-to-one. A nested tree would
  repeat parent ids and invite contradictions.
- **Alternatives considered**: A nested tree in JSON. Rejected: it duplicates identity and is
  harder to validate.

## R8. Import states and "Keep both"

- **Decision**: Each file entry gets a state:
    - **new**: no installed item has that id;
    - **same**: equal after dropping timestamps;
    - **conflict**: same id, different content;
    - **unavailable**: its system, module, shipped definition, or shipped view does not exist here.

    An unavailable parent makes its whole branch unavailable. Replace overwrites by id. "Keep both"
    gives new ids to the entry and every entry below it. The remap covers owners, `settingId`,
    `documentKind`, `setting.pages`, and `defaultTemplateId`. The entry's name gets a translated
    suffix, "(imported)".

    Ticking a child whose parent is new and unticked ticks the parent automatically, shown in
    tertiary, mirroring export. Edited shipped pages conflict when an override already exists, and
    Replace overwrites the override.

- **Rationale**: This extends the proven `typeInstallState` / `rewriteTypeIdentity` logic to every
  level (FR-018, FR-019).

## R9. Tree widget, drag, and menu

- **Decision**: The tree is a hand-written WAI-ARIA tree:
    - `role="tree"` / `treeitem` / `group`, with `aria-level`, `aria-expanded`, `aria-selected`;
    - a roving `tabindex`;
    - arrow keys, Home/End, and type-ahead;
    - Enter opens a page.

    Only expanded branches render (SC-007). Drag and drop is native HTML5 with a library MIME type,
    the same approach as the template editor outline. A drop target validates with the pure
    `canMove`. Keyboard users move through "Move…" (the picker) or the context menu, so drag is
    never the only path. The context menu is a Radix Popover anchored at the pointer (right-click
    or Shift+F10 / the Menu key) or at the row's "⋯" button. Its items use `role="menu"` /
    `menuitem`.

    Narrow screens (below `md`) get two tabs, Tree and Details. Selecting a row switches to
    Details.

- **Rationale**: No new dependency (constitution VII). The patterns already exist in the editor.
- **Alternatives considered**:
    - `@radix-ui/react-context-menu`. Rejected: a new dependency for one menu, and Popover
      suffices.
    - A virtualized tree library. Rejected: lazy branches meet the 300-page budget.

## R10. Document counts

- **Decision**: One pass over `documentStore.documents` builds a `Map` keyed
  `systemId|definitionId|settingId`, memoized on the documents array. Rows sum their children.
- **Rationale**: This gives O(documents) per change, with no per-row scans.

## R11. Accent roles (T-081)

- **Decision**:
    - Rename the CSS variable `--editor` to `--tertiary` and the Tailwind color `editor` to
      `tertiary`.
    - Replace every current `editor` use (19 class uses in 5 files) with `primary` (selection,
      frames, insertion points) or `secondary` (hover, help, pressed modes). The mapping is in the
      tailwind-theming skill.
    - `tertiary` is used only for automatically included export and import parents.

    The storybook palette picks the new name up from `tailwind.config.cjs`.

- **Rationale**: FR-022, FR-023, and the maintainer's accent rule.

## R12. Documentation and help

- **Decision**:
    - Add a new guide page, `docs/template-editor/library.mdx`, with its ru mirror. It has anchors
      for the tree, creating, moving, the default page, export, and import.
    - Add these anchors to the `EDITOR_GUIDE` map.
    - Put help links in the library header and in the move, export, and import panels.
    - The anchors test covers the new page.
- **Rationale**: FR-024, and the storybook and editor-help rules of constitution VI.

## R13. What happens to the old dialogs

- **Decision**:
    - `TemplateLibraryDialog.tsx` is replaced by `LibraryDialog`, which keeps the same toolbar entry
      point.
    - `UserSettingsPanel.tsx` and `TemplateImportDialog.tsx` are absorbed: settings live in the
      tree, and single-template files import through the library preview.
    - Their tests move to the new library tests.
    - The editor's "Type and setting" select stays (spec assumption).
- **Rationale**: One place for the library (FR-001). Dead code would fail the knip gate.
