# Feature Specification: Template Composition Usability

> **Change record.** The recursive panel editor it describes was replaced by the three-area visual editor of spec 012. Current template behavior: `.agents/skills/sheet-templates/SKILL.md`.

**Feature Branch**: `006-template-composition-usability`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description (translated from Russian): "The previous spec introduced the template pattern and brought it to a proof-of-concept. Now debug it and refine it until using it is genuinely convenient. (1) Look at the previous spec — it should contain records of what still needs to be done for templates; collect all of that, we are doing it now. (2) Beyond that we will do the following (collect the unique requirements from my notes and the previous spec's records): rework how section, field group, field, and table work — all of these must be able to exist at every level, so a user can create a field in a vacuum without a section or field group, or nest ten sections inside each other. Rework the presentation styles based on the application's existing section components — a section is a collapsible block: no background, optional documentation link, and column splitting; a field group, like the existing titled surface card, has a visible title, becomes collapsible when the author opts in (with remembered expanded state), and carries the surface background. Finish the remaining character-card sections and their elements — for example the missing image element, and derived stats (done as ordinary fields, with dependencies on other values: e.g. a dots field whose maximum comes from another value, or a read-only value computed by formula — working with both system and custom stats), etc. Rework the collapsibility of panels in the template editor — collapse and move currently use identical icons in the same spot, which is confusing; devise and apply a solution. Resolve custom lists (currently they exist only for skills and are hard-limited to three columns; make a custom list possible anywhere with its own value-key binding, the way fields work; the system-fields vs custom-fields split must happen under the hood and never be shown to the user). Add the ability to create templates not only as particular views but as new entity types, manage setups, and create new types and new views within new setups. If the task is still too large, split it into several specs — take now only the essentially needed parts and record the rest for the next spec."

## Scope Note

Feature 005 shipped the primitive-composition proof of concept and recorded follow-up work. This feature executes those records together with the author's usability requirements:

