# Feature Specification: Custom Character Page Templates

**Feature Branch**: `003-custom-sheet-templates`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "Давай начнём подготовку к тестовй версии фичи кастомных темплейтов страницы персонажа (а также их импорта и экспорта). Продумаем механизм создания новых темплейтов, их настройки относительно выбранного шаблона, их сохранения, их выбора как страницы персонажа, импорта/экспорта с json, а также edge кейсы, навроде прикрепления определённых массивов данных из data/ к определённым текстовым полям (и соответственно заполнения ряда полей как итог, как например это происходит у character sheet WoD SW в инвентаре или в выборе силовой способности, или расы, или ещё чего). В общем составляем план глобальной фичи, а затем будем реализовывать её по частям."

## Clarifications

### Session 2026-09-02

- Q: What happens to linked field values when the player replaces or clears a catalog-backed selection on the character page? → A: Re-copy on replace — replacing the selection re-copies the newly selected entry's data into the linked fields; clearing the selection leaves previously copied values untouched.
- Q: When an author edits a saved template, when do their changes reach the version characters use? → A: Explicit save/discard — edits stay in an in-editor draft and are applied only on explicit save (or discarded with confirmation); characters always render the last saved version.
- Q: How much control does a template author have over which catalog-entry details auto-fill which linked fields? → A: Default set + remap — attaching a catalog supplies a sensible default auto-fill set; the author may remap which detail targets which of their fields or disable fills.
- Q: How does a field's required flag behave when a character's page is filled? → A: Soft advisory — unfilled required fields are marked visually and noted on export, but never block input or saving of the character.
- Q: Can a catalog-backed field allow multiple selections in this version? → A: Single-choice only — catalog-backed fields are single-choice in v1; multi-select remains available only for fields with manually defined option lists.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Author a custom template from a chosen base (Priority: P1)

A player or game master wants a character page shaped like their homebrew game. They open the template manager and choose a starting point: an empty structure, a copy of any available built-in page layout, or a duplicate of an existing custom template. They then compose the page from ordered sections containing field groups and tables — adding, renaming, reordering, and removing parts; choosing each field's type and settings; naming and describing the template — and save it into their template library.

**Why this priority**: Nothing else in the feature exists until a template can be authored and saved. This slice is independently valuable: an author can build and keep work-in-progress templates even before any character uses them.

**Independent Test**: Create a template from a chosen base, modify its structure (add a section with several fields), save it, reopen the template manager, and confirm the template persisted with exactly that structure.

**Acceptance Scenarios**:

1. **Given** the template manager, **When** the user starts a new template from a chosen base (empty, built-in layout, or existing custom template), **Then** a new editable template opens pre-populated with the base's structure and a fresh identity, and the base itself is left untouched.
2. **Given** an editing session, **When** the user adds, renames, reorders, or removes sections, blocks, and fields, then saves, **Then** the saved template reflects exactly those changes and satisfies the template integrity rules (unique identifiers, supported field types, size limits, consistent bounds).
3. **Given** an invalid configuration attempt (duplicate identifier, missing required name, exceeded size limit, inconsistent numeric bounds), **When** the user saves or applies the change, **Then** the system rejects it with a clear, actionable message identifying the offending item, and no partial or corrupt state is stored.

---

### User Story 2 - Use a custom template as a character's page (Priority: P2)

A player opens one of their characters and selects an available custom template as that character's page. The page renders exactly the template's sections, blocks, and fields in order; the player fills the fields in; the values persist with the character and survive reloads and app restarts. Built-in pages remain available at all times, and the player can switch between pages without losing anything.

**Why this priority**: This is the payoff of the feature — authored structure becomes a working character page. It depends on Story 1 existing but is independently testable as soon as one template is saved.

**Independent Test**: With a saved template, assign it to a character, fill in several fields, reload the application, and verify the same page and the same values return.

**Acceptance Scenarios**:

