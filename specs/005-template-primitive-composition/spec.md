# Feature Specification: Template Primitive Composition

> **Historical record.** Hybrid defaults and the placement path were replaced by spec 006. Current template behavior: `.agents/skills/sheet-templates/SKILL.md`.

**Feature Branch**: `005-template-primitive-composition`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description (from review session): "Перестроиться на более гибкую структуру: оперировать полями (примитивами), а не стандартными секциями. Возможность добавлять TraitRow / TraitRowWithInput / CustomTraitList и из них составлять блоки. Благодаря этому можно собрать такого же персонажа, но без Силы (всё ещё с Волей) и с другими скиллами. Аналогично с brief — не полная интеграция brief как отдельного поля, а возможность делать поля в brief формате. Цвета секций — автоматически primary -> secondary по чётности элемента." — with five alignment decisions recorded in Clarifications.

## Scope Note

Feature 004 made every page template-backed; its "ready-made block" placements (opaque page
parts) proved the mechanism but not the flexibility. This feature replaces opaque composition
with **document-bound primitives**: the template author composes pages from the same building
blocks the application's own pages use (trait rows, custom trait lists, resources, condition
tracks, identity fields), each bound to a specific piece of document data. The bar: a user can
compose a page identical to today's built-in character page — or a variant of it (no Force
section, still with Willpower; a custom selection of skills) — entirely from primitives.

## Clarifications

### Session 2026-09-05 (review alignment)

- Q: What is the unit binding a primitive to document data? → A: A closed per-system set of binding keys (like catalog bindings) — the template stores a key; the system owns the mapping key → data, labels, and limits.
- Q: Which primitives form the starting set? → A: Core set — trait row (plain), trait row with input/specialization, custom trait list, resource, condition track, document identity field. All presentation-configurable (labels; for condition tracks also level count and per-level names).
- Q: How does a template choose which traits appear? → A: A primitive binds to one specific trait of a profile group (e.g. "abilities.Athletics"); groups define labels/limits, the template composes rows in any composition and order.
- Q: How are brief-format fields expressed? → A: A `compact` presentation flag on the primitive — same binding, compact rendering.
- Q: What happens to the feature-004 built-in block placements? → A: Kept temporarily for reference but unused — no shipped template/view references them; the legacy render path stays functional until the user confirms the primitive-built pages look right, after which the legacy blocks and placements are deleted.

### Session 2026-09-05 (pre-plan review, second pass)

- Q: Full parity for every page in one step, or phased? → A: Phased (B) — the core primitive set lands first; Force powers, merits/flaws, and equipment-with-catalogs primitives are the explicitly planned second phase inside the same direction, started only after the user confirms the first phase is on the right track. Until then the affected default templates are hybrid: primitives where covered, legacy placements for the not-yet-covered parts (Force, advantages, inventory).
- Q: Can a template introduce a new default trait (e.g. an "Occultism" skill)? → A: Not as a profile trait (profile stays system-owned), but a custom-trait-list primitive MAY carry preset entries — author-defined starting entries (label, optional default value) that seed the list, behaving exactly like user-created entries afterwards (editable, removable).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Compose pages from document-bound primitives (Priority: P1)

A template author opens the template editor and, alongside the existing declarative fields and
tables, adds **document-bound primitives**: a trait row bound to a specific trait (e.g.
Strength), a trait row with input/specialization, a custom trait list (e.g. custom talents), a
resource, a condition track, or a document identity field. Each primitive shows the available
binding choices for the template's game setup and document type as human-readable names; the
author can override the displayed label; a condition track primitive lets the author set how
many levels it has and what each level is called (sensible defaults come from the system). On
the character page, each primitive edits the document data it is bound to — exactly as the
built-in page does — and everything persists.

**Why this priority**: nothing else exists until primitives can be placed, bound, rendered, and
edited. This is the foundation the rest of the feature composes.

**Independent Test**: Create a template with a trait row (Strength), a resource, a condition
track, and a custom trait list; assign it to a character; edit each; verify values land in the
document's own data and survive reload/restart.

**Acceptance Scenarios**:

1. **Given** the template editor, **When** the author adds a primitive, **Then** a picker shows
   the available binding keys for the template's setup and document type, grouped and named in
   the user's language — and the chosen primitive displays what it is bound to.