- **From feature 005 records**: the phase-two primitive set (Force powers list, merits/flaws, equipment with catalogs) and the user-gated legacy cleanup (delete the legacy ready-made block path once parity is confirmed).
- **From the sheet backlog records**: configurable dot maxima (a dots control's maximum becomes configurable instead of fixed) and uniform trait updating across all trait groups (no special-cased trait paths) — both are supporting capabilities for the dependent-field model below.

### Out of scope — recorded for the next spec

- **Setups and new entity types**: managing game setups, creating templates as definitions of new entity types (new document kinds), and creating new types and new views within newly created setups. This is the multi-system foundation epic and gets its own spec. Everything in this feature works within the existing setups and document kinds.

## Clarifications

### Session 2026-09-06

- Q: What must template formulas support at minimum, and what may they constrain? → A: Basic
  arithmetic only (`+ − × ÷`, parentheses, numeric results); formulas are also the mechanism for
  limits on primary stats — e.g. Willpower's ceiling and Force Points' maximum/current — not
  just for display-only derived fields.
- Q: Does the image element apply to per-document data or to the template itself? → A: A
  per-document editable image field is mandatory. A static template-level decorative image
  (e.g. template-specific backgrounds) is a low-priority future idea recorded in the product
  backlog — out of scope here.
- Q: How should old fixed-hierarchy templates map onto the new presentation model? → A: No
  structure-preserving mapping for shipped defaults: the character-card template realization
  is rebuilt from scratch using the full new capability set, with the pre-template built-in
  viewer presentation (Base → Attributes → Skills → Advantages → Force → Body → Other,
  alternating accents, wide centered layout) as the visual reference. The current default
  template composition is deliberately not preserved.
- Q: What happens to user-authored templates saved before this change? → A: They are not
  migrated — the product has no permanent users yet, so a breaking rework is acceptable.
  Mandatory data migration on change becomes a governance rule only once permanent users
  exist (a future constitution amendment, out of scope here); until then, encountering a
  pre-feature template must still be handled without crashes or data corruption.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Free composition: every element at every level (Priority: P1)

A template author building a page is no longer forced through a fixed hierarchy (section → field group → fields). Section, field group, field, and table are all placeable at any level: a lone field can sit directly on the page with no container; sections can nest inside sections to any reasonable depth (guarded by a generous limit); a table can live inside a nested section or directly on the page. The editor lets the author add, move, and remove any element at any level of the structure, and the rendered page mirrors that structure exactly.

**Why this priority**: every other story builds on the reworked composition model; nothing else is meaningful until the structure itself is free.

**Independent Test**: Create a template containing a bare field with no container, a section nested two levels deep holding a table, and a field group holding a single field; assign it to a character; verify all render, edit, and persist.

**Acceptance Scenarios**:

1. **Given** the template editor with a fresh template, **When** the author adds a field without creating any section or group, **Then** the field appears directly on the page, renders at view time, and its value persists.
2. **Given** a section inside a section inside a section, **When** the page renders, **Then** the nesting is visible and each level collapses/indicates independently; content edits at the deepest level work and persist.
3. **Given** any element at any level, **When** the author moves it to a different container (or to the page root), **Then** the whole element — including any children — moves with it, keeps its identity and stored values, and nothing else in the template changes.
4. **Given** the depth guardrail (see Assumptions), **When** the author tries to nest deeper than allowed, **Then** the editor explains the limit with an actionable message and nothing is corrupted.
5. **Given** a template saved before this feature (fixed hierarchy), **When** it loads, **Then** the application degrades gracefully — the entry is clearly marked incompatible, the affected document falls back to the built-in page — with no crash and no data loss.

---

### User Story 2 - Unambiguous editor affordances: collapse vs move (Priority: P1)

In the template editor, every collapsible panel (section, field group, any element) distinguishes the collapse control from the reorder control. Reordering uses a dedicated affordance — a drag handle (grab-and-drag is the intended direction) or, as a fallback, a pair of controls that look and sit nothing like the collapse chevron. The two affordances never share an icon or a spot. This is consistent at every nesting level.

**Why this priority**: the current ambiguity makes every editing gesture error-prone; fixing it is small and multiplies the value of the whole editor.

**Independent Test**: Open the editor on a template with several sections and groups; without consulting documentation, identify and correctly use collapse and reorder on the first try at two different nesting levels.

**Acceptance Scenarios**:

1. **Given** any element's panel in the editor, **When** a first-time user looks at it, **Then** the collapse control and the reorder control are visually and spatially distinct — different icons, different placement — and the user identifies which is which without trial and error.
2. **Given** a nested structure, **When** the user drags (or uses the reorder control on) an element, **Then** it reorders within its container or moves between containers as intended, and the collapse state never changes as a side effect.
3. **Given** any collapsible panel, **When** the user toggles it, **Then** only its visibility changes; order never changes as a side effect.
4. **Given** keyboard-only operation, **When** the user works with panels, **Then** both collapse and reorder are keyboard-operable with accessible labels stating the action.

---

### User Story 3 - Presentation rework: section and field group styling (Priority: P2)

At view time a section renders in the style of the application's collapsible section: no background box of its own, an accent marker, an optional documentation link the author may set, and an optional column layout for its direct children. A field group renders in the style of the application's titled surface card: always a visible title, the surface background box around the whole group, and collapsibility only when the author explicitly opts in — with the expanded/collapsed state remembered for the user across sessions. Shipped default templates are updated to the new presentation; user-saved templates migrate losslessly.

**Why this priority**: this is the visual language that makes free composition readable on the page; it depends on Story 1's structure model.

**Independent Test**: Build a page with a bare section (no group) and a collapsible group inside it; verify section shows no box, group shows the surface box; toggle the group, reload, and verify the state was remembered.

**Acceptance Scenarios**:

1. **Given** a section with a documentation link set, **When** the page renders, **Then** the section header shows the documentation affordance that opens the linked page without toggling the section.
2. **Given** a section with a column layout configured, **When** the page renders, **Then** its direct children are arranged in the configured number of columns (stacking on narrow screens).
3. **Given** a field group the author marked collapsible, **When** the user collapses it and reloads or restarts, **Then** it is still collapsed (state remembered), and its content stays intact.
4. **Given** a field group not marked collapsible, **When** the page renders, **Then** its title is always visible and no collapse control is offered.
5. **Given** a template saved before this feature, **When** it is encountered, **Then** it is retired gracefully (marked incompatible; built-in page fallback) instead of rendering partially reworked content.

---

### User Story 4 - Dependent and derived fields, and the image element (Priority: P2)

A template author can make fields depend on other values, uniformly for system-backed and custom content:

- a dots/rating field's maximum can follow another value — directly or via a formula — and the same formula-bound limits apply to primary system resources (e.g. a character's Willpower ceiling, Force Points maximum/current); stored and current values clamp when the cap drops;
- a read-only field can compute its displayed value by a formula over other values (e.g. a derived stat), updating immediately when any source changes.