1. **Given** a character and an available compatible custom template (same document kind), **When** the user selects the template as the character's page, **Then** the page renders the template's full structure immediately, in order, with an input control appropriate to each field.
2. **Given** values entered on a custom page, **When** the character is saved, reloaded, or the application restarted, **Then** all values persist exactly as entered.
3. **Given** a character on a custom page, **When** the user switches to a built-in page and back to the custom page, **Then** the custom template's values are retained across the round trip.
4. **Given** a read-only viewing context for a character, **When** its custom page renders, **Then** all template content is visible and nothing is editable, consistent with other read-only pages.
5. **Given** two templates whose fields share a `valueKey` (e.g., an "appearance color" field on a human-form page and on a true-form page), **When** the value is edited on one page, **Then** the other page reads the same value, and re-assigning either template preserves it.

---

### User Story 3 - Catalog-backed fields auto-fill related fields (Priority: P2)

A template author attaches one of the application's data catalogs (e.g., weapons and gear, Force powers, species) to a choice field in the template editor. On the character page, that field's options come from the catalog itself; when the player picks an entry, the system fills the linked fields with that entry's details — the same convenience the built-in Star Wars sheet already offers for inventory, Force ability selection, or species — and the filled values remain editable afterwards.

**Why this priority**: This is the feature's distinctive power: it turns static forms into living pages connected to the game's data, and it was explicitly requested. It is independent of import/export and can ship before or after Story 4.

**Independent Test**: With a template containing a catalog-backed field, pick a catalog entry on a character page and verify the linked fields populate with that entry's data and remain editable.

**Acceptance Scenarios**:

1. **Given** the template editor, **When** the author attaches an available catalog to a choice field, **Then** a default auto-fill set (which entry details fill which fields) is offered, the author can remap or disable individual fills from that closed set, and the resulting binding is saved as part of the template.
2. **Given** a character page with a catalog-backed field, **When** the player opens the field's options, **Then** the options shown are that catalog's entries in the player's language — not a manually typed list.
3. **Given** the player selects a catalog entry, **When** the selection is made, **Then** the linked fields populate with the entry's data immediately and remain editable; replacing the selection re-copies the newly selected entry's data into the linked fields, clearing the selection leaves the previously copied values untouched, and neither action corrupts any other fields.

---

### User Story 4 - Import and export templates as JSON (Priority: P3)

An author exports a saved template to a JSON file to back it up or share it with their gaming group. Another user imports the file: the template is fully validated before anything is applied; on success it joins their template library; if its identity collides with an existing template the user chooses replace, duplicate as a new copy, or cancel; on invalid content nothing is imported and a clear reason is shown.

**Why this priority**: Sharing and backup multiply the feature's value but are not needed for the core author-and-use loop, and they reuse the application's established document import/export conventions — a well-bounded final slice.

**Independent Test**: Export a template, remove it locally, import the exported file back, and verify an identical template (structure, settings, catalog bindings) is restored.

**Acceptance Scenarios**:

1. **Given** a saved custom template, **When** the user exports it, **Then** a JSON file is produced containing the complete template definition and its catalog bindings, and importing that file into an empty library reproduces the template exactly.
2. **Given** an import whose template identity matches an existing template, **When** the user confirms the import, **Then** the user is offered replace, duplicate with a new identity, or cancel, and the chosen action is applied completely or not at all.
3. **Given** a malformed, incomplete, or unsupported-version file, **When** the user attempts the import, **Then** nothing is imported and the user sees a specific, actionable error.

---

### Edge Cases

