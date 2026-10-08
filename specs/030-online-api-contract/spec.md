# Feature Specification: Online API contract, first version

**Branch**: `030-online-api-contract` | **Created**: 2026-10-08 | **Status**: Draft

**Input**: "Spec 030: record the online mode / cloud space direction agreed with the backend
developer (ROADMAP `online-mode`, TODO T-012, T-105, T-106, T-107, T-016) and fix the first version
of the API contract process and content: a separate private OpenAPI contract repository both sides
propose changes to, conformance reports per side (frontend Zod 4 → JSON Schema vs contract),
envelope-only server validation with opaque document data, layered migrations, server-seeded shared
rolls (SHA-256 counter generator with test vectors), client-generated UUIDv7 ids, two spaces with
explicit moves, library dependencies on move, quotas, accounts cloud-only, minimal personal data."

## Context

A backend developer has started the cloud side of TTGamer on a separate stack (Go, ArangoDB, JWT
sessions, Docker on a VPS). The direction agreed on 2026-10-08 is recorded in ROADMAP `online-mode`
and in TODO T-012, T-105, T-106, T-107, and T-016: one library with a local space and a cloud space,
explicit moves instead of automatic sync, a trust boundary at "what other people see", quotas in the
cloud only. There is no written contract yet, so each side would guess what the other sends. This
spec fixes the first contract version and the process for changing it, and builds the frontend parts
that need no running server: the conformance report, the seeded roll generator, and ids created on
the device. The cloud space itself (T-012, moving documents, sign-in screens) is a later spec built
against this contract.

## Clarifications

### Session 2026-10-08

- Q: Is the first contract version written in this repository's spec folder and then moved, or
  straight into a private repository? → A: In this repository's spec folder. Whether a shared
  private repository will exist at all is open; each side may keep its own copy of the contract
  instead.
- Q: Which field naming style does the API use? → A: snake_case on the wire; the frontend keeps
  camelCase in its own storage and code and maps names at the API boundary.

## User Scenarios & Testing

### User Story 1 - A first contract both sides can review (Priority: P1)

The maintainer and the backend developer read one contract that says what the cloud API accepts and
returns: accounts and sessions, the two spaces and moves between them, library items and what a
record depends on, quotas and current usage, shared rolls, and errors. Each proposes changes to it
and sees who proposed what and why.

**Why this priority**: every other cloud task builds on it; without it both sides guess.

**Independent Test**: the contract passes an OpenAPI validator, and every decision in ROADMAP
`online-mode` (2026-10-08 note) maps to an operation, a model, or a stated rule in it.

**Acceptance Scenarios**:

1. **Given** the contract, **When** the backend developer reads the document operations, **Then**
   they find how a document is moved to the cloud, read, updated with a revision check, downloaded
   as a local copy, and deleted, with each response and error.
2. **Given** a record that uses a local-only template, **When** a client asks what moving it
   requires, **Then** the contract defines a response listing the library items it depends on and
   which of them the cloud already has.
3. **Given** a proposed change to a model, **When** it is made through the contract's review
   process, **Then** the history shows who proposed it, who approved it, and the contract version it
   lands in.
4. **Given** a user over their quota, **When** they upload, **Then** the contract defines a distinct
   quota error that carries current usage and the limit.

---

### User Story 2 - The frontend knows where it differs from the contract (Priority: P2)

A frontend developer runs one command and gets a report: which contract models the frontend's own
schemas match, which differ (field by field), and which the frontend does not implement yet, against
the contract version the frontend declares.

**Why this priority**: the maintainer asked to see what each side supports and where they differ;
the backend side gets the same from its own tooling.

**Independent Test**: change a field in a local copy of the contract; the report names that field as
a difference; restore it and the report is clean for that model.

**Acceptance Scenarios**:

1. **Given** the frontend's document envelope schema and the contract's envelope model, **When** the
   report runs, **Then** it lists each field as matching, differing (with both shapes), or present
   on one side only.
2. **Given** a contract model the frontend does not use yet, **When** the report runs, **Then** it
   is listed as not implemented, not as an error.
3. **Given** the report finds differences, **When** it runs in the checks, **Then** it prints them
   and does not fail the run (reported, not blocking, until the cloud space ships).

