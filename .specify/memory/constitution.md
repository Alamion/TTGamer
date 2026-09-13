<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 -> 1.2.0 (amendment: observable degradation + current-state documentation)

Modified principles:
  III. Pleasurable Cross-Module Interactions — graceful degradation MUST also be observable
       (reported through the module's diagnostics channel; tests fail on unexpected reports)

Sections:
  Expanded: Governance — "Current-state documentation" rule (specs are change records; module
            AGENTS.md + .agents/skills hold current behavior; features close only when updated)

Runtime guidance updated: AGENTS.md (§9 Specs vs Current State), src/sheet_manager/AGENTS.md,
  .agents/skills/sheet-templates/SKILL.md (new), .agents/skills/sheet-manager/SKILL.md

Deferred TODOs: none
-->

# TTGamer Constitution

## Core Principles

### I. Modular Semi-Autonomy

Every feature is a self-contained module with a declared purpose, its own state, types,
tests, and an explicit public API surface. Rules:

- The named modules are: `dice_roller` (with `dice-logic` as its evaluation core),
  `sheet_manager`, `integrations/*`, `shared/*`, and documentation (`docs/` + `i18n/`).
- A module MUST NOT reach into another module's internals; it consumes only the public
  entry point the other module declares (e.g. `dice_roller/dice-logic/index.ts`).
- `shared/` MUST stay system- and feature-independent. Cross-feature or external-service
  behavior belongs in `integrations/`, never in shared utilities.
- New game systems integrate through explicit system boundaries (registries, schemas,
  adapters); adding a system MUST NOT introduce system conditionals inside shared or
  another module's code.
- Each module can be reasoned about, tested, and refactored without loading the whole
  application into context. If that stops being true, the boundary is broken.

Rationale: semi-autonomy is what lets modules evolve at different speeds without
cascading breakage.

### II. Explicit Contracts at Boundaries

Data and behavior crossing a module edge MUST pass through a validated, declared
contract. Rules:

- Imported or persisted character data MUST satisfy `BaseCharacterSchema` (Zod);
  unknown legacy fields are stripped, never silently trusted.
- Catalog and data integrity is enforced by `yarn validate:data`; documentation parity
  (en ↔ ru) by `yarn validate:i18n`; UI/catalog strings come from the YAML canonical
  sources via `yarn build:translations`. Generated `ttgamer.*` entries MUST NOT be
  hand-edited.
- Machine-readable facts have exactly one owner (version → `package.json`, release
  summaries → `CHANGELOG.md`, UI strings → `translations/source`). Prose MAY summarize
  but MUST NOT duplicate them as a second authority.
- Contract changes are breaking by default: they require updated tests on both sides
  of the boundary and a version/consumer check before merge.

Rationale: unvalidated edges are where autonomy decays into coupling.

### III. Pleasurable Cross-Module Interactions

Interactions between modules are designed experiences, not plumbing afterthoughts.
A cross-module interaction is pleasurable when it is seamless, reversible, forgiving,
and consistent. Rules:

- Cross-module handoffs (sheet stat → dice panel, docs notation → roll, Discord
  delivery) MUST be implemented as bounded adapters in `integrations/` and MUST NOT
  entangle module internals.
- Handoffs MUST preserve user context: the user arrives where the interaction makes
  sense, with prefilled state, and can back out without losing work.
- Failure MUST degrade gracefully: a blocked webhook, missing sheet, or unsupported
  notation yields a clear, actionable message — never a dead end, silent drop, or raw
  stack trace surfaced to the user.
- Degradation MUST be observable to developers: every fallback, rejected write, quarantine,
  or unresolved reference reports through the module's diagnostics channel (for
  `sheet_manager`, `diagnostics.ts`), and tests fail on unexpected reports. A silent
  fallback is a defect.
- New interactions MUST state which two modules they connect, which contract they rely
  on (Principle II), and what the user sees on success and on failure before merge.

Rationale: modules exist to serve flows; a technically clean boundary that produces a
clunky user flow has failed its purpose.

### IV. Fit-for-Purpose Code Quality

Quality bars are defined per module according to its purpose, not uniformly lowered to
the easiest standard. Universal floor (all modules): TypeScript strict mode with no
`any`, ESLint clean (React hooks + a11y rules), Prettier formatting, uncommon comments
reserved for non-obvious constraints, `interface` for object shapes and `type` for
unions. On top of the floor:

