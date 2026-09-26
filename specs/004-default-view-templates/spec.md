# Feature Specification: Built-in Views as Default Templates

> **Historical record.** Default derivation and block placements were replaced by specs 005–006; overrides keyed by view id were replaced by `systemId:viewId` keys in spec 012 (T-046). Current template behavior: `.agents/skills/sheet-templates/SKILL.md`.

**Feature Branch**: `004-default-view-templates`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Look over phases of spec-003; your task is 1. to improve the template feature to the point where all current main character (both full and brief form) can be recreated with template 2. To move all current views and appoint them as one of default templates that user can modify further / reset to start point if he want to. 3. user should be able to not just create new view modes of existing types, but also create new types and create new setups (e.g. for DnD or cyberpunk) with their own types of views and templates. If you think the task is too big, note it and we will separate it in several specs."

## Scope Note (task split)

The original request contains three tasks. Tasks 1 and 2 form one coherent arc — the application's
built-in pages become template-backed — and are covered by this spec. Task 3 (users creating new
view types and entirely new game setups such as DnD or Cyberpunk with their own view types and
templates) is a substantially larger, independent epic; it is deliberately **excluded** here and is
recorded as the next follow-up specification. This spec does not preclude it: the mechanisms
introduced here (templates as the universal page mechanism) are the foundation task 3 would build on.

## Clarifications

### Session 2026-09-05

- Q: When a user duplicates a modified default template, should the copy carry the modified or pristine content? → A: Copy carries the current saved (modified) content.
- Q: Should edits to a default template propagate live to documents already assigned to it? → A: Live propagation — every assigned document renders the newly saved version immediately.
- Q: When a template edit removes a ready-made block a document had data in, is a notice shown? → A: No special notice — orphan semantics apply as with fields.
- Q: How do existing documents' view selections resolve and full/brief pages stay consistent after the change? → A: No silent mapping or mandatory migration — full and brief are ordinary default templates; their values stay consistent through the existing shared value-key mechanism (spec-003 FR-25), and template authors can use ready-made blocks from both full and brief compositions.
- Q: Should default templates be visually distinguished from custom templates in the library and selector? → A: Subtle "default" badge in both places, combined with the modified marker.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Compose templates from ready-made interactive blocks (Priority: P1)

A template author wants to build a custom character page that behaves exactly like today's main
character page. In the template editor, alongside field groups and tables, they can now add
**ready-made interactive blocks** — the fully functional page parts that power the built-in pages
(the character header, attribute rows, skill lists, advantages, Force abilities, the health/body
tracker, the miscellaneous block, and the brief character card). Each block can be placed in any
section, ordered, and given its presentation setting (e.g., accent color) where the block supports
one. Saving and assigning the template produces a page indistinguishable in content and behavior
from the built-in full or brief character page.

**Why this priority**: Nothing else in the feature works without it. Built-in pages are rich,
interactive, system-aware compositions; until a template can carry them, no template can recreate
the main character page — which is the explicit bar of task 1 — and there is nothing to seed
default templates from in task 2.

**Independent Test**: Create a template containing the same ready-made blocks as the built-in full
character page (and separately, one containing only the brief card, and one mixing elements of
both), assign it to a character, and verify the page offers the same content and interactions as
the corresponding built-in page.

**Acceptance Scenarios**:

1. **Given** the template editor, **When** the author adds ready-made interactive blocks to a
   template's sections alongside field groups and tables, orders them, and saves, **Then** the
   saved template preserves the exact composition, order, and per-block presentation settings.
2. **Given** a character whose page is a template containing the same blocks as the built-in full
   character page, **When** the page renders, **Then** every interactive capability of the built-in
   full page is present and functional (editing the header, adjusting attributes, skills,
   advantages, Force abilities, health/body tracking, miscellaneous data), with no capability
   missing.
3. **Given** a character whose page is a template containing only the brief card block, **When**
   the page renders, **Then** it matches the built-in brief page's content and behavior.
