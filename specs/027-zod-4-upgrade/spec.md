# Feature Specification: Zod 4 Upgrade

**Branch**: `027-zod-4-upgrade` | **Created**: 2026-10-08 | **Status**: Draft

**Input**: "Spec 027: Zod 4 upgrade (T-088, first of the remaining majors; then TypeScript 7 and
Tailwind 4 as separate specs). Migrate zod ^3.24 -> 4.x across every schema and error API use, with
yarn verify:full green; persisted/imported documents must still load (store hydration, import
envelope, template schemas)."

## Context

Spec 026 moved most dependencies to current majors; Zod (3.25, latest 4.x), TypeScript 7 and
Tailwind 4 remain in [T-088](../../TODO.md). Each goes in its own spec, Zod first because nothing
blocks it (TypeScript 7 waits on typescript-eslint support). Zod validates every persisted
character, imported document, template, user document type, and catalog, so the risk is not
compilation but silently changed validation: a document that loaded yesterday must load tomorrow,
and a bad one must still be rejected with a message the user can act on. Zustand is already on 5 and
is not part of this work.

## Clarifications

### Session 2026-10-08

- Q: If Zod 4 changes a validation message, must wording stay verbatim or only the path and cause? →
  A: Path and cause only; wording may differ, and the maintainer reviews the list of changed
  messages.

## User Scenarios & Testing

### User Story 1 - Existing data keeps loading (Priority: P1)

A player opens the sheet after the upgrade. Their stored characters, templates, and user document
types hydrate exactly as before, and imported files from earlier versions are accepted or rejected
the same way.

**Why this priority**: Data loss or a wrongly rejected character is the one failure that matters.

**Independent Test**: Run the store hydration, migration, and import tests plus fixtures captured
before the upgrade; compare accepted/rejected outcomes and parsed values.

**Acceptance Scenarios**:

1. **Given** a character, template, or user type saved by the current release, **When** the app
   loads it with the new validation library, **Then** it parses to the same value as before.
2. **Given** a legacy character import with unknown fields, **When** it is imported, **Then**
   unknown fields are stripped and known ones are kept, as today.
3. **Given** a malformed or tampered import, **When** it is imported, **Then** it is rejected and
   nothing is written to the store.
4. **Given** defaults and optional fields omitted in stored data, **When** it is parsed, **Then**
   the same defaults are filled in.

---

### User Story 2 - Errors stay readable (Priority: P1)

A template author saves an invalid template, or a user imports a bad file. They see the same kind of
located, understandable problem list as before (path and reason), in English and Russian.

**Why this priority**: The editor's save check and import dialog present validation issues directly.

**Independent Test**: Existing editor issue tests and import-error tests pass with unchanged
expected messages or paths, or with deliberate, reviewed changes.

**Acceptance Scenarios**:

1. **Given** a template with a schema error at a nested node, **When** it is saved, **Then** the
   issue list names the same node path and the same cause (wording may differ).
2. **Given** an invalid catalog entry, **When** `yarn validate:data` runs, **Then** it fails with
   the entry and field identified.

---

### User Story 3 - Dependency is current and the toolchain is green (Priority: P2)

A maintainer sees Zod on its current major, with no deprecated-API usage left, and the whole
verification suite green.

**Why this priority**: Completes the Zod part of T-088 and unblocks later work on a supported API.

**Independent Test**: `yarn verify:full` passes; `yarn outdated` lists no Zod entry; a search finds
no removed or deprecated Zod 3 calls.

**Acceptance Scenarios**:

1. **Given** the upgrade is merged, **When** `yarn verify:full` runs, **Then** every check passes.
2. **Given** the production build, **When** its bundle size is compared with the pre-upgrade build,
   **Then** the sheet route does not grow noticeably.

### Edge Cases

- Strictness differences (unknown keys, number and string coercion, empty strings, `NaN`, infinity):
  behavior must match today's, or the difference is listed in the change record and covered by a
  test.
- Default values applied to missing versus `undefined` versus `null`: stored data written by older
  releases must still hydrate with the same result.
- Recursive and discriminated schemas (template tree, elements): parse results and error paths for
  deep nodes must stay equivalent.
- Types inferred from schemas: public TypeScript types of documents, templates, and system plugins
  must not change shape for consumers.
- Generated or user-supplied schemas (user document types and catalogs registered at runtime): they
  must keep validating the same documents.

## Requirements

### Functional Requirements

- **FR-001**: The project MUST depend on the current Zod major and no code MUST use APIs removed by
  it; deprecated APIs MUST be replaced where a supported equivalent exists.
- **FR-002**: Every schema that validates persisted, imported, template, system, or catalog data
  MUST accept and reject the same inputs as before, except for differences listed in the change
  record with a test.
- **FR-003**: Parsed output (defaults, stripped unknown keys, transforms) MUST equal pre-upgrade
  output on a fixture set captured before the migration.
- **FR-004**: Validation issues shown to users (template save check, import errors, catalog
  validation) MUST keep identifying the location and cause of each problem; wording may change, and
  tests assert path and cause, not message text.
- **FR-005**: Exported TypeScript types derived from schemas MUST remain assignable in both
  directions with their pre-upgrade shape, checked by type tests or the full type check.
- **FR-006**: The migration MUST land in steps that each keep the checks green, so any step can be
  reverted alone.
- **FR-007**: Module guidance and skills that describe Zod behavior or error handling MUST be
  updated to the new API; the T-088 backlog entry MUST be updated to show Zod done.
- **FR-008**: No change to stored data format or version is allowed; existing data needs no
  migration step.

### Key Entities

- **Document / character envelope**: persisted and imported container validated on load and import.
- **Template**: tree of pages and elements validated on save, import, and shipped-template checks.
- **User document type and catalog**: runtime-registered definitions validated before registration.
- **System plugin definition and catalog entries**: build-time data validated by `validate:data`.

## Success Criteria

- **SC-001**: 100% of pre-upgrade fixtures (characters, templates, user types, catalogs) parse to
  the same value after the upgrade.
- **SC-002**: `yarn verify:full` passes with no test removed or weakened to make it pass.
- **SC-003**: Zero uses of removed or deprecated Zod APIs remain in `src`, `scripts`, and `tests`.
- **SC-004**: The sheet route's downloaded JavaScript grows by no more than 2% against the
  pre-upgrade build.
- **SC-005**: Every user-facing validation message changed by the upgrade is listed with its reason;
  the list is empty or reviewed by the maintainer.

## Assumptions

- Zod is the only package upgraded here; TypeScript 7 and Tailwind 4 get separate specs after this,
  and `@types/node` stays out of scope as in spec 026.
- The upgrade targets the latest stable 4.x line, using its native API rather than a long-term
  compatibility layer.
- Fixtures are captured from the current code before any migration step and kept as tests.
- No stored-data format change is wanted; if an incompatibility cannot be hidden in the schema, the
  maintainer decides before it ships.
- This is a regular spec rather than a small change because it touches schema and persistence
  validation across modules.