---

### User Story 3 - A shared roll anyone can recompute (Priority: P3)

A roll other people will see uses a seed the server issues after it has stored the notation. The
roller's client evaluates the roll from the seed; any other client given the notation and the seed
gets the same dice and the same total. Rolls for oneself work exactly as today.

**Why this priority**: it closes the forged-roll hole without the server reimplementing the dice
language, and both sides can test it today from shared test vectors.

**Independent Test**: evaluate each test vector's notation with its seed and compare the dice and
the total with the vector.

**Acceptance Scenarios**:

1. **Given** a seed and the notation `4d6!` (exploding), **When** two clients evaluate it, **Then**
   both get identical dice, explosions included, and the same total.
2. **Given** the published test vectors, **When** the frontend runs them, **Then** every draw and
   every roll result matches the vector exactly.
3. **Given** a roll for oneself, **When** the user rolls, **Then** no seed is involved and the
   result, history, and animation behave as before.

---

### User Story 4 - Documents keep their id when they move (Priority: P4)

A document, library item, or folder created on the device gets an id that the cloud accepts as is,
so moving it to the cloud keeps every reference to it.

**Why this priority**: moves (T-012) depend on it; it changes stored data, so it lands before the
cloud space rather than with it.

**Independent Test**: create a document and a user type offline; their ids are time-ordered UUIDs;
existing documents keep their ids and still open with their templates.

**Acceptance Scenarios**:

1. **Given** a new document, user type, setting, or catalog, **When** it is created, **Then** its id
   is a UUIDv7.
2. **Given** documents and library items saved before this change, **When** the app loads them,
   **Then** their ids and every reference between them are unchanged.

### Edge Cases

- A user's own value key or catalog field such as `strengthBonus` inside document data: it is
  content, not a contract field, so it crosses the API unchanged in both directions.
- A seed draw at the upper end: a draw is always below 1, so a die never shows a face above its
  size.
- Exploding dice without a limit: the evaluator's existing explosion cap bounds the draws; the draw
  counter continues across explosions and rerolls in evaluation order.
- A client meets a document whose `schemaVersion` is newer than it knows: it shows the document
  read-only and never writes it back.
- An id that is not a UUID (a built-in template id, an old fallback id): the contract states which
  ids must be UUIDs (user-created documents and library items) and which are fixed names (built-in
  systems, definitions, templates).

## Requirements

### Functional Requirements

**Contract process**

- **FR-001**: The contract MUST be one OpenAPI 3.1 document with a semantic version. Its first
  version MUST be written in this repository, outside the spec folder so it can keep changing after
  this spec merges; every change after review by both sides MUST be recorded with its author,
  approver, and the version it lands in. Whether it later moves to a shared private repository or
  each side keeps its own copy is left open; the process MUST work either way.
- **FR-002**: Each side MUST declare the contract version it implements; the backend MUST expose its
  version in an unauthenticated endpoint.
- **FR-003**: The frontend MUST keep its copy of the contract in this repository, with the version
  and, when it comes from elsewhere, the source it came from, so every build path works without
  access to another repository.
- **FR-004**: The frontend MUST provide a report of matching, differing, and unimplemented models
  between its schemas and its contract copy (US2), comparing names after the camelCase/snake_case
  mapping; it is reported, not blocking.

**Contract content**

- **FR-005**: The contract MUST describe the document envelope (id, kind, system, definition, schema
  version, metadata, template values) and treat document `data` as opaque JSON limited only by size;
  the server MUST NOT validate system-specific data.
- **FR-006**: The contract MUST describe moving a record to the cloud (id kept), reading, updating
  with a revision check that rejects a stale write, downloading as a local copy with a new id, and
  deleting.
- **FR-007**: The contract MUST describe library items (settings, rulesets' user types, templates,
  catalogs) the same way, and an operation that lists the library items a record depends on and
  which of them the cloud already has.
- **FR-008**: The contract MUST describe quotas in bytes (documents and images counted separately),
  a usage endpoint, and a distinct quota error carrying usage and limit.
- **FR-009**: The contract MUST describe accounts and sessions for the cloud space only: sign-up,
  sign-in, session refresh, sign-out, and account deletion; it MUST store only the personal data the
  cloud space needs, and responses MUST never contain password material.
