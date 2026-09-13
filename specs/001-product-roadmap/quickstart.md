# Quickstart: TTRPG Product Roadmap

**Feature**: 001-product-roadmap | **Date**: 2026-09-02

Manual validation scenarios proving the feature end-to-end. No build or test command is involved: the deliverable is `ROADMAP.md` plus `TODO.md` adjustments. Run these after implementation (and whenever auditing, per SC-004's quarterly rhythm).

## Prerequisites

- Repository checkout with the feature branch merged or checked out.
- `ROADMAP.md` exists at the repo root; `TODO.md` is present.

## Scenario 1 — Coverage audit (SC-001)

1. Open `ROADMAP.md`.
2. Check the overview table: exactly 13 rows, one per enumerated path, each with slug, name, status, and priority.
3. Confirm statuses only use the vocabulary: `done`, `in progress`, `not started`, `shipped`, `declined`, `superseded`.

**Expected**: 13/13 paths present; audit completes in under 5 minutes; no out-of-vocabulary status.

## Scenario 2 — Planning session starts from one entry (SC-003)

1. Pick any path entry (e.g. `campaigns`).
2. From the entry alone, confirm you can answer: what it covers (scope), who uses it (users), what it depends on (dependencies), what is undecided (open questions).

**Expected**: zero re-elicitation needed; scope, users, dependencies, and open questions all present in the entry (FR-011).

## Scenario 3 — Truthfulness spot-check (SC-004)

1. Find every `done` status in `ROADMAP.md`.
2. For each, verify the capability is usable in the product today (e.g. `offline-support`: the product runs fully offline; the only optional network capability is Discord delivery).
3. Find every `in progress` status; verify the entry lists its remaining gaps (e.g. `core-book-docs`: one system written, validation and real-player testing pending).

**Expected**: 100% of `done` claims correspond to working capabilities; 100% of `in progress` entries list remaining gaps.

## Scenario 4 — No duplication between ROADMAP.md and TODO.md (FR-006, FR-013)

1. Search `TODO.md` for any path scope text: entries may reference slugs (e.g. `core-book-docs`) but must not restate path scope, status, or dependencies.
2. Search `ROADMAP.md` for task-level execution detail: it must not absorb TODO task content.

**Expected**: ownership split holds — path intent lives only in `ROADMAP.md`; executable tasks live only in `TODO.md`.

## Scenario 5 — Non-technical readability and language (FR-007, FR-015)

1. Read the overview table and two path entries as a non-technical party member would.
2. Confirm the document is English-only and jargon is avoided or explained inline.

**Expected**: the reader can explain what the product is and what is planned without help; no Russian mirror of the roadmap exists anywhere in the repository.

## Scenario 6 — Formatting hygiene (Constitution IV)

```bash
yarn format:check
```

**Expected**: Prettier reports no issues for `ROADMAP.md` (and the edited `TODO.md`).

## Related artifacts

- Entity fields and transition rules: [data-model.md](./data-model.md)
- Structure, encoding, and slug decisions: [research.md](./research.md)