The author picks source values from the same coordinate space used for field storage — system stats and custom values appear as one undifferentiated list of choices; the author and the player never see a "system vs custom" distinction. Formula authoring is validated (unknown sources, invalid expressions, and circular chains are rejected or clearly flagged at authoring time). Alongside this, the missing element type is added: a per-document image — placeable anywhere, filled by device upload or by URL, respecting the application's portrait rules (secure URLs only; device uploads are resized, size-bounded, and stored locally on the device).

**Why this priority**: derived stats and the portrait are the most prominent gaps between what the built-in card shows and what templates can express today.

**Independent Test**: Build a template with a rating field capped by a second field's value and a read-only formula field summing two fields; edit the sources and verify clamping and instant recomputation; add an image element and verify upload, URL entry, and persistence.

**Acceptance Scenarios**:

1. **Given** a rating field or system resource (e.g. Force Points) whose maximum follows another value or a formula, **When** the computed maximum decreases below the stored/current value, **Then** the stored/current value is clamped to the new maximum; when the maximum rises, the full range is editable again.
2. **Given** a read-only formula field, **When** any source value changes, **Then** the displayed value updates immediately without a reload, and the user cannot type into it.
3. **Given** formula sources drawn from both system stats and custom values, **When** the author composes the formula, **Then** both kinds are offered in one undifferentiated picker and behave identically.
4. **Given** a formula referencing a source that becomes unavailable (deleted field, unavailable binding), **When** the page renders, **Then** the field degrades to a clearly-labeled state naming the problem; the rest of the page and all data are unaffected.
5. **Given** an image element, **When** the author/player provides a device image, **Then** it is stored locally in a size-bounded form and displays; a secure remote URL also displays; an insecure or unsupported source is rejected with a clear message.
6. **Given** a dependency chain the author tries to close into a circle, **When** they save, **Then** the circular dependency is rejected with an explanation naming the cycle.

---

### User Story 5 - Custom lists anywhere (Priority: P2)

A custom list becomes a first-class element placeable anywhere in a template, with its own value binding exactly like a field's value key — no longer tied to the skills domain and no longer hard-limited to three columns. A custom list can instead be bound to a system-owned list; the element and its behavior are identical either way, and the system/custom split stays invisible. Entries carry a name and an optional rating; players add, edit, and remove entries at view time; column layout is author-configured. Author-defined preset entries continue to seed a bound list on first use, behaving as ordinary entries afterwards.

**Why this priority**: frees list-shaped content (assets, contacts, spells, gear notes) from the skills domain — a major expressiveness gap.

**Independent Test**: Add a custom list directly on the page root with its own value binding and a two-column layout; add entries at view time, reload, and verify persistence; add a system-bound list and verify identical behavior.

**Acceptance Scenarios**:

1. **Given** a custom list placed at any level, **When** the player adds, edits, and removes entries, **Then** all changes persist under the list's own value coordinate.
2. **Given** two lists in different containers with different value coordinates, **When** the player edits one, **Then** the other is unaffected.
3. **Given** a list configured with a column count, **When** the page renders, **Then** entries are laid out in the configured columns (stacking on narrow screens) — never a hardcoded three.
4. **Given** a system-bound list and a custom-value list in the same template, **When** the player uses both, **Then** the interface and behavior are indistinguishable apart from the data they write.
5. **Given** a list with author-defined presets, **When** a document first uses the template, **Then** the presets appear as ordinary, editable, removable entries (existing preset semantics preserved).

---

### User Story 6 - Remaining character-card elements (Priority: P2)