- **FR-010**: The contract MUST describe shared rolls: the client submits the notation, the server
  stores it and then returns a roll id and a seed of at least 128 random bits; the stored roll keeps
  notation and seed so any client can recompute it.
- **FR-011**: The contract MUST fix the generator: draw `i` (from 0) is the first four bytes of
  SHA-256 over the UTF-8 text `seed + ":" + i`, read as a big-endian unsigned 32-bit integer and
  divided by 2^32; it MUST ship test vectors of draws and of whole rolls.
- **FR-012**: Every field the contract defines MUST be snake_case on the wire. The frontend MUST
  keep camelCase in storage and code and map names in one place at the API boundary; keys inside
  opaque content (document `data`, `templateValues` keys, catalog entries) MUST pass through
  unchanged.
- **FR-013**: Migrations MUST be split by layer: the server migrates its own structures (envelope
  fields, metadata, quotas, rights, API version); the client migrates document `data` by its
  `schemaVersion`; a client MUST show a document of a newer version read-only.
- **FR-014**: The contract MUST define error responses with a stable kind (validation, conflict,
  quota, unauthorized, forbidden, not found, rate limit) and no internal details.

**Frontend parts built now**

- **FR-015**: The dice evaluator MUST accept the seeded generator as its random source and reproduce
  every test vector exactly; local rolls MUST keep the current random source.
- **FR-016**: New user-created documents MUST get UUIDv7 ids, and new user types, settings, and
  catalogs MUST keep their `user-` prefixes with the 32 hex digits of a UUIDv7; existing ids and
  references MUST stay unchanged.
- **FR-017**: A shared roll record MUST carry the generator algorithm's id and the resulting dice,
  so a roll made before an evaluator change still displays and is recomputed only by clients that
  know its algorithm. Seeded rolls in this spec are 2D; 3D shared rolls are T-106's own work.

### Key Entities

- **Contract**: the versioned OpenAPI document; the single authority for the cloud API.
- **Space**: where a document lives — on this device or in the cloud; a document has one home.
- **Envelope**: the document's typed outer fields; the server's validation stops there.
- **Library item**: a setting, user type, template, or catalog a record may depend on.
- **Shared roll**: notation, seed, roll id, and owner; recomputed by every viewer.
- **Quota**: the byte limits of one account and its current usage.

## Success Criteria

- **SC-001**: Every decision in the ROADMAP `online-mode` 2026-10-08 note maps to a named operation,
  model, or rule of the contract, or is listed as deferred with its reason.
- **SC-002**: The backend developer reviews the first contract version and records approval or
  change requests on it within one review round.
- **SC-003**: Both sides reproduce 100% of the generator test vectors.
- **SC-004**: The frontend conformance report names a deliberately changed field in under a minute
  from running the command.
- **SC-005**: No stored document or library item changes its id, and all existing documents open
  with their templates after the id change (US4).
- **SC-006**: Local rolls, the 3D and 2D dice, and roll history behave as before (no test in the
  unit, perf, or browser runs changes its expectations).
- **SC-007**: A document sent to the cloud and read back is identical to the stored original,
  including every key inside its data (no name mapping leaks into content).

## Assumptions

- The first contract version covers one user's own spaces. Sharing with other users, published
  library versions, rooms, and the roll-sharing proxy (T-016) are named as later versions.
- A cloud document opened without a network is read-only from the local cache; offline edits sent
  later are out of scope.
- Existing document ids are `crypto.randomUUID()` values (UUIDv4); existing user type, setting, and
  catalog ids carry only 8 random hex digits. No stored id is rewritten: the contract accepts any
  UUID for documents and keys library items by owner plus id, so old short ids cannot collide across
  users.
- The backend's tooling for its conformance report (for example `oasdiff`) is the backend's choice;
  this spec builds only the frontend report.
- The browser computes SHA-256 synchronously through a small library, since the evaluator draws
  synchronously.
- Account management beyond deletion (data export, email verification) is listed in the contract as
  open, not specified.
- Moving documents, sign-in screens, the cloud tree, and quota UI belong to T-012's own spec.
