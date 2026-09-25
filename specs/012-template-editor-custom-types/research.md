# Research: Visual template editor and template-defined document types

Findings come from reading the current code (template editor, declarative renderer, document
source, stores, registry, file formats, Star Wars and V5 systems) and from the clickable
prototype the maintainer approved on 2026-09-25. Each decision lists what was chosen, why,
and what was rejected. Line references are to the code as of commit `df067e8`.

## Visual editor

### R1 — Three areas, settings reused from today's panels

**Decision**: `TemplateEditorDialog` becomes a three-area workspace: **Outline** (compact tree),
**Page** (the draft rendered by the real renderer), **Settings** (the selected element only).
The settings pane reuses today's per-element controls. The body of `ElementEditor`
(`ElementEditor.tsx:413-455`: column placement, visibility, section/group/table/list config,
`PrimitiveConfig`, `FieldEditor`) moves into an exported `ElementSettings({ node,
parentColumns, callbacks })`, and the private `*Config` functions move with it. The recursive
panel tree is replaced by a compact `OutlineTree`: one row per node, with the grip, the kind,
the label, markers for conditions and issues, and no inline settings. Both `EditorModelContext`
and `EditorFillTargetsContext` wrap all three areas. The coordinate `<datalist>` is still
rendered once, by the dialog. Below the `md` breakpoint the areas become tabs (Page / Outline /
Settings), as in the prototype.

**Rationale**: the settings controls are already decoupled from the tree. They take `node` and
callbacks and never `depth`, path, or move handlers. The only structural input is
`parentColumns`, which the pane derives from the parent lookup. Reusing them keeps every
existing capability (sources, fills, term hints, layout controls) and their tests.

**Alternatives rejected**:

- Keeping the recursive panels next to a preview (spec option C): it solves seeing, not
  arranging.
- Inline WYSIWYG popovers (option B): the maintainer chose A after the prototype, and
  popovers over a 120-element page hide the context they edit.

### R2 — The page renders the draft through the real renderer, with an overlay seam

**Decision**: the page pane renders `DeclarativeSheetView` with the **draft** and
`embedded`. An optional `TemplateEditorOverlayContext` is read in two places:

- `ChildrenGrid.renderNode` (`DeclarativeSheetView.tsx:500-508`) is the single place every
  node is rendered. When the context is present it wraps the node in an `EditorNodeFrame`:
  `data-node-id`, hover and selected outlines, the kind/label chip with the drag grip,
  click-to-select, and insertion slots before each child and after the last one. Empty columns
  of a multi-column container get a drop zone.
- The `visibleWhen` gate in `NodeView` (`:413`) renders the node inside a hatched
  "hidden by condition" frame instead of returning `null` while the overlay is present.

Without the context nothing changes, so sheets and docs embeds render exactly as before. Table
columns stay unselectable in the page, because they are fields of the table and are selected
through the table. Collapse state in the editor uses its own key prefix (`editor-…`) so the
editor never collapses or expands the real page (today the key is `template-${id}-${nodeId}`,
`:421, :445`).

**Rationale**: one wrap point means no forked renderer, so what the author sees is what the
sheet shows. That is the core promise of FR-001.

**Alternatives rejected**:

- A separate editor renderer: it would drift from the real one, which is exactly what the
  maintainer wants to stop.
- DOM post-processing of the rendered page: fragile, and it cannot place slots between grid
  items.

### R3 — A writable scratch document for the page pane

**Decision**: add `createScratchDocumentSource(envelope, definition)` next to
`createStaticDocumentSource` in `hooks/useDocumentSource.ts`. It holds one envelope in a
component-local store, and its writers have the store's semantics:

- data is parsed with the definition schema;
- metadata is merged;
- template values are validated, merged, and `undefined` drops a key.