4. **Given** a template mixing ready-made blocks and declarative fields, **When** the user edits
   both on the same page, **Then** both persist correctly and independently — ready-made blocks
   operate on the document's own data exactly as on built-in pages, and declarative fields use the
   shared document value store as established by spec-003.
5. **Given** an invalid template configuration (e.g., a ready-made block that does not exist for
   the template's game setup), **When** the user saves, **Then** the system rejects it with a
   clear, actionable message identifying the offending block.

---

### User Story 2 - Every current view becomes a default template (Priority: P2)

A player opens any document (main character full or brief, droid, creature, vehicle, fodder —
every view that exists today) and finds that view available as a **default template**: it appears
in the template library and in the page selector without any user action, renders identically to
the original view, and can be assigned to documents like any other template. The player can edit a
default template (draft-until-save, same as custom templates), duplicate it into a normal custom
template to customize without touching the original, and **reset** it to its pristine state at any
time.

**Why this priority**: This is task 2 — the payoff that turns built-in pages into living, mutable
templates — and it depends only on Story 1's block mechanism existing.

**Independent Test**: For each current view, verify it appears as a default template, renders
identically when assigned, can be edited (and the edit applies on save), and can be reset to the
original content.

**Acceptance Scenarios**:

1. **Given** any current view of any document type, **When** the user opens the template library
   or the page selector, **Then** that view is present as a default template, labeled and grouped
   with its document type, requiring no setup action.
2. **Given** a document assigned to a default template, **When** the page renders, **Then** it is
   identical to the original built-in view's rendering.
3. **Given** a default template being edited, **When** the user saves, **Then** all documents
   assigned to it render the saved structure from then on; discarding unsaved edits leaves the
   last saved version intact (same draft-until-save rules as custom templates).
4. **Given** a modified default template, **When** the user resets it, **Then** after an explicit
   confirmation its structure, name, and description are restored exactly to the original, and the
   modified state marker clears.
5. **Given** a default template, **When** the user attempts to delete it, **Then** deletion is not
   offered; the user can instead duplicate it into an independent custom template.
6. **Given** a default template that has been modified, **When** the user views it in the library
   or editor, **Then** it is visibly marked as modified relative to the original.

---

### User Story 3 - Seamless transition for existing documents and data (Priority: P2)

A player with existing characters installs the new version. Nothing visibly changes: every
document keeps rendering its current page; its current view selection keeps working. If the player
later assigns, edits, or resets default templates, no character data is ever lost — values whose
fields disappear from the active page are retained (existing orphan semantics) and reappear when a
field addressing them returns.

**Why this priority**: Trust is the feature's precondition — users must adopt template-backed
pages without any risk to existing campaigns. It is independently verifiable with pre-upgrade
data alone.

**Independent Test**: Load a pre-upgrade library of documents, verify every document renders
exactly as before the upgrade, then edit and reset default templates and verify zero data loss.

**Acceptance Scenarios**:

1. **Given** a library of existing documents created before the feature, **When** the application
   is upgraded and the documents are opened, **Then** each document renders its current page
   identically to before, and its current view selection still works.
2. **Given** a document with values in fields that a template edit or reset removes from the
   active page, **When** the page is re-rendered and the user later re-adds a field addressing the
   same value key, **Then** the retained value reappears; nothing was destroyed.
3. **Given** a character assigned to a default template, **When** that template is reset, **Then**
   the character keeps all of its data and the page simply renders the original structure again.

---

### Edge Cases

- **Reset with assigned characters**: resetting a default template never deletes character data;
  values at coordinates the original structure does not address are retained (orphan semantics)
  and recoverable.
- **Reset with an unsaved draft**: reset applies to the saved template and requires the same
  confirmation as discarding unsaved edits; the draft is discarded as part of the confirmed reset.
- **Import collision with a default template**: an exported, modified default template imported on
  another device carries the default's identity — the established replace / duplicate / cancel
  flow applies; replacing overwrites the local default's current content (reset still restores the
  pristine original afterwards).