- `dice-logic` (evaluation core): pure, deterministic, side-effect-free; no UI, DOM, or
  store dependencies; limits and modifier order encoded as invariants.
- Stores (`Zustand`): single responsibility per store; persistence via the established
  localForage/IndexedDB middleware; no ad-hoc global mutable state.
- Adapters (`integrations/`): defensive against both sides; bounded queues with retry
  and backoff for side-effectful delivery; no fire-and-forget network calls.
- UI components: composition over configuration, `clsx` for conditional classes, Lucide
  for icons, Radix primitives where behavior is nontrivial.

Rationale: the dice evaluator and a tooltip have different stakes; the floor keeps the
codebase coherent while the additions keep critical logic trustworthy.

### V. Risk-Proportional Testing

Testing intensity MUST be proportional to a module's blast radius. Every module has a
testing standard; none is exempt. Rules:

- Pure logic (`dice-logic` lexer/parser/evaluator, evaluators, limits): exhaustive unit
  tests including edge cases, malformed input, and deterministic random-value
  consumption in tests.
- Schemas and persistence (`sheet_manager` types/store): round-trip, import (including
  legacy-field stripping), and migration integration tests.
- UI and stores: targeted component and store tests for user-visible flows (roll, edit,
  import/export, multi-character switching).
- Data, docs, and translations: validated by `yarn validate:data`, `yarn validate:i18n`,
  and `yarn build:translations` instead of hand-written tests.
- Cross-module adapters (`integrations/`): contract tests against the public APIs of
  both sides; a change on either side that breaks the contract MUST fail tests.
- Verification scope: small code edits run targeted tests plus `yarn verify:fast`;
  dice-logic or schema/persistence edits run the full test suite; config, dependency,
  route, generated-CSS, or documentation-path edits require `yarn verify:full`.

Rationale: testing effort spent uniformly is effort spent badly; the risk map keeps
critical paths airtight while keeping docs and UI changes cheap to verify.

### VI. Consistent, Accessible Experience

Users MUST experience one product, not N modules. All user-facing surfaces follow the
same design language and accessibility floor. Rules:

- Styling via Tailwind with the project palette variables; dark mode supported wherever
  the core UI supports it; icons from Lucide; complex widgets from Radix primitives.
- Accessibility floor: icon-only buttons carry `aria-label`, table headers carry
  `scope="col"`, collapsible sections expose `aria-expanded`, error messages use
  `role="alert"`, and all interactive elements are keyboard reachable.
- All user-visible strings are translatable: new UI strings go through the YAML
  canonical sources in `translations/source` and appear in both `en` and `ru`.
- Language split: Russian localization applies to user-facing surfaces only —
  application UI strings (via `translations/source`) and `docs/` locales (via
  Docusaurus i18n). Repository working documents — specifications, roadmap and
  backlog files (TODO, TOFIX), code comments, and commit-facing artifacts — are
  English-only and MUST NOT maintain Russian mirrors.
- Feedback patterns (loading, empty, error, success) reuse the established components
  and phrasing; a module introducing a novel feedback pattern MUST justify it in review.

Rationale: consistency is what makes module handoffs feel like one application, and
accessibility is non-negotiable because the audience includes assistive-technology users.

### VII. Performance as a Shared Budget

Performance is a shared resource: no module may optimize itself at the expense of the
whole. Rules:

- Heavy capabilities (3D dice renderer, large catalogs, sounds) MUST be lazy-loaded or
  deferred until requested; they MUST NOT sit on the critical path of page load.
- Persistence operations go through IndexedDB (localForage) asynchronously; the main
  thread MUST NOT block on reads or writes of character or history data.
- Derived values in stores (derived stats, pools, computed sheets) are memoized;
  interactive components avoid unnecessary re-renders in hot paths (dice input, stat
  editing).
- A change that adds a route, dependency, generated CSS, or shared component MUST run
  `yarn verify:full` and be reviewed for its bundle impact, because these change what
  every user downloads.

Rationale: modularity that ships a slow product is a failure; budgets keep autonomy
from becoming bloat.

## Quality & Standards Matrix

The per-module table is the operational summary of Principles IV–VII. Where a conflict
is perceived, the principles govern and this table clarifies application.