- **Catalog unavailable on import or device**: a template references a catalog that is unknown or removed on the importing device — the template still imports/loads; the affected field degrades to a manually filled choice field, the user is told exactly which fields were affected, and no character data is lost.
- **Catalog content changes after binding**: a catalog entry is renamed, updated, or removed after values were already copied into characters — copied values remain untouched; option lists reflect the catalog's current content at render time.
- **Template edited after characters use it**: a field that characters have values for is removed or its type is changed — orphaned values are preserved (never destructively deleted) so reverting the template edit brings them back; a type change keeps or safely converts existing values and warns when conversion would lose data.
- **Unsaved editor draft**: leaving the editor or closing it with unsaved changes prompts for confirmation; the saved template remains unchanged until an explicit save.
- **Shared-key rename**: changing a field's `valueKey` starts an empty coordinate; the previous value stays orphaned (recoverable by re-keying back), never silently moved.
- **Cross-template type mismatch on one key**: a value written under one field's type is displayed through another template's field via the keep-or-convert rule; an unreadable value shows empty and is never destroyed.
- **Clearing a shared value**: clearing a field clears its shared coordinate for every page reading that key — predictable, documented behavior of one value per key.
- **Template deleted while in use**: characters assigned to it keep all their data; the page falls back to the document's default page with a clear notice, and the assignment can be re-pointed to another template later.
- **Identifier collisions inside one template** (duplicate section, block, field, or option identifiers): rejected during editing/saving with the offending item identified.
- **Import identity collision**: handled with replace / duplicate / cancel; cancel leaves the library untouched.
- **Structure and size limits** (sections, blocks, fields, options): enforced live during editing with immediate feedback, not only at save time.
- **Display-name collisions**: two templates may share a display name; identity is stable and internal, and renaming never breaks existing assignments.
- **Scale**: the library remains responsive with at least 50 saved templates, and editing/rendering show no perceptible degradation at the maximum allowed template size.
- **Accessibility**: all template management and custom-page interaction is fully operable by keyboard and with assistive technology, including errors announced to the user.

## Requirements _(mandatory)_

### Functional Requirements

**Authoring and management**

- **FR-1**: System MUST let users create a new template by starting from (a) an empty structure, (b) a copy of any available built-in page layout, or (c) a duplicate of an existing custom template. Starting points are always copied, never modified.
- **FR-2**: System MUST let authors compose a template from ordered sections; each section contains one or more blocks; a block is either a field group or a table with defined columns. Authors MUST be able to add, edit, reorder, and remove sections, blocks, and fields.
- **FR-3**: System MUST support authoring these field types: short and long text; number with optional bounds; on/off toggle; single- or multi-choice with a defined option list; rating scale; resource pool with current and maximum values; and a reference field pointing at other documents of chosen kinds.
- **FR-4**: System MUST enforce integrity on every saved template — unique identifiers within their scope, required naming, supported field types, consistent numeric bounds, and the product's template size limits — and MUST reject violations with specific, actionable messages.
- **FR-4a**: A field's required flag is soft advisory on the character page: unfilled required fields MUST be marked visually (e.g., marker or highlight) and noted on character export, but MUST NOT block input, page switching, or saving. A required field counts as filled when its shared coordinate holds a value, regardless of which page wrote it.
- **FR-5**: Templates MUST be declarative descriptions only: a template MUST NOT contain or execute arbitrary user code; all page behavior is provided by the application.
- **FR-6**: System MUST persist saved templates locally and present them in a template library grouped by the document kind they apply to, showing each template's name and description.
- **FR-7**: System MUST let authors edit and delete their saved custom templates (with confirmation before deletion); built-in layouts are neither editable nor deletable. Edits are held as an in-editor draft and take effect only on explicit save; discarding unsaved edits requires confirmation, so characters always render the last saved version.
- **FR-8**: System MUST give every saved template a stable identity that survives renaming; display names are independent of identity and duplicates are allowed.

**Selection and rendering**

- **FR-9**: System MUST let a user choose, per document, which page is active: any compatible built-in layout or any compatible custom template, where compatible means the same owning system (`systemId`) and the same document kind (FR-26).
- **FR-10**: System MUST render the active custom page exactly as the template defines it — sections, blocks, and fields in order — with input controls appropriate to each field type.
- **FR-11**: System MUST persist per-document field values in one document-scoped bag keyed by each field's storage coordinate — its `valueKey`, defaulting to the field identifier — so values survive reloads, page switching, and application restarts (FR-25).
- **FR-12**: System MUST preserve character values whose coordinates become orphaned — a key no field or table of the active template addresses — after template edits or page re-assignment (rather than deleting them), and make them visible again when a field addressing the same `valueKey` returns. Changing a field's `valueKey` starts a new empty coordinate and leaves the old value orphaned; values are never silently migrated on rename (FR-25).
- **FR-13**: If a character's assigned template is missing (deleted, or not present on this device), the system MUST fall back to the document's default page with a clear notice, MUST NOT lose that character's data, and MUST keep the assignment re-pointable.
- **FR-14**: Custom pages MUST work in read-only viewing contexts: all template content visible, nothing editable.