- **Unknown ready-made block on import or on another setup**: a template references a block that
  is unknown or unavailable for the target game setup — the template still loads; the block
  renders as a clearly-labeled placeholder with a notice, the rest of the page works, and the user
  is told exactly which blocks were affected. No document data is lost.
- **Duplicate identifiers**: a ready-made block and a field/table in the same template share one
  identifier namespace; collisions are rejected live during editing with the offending item
  identified.
- **Size limits**: the established template size limits apply to compositions of ready-made blocks
  and declarative content alike, enforced live during editing.
- **Display-name collisions**: default and custom templates may share display names; identity is
  stable and internal.
- **Page selector duplication**: after built-in views become default templates, the selector MUST
  show exactly one entry per available page — no duplicate entries for the same page.
- **Scale**: the library remains responsive with at least 50 saved templates including defaults;
  rendering a default template shows no perceptible delay versus the original built-in view.
- **Accessibility**: all new management and editing surfaces meet the application's accessibility
  floor (keyboard operability, labeled controls, announced errors).

## Requirements _(mandatory)_

### Functional Requirements

**Ready-made interactive blocks in templates**

- **FR-1**: Template authoring MUST support adding ready-made interactive blocks — the page parts
  that power built-in views (character header, attributes, skills, advantages, Force abilities,
  body/health tracking, miscellaneous, brief card, and the specialized document pages) — as blocks
  within a template's sections, alongside field groups and tables. Any ready-made block of the
  compatible setup MUST be selectable from any template, regardless of which view composition it
  originates from — in particular, a template MAY freely mix elements from the full and brief
  character compositions.
- **FR-2**: A template MUST let the author order ready-made blocks and set their per-block
  presentation options (e.g., accent color) where the block supports one, matching the options
  built-in views use today.
- **FR-3**: A template page MUST render each ready-made block with full interactivity, identical
  to its behavior on the built-in page it originates from.
- **FR-4**: Ready-made blocks MUST be validated against the template's owning game setup: only
  blocks that exist for that setup are selectable and saveable; an unavailable or unknown block
  (e.g., from an imported file) MUST degrade to a clearly-labeled placeholder with a notice
  identifying the block, without affecting the rest of the page or any document data.
- **FR-5**: Ready-made blocks and declarative fields/tables MUST be mixable within one template.
  Ready-made blocks operate on the document's own data exactly as on built-in pages; declarative
  fields continue to use the shared document-scoped value store (spec-003 FR-25 semantics).
- **FR-6**: A ready-made block placement and all other template content MUST share one identifier
  namespace within a template; collisions MUST be rejected with live, actionable feedback.

**Default templates from current views**

- **FR-7**: Every view that exists today (main character full and brief, droid, creature, vehicle,
  fodder, and any view added by a registered game setup) MUST be provided as a **default
  template** — present in the template library and page selector without user action, rendering
  identically to the original view.
- **FR-8**: Default templates are ordinary templates: the system MUST NOT apply any special-case
  mapping mechanism or mandatory migration step for them. Existing documents' current view
  selections MUST continue to resolve through ordinary page selection so their pages render
  unchanged. Value consistency across the full and brief pages MUST come from the existing shared
  value-key mechanism (spec-003 FR-25): a field shared between them reads and writes one
  document-scoped value, so a change made on the full sheet shows on the brief one accordingly.
- **FR-9**: Default templates MUST be editable under the same draft-until-save rules as custom
  templates (edits apply only on explicit save; discard requires confirmation). On save, the new
  version MUST propagate live: every assigned document renders the newly saved structure
  immediately. This supersedes spec-003 FR-7's "built-in layouts are neither editable nor
  deletable" rule.
- **FR-10**: A user MUST be able to reset any default template to its pristine original content —
  structure, name, and description — with explicit confirmation; reset is always available,
  regardless of how many edits were saved.
- **FR-11**: Default templates MUST NOT be deletable. A user MUST be able to duplicate a default
  template into an ordinary custom template, after which the copy is independent; the duplicate
  carries the default's current saved content (including modifications), not the pristine original.