| Module | Code Quality Bar | Testing Standard | Experience Duty | Performance Duty |
| --- | --- | --- | --- | --- |
| `dice_roller/dice-logic` | Pure, deterministic core; zero UI/DOM/store deps; limits as invariants | Exhaustive unit tests: edge cases, malformed input, deterministic randoms | Errors readable and actionable, matching documented notation | Sub-millisecond evaluation; allocation-light |
| `dice_roller` UI | Strict TS, hooks rules, store discipline (Zustand) | Component + store tests: pool, history, roll flow, 2D/3D toggle | Consistent roll feedback, history, sound/3D preferences | 3D renderer and sounds lazy-loaded; never block input |
| `sheet_manager` | Zod schema as single source; multi-character context via `useCharacter()` | Round-trip, import (legacy strip), persistence integration tests | Modal/collapsible a11y; consistent stat display and editing | IndexedDB async persistence; derived stats memoized |
| `integrations/*` | Bounded adapters only; queue + retry + backoff for side effects | Contract tests against both sides' public APIs | Seamless handoffs; graceful, actionable failure paths | Rate-limited delivery; no unbounded retries |
| `shared/*` | System- and feature-independent primitives; no per-system logic | Unit tests for hooks and utils | Reusable primitives (DataCatalog, EntityCard, SecretField) look and behave the same everywhere | Generic by default; no heavy assets |
| `docs/` + `i18n/` | MDX conventions (admonitions, cross-refs, dice notation); canonical YAML sources | `validate:data`, `validate:i18n`, `build:translations` | Docs render correctly in both locales; notation examples match UI behavior | No heavy embeds without lazy loading |
| Data catalogs (`data/`) | Schema-validated entries; filters and table configs typed | `validate:data` | Cards, filters, and tables follow shared catalog UX | Catalog payloads trimmed; no duplicate media |

## Verification Workflow

- **Tier 1 — Fast check** (`yarn verify:fast`): lint + typecheck. Required for any small
  code edit; the default for most branches.
- **Tier 2 — Logic and schema** (`yarn verify`): lint + typecheck + full test suite.
  Required for edits to `dice-logic`, schemas, stores, or persistence.
- **Tier 3 — Full verification** (`yarn verify:full`): lint + typecheck + tests +
  production build. Required for config, dependency, route, generated-CSS, or
  documentation-path changes.
- **Specialized validators**: `yarn validate:data` and `yarn validate:i18n` are required
  gates for their domains and are not substitutes for tests.
- **Review expectations**: every change states which modules it touches; cross-module
  changes identify the contract being relied on; UI changes confirm the accessibility
  floor; PRs that violate a principle must either comply or propose a constitution
  amendment — silent exceptions are prohibited.

## Governance

- This constitution supersedes other practices where they conflict. Conflicts are
  resolved in favor of the constitution until it is formally amended.
- **Amendment procedure**: propose the change (principle text + rationale + affected
  modules), update this document with a Sync Impact Report, bump the version per the
  policy below, and mirror material changes into runtime guidance (`AGENTS.md` and the
  matching `.agents/skills/` documents) so agents and humans read the same rules.
- **Versioning policy**: MAJOR for removal or redefinition of a principle or
  backward-incompatible governance change; MINOR for new principles, sections, or
  materially expanded guidance; PATCH for clarifications and wording. The version line
  at the bottom of this file MUST always match the latest Sync Impact Report.
- **Compliance review**: reviews verify principle compliance explicitly; complexity
  beyond the standards here must be justified in the PR description; unverifiable claims
  ("it's fast", "it's tested") are replaced by the concrete gate that proves them.
- **Current-state documentation**: specifications under `specs/` are change records and
  may be amended by later specs; they MUST NOT be the only description of current behavior.
  Each module's current behavior lives in its `AGENTS.md` and matching `.agents/skills/`
  reference. A feature is complete only when those are updated and every superseded spec
  carries a historical banner pointing at the current-state reference.
- **Runtime guidance**: `AGENTS.md` is the operational cheat sheet and the designated
  guidance file for day-to-day development; it must remain consistent with this
  constitution and defer to it on conflict.

**Version**: 1.2.0 | **Ratified**: 2026-09-02 | **Last Amended**: 2026-09-12
