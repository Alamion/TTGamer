# Data Model: TTRPG Product Roadmap

**Feature**: 001-product-roadmap | **Date**: 2026-09-02

The data model below is realized as structured markdown in `ROADMAP.md` (see [research.md](./research.md) D2/D3 for the rendering). It is a document data model, not application state: there is no persistence layer beyond git and no runtime code.

## Entity: Roadmap Path

A planned product enhancement expressed as a business outcome.

| Field              | Type                      | Required           | Rules                                                                                                                                                                                                    |
| ------------------ | ------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`             | string (kebab-case)       | yes                | Stable identifier assigned at creation; unique across all paths; never reused for a different path; never renumbered (FR-014). Used by all cross-references (TODO tasks, future specs, commit messages). |
| `name`             | string (single line)      | yes                | Human-readable path name; may evolve over time without affecting `slug`.                                                                                                                                 |
| `status`           | enum                      | yes                | Exactly one per path (FR-002): `done`, `in progress`, `not started`, or a closed outcome: `shipped`, `declined`, `superseded` (FR-008).                                                                  |
| `priority`         | integer                   | yes                | The owner's indicative order (1–13); refined by real dependencies (FR-014: MUST NOT be used as an identifier).                                                                                           |
| `users`            | enum list                 | yes                | Intended users: `players`, `GMs`, or both (FR-003).                                                                                                                                                      |
| `scope`            | prose (multi-sentence)    | yes                | Plain-language summary: what becomes possible when done; jargon avoided or explained inline (FR-003, FR-007). MUST NOT name code modules, files, or layers (FR-012).                                     |
| `dependencies`     | list of slugs             | yes (may be empty) | Directional: a path cannot reasonably ship before its dependency. Stated in both affected entries; scope never duplicated between overlapping paths (FR-004, Edge Case 1).                               |
| `open_questions`   | list of prose items       | yes (may be empty) | Recorded undecided aspects (FR-004); e.g. packaging/distribution approach, campaign archive format.                                                                                                      |
| `sub_capabilities` | list of prose items       | conditional        | Required where one path bundles distinct capabilities (FR-009), e.g. `llm-integrations`; each must be independently plannable.                                                                           |
| `notes`            | list of dated prose items | optional           | Dated progress notes; significant scope revisions keep a dated note so history stays readable (Edge Case 2).                                                                                             |

### Uniqueness and identity rules

- `slug` is the sole identifier; `priority` and `name` are not identifiers (FR-014).
- Exactly one `status` per path at any time (FR-002).
- Slugs are assigned once through the review flow (FR-010) and live in the overview table and the section heading of each entry.

## Entity: Status (lifecycle)

Active states: `done`, `in progress`, `not started`. Closed outcomes: `shipped`, `declined`, `superseded`.

```text
not started ──▶ in progress ──▶ done
     │               │             │
     └───────────────┴─────────────┴──▶ shipped | declined | superseded (closed outcomes, terminal)
```

State transition rules:

- `done` requires the capability to be usable in the product today (FR-002, SC-004); status changes to `done` happen in the same review that ships the capability, never in a later cleanup (Story 3, Acceptance Scenario 1).
- `in progress` must carry an explicit list of remaining gaps; "mostly done" is not a legal value (Edge Case 3).
- Closed outcomes are terminal and keep the entry visible with an outcome record: `shipped`, `declined` (brief reason), or `superseded` (pointer to the replacing path) (FR-008). Closed entries are never silently deleted (Edge Case 4: new paths are added; replaced ones stay with outcome).

## Entity: Dependency

A directional relationship between two paths: `dependent ──depends on──▶ prerequisite`.

- Recorded as a slug list in each path entry (FR-004).
- Where two paths overlap, the relationship is stated in both entries; scope is never duplicated (Edge Case 1).
- Initial graph (from spec Input, see [research.md](./research.md) D5): `campaigns` → `note-tree`; `multiplayer-groups` → `campaigns`; `map-notes` ↔ relates to `note-tree`.

## Entity: Open Question

An undecided aspect of a path, kept with the path it affects.

- Fields: question text, affected path slug, resolution note (added when decided).
- Resolving an open question updates the entry through the normal review flow (FR-010); the packaging/distribution question is intentionally resolved later, inside `app-packaging` planning (spec Assumptions).

## Validation rules summary (traceability)

| Rule                                                                    | Source                      |
| ----------------------------------------------------------------------- | --------------------------- |
| Status vocabulary limited to the six values above                       | FR-002, FR-008, Edge Case 3 |
| Slug uniqueness, stability, no renumbering                              | FR-014                      |
| No code-module/file/layer names in any path entry                       | FR-012                      |
| No machine-readable facts owned elsewhere (versions, release summaries) | FR-006                      |
| Sub-capabilities listed separately where bundled                        | FR-009                      |
| Scope text lives only in `ROADMAP.md`; TODO.md references slugs         | FR-013                      |
| English-only content                                                    | FR-015                      |
| Status changes land in the same review as the work                      | FR-010, Story 3             |