`validateTemplatePageValues` is extracted from `store/documentStore.ts:124` into
`features/sheet/data/templateValueWrites.ts` so the store and the scratch source share one
write rule. `DocumentSource` gains `preview: boolean`. The code that today keys on `readOnly`
(no "open document" for references, no `reference-target-missing` report, `hooks.ts:155,
320-326`) keys on `preview`, so a scratch source is writable but still a preview.

The page pane starts from a **sample** document:

1. a scratch copy of the open document when its system and kind match the draft;
2. otherwise the definition's first declared example;
3. otherwise `createDefault()`.

The scratch copy is always a copy, never the store's document (FR-002).

**Rationale**: every sheet write already goes through the document source; the only direct
store use is `setCurrentDocument`. A writable in-memory source therefore needs no change to
bindings, primitives, or formulas.

**Alternatives rejected**:

- A read-only page pane: the prototype showed that clicking dots and typing in the pane is how
  authors check a layout.
- Writing to a hidden real document: it risks data loss and litters the document list.

### R4 — Preview data comes from plugin-declared examples

**Decision**: `DocumentDefinition` gains an optional
`examples?: readonly { id: string; label: DocumentViewLabel; create: () => DocumentEnvelope }[]`.
Star Wars declares its existing examples (`examples.ts:257-269`: Jax Vorn for character, wampa,
stormtroopers, Red Five, the landspeeder, the Falcon). Hunter declares Lena Varga
(`modules/hunter/example.ts:151`). The quick preview offers three kinds of data:

- the open document, when compatible;
- each example of the draft's definition;
- a blank document from `createDefault()`.

The preview renders with `createStaticDocumentSource` (read-only), all editor marks off, and
conditions applied. `docsEmbeds.tsx` keeps its helpers and reads the same declarations.

**Rationale**: the generic editor may not import a concrete system (ESLint
`no-restricted-imports`). A plugin declaration is the registered route, in the same way as
`catalogs` and `dice`.

**Alternatives rejected**: importing the examples in the editor, which breaks the module
boundary.

### R5 — One dispatch point with bounded, coalescing history

**Decision**: every draft change goes through one reducer, `applyDraftChange(next, meta)`, in
a new `template-editor/history.ts`. `insertNode` and `moveNode` today use `applyOp`; every other
operation uses `setDraft` (`TemplateEditorDialog.tsx:161-190`). The reducer keeps
`past`/`future` stacks of `{ draft, selectedId }`:

- The stacks are capped at 100 entries.
- Structural sharing (`mapNodes`) makes each snapshot cost only the changed path.
- Consecutive changes with the same `meta.coalesceKey` (node id + property, for example typing
  a label) within 800 ms merge into one step.
- Undo and redo restore the selection (FR-009).
- The dirty check compares the draft with the opening draft, as today.

**Rationale**: the prototype confirmed that undo is what makes direct manipulation safe. A
single entry point is also where the stable-callback rule (`draftRef`) already has to hold.

**Alternatives rejected**:

- zundo or immer: a new dependency (Principle VII) for about 60 lines of pure code.
- Unbounded history: it grows memory on long sessions.

### R6 — Layout-independent editor shortcuts

**Decision**: add a small keymap hook in `template-editor/shortcuts.ts`. It matches physical
keys (`KeyboardEvent.code`) with Ctrl or Meta, and it listens on the editor dialog's content
element (not `document`), so shortcuts work only while the editor has focus. The keymap:

- `KeyZ`: undo; `Shift+KeyZ` and `KeyY`: redo.
- `KeyD`: duplicate.
- `Delete`: remove.
- `Alt+ArrowUp` / `Alt+ArrowDown`: move among siblings.
- `Alt+ArrowLeft`: move out of the container.
- `Alt+ArrowRight`: move into the previous sibling container.
- `Alt+Shift+ArrowLeft` / `Alt+Shift+ArrowRight`: move to the previous or next column.

While focus is in a text input, textarea, or select, Ctrl+Z and Ctrl+Y fall through to the
browser's own text undo, and Delete edits text. Handled keys call `preventDefault()` so
Ctrl+D never bookmarks the page. Every move is announced through a polite live region.

