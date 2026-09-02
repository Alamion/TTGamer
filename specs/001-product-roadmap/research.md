# Research: TTRPG Product Roadmap

**Feature**: 001-product-roadmap | **Date**: 2026-09-02

All unknowns for this feature are resolvable from repository evidence (existing root files, spec clarifications, constitution v1.1.0). No external research or subagent dispatch was required; each decision below cites the local evidence it derives from.

## D1 — File location and name

**Decision**: `ROADMAP.md` at the repository root.

**Rationale**: The roadmap is a standing, contributor-facing intent document. Root placement groups it with the other standing repo artifacts (`README.md`, `AGENTS.md`, `TODO.md`, `TOFIX.md`) and keeps it out of the `docs/` module, which would drag it into the docs i18n parity flow (`validate:i18n`) that FR-015 explicitly excludes. Spec Assumption 1 delegates this decision to planning; this is that decision.

**Alternatives considered**:

- `TODO.md` itself becomes the roadmap — rejected: merges two vocabularies (paths vs. executable tasks) in one file, contradicts the FR-013 ownership split, and complicates the future backlog-format feature.
- `docs/roadmap.md` — rejected: end-user-facing module + i18n parity expectations; wrong audience and wrong language policy.
- `specs/roadmap.md` — rejected: `specs/` holds per-feature lifecycle artifacts; the roadmap is a living standing document.
- `.specify/memory/` — rejected: that directory is spec-kit tooling memory (constitution), not product intent.

## D2 — Document structure

**Decision**: Overview table up top, one section per path below.

- Overview table columns: Slug | Path | Status | Priority — gives a 5-minute coverage audit (SC-001).
- One `### <slug> — <Name>` section per path with a fixed field list: Status, Priority, Users, Depends on, Scope, Open questions, Progress notes.
- A short header note states the document's role and the `TODO.md` relationship (task queue references slugs; scope lives only here).

**Rationale**: The spec requires both auditability (SC-001) and planning depth (FR-011, SC-003). A table alone cannot hold readable scope summaries; sections alone make coverage audits slow. Field list mirrors the `Roadmap Path` entity in the spec's Key Entities.

**Alternatives considered**:

- Single wide table with scope text in cells — rejected: unreadable for multi-sentence scope, hard to diff in review.
- Sections only, no table — rejected: SC-001's "verify 100% coverage in under 5 minutes" becomes manual page-scanning.

## D3 — Status and priority encoding

**Decision**: Plain text fields. `Status: done | in progress | not started`; closed outcomes `Status: shipped | declined | superseded (by <slug> / reason)`. Priority is an integer `Priority: <n>` reflecting the owner's indicative order, refined by dependencies.

**Rationale**: One canonical text form per status, greppable and future-validator-friendly. Project history shows multi-encoding drift (three live encodings of "in progress" in `TODO.md` across commits) — the roadmap must not repeat that. No emoji and no checkbox syntax: those belong to queue files, not to the intent document.

**Alternatives considered**:

- Checkbox `- [x]` encoding — rejected: duplicates the queue-file convention and invites the same drift.
- Emoji legend — rejected: decorative status with no single canonical form; the `TOFIX.md` "Version: 3.0.0" fossil shows self-declared format labels do not prevent drift.
- No explicit priority field — rejected: the Key Entities define "indicative priority" as an attribute of Roadmap Path.

## D4 — Slug registry (FR-014)

**Decision**: Thirteen stable kebab-case slugs, assigned once:

| #   | Path                                                   | Slug                      |
| --- | ------------------------------------------------------ | ------------------------- |
| 1   | Multi-system character sheets                          | `multi-system-sheets`     |
| 2   | Interactive step-by-step character creation            | `character-creation-flow` |
| 3   | Per-system core-book documentation                     | `core-book-docs`          |
| 4   | GM notes for non-character entities + template builder | `gm-notes-templates`      |
| 5   | Full offline support                                   | `offline-support`         |
| 6   | App packaging / distribution                           | `app-packaging`           |
| 7   | Hierarchical (recursive folder) note structure         | `note-tree`               |
| 8   | Campaigns as note sets with archive export/import      | `campaigns`               |
| 9   | Map note entities (canvas, images, drawing, links)     | `map-notes`               |
| 10  | Multi-note showcase on one page                        | `note-showcase`           |
| 11  | Multiplayer groups (GM/party permissions)              | `multiplayer-groups`      |
| 12  | Online forum (discussions, votes, announcements)       | `online-forum`            |
| 13  | LLM integrations                                       | `llm-integrations`        |

**Rationale**: Kebab-case matches repo naming conventions and is readable in commit messages and TODO references. Numbers 1–13 are recorded as priority only (FR-014: enumeration MUST NOT be an identifier).

**Alternatives considered**: Numeric IDs (`P01`…) — rejected: freezes the enumeration the spec explicitly keeps indicative; collides mentally with feature-branch numbers (`specs/NNN-*`).

## D5 — Dependencies and open questions (initial content)

**Decision**: Initial dependency/open-question graph derived from the owner's original enumeration and the spec's acceptance scenarios:

- `campaigns` depends on `note-tree`; open question: archive format and what exactly a campaign bundles.
- `multiplayer-groups` depends on `campaigns` (and transitively `note-tree`).
- `map-notes` relates to `note-tree` (points/links between notes); direction of dependency stated in both entries, scope not duplicated (spec Edge Case 1).
- `app-packaging` open question: automated multi-platform package builds (`.exe`/`.apk`/`.deb`) versus an alternative distribution route.
- `llm-integrations` lists four separately plannable sub-capabilities (FR-009): note/image generation, dice-rolling support, LLM-driven story narration, LLM-as-player.
- `offline-support`: done — the only optional network capability is the external Discord delivery integration.
- `core-book-docs`: in progress — one system written (Star Wars WEG/WoD 2e), validation and real-player testing pending.

**Rationale**: Source of truth is the spec's Input paragraph and its acceptance scenarios (FR-004, FR-008, FR-009); the roadmap writes these down instead of re-deriving them.

## D6 — TODO.md migration approach (FR-013)

**Decision**: No TODO entry is copied into `ROADMAP.md`. The roadmap's scope summaries are authored from the spec's Input (path-level intent). Then `TODO.md` is edited so that:

- Entries whose content was path-level intent (e.g. "WoD (VtM 2e) System Docs") shrink to task-level lines referencing the path slug (e.g. `core-book-docs`).
- Task-level entries that support a path (e.g. "Database + Auth" as a prerequisite for `multiplayer-groups`/`online-forum`) remain tasks and gain a slug reference.
- No path scope, status, or dependency text remains duplicated across the two files.

**Rationale**: FR-013 requires migration, not copying, and forbids the roadmap from absorbing task-level detail. Authoring scope from the spec (single source) rather than lifting TODO prose avoids smuggling task vocabulary into the roadmap.

**Alternatives considered**: Leave TODO.md untouched this feature (Option C from clarification session) — rejected during clarify: accepted permanent duplication violating FR-006.

## D7 — No format-version header

**Decision**: `ROADMAP.md` carries no self-declared "Version" header. Changes are governed by the normal review flow (FR-010) and git history.

**Rationale**: `TOFIX.md`'s "Version: 3.0.0" header survived three format generations without ever tracking them — self-versioning a document without an amendment procedure is decoration. If automated format governance is wanted later, it belongs to the backlog-format feature's validator, not a markdown header.