The elements recorded in feature 005's second phase become available so the entire built-in character card can be expressed through templates: a Force powers list, merits/flaws rows, and equipment backed by data catalogs. After this story, a template author can rebuild the full built-in character page — including its portrait, derived stats (Story 4), and every remaining section — without using any legacy ready-made placement.

**Why this priority**: closes the expressiveness gap recorded by the previous spec; required before the legacy path can be retired (Story 7).

**Independent Test**: Compose a template covering every section of the built-in full character page using only first-class elements; assign it and compare content and behavior against the built-in page.

**Acceptance Scenarios**:

1. **Given** the template editor, **When** the author adds a Force powers element, merits/flaws element, or equipment element, **Then** each binds to its document data and edits exactly as the built-in page does.
2. **Given** an equipment element backed by a data catalog, **When** the player picks catalog entries, **Then** behavior matches the built-in inventory experience (catalog browsing, copy-on-select details) and persists in document data.
3. **Given** the composed full page, **When** compared section by section with the built-in character page, **Then** no interactive capability of the built-in page is missing.
4. **Given** any of the new elements in a document of a kind that does not support them, **When** the page renders, **Then** each degrades to a clearly-labeled placeholder with no data impact.

---

### User Story 7 - Legacy path retirement behind the user-confirmed gate (Priority: P3)

Once the user confirms the primitive-composed pages look and behave right, the legacy ready-made block components and the placement rendering path are deleted in a single follow-up cleanup. Templates saved before feature 005 that still contain legacy placements keep rendering until that confirmation; after the cleanup they degrade to labeled placeholders per the established degradation rule. This gate is explicit and user-driven — never automatic.

**Why this priority**: deliberate retirement, not new capability; it protects parity review while making the direction one-way.

**Independent Test**: Before confirmation: pre-005 templates with placements render through the retained path. After confirmation: no shipped template or editor surface references legacy placements, and the code no longer contains them.

**Acceptance Scenarios**:

1. **Given** the user has not yet confirmed parity, **When** a pre-005 template with legacy placements renders, **Then** it works through the retained path with no data loss.
2. **Given** the user confirms parity, **When** the cleanup lands, **Then** no shipped template, editor surface, or code path references legacy placements, and affected old templates degrade to labeled placeholders without crashing or touching data.

---

### Edge Cases

- **Depth guardrail**: nesting beyond the allowed depth is rejected with an actionable message; nothing is written.
- **Circular dependencies**: rejected at authoring time with the cycle named; a chain broken by later edits re-evaluates cleanly.
- **Missing formula/rating-cap sources**: field degrades to a labeled state; page and data unaffected; recovery is re-pointing the source.
- **Invalid formula results** (e.g. division by zero, non-numeric source): the field shows an explicit unreadable/error state, never a silently wrong number.
- **Computed-maximum clamp**: a decreasing computed maximum clamps the stored/current value once; no repeated writes or persistence churn.
- **Moving containers**: moving an element moves its whole subtree; identities and stored values are untouched.
- **Removing containers**: children are removed with the container; their stored values become orphaned and are retained (never destructively deleted), per the established orphaned-value convention.
- **Value-key sharing**: elements in different containers with the same value coordinate read and write one shared value — intended, existing semantics, unchanged.
- **Pre-feature user templates**: retired without migration — no crashes, no data changes; affected documents fall back to the built-in page with a clear notice; stored document values remain intact.
- **Unknown/foreign-kind bindings**: degrade to labeled placeholders; zero crashes, zero data changes.
- **Image sources**: oversize device images are rejected or resized per the portrait rules; insecure or non-image URLs rejected with a clear message; read-only contexts display without edit affordances.
- **Deep nesting performance**: pages with many nested levels and many elements render without noticeable lag; collapse state of deeply nested panels stays consistent after reload.
- **Read-only viewing contexts**: every new element renders fully but is not editable, consistent with existing read-only behavior.
- **Localization and accessibility**: all editor and page strings ship in English and Russian through the translation pipeline; all new surfaces meet the accessibility floor (labeled controls, keyboard operability, `aria-expanded` on every collapsible, announced errors).

## Requirements _(mandatory)_

### Functional Requirements

**Composition model**