**Rationale**: the maintainer's prototype review found that `e.key` fails under a Russian
layout (Z produces «я»). `code` is layout-independent (FR-011a). No shortcut helper exists in
the codebase.

**Alternatives rejected**:

- `e.key` with a transliteration map: it only covers the layouts we happen to list.
- A document-level listener: it would fire behind other dialogs.

### R7 — Native drag and drop, keyboard parity

**Decision**: keep native HTML5 drag and drop with the existing MIME type
`application/x-ttgamer-template-node` (`ElementEditor.tsx:44`), and handle drops with the same
`stopPropagation` rules. The outline rows and the page chips are drag sources. Page slots,
empty-column zones, and outline slots are drop targets. A drop into a column slot sets
`column` in the same history step as the move. Invalid moves are refused with the existing
`cannotMoveIntoItself` message and the depth and count errors. Touch devices have no native
drag and drop; they use the move buttons and commands in the settings pane.

**Rationale**: the current tests already simulate native drops (`template-editor.test.tsx:613-714`),
and no dependency is added.

**Alternatives rejected**: dnd-kit. It gives better touch drag, but it is a new dependency
that ships to every user. Keyboard and button moves already cover touch.

### R8 — Duplicate with fresh identities

**Decision**: add `duplicateNode(draft, nodeId): DraftOpResult` to `draft.ts`. It re-issues
ids for the node, its descendants, table columns, and select options, using `newId` with the
original prefix. It inserts the copy right after the original and checks the depth and count
limits. An explicit custom `valueKey` on a copy is dropped, so the copy's coordinate becomes
its new id. A `valueKey` that addresses bridged system data is kept, because both elements
then show the same trait by design. The label gets the localized "(copy)" suffix, and the
reference is dropped as on rename.

**Rationale**: FR-010 and the acceptance scenario say that copies do not share custom values.
Bridged coordinates must stay, or a copied trait row would silently become a custom value.

### R9 — Issues point at elements

**Decision**: `DraftIssue` gains an optional `nodeId`. `collectDraftIssues` fills it wherever
the issue belongs to a node (duplicate ids, bounds, formula errors, reference issues). The
outline and the page mark those nodes, and clicking an issue selects its node.

**Rationale**: with one element's settings visible at a time, an issue without a location is
a dead end (Principle III).

### R10 — Performance of the live page

**Decision**:

- The page pane renders `useDeferredValue(draft)`, so typing in settings never waits for the
  page.
- `NodeView` and `EditorNodeFrame` are memoized on node identity plus the selected and hover
  flags. Structural sharing keeps untouched nodes identical.
- Hover is tracked with CSS and one delegated `pointerover` handler that sets a single
  `data-hover` attribute. It does not use React state per node.
- The quick preview mounts only when opened.

The budget in SC-002 (100 ms for a keystroke or a move on the Star Wars full sheet, 1 s to
open the preview) is checked by a timing test in jsdom with a generous margin, and by hand in
the quickstart.

**Rationale**: the editor performance rules (`SKILL.md` "Editor performance rules") already
say that breaking identity re-renders everything. The renderer has no memoization today
(`DeclarativeSheetView.tsx` has no `memo(`).

## Template-defined document types

### R11 — User types share one generic data shape

**Decision**: the identity of a user type is `kind = definitionId = "user-" + 8
[a-z0-9]`. Every user-type document has the same envelope data, an empty object
(`UserTypeDataSchema = z.object({}).strip()`). All of its values live in `templateValues`. The
registry parses any document whose `definitionId` starts with `user-` in a registered system
with this generic schema, **without needing the type itself**.

**Rationale**:

- Loading stays independent of the order in which the stores hydrate. Today
  `parseDocument` throws for unknown definitions and the document drops into recovery
  (`registry.ts:96-99`, `documentStore.ts:216-234`).
- Deleting a type can never make its documents disappear (FR-020).
- The registry rejects shipped definition ids and kinds that start with `user-`, so the two
  namespaces never collide (FR-021).