- **FR-12**: A default template MUST be visibly marked as modified when its saved content differs
  from the original; the marker clears on reset. Default templates MUST additionally carry a
  subtle "default" badge in both the template library and the page selector, so users can tell at
  a glance which pages are original defaults (undeletable, resettable).
- **FR-13**: The page selector MUST present a single unified list of pages per document — default
  templates and custom templates of the compatible setup and document kind — with no duplicate
  entry for any page.

**Data safety and compatibility**

- **FR-14**: Editing, saving, or resetting a default template MUST NOT destroy any document data.
  Values whose coordinates are no longer addressed by the active page remain retained under the
  established orphan semantics (spec-003 FR-12) and reappear when a field addressing them returns.
  This applies equally to content of removed ready-made blocks: no special notice is shown —
  orphan semantics apply exactly as with removed declarative fields.
- **FR-15**: A template containing ready-made blocks of a game setup is compatible only with
  documents of that setup and document kind (spec-003 FR-26 rules unchanged).
- **FR-16**: Modified default templates MUST export and import like custom templates (format
  version marker carried per spec-003 FR-22); imports colliding with a local default template's
  identity MUST follow the established replace / duplicate / cancel flow.

**Cross-cutting**

- **FR-17**: All user-visible strings of this feature MUST be provided in English and Russian
  through the application's translation pipeline.
- **FR-18**: All new management and editing surfaces MUST meet the application's accessibility
  floor: keyboard operability, labeled controls, announced error messages.

### Key Entities _(include if feature involves data)_

- **Ready-made Block Placement**: a template block referencing a ready-made interactive page part
  of a game setup, with placement order and optional presentation settings (e.g., accent color).
- **Default Template**: a template instance the application seeds from a current view; stable
  identity, undeletable, editable, always resettable to its pristine original; carries a modified
  state relative to the original.
- **Original Content Snapshot**: the pristine structure a reset restores; owned by the application
  from the registered view definition, not user-editable data.
- **Template / Section / Field / Field Value / Orphaned Value**: as defined in spec-003, extended
  by the ready-made block placement block type.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A template composed of the same blocks as the built-in main character page offers
  100% of that page's content and interactive capabilities, in both full and brief forms.
- **SC-002**: 100% of current views are available as default templates and render identically to
  the original views when assigned.
- **SC-003**: Resetting a default template restores its original structure, name, and description
  100% exactly, within a few seconds, with zero document data loss.
- **SC-004**: 100% of pre-upgrade documents render their current pages identically after the
  upgrade, with zero data loss.
- **SC-005**: Editing and saving a default template updates every assigned document's rendering
  with no perceptible delay at maximum template size, and 100% of entered values persist across
  reload, restart, and template reset.
- **SC-006**: An export → import round trip of a modified default template reproduces it 100%
  identically, and importing it onto a device where the default exists offers the established
  collision resolution.

## Assumptions

- **Task split**: task 3 of the request — users creating new view types and new game setups (DnD,
  Cyberpunk, etc.) with their own view types and templates — is out of scope for this spec and is
  recorded as the next follow-up specification. This spec does not close the door on it; the
  template-as-universal-page mechanism introduced here is the foundation it would extend.
- **Reset source of truth**: the pristine content of a default template comes from the
  application's registered view definitions, so reset never depends on user-stored data.
- **Unified page model**: after this feature, every page a document can select is template-backed;
  the legacy built-in rendering path remains only as an internal fallback (missing template), not
  as a user-visible separate page kind.
- **Value consistency across compositions**: the full and brief pages stay value-consistent
  through the established shared value-key mechanism, not through any template-to-template
  synchronization logic — one value per key, read by both pages.
- **Editing defaults is intentional**: unlike spec-003 FR-7, default templates are editable in
  place because the user explicitly asked for modifiable defaults with a reset path; duplication
  remains available for users who prefer not to touch defaults.
- **Local-first and persistence conventions** carry over unchanged from spec-003 (local storage,
  validation-before-apply, established import/export flows).
- **Localization split**: user-facing strings ship in English and Russian via the existing
  translation pipeline; this specification and all repository working documents are English-only.