**Catalog binding**

- **FR-15**: System MUST let an author attach an available data catalog to a choice field; the field's options then come from the catalog at render time, displayed in the user's language, instead of a manually defined list. A catalog-backed field MUST be single-choice in this version; multi-select remains available only for fields with manually defined option lists.
- **FR-16**: For a catalog-backed field, the auto-fill mapping is defined as a default set provided by the catalog's binding (a closed set of entry details the catalog declares fillable, with default targets). The author MUST be able to remap which entry detail fills which of the template's fields or disable individual fills, from that closed set only.
- **FR-17**: On the character page, selecting a catalog entry MUST immediately populate the linked fields with that entry's data as a one-time copy owned by the character; the populated values MUST remain editable, and later catalog changes MUST NOT silently rewrite already-copied values. Replacing the selection MUST re-copy the newly selected entry's data into the linked fields; clearing the selection MUST leave previously copied values untouched. Fill writes target the linked field's storage coordinate (`valueKey`), wherever that field lives. (Binding behavior decided: copy-on-select; live-linked and per-binding modes are out of scope for this version.)

**Import and export**

- **FR-18**: System MUST export any saved custom template to a JSON file containing the full definition — structure, field settings, catalog bindings, and a format-version marker — following the application's export naming convention.
- **FR-19**: System MUST validate an imported template completely before applying any part of it; invalid files MUST be rejected entirely with a specific reason and no partial state changes.
- **FR-20**: When an import's identity collides with an existing template, the system MUST offer replace, duplicate with a new identity, or cancel — consistent with the application's existing document import behavior.
- **FR-21**: System MUST import templates that reference catalogs unavailable on the device by degrading those fields to manually filled choice fields and telling the user which fields were affected.
- **FR-22**: Template definitions MUST carry a format-version marker so future format changes can be recognized, migrated, or safely rejected.

**Cross-cutting**

- **FR-23**: All user-visible strings of this feature (labels, errors, confirmations) MUST be provided in English and Russian through the application's translation pipeline.
- **FR-24**: Template management and custom pages MUST meet the application's accessibility floor: keyboard operability, labeled controls, and announced error messages.

**Shared value store and system scoping (2026-09-03 amendments, D1–D4)**

- **FR-25**: Fields in different templates with an equal `valueKey` MUST share one stored document-scoped value. The storage layer is type-agnostic: each field validates its own writes against its own type, and readers apply the keep-or-convert display rule without destroying stored data (including array-vs-scalar mismatches between multi-select and single-select fields).
- **FR-26**: Template compatibility — for page assignment and for library/selector listing — MUST match both the owning system (`systemId`) and the document kind.
- **FR-27**: A `valueKey` MUST follow the template identifier rules and be author-editable for both fields and table blocks (default: the field/block identifier). Within one template, the effective value keys of all fields and all table blocks MUST be unique — one namespace — with actionable live feedback; across templates an equal key is the sharing mechanism (FR-25), not an error.
- **FR-28**: The store upgrade that flattens legacy per-template value bags MUST: map each key declared by a known template through that field's `valueKey` (per-key mapping); keep undeclared namespaces and keys verbatim (no data dropped); apply atomically per document — a document that fails is retained untouched in bounded recovery; run once per store upgrade; and require the template library for key mapping, so documents are processed only after the library is available.
- **FR-29**: Template files of format version 1 MUST import with `systemId` defaulting to `star-wars-wod`. This default holds while that is the only registered system; when a second system plugin ships, v1 imports MUST offer an explicit system choice instead.

### Key Entities _(include if feature involves data)_