- **FR-1**: Section, field group, field, and table MUST all be placeable at any level of a template: directly at page root, inside any container, and nested to the guarded depth limit (Assumption A2). A field MUST be creatable without any surrounding section or group.
- **FR-2**: The editor MUST support adding, editing, moving (within and between containers), and removing any element at any level; moving an element MUST move its entire subtree and preserve identities and stored values.
- **FR-3**: A documented depth guardrail MUST cap nesting with a clear, actionable message when exceeded.
- **FR-4**: Shipped default templates (including the full character card) MUST be recomposed from scratch using the complete new capability set, with the pre-template built-in viewer presentation as the visual reference. Pre-feature user-authored templates are NOT migrated (no permanent user base yet): the application MUST retire them gracefully — clearly marked as incompatible, affected documents fall back to the built-in page with the existing stale-template notice — with zero crashes and zero data corruption; their stored document values remain intact.
- **FR-5**: Existing value-coordinate semantics MUST carry over unchanged: a field's value key defaults to its id, equal keys share one value across containers and templates, and orphaned values are never destructively deleted.

**Editor affordances**

- **FR-6**: Collapse and reorder controls MUST be visually and spatially distinct at every nesting level; they MUST NOT share an icon or a position. Reordering SHOULD be a drag handle; any button-based fallback MUST be equally unambiguous.
- **FR-7**: Collapsing MUST change only visibility; reordering MUST change only position; neither may affect the other or the stored data.
- **FR-8**: Both affordances MUST be keyboard-operable with accessible action labels.

**Presentation**

- **FR-9**: A section MUST render as a collapsible block without its own background, with the automatic accent marker, an optional author-set documentation link, and an optional column layout (up to four) for its direct children; the documentation link MUST open without toggling the section.
- **FR-10**: A field group MUST render with an always-visible title and the surface background around the whole group; it MUST be collapsible only when the author opts in, and the expanded state MUST persist per user across sessions.
- **FR-11**: Accent colors remain automatic (primary → secondary alternation); the author MUST NOT set accents manually. Label overrides on system-bound content remain presentation-only.

**Dependent and derived fields**

