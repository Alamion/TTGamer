# Data Model: TODO/TOFIX Backlog Format Standardization

**Feature**: 002-todo-tofix-format | **Date**: 2026-09-02

The model below is realized as structured Markdown in two files, enforced by the backlog validator (see [contracts/backlog-format.md](./contracts/backlog-format.md) for the line grammar and violation codes).

## Entity: Task Entry (in `TODO.md`)

A unit of executable work in the product task queue.

| Field                                | Type                | Required | Rules                                                                                                                                                         |
| ------------------------------------ | ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | `T-###`             | yes      | Unique within the file; assigned once; never reused or renumbered (FR-001).                                                                                   |
| `name`                               | string, single line | yes      | Bold lead of the entry line; may evolve; the `id` never changes (Edge Case: renames).                                                                         |
| `status`                             | enum                | yes      | Exactly one of: `done`, `in progress`, `not started`, `declined`, `superseded`. Encoded only as the checkbox + emoji pair (FR-002; research D3).              |
| `area`                               | section group       | yes      | The `###` section the entry lives under (Major, Minor, Localization, LLM Support, Verification Backlog). Also the only carrier of priority ordering (FR-004). |
| `scope`                              | prose               | yes      | Plain language: what becomes possible and for whom; at least a clause on the entry line or its sub-bullets (FR-003).                                          |
| `dependencies`                       | prose               | yes      | Named dependencies or the literal "none" (FR-003).                                                                                                            |
| `effort`, `impact`, `open questions` | prose               | no       | Optional; their absence is never a violation and never a question trigger (FR-011).                                                                           |
| `path refs`                          | list of slugs       | no       | Roadmap slugs that must exist in `ROADMAP.md` (FR-005; dangling reference is a violation).                                                                    |

State transitions (task status): `not started → in progress → done`; any active state → `declined` / `superseded` (closed outcomes keep the entry visible with the reason in the body; a shipped task is `done` — there is no separate shipped state for tasks).

## Entity: Defect Entry (in `TOFIX.md`)

A known defect awaiting a fix outside any feature cycle.

| Field            | Type                | Required | Rules                                                                                                                                                          |
| ---------------- | ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `F-###`             | yes      | Unique within the file; never reused or renumbered (FR-001).                                                                                                   |
| `name`           | string, single line | yes      | The `### F-### — Name` heading text.                                                                                                                           |
| `severity`       | enum                | yes      | Carried exclusively by section membership: `Critical` / `High` / `Medium` / `Low` (FR-006; research D4). Moving a defect between sections re-orders the queue. |
| `area`           | prose               | yes      | Affected area/module-agnostic region of the product.                                                                                                           |
| `evidence`       | prose               | yes      | Observable symptom or concrete observation (FR-006).                                                                                                           |
| `recommendation` | prose               | yes      | Suggested direction for the fix (FR-006).                                                                                                                      |

Lifecycle: open until the fix ships → the entry is removed in the same review (FR-007). There is no status field; removal is the only exit.

## Entity: Entry Identifier

Short stable code (`T-###` / `F-###`), unique per file. The join key for commit messages, discussion, and audit (SC-004). Retired identifiers (merged/closed) are never reassigned; gaps are permanent.

## Entity: Status (task lifecycle vocabulary)

Borrowed from the roadmap vocabulary (feature 001): `done` / `in progress` / `not started`; closed outcomes `declined` / `superseded` (tasks that ship are `done`; `shipped` as a distinct value applies to roadmap paths, not tasks). Exactly one canonical encoding (research D3); mixed encodings are violations.

## Entity: Severity (defect queue weight)

`Critical` / `High` / `Medium` / `Low` — section membership only; orthogonal to task status; never overlaps the status vocabulary.

## Entity: Roadmap Path Reference

A one-way slug pointer from a backlog entry into `ROADMAP.md`. Rules: referenced slug must exist (dangling → violation); path scope text must never be restated (overlap → violation); the roadmap never references backlog identifiers.

## Violation model (enforced categories, FR-010)

| Code              | Category                              | Detection                                                                    |
| ----------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| `E-ID-DUP`        | duplicated identifier                 | same `T-###`/`F-###` twice in one file                                       |
| `E-ID-FMT`        | malformed identifier                  | entry without a well-formed id at its anchor                                 |
| `E-STATUS-VAL`    | unknown/missing status value          | emoji outside the legend, or missing pair                                    |
| `E-STATUS-AGREE`  | inconsistent status encoding          | checkbox/emoji disagreement, `[/]`, "(in progress)" suffix                   |
| `E-FIELD-MISSING` | missing required field                | task without scope/dependencies; defect without area/evidence/recommendation |
| `E-SECT-UNKNOWN`  | entry outside known grouping          | TODO entry outside any `###` area; TOFIX entry outside a severity section    |
| `E-SLUG-DANGLING` | roadmap reference to nonexistent slug | referenced slug absent from roadmap overview                                 |
| `E-SCOPE-OVERLAP` | path scope restated from roadmap      | ≥8-word normalized overlap with a roadmap scope sentence                     |

Each failure message names: file, entry identifier (or line), violated rule code, and the canonical form to use (FR-010).