**Alternatives rejected**:

- A per-type data schema generated from the template: it duplicates what template value
  validation already does, and it breaks on every page edit.
- Registering synthesized definitions before the document store hydrates: this creates a
  load-order hazard. `flattenLegacyTemplateValues` already reads the template store during
  document migration.

### R12 — A type store and registry overlay

**Decision**: add a new persisted Zustand store, `documentTypeStore`
(`universal-document-type-storage`, localForage, version 1). It holds:

- `types: Record<id, UserDocumentType>`
- `settings: Record<id, UserSetting>`
- `quarantine` (max 100)

`SystemRegistry` gains a read-only overlay, `setUserDocumentTypes(snapshot)`, fed by a store
subscription in `systems/index.ts`. It affects three methods:

- `getDocumentDefinition` returns a synthesized definition for user ids: the type's name as
  its label, the generic schema, `createDefault: () => ({})`, `views` = the type's templates
  (view id = template id), and `defaultViewId` = the type's default page. A user id without a
  type returns a synthesized **orphan** definition with the fallback page.
- `listDefinitions` appends the user types.
- `parseDocument` applies R11.

Shipped invariants are unchanged. All 27 call sites keep calling the same methods.
`resolveDocumentPolicies` switches from `system.documents.find` (`policies.ts:74`) to the
registry, so user types get the system policies plus those of the module they belong to
(FR-017).

**Rationale**: the fewest touched call sites. Generic code already goes through the registry.
The overlay keeps "registry is the only lookup" true.

**Alternatives rejected**: making every caller merge shipped and user definitions itself,
which would mean 27 call sites and guaranteed drift.

### R13 — Pages, views, and the fallback page

**Decision**:

- A type's pages are ordinary user templates with `systemId` and `documentKind` = the type's
  kind. `resolveEffectiveTemplate` already resolves a user template whose id equals the view
  id (`view.ts:52-59`), so no new resolution path is needed.
- `CharacterSheet.tsx:74-78` no longer returns `null` for a missing definition. It renders
  the fallback page.
- For an orphan or a type without pages, the fallback page is a template synthesized in
  memory from the document's stored keys: one group of text fields labelled by key. It
  renders through the normal renderer, so values stay visible and editable. It reports
  `template-fallback` with the reason `type-missing`.

**Rationale**: FR-019 and FR-020 hold without special UI. The orphan page is built from
existing parts.

### R14 — What a user-type page may contain

**Decision**:

- Bindings come from `listDocumentBindings(system, kind)`. That list is empty for a `user-`
  kind, so the editor's "Stores value in" offers only custom values (FR-016). No code change
  is needed beyond this verification.
- The catalog picker in `CatalogBindingEditor.tsx:40` is scoped to the draft's system for
  **all** templates. Validation (`templateReferences.ts:131`) and import stripping stay
  global, so existing templates keep working.
- Reference fields get a kind picker, fed by `listDefinitions()` shipped and user kinds.
  Today the kind is hard-coded to `character` (`draft.ts:372`).

**Rationale**: showing another system's catalogs was already a latent inconsistency. Scoping
the picker is a UX correction with no data effect.

### R15 — Type identity in files

**Decision**: a new wrapper, `ttgamer-document-type` version 1:
`{ format, version, type, setting?, templates[], notices? }`. It is validated like a template
file: exact version, every template through `CustomTemplateSchema` plus references, an
unknown system is rejected, and unavailable catalogs are stripped and reported.

A document export of a user type adds an optional top-level `documentType` with the same
payload. The document file has no wrapper today, and the envelope parse strips unknown keys,
so older builds ignore it.

On import, an unknown type is installed. A type with the same id and different content offers
replace, keep both, or cancel:

- **Keep both** re-issues the kind and rewrites the templates and the imported document.
- **Cancel** imports nothing.

**Rationale**: FR-023 to FR-025, reusing the existing conflict dialogs.