- **FR-12**: A rating/dots field MUST support a dynamic maximum bound to another value (direct link or arithmetic formula), and the same formula-bound maxima MUST be available for primary system resources (e.g. a character's Willpower ceiling, Force Points maximum/current); stored and current values MUST clamp to the computed maximum, with sources accepted uniformly from system-backed and custom coordinates.
- **FR-13**: A read-only field MUST support a formula over other values — basic arithmetic only (`+ − × ÷` with parentheses, numeric results) — recomputed immediately when any source changes; the author MUST pick sources from one undifferentiated coordinate space covering system-backed and custom values.
- **FR-14**: Formula and dynamic-max authoring MUST be validated: unknown sources, invalid expressions, and circular chains MUST be rejected or flagged with an explanation at authoring time.
- **FR-15**: A dependent field with an unavailable source MUST degrade to a clearly-labeled state naming the problem, without affecting the rest of the page or any stored data; invalid formula results MUST surface an explicit error state rather than a wrong number.
- **FR-16**: A per-document image field MUST be placeable anywhere, accepting device upload (resized, size-bounded, device-local storage) or secure remote URLs; insecure or unsupported sources MUST be rejected with a clear message; device-local image data MUST be excluded from JSON exports, matching the portrait rules. A static template-level decorative image is explicitly out of scope (recorded in the product backlog).

**Custom lists**

- **FR-17**: A custom list MUST be placeable at any level with its own value coordinate, and MUST equally support binding to a system-owned list; the two storage modes MUST be indistinguishable in the interface.
- **FR-18**: List entries MUST carry a name and an optional rating; players MUST be able to add, edit, and remove entries at view time; column layout MUST be author-configured (up to four), replacing the hardcoded three-column presentation.
- **FR-19**: Preset seeding semantics carry over: author-defined presets seed a bound list once on first use as ordinary, editable, removable entries.

**Remaining elements and retirement**

- **FR-20**: The Force powers list, merits/flaws, and catalog-backed equipment MUST become available as first-class elements binding to document data with behavior parity to the built-in page; foreign-kind usage degrades to labeled placeholders.
- **FR-21**: The legacy ready-made block path MUST be retained until the user confirms parity, then removed in one gated cleanup; after removal, old templates referencing it degrade to labeled placeholders without data loss or crashes.

**Cross-cutting**

- **FR-22**: All user-visible strings MUST ship in English and Russian through the translation pipeline; all new surfaces MUST meet the accessibility floor (keyboard operability, labeled controls, `aria-expanded` on collapsibles, `role="alert"` error announcements).

### Key Entities _(include if feature involves data)_

- **Composition Element**: any node of a template page — section, field group, field, table, custom list, image, system-bound element — all sharing one placement model with order, optional parent container, and stable identity.
- **Section**: a container rendering as a collapsible block (no background, accent marker, optional documentation link, optional column layout for direct children).
- **Field Group**: a container rendering as a titled surface card; collapsibility is opt-in with remembered state.
- **Field**: a leaf with a value coordinate; types include text, number, toggle, select, rating, resource, reference — and the new image and dependent/formula variants.
- **Dependent Field**: a field whose maximum or displayed value is derived from other coordinates (direct value link or arithmetic formula), including formula-bound maxima for primary system resources; carries sources, validation state, and degradation state.
- **Custom List**: a leaf element with its own value coordinate or a system-list binding; entries are name + optional rating; column layout is author-owned.
- **System-Bound Element**: the existing document-bound element concept (traits, resources, tracks, identity fields, plus the new Force powers, merits/flaws, equipment), bound through the per-system binding registry.
- **Value Coordinate**: the shared storage address namespace (value keys and bridged document data addresses) — the single space sources and targets are picked from, with the system/custom split resolved invisibly underneath.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A template author can build a page containing a bare field, a section nested two levels deep, a collapsible group, an image, a formula-derived field, and a custom list in under 15 minutes without external documentation.
- **SC-002**: 100% of the built-in full character page's content and interactive capabilities can be expressed by a template composed of first-class elements, with zero legacy placements.
- **SC-003**: 100% of pre-feature user-saved templates encountered after this change are retired without a single crash or data corruption: affected documents fall back to the built-in page with a clear notice, and their stored document values remain intact.
- **SC-004**: In a first-exposure usability check, users correctly identify the collapse and reorder controls at least 9 times out of 10 without trial and error.
- **SC-005**: 100% of derived and clamped values update within one interaction of their sources changing, with zero stale displays after reload or restart.
- **SC-006**: 0 crashes and 0 unintended data changes across all degradation paths (unknown sources, foreign-kind bindings, invalid formulas, insecure images, retired legacy placements).

## Assumptions

- **A1 — Scope split (author-authorized)**: setups management, templates as new entity types, and new views within new setups are deferred to the next spec (see Out of scope). This feature completes template usability within the existing setups and document kinds.
- **A2 — Depth guardrail**: the nesting limit is generous (default 10 levels, matching the author's "ten sections" example) and expressed as a single configurable constant; exceeding it is an authoring-time rejection, not silent truncation.
- **A3 — Reorder affordance**: drag-and-drop is the intended reorder interaction; a distinct button-based fallback (arrows clearly separated from the collapse chevron) is acceptable if dragging proves impractical inside deeply nested panels. Either way the FR-6 distinction holds.
- **A4 — Derived values are computed, not stored**: formula results are evaluated at view time and never written back as second copies of the data; a formula-bound maximum clamps only the value it bounds, at write time. Derived calculations never depend on template composition, and system-derived stats keep their existing ownership rules.
- **A5 — Defaults rebuilt, no migration while there is no user base**: shipped defaults are rebuilt from scratch against the built-in viewer presentation. Pre-feature user-authored templates are retired rather than migrated; document data and the value bag never change shape. Once permanent users exist, mandatory data migration on change becomes a constitution-amendment governance decision (out of scope here).
- **A6 — Custom-list storage split stays internal**: system-owned lists and value-coordinate lists keep their separate storage shapes; the unified element interface hides the difference from both author and player. No data-model unification of traits and lists happens in this feature.
- **A7 — Local-first and persistence conventions** carry over unchanged (device-local images, IndexedDB persistence, import validation before any state change).
- **A8 — Verification scope**: this feature touches template schema, persistence, and rendering — the schema/persistence verification tier (lint + typecheck + full test suite) applies at every checkpoint.