2. **Given** a page with a trait row bound to Strength, **When** the user adjusts it, **Then**
   the same value changes everywhere the Strength trait is shown (including built-in-style
   pages), and persists across reload and application restart.
3. **Given** a condition track primitive, **When** the author sets a level count and per-level
   names (or accepts the system defaults), **Then** the character page renders exactly that
   track and marking levels updates the document's condition data.
4. **Given** a label override on any primitive, **When** the page renders, **Then** the
   overridden label is shown; the system's original label is used when no override is set.
5. **Given** a primitive bound to a key unknown to the current setup (e.g. imported from
   elsewhere), **When** the page renders, **Then** it degrades to a clearly-labeled placeholder
   with a notice, the rest of the page works, and no document data is affected.

---

### User Story 2 - Built-in pages rebuilt from primitives (Priority: P2)

A player's existing pages — the main character full sheet, droid, creature, vehicle, fodder
group, and their brief forms — are now defined as templates composed of primitives, rendering
identically to the previous built-in pages. Because composition is free, the player can derive a
variant: the same character page without the Force section but still with Willpower, or with a
different selection of skills, simply by composing different primitives.

**Why this priority**: this is the payoff — pages become truly composable — and it validates the
primitive set against real parity.

**Independent Test**: Assign the rebuilt default templates and compare content and behavior with
the previous built-in pages; then compose the "no Force, with Willpower, custom skills" variant
and verify it works with real document data.

**Acceptance Scenarios**:

1. **Given** any current page (full character, droid, creature, vehicle, fodder, brief), **When**
   its rebuilt default template renders, **Then** every interactive capability of the previous
   built-in page is present and functional, with no capability missing.
2. **Given** the editor, **When** the author omits the Force-related primitives but keeps a
   Willpower resource and selects a custom set of skill rows, **Then** the resulting page works
   against the same character — Willpower shows its (derived) value, omitted traits simply do
   not appear, and nothing else breaks.
3. **Given** a page mixing primitives, declarative fields, and tables, **When** the user edits
   all of them, **Then** primitives write document data, fields/tables write the shared value
   store, and both persist independently.
4. **Given** traits, resources, or tracks not included in the active page, **When** the template
   changes or the page is switched, **Then** the document data for them remains intact
   (schema-owned data is never deleted by template edits).
5. **Given** any page, **When** rendered, **Then** section/block accent colors follow the
   automatic primary → secondary alternation by element parity — no manual accent control.

---

### User Story 3 - Brief-format fields via compact presentation (Priority: P2)

An author building a brief card does not embed a monolithic "brief" page part; they compose the
card from the same primitives with **compact presentation** — the same bindings, the compact
rendering (compact trait ratings, compact text fields, compact condition track).

**Why this priority**: proves the primitive set covers both page densities with one binding
model, replacing the brief page part entirely.

**Independent Test**: Compose a brief card from compact primitives bound to the same traits as
the full page; verify values stay in sync between a full page and the brief card.

**Acceptance Scenarios**:

1. **Given** a primitive with compact presentation, **When** the page renders, **Then** it uses
   the compact rendering of the same bound data.
2. **Given** a full page and a brief card bound to the same traits, **When** a value is edited on
   one, **Then** the other reflects it immediately (one value, two presentations).

---

### User Story 4 - Legacy page parts demoted to reference, deleted on confirmation (Priority: P3)

The feature-004 ready-made block placements stop being used for composition except where a
default template still requires them under phased parity (Force, advantages, inventory until the
second primitive phase). The legacy block components and the placement rendering path remain as
the parity reference; as primitives cover their content, they are removed phase by phase — with
final deletion gated on the user's confirmation that everything looks and behaves right.

**Why this priority**: a deliberate retirement gate, not new capability; it protects parity
(review possible against the reference) while making the direction one-way.

**Independent Test**: Verify no shipped template uses legacy placements beyond the documented
hybrid parts, the editor offers no legacy placements for covered content, and templates saved
before this feature still render through the legacy path until cleanup.

**Acceptance Scenarios**:

1. **Given** the template editor, **When** the author adds blocks, **Then** legacy ready-made
   block placements are not offered for content the primitives already cover.
2. **Given** a template saved before this feature that contains legacy placements, **When** it
   renders, **Then** it still works through the retained legacy rendering path (no data loss, no
   crash).