**Alternatives rejected**: making the template file v4 carry types. That would force a
version bump on every template file for a feature most files do not use.

### R16 — Deleting a type

**Decision**: the library's delete action for a type counts documents with that
`definitionId` in the loaded document list. It asks for confirmation with the count and
removes the type and its templates. The documents stay, and they open on the orphan page
(R13).

**Rationale**: FR-020. Documents are already all in memory (the documents store loads them
all), so the count needs no new query. **Scale note**: this is linear in the number of
documents, and it runs on an explicit user action.

## User settings

### R17 — A user setting is a thin grouping over a ruleset's core character

**Decision**: a `UserSetting` is `{ id: "user-setting-" + 8, name, description?, systemId,
pages: Partial<Record<definitionId, templateId>> }`. `systemId` must be a system that declares
`SystemPlugin.coreDefinitions`: the engine-only definitions a user setting may reuse. The
changes:

- **Documents** created in a user setting record `metadata.settingId`, an optional additive
  field. Their `metadata.templateId` is set to the setting's page for that definition when
  one exists.
- **Templates** made for a setting carry an optional `settingId`. The view selector shows a
  document only the templates with its own `settingId`, or with none.
- **User types** may belong to a user setting (`owner: { settingId }`) or to a shipped setting
  (`owner: { systemId, moduleId? }`).