- **Template**: the reusable page definition — stable identity, display name, optional description, owning system (`systemId`, FR-26), target document kind, format version, and an ordered list of sections.
- **Section**: a titled, ordered grouping of blocks within a template.
- **Block**: either a field group (one or more fields, optional column arrangement) or a table (defined columns, optional row bounds, optional title).
- **Field**: a single input definition — identity, label, optional description, requiredness, storage coordinate (`valueKey`, default = field identifier), type-specific settings (numeric bounds, option lists, multi-select, rating presentation, reference target kinds), and an optional catalog binding. Fields with a catalog binding are single-choice in this version.
- **Catalog Binding**: the attachment of a data catalog to a choice field — which catalog supplies the options, plus the auto-fill mapping: a remap of the catalog's declared fillable entry details onto the template's fields (defaults provided by the catalog; individual fills may be remapped or disabled).
- **Template Library**: the user's collection of saved templates, grouped by document kind; identity-based, tolerant of duplicate display names.
- **Page Assignment**: the per-document choice of which page (built-in layout or custom template) is active.
- **Field Value**: a character's stored value at one `valueKey` coordinate in the document-scoped bag; owned by the character and independent of any template's later edits. Fields in different templates addressing the same coordinate share one value (FR-25).
- **Orphaned Value**: a stored value whose coordinate is not addressed by any field or table of the active template; retained indefinitely and visible again when a field addressing the coordinate returns (FR-12).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user familiar with the application can create, save, and apply a working custom template to a character in under 10 minutes without external documentation.
- **SC-002**: Assigning a template as a character's page renders it with no perceptible delay (for templates up to the maximum allowed size), and 100% of entered values survive reload, application restart, and page/template re-assignment (document-scoped coordinates).
- **SC-003**: Selecting an entry in a catalog-backed field populates its linked fields with no perceptible delay, and 100% of populated values remain editable.
- **SC-004**: An export→import round trip reproduces a template 100% identically (structure, field settings, catalog bindings) in an empty library.
- **SC-005**: 100% of invalid import attempts are rejected with a specific, actionable message and leave the library unchanged.
- **SC-006**: The template library remains responsive with at least 50 saved templates, and editing and rendering show no perceptible degradation at maximum template size.
- **SC-007**: In a group where one member authors templates and others import them, every member can use the shared templates successfully guided by in-app messages alone (including degraded catalog fields).
- **SC-008**: The v2→v3 store migration preserves 100% of stored values — every legacy value is readable at its mapped (or verbatim) coordinate after upgrade, with zero dropped entries.

## Assumptions

- **Local-first**: templates are stored on the user's device like other application data; there is no cloud library or online template marketplace in this version — file export/import is the sharing path.
- **Document kinds**: custom templates target all document kinds the sheet manager supports, with characters as the first and primary use case; built-in layouts remain the default page until the user selects otherwise.
- **Declarative scope for v1 (decided)**: templates consist of fields, field groups, tables, and catalog bindings only; embedding built-in interactive page parts (e.g., the health tracker or derived-stat display) inside a custom template is out of scope for this version and is a candidate for a later phase.
- **Catalog binding behavior (decided)**: copy-on-select — selecting a catalog entry copies that entry's data into the linked fields as character-owned values; live-linked and per-binding modes are out of scope for this version.
- **Import/export conventions**: validation before applying, replace/duplicate/cancel on identity collision, and the established export naming convention carry over from existing document import/export behavior.
- **Coexistence**: a custom template appears as one selectable page for a document; installing custom templates never removes built-in pages. A template _page_ is distinct from a definition-owned _view_; the page selector merges both lists (views first).
- **Single-system documents**: each document belongs to exactly one system (envelope ownership), so document-global `valueKey`s never cross system boundaries.
- **Localization and language split**: user-facing strings ship in English and Russian via the existing translation pipeline; this specification and all repository working documents are English-only.

### Session 2026-09-03

- Q: How do different views/templates of one character share values (e.g., an appearance color on a human-form and a true-form page)? → A: One document-scoped value bag keyed by author-visible `valueKey` (default = field id); equal keys share one value (D1–D3, FR-25).
- Q: What scopes template compatibility? → A: Owning system + document kind (D4, FR-26); format v2 carries `systemId`, v1 files default to `star-wars-wod` (FR-29).
- Q: What happens on `valueKey` rename? → A: New empty coordinate; old value stays orphaned, never silently migrated (FR-12).
- Q: What governs shared keys used with different field types? → A: Type-agnostic storage; per-field write validation; keep-or-convert reads (FR-25).
- Q: How does the legacy bag migrate? → A: Per-key mapping through known templates' valueKeys, verbatim orphans, atomic per document with bounded recovery, one-time, library-dependent ordering (FR-28, SC-008).