3. **Given** the application code, **When** the user confirms parity (phase by phase), **Then**
   the covered legacy blocks and placements are removed in a single follow-up cleanup (explicit
   gate, not automatic).

---

### Edge Cases

- **Unknown binding key** (import, or setup without that binding): placeholder + notice naming
  the binding; rest of the page works; document data untouched.
- **Binding key valid for another document type**: treated as unavailable for the template's
  type (the same kind-scoping rule as feature 004) — degraded, never rendered with wrong data.
- **Condition track overrides**: level count and names are validated against the system's
  supported ranges; an invalid override falls back to the system defaults with an actionable
  message in the editor.
- **Duplicate bindings**: two primitives bound to the same key on one page both render and edit
  the same data (one value, two presentations); allowed and predictable.
- **Derived values**: a resource whose value is derived (e.g. Willpower from virtues) shows the
  derived value when its source primitives are omitted; derived calculations never depend on
  template composition.
- **Label overrides are presentation-only**: overriding a label never changes stored data keys,
  derived calculations, or other pages showing the same trait.
- **Legacy placements in old saved templates**: render through the retained legacy path until
  the cleanup gate; never crash, never lose data.
- **Read-only viewing contexts**: every primitive renders fully but is not editable, consistent
  with existing read-only behavior.
- **Localization and accessibility**: all editor and page strings ship in English and Russian
  through the translation pipeline; primitives meet the accessibility floor (labeled controls,
  keyboard operability, announced errors).

## Requirements _(mandatory)_

### Functional Requirements

**Binding model**

- **FR-1**: The system MUST expose a closed, per-setup set of document binding keys — each
  declaring its data kind (trait / custom list / resource / condition track / identity field),
  default label, and value limits. Templates store only binding keys; the setup owns the mapping
  from key to data.
- **FR-2**: A primitive MUST bind to exactly one binding key. Trait-row primitives bind to one
  specific trait of a profile group; custom-trait-list primitives bind to one list; resource and
  condition track primitives bind to their respective data addresses.
- **FR-3**: A primitive bound to a key unavailable for the template's setup or document type
  MUST degrade to a clearly-labeled placeholder with a notice identifying the binding; the rest
  of the page and all document data MUST be unaffected.
- **FR-4**: Template compatibility rules carry over unchanged (owning setup + document kind).

**Primitive set (core)**

- **FR-5**: Template authoring MUST support the core primitive set: trait row (plain), trait row
  with input and specialization, custom trait list, resource, condition track, and document
  identity field — placeable in any section, in any composition and order, alongside existing
  declarative fields and tables.
- **FR-6**: Each primitive MUST support a label override (presentation-only). Condition track
  primitives MUST additionally let the author set the number of levels and each level's name,
  with the system's defaults offered as the starting point and overrides validated against the
  system's supported ranges.
- **FR-7**: Every primitive MUST support a compact presentation flag rendering the brief-format
  variant of the same bound data.
- **FR-8**: Primitives MUST operate on the document's own data through the same paths the
  built-in pages use — never on the template value bag. Declarative fields/tables continue to
  use the shared value store. Mixed pages MUST persist both mechanisms independently.
- **FR-9**: Accent colors MUST be automatic (primary → secondary alternation by element parity);
  the template author MUST NOT set accents manually.

**Pages rebuilt; legacy demotion**

- **FR-10 (phased parity)**: Pages whose content the core primitive set covers (identity,
  attributes, skills, custom lists, condition tracks, resources — and their brief forms) MUST be
  provided as default templates composed from primitives, rendering with parity to the previous
  built-in page. Pages with not-yet-covered parts (Force powers, merits/flaws, equipment with
  catalogs) are hybrid until the second primitive phase: primitives where covered, retained
  legacy placements for the rest. The second phase (Force-list, merits/flaws, equipment
  primitives) is the planned continuation, started after the user confirms phase-one parity.
- **FR-11**: The editor MUST NOT offer legacy ready-made block placements for composition
  **except** where a default template still requires them under phased parity; no other shipped
  template or view MUST reference them.
- **FR-12**: The legacy placement rendering path and block components MUST be retained as the
  parity reference and for the hybrid pages of FR-10; they are removed phase by phase as
  primitives cover their content, with final deletion gated on user confirmation — never
  automatic.