- **The create dialog** lists user settings as their own groups: the core definitions (with the
  setting's page) plus its user types.

**Rationale**: FR-026 and FR-027. No mechanics are user-defined. Dice, validation, and policies
come from the ruleset plugin, because the document's `systemId` is the ruleset's.

**Alternatives rejected**: a user setting as a new `SystemPlugin` at runtime. That would
duplicate dice and policy registration, and it does not survive a missing setting.

### R18 — V5 gets a core character definition

**Decision**: add `v5-character` to the `wod-v5` plugin: kind `mortal`, a
`V5CoreShape`-only schema, no module, and views `v5-core-sheet` / `v5-core-brief` built from
`ruleset/templateParts.ts`. The plugin declares `coreDefinitions: ['v5-character']`.

The kind is `mortal`, not `character`. Template compatibility and binding lists are keyed by
`systemId + documentKind`. A `character` kind would make Hunter pages, Hunter-only bindings, and
Hunter user templates available to engine-only characters, and the reverse. A distinct kind
keeps them apart without changing the compatibility rule. Reference fields reach mortals
through the new kind picker (R14).

**Rationale**: a user setting on V5 needs an engine-only character. Reusing `hunter` would
carry Hunter fields and the Hunter module. The definition is also the natural base for V5
mortals and for T-039.

## WoD 2e ruleset (T-041)

### R19 — Code-level layering with frozen Star Wars identities

**Decision**:

- Extract `systems/wod2e/ruleset/`: `Wod2eCoreShape` (the engine fields listed in the data
  model), a neutral classic profile, bindings built with the existing `wod-like` builders,
  template parts, and dice (`classicWodTraitPool`).
- `systems/star-wars-wod/` becomes a setting built on it. Its schemas are `{ ...Wod2eCoreShape,
...StarWarsShape }` and produce the same parse result. Its profile is a
  `createWodSheetProfileVariant` of the engine profile, and its pages compose the ruleset
  parts.
- **Every persisted Star Wars identity stays frozen.** That covers `systemId star-wars-wod`,
  the definition ids, kinds, view ids, coordinates, and data field names. So there is no store
  version bump, no `RENAMED_SYSTEM_IDS` entry, and no data migration.
- A separate engine plugin `wod-2e` ("World of Darkness 2nd Edition") registers the engine
  character: definition `wod2e-character`, views `wod2e-sheet` / `wod2e-brief`,
  `coreDefinitions: ['wod2e-character']`.
- The pre-007 character fixture test (`fixtures/character-templates.pre-007.json`) and the
  default-template tests guard byte-identical Star Wars trees (FR-027d).

**Rationale**: the maintainer asked to move Star Wars onto a WoD 2e ruleset. This moves the
engine code once, as the constitution requires ("rulesets that share an engine MUST share one
ruleset"), with zero risk to stored data (FR-027c). With frozen ids, user templates for the
engine character stay incompatible with Star Wars documents (compatibility is `systemId +
documentKind`). Force-bound nodes can therefore never end up on an engine document.

**Alternatives rejected**: renaming `star-wars-wod` to a `wod-2e` system with Star Wars as a
`module`, the literal V5 pattern. It needs a store bump plus a rename (which cannot tell
documents apart by definition). It widens template compatibility to every character on the
engine. It also moves docs and i18n config keys. All of that risk is for an identical
player-visible result.

### R20 — Publisher policy of the WoD 2e engine

**Decision** (maintainer, 2026-09-25): neither the `wod-2e` engine plugin nor the Star Wars
setting declares any policy. The Dark Pack grants rights to World of Darkness 5th Edition
material only, so declaring it on classic WoD 2e content would grant nothing. Constitution
1.4.2 records this scope: a policy is declared only where it actually applies.

Source material (VIII): classic World of Darkness 2nd Edition mechanics and trait names, used
as mechanics and names only, with rules text in our own words; no applicable community policy;
no notice. V5 documents, including user settings and user types on the `wod-v5` ruleset, keep
the Dark Pack badge and export notices through the existing system and module policies.

**Rationale**: a badge that confers no rights is misleading, and it would also break FR-027d
(no change in Star Wars notices).

### R21 — Engine ability list

**Decision**: the engine profile uses the classic WoD 2e ability groups (Talents, Skills,
Knowledges) with the standard classic ability names. The names are allowed by VIII, which
permits trait names. They are added to `translations/source/{en,ru}/ui/sheet/wod2e.yaml`, and
Russian terms go into the glossary review queue as with V5. The Star Wars variant keeps its
own ability names.

## Storage keys (T-046)

### R22 — Composite override keys

**Decision**: `templateStore` goes to version 5. `defaultOverrides` is keyed by
`` `${systemId}:${viewId}` `` through one helper, `overrideKey(systemId, viewId)`, in
`store/templateStore.ts`. The migration re-keys each entry from `override.systemId` (entries
that fail to parse are quarantined, as today). Call sites that change:

- `view.ts:38, 73`
- `CharacterSheet.tsx:71, 117`
- `TemplateEditorDialog.tsx:75, 144`
- `TemplateLibraryDialog.tsx:59-66, 108-113, 423`
- `duplicateTemplate` (`templateStore.ts:112`)

The registry's cross-system view-id uniqueness check stays for now (docs embeds address views
by id).

Also fixed here: importing a template whose id equals a shipped view id currently shadows that
shipped page silently (`TemplateImportDialog.tsx:66` checks user ids only). Such an import now
gets a fresh id.

**Rationale**: FR-022, SC-006.

## Testing strategy

**Decision**: follow Principle V.

| Area                                                                                                                                                                                                                                | Tests                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Pure logic (`history.ts`, `duplicateNode`, shortcut matching, keyboard move targets, user-kind parsing, orphan page synthesis, override key migration)                                                                              | Unit tests                                                                                  |
| Stores (template store v5 migration, the new `documentTypeStore`, document import with an embedded type, Star Wars parse parity)                                                                                                    | Round-trip and migration tests                                                              |
| Components (editor areas, selection sync, slots and drops, condition-hidden frames, preview data picker, undo/redo, shortcuts under a simulated Russian layout via `code`, create dialog groups, library type flows, fallback page) | jsdom tests with Testing Library                                                            |
| Whole change                                                                                                                                                                                                                        | Tier 3 (`yarn verify:full`): it touches schemas, stores, and translations and adds a plugin |

Existing test selectors (`data-node-id`, `data-children-of`, `data-drop-zone`,
`data-palette-option`, the `grip-<id>` test ids) are kept on the outline so the drag-and-drop
suite ports with minimal change.