- **FR-13**: Editing, saving, resetting, and switching pages MUST NOT destroy document data:
  traits/resources/tracks not addressed by the active page remain in the document's own data
  (schema-owned), and derived calculations never depend on template composition.
- **FR-16 (preset entries)**: A custom-trait-list primitive MAY carry author-defined preset
  entries (label, optional default value). A document using the template MUST see the presets as
  ordinary entries of that list — fully editable and removable, indistinguishable from
  user-created entries afterwards. Presets MUST NOT participate in system derived calculations
  beyond what ordinary list entries do, and MUST NOT write into the document until the document
  actually uses the template.

**Cross-cutting**

- **FR-14**: All user-visible strings of this feature MUST be provided in English and Russian
  through the application's translation pipeline.
- **FR-15**: All new editing and rendering surfaces MUST meet the application's accessibility
  floor: keyboard operability, labeled controls, announced error messages.

### Key Entities _(include if feature involves data)_

- **Binding Key**: the closed per-setup address of one piece of document data — id, data kind
  (trait / custom list / resource / condition track / identity field), default label, value
  limits. Declared by the setup; referenced by templates; never stored as data copies.
- **Document Primitive**: a template block bound to one binding key — with label override,
  optional compact presentation, and (condition tracks) level count + per-level name overrides.
- **Primitive Placement**: the primitive's position in a section's ordered composition; accent
  color is derived from parity, never stored.
- **Default Template**: as feature 004 (identity = view id, editable via override, resettable) —
  now composed from primitives.
- **Legacy Placement**: a feature-004 ready-made block placement; retained for reference and
  backward compatibility of old saved templates, excluded from authoring and shipped templates.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A template composed of the same primitives as the main character page offers 100%
  of that page's content and interactive capabilities (full and brief forms).
- **SC-002**: A user can build the variant "same character without Force, still with Willpower,
  custom skill selection" in under 10 minutes without external documentation.
- **SC-003**: 100% of edits made through primitives land in the document's own data and persist
  across reload, restart, and page/template switching, with zero data loss for omitted traits.
- **SC-004**: A full page and a brief card bound to the same traits show identical values at all
  times (one value, two presentations) — 0 desynchronization.
- **SC-005**: 100% of unavailable or foreign-type bindings degrade to labeled placeholders with
  zero crashes and zero document data changes.
- **SC-006**: No shipped template or view references legacy placements beyond the documented
  hybrid parts; 100% of pre-feature templates containing them keep rendering through the
  retained legacy path.

## Assumptions

- **Single owner of bindings**: the game setup (system profile) declares binding keys, labels,
  and limits; templates reference them. A new setup (the earlier-deferred epic) declares its own
  keys — no cross-system conditionals.
- **Values stay schema-owned**: primitives read/write document data through existing capability
  paths; the template value bag remains only for declarative fields/tables. Label overrides and
  track overrides never alter stored keys or derived calculations.
- **Derived values are computation, not composition**: Willpower-like derived resources remain
  available even when their source sections are omitted from a page.
- **Presets are list entries, not profile traits**: a preset "Occultism" behaves like any
  user-created custom-list entry (editable label/value, removable); it does not become a
  system-profile skill and does not enter derived calculations beyond ordinary list entries.
- **No data-model unification of the two trait worlds**: profile traits (keyed maps) and custom
  lists (arrays) remain separate data shapes — unifying them would be a breaking schema rework
  (every block, integration, and migration touched) for no user-visible gain, since primitive
  composition already renders both worlds identically as placeable rows. If unification is ever
  needed, the cheaper direction is generalizing the FR-16 preset mechanism: the system profile
  becomes the system-owned preset set seeded into document-owned trait collections.
- **Hybrid interim**: under phased parity the default full-sheet template mixes primitives with
  retained legacy placements for Force/advantages/inventory until the second primitive phase;
  this is the only sanctioned use of legacy placements.
- **Cleanup is user-gated**: legacy blocks and the placement path are deleted only after the
  user confirms parity; the confirmation is a deliberate follow-up step, tracked in the backlog.
- **Local-first and persistence conventions** carry over unchanged (no document-envelope format
  change; template schema gains additive primitive block types).
- **Localization split**: user-facing strings ship in English and Russian via the existing
  translation pipeline; this specification and all repository working documents are English-only.
