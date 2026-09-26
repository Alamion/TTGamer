<!--
SYNC IMPACT REPORT
==================
Version change: 1.4.2 -> 1.5.0 (amendment: element storybook and template-editor parity
  for new elements)

Modified principles:
  VI. Consistent, Accessible Experience — every template and documentation element, with its
    variants, and every palette color appear in a draft-only docs storybook; elements a
    setting needs are built as editor-configurable template elements, extending an existing
    element in preference to adding a similar one

Runtime guidance updated: AGENTS.md (§8 Module Boundaries), src/sheet_manager/AGENTS.md
  (UI Rules), .agents/skills/sheet-templates/SKILL.md

Deferred TODOs: none (T-069 built the storybook: `docs/dev/storybook/`)

Previous: 1.4.1 -> 1.4.2 (clarification: the Dark Pack policy covers World of
  Darkness 5th Edition material only; a policy is declared only where it actually grants rights
  to the material, so classic World of Darkness engines and conversions built on them, such as
  the Star Wars WoD 2e hybrid, declare no Dark Pack notice)

Modified principles:
  VIII. Respectful Use of Third-Party Material — Dark Pack scope corrected in the example list;
    rule added that policies are declared only where they apply

Runtime guidance updated: src/sheet_manager/systems/policies.ts (policy scope comment),
  TODO.md (T-037 note)

Deferred TODOs: none

Previous: 1.4.0 -> 1.4.1 (clarification: a policy badge confirms the project accepts
  the policy; it is placed once in a prominent place per product surface that presents the
  material, not repeated on every view, and game mechanics alone need no notice)

Modified principles:
  VIII. Respectful Use of Third-Party Material — badge placement and the mechanics
    exception made explicit

Runtime guidance updated: AGENTS.md (§8 Module Boundaries, third-party material)

Deferred TODOs: none

Previous: 1.3.1 -> 1.4.0 (amendment: the dead-code audit becomes a Tier 2 gate instead
  of an advisory report; exemptions are declaration-level with a stated reason)

Modified sections:
  Verification Workflow — `yarn audit:dead-code` runs inside `yarn verify` (Tier 2) and fails
    the run on any unused file, export, or dependency; `@knipignore` at the declaration with a
    stated reason is the only exemption; dependency removal stays human-reviewed

Runtime guidance updated: AGENTS.md (§3 command table, §10 Verification Scope)

Deferred TODOs: none

Previous: 1.3.0 -> 1.3.1 (clarification: VIII notices may be one dedicated page plus
  badges where material is used, instead of full text on every surface)

Previous: 1.2.0 -> 1.3.0 (amendment: layered game systems, third-party content, library scale)

Modified principles:
  I. Modular Semi-Autonomy — game systems are layered as ruleset + setting + module; one
     supernatural module per character by default, crossovers extend sheets through templates
  II. Explicit Contracts at Boundaries — persisted/imported data is validated by the document
     envelope and the registered definition schema (BaseCharacterSchema is the legacy import
     path only); MDX imports use `@site/` so tooling can resolve them
  VII. Performance as a Shared Budget — entity collections must scale to thousands of documents

Added principles:
  VIII. Respectful Use of Third-Party Material — own-words rules text, publisher policies
        tracked as system metadata with notices shown where material is used, free
        non-commercial distribution of licensed content, honest client-side hiding

Sections:
  Quality & Standards Matrix — sheet_manager and docs rows updated
  Verification Workflow — advisory `yarn audit:dead-code`

Runtime guidance updated: AGENTS.md (§8 Module Boundaries), .agents/skills/mdx-documentation/SKILL.md

Deferred TODOs: T-037 (text audit + automatic notices) implements Principle VIII for existing content
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
- Game systems are layered: a **ruleset** owns mechanics (dice, trait scales, derived
  values), a **setting** owns flavor and catalogs, and **modules** add a supernatural
  type's traits, resources, and tracks on top of a ruleset. Rulesets that share an engine
  (e.g. V5 for VtM 5e and H:tR 5e) MUST share one ruleset rather than duplicate it. A
  document carries one supernatural module by default; crossovers are built by extending
  the sheet through user templates, not by per-combination code.
- Each module can be reasoned about, tested, and refactored without loading the whole
  application into context. If that stops being true, the boundary is broken.

Rationale: semi-autonomy is what lets modules evolve at different speeds without
cascading breakage.

### II. Explicit Contracts at Boundaries

Data and behavior crossing a module edge MUST pass through a validated, declared
contract. Rules:

- Imported or persisted documents MUST pass the document envelope schema and the Zod
  schema of the registered definition they name; entries that fail are kept in a bounded
  recovery collection, never silently trusted or dropped. `BaseCharacterSchema` remains
  only the legacy-character import path, where unknown fields are stripped.
- Documentation imports project code through the `@site/` alias only (root-absolute or
  relative paths into `src/` resolve in webpack but not in TypeScript, knip, or IDEs);
  `tests/docs/mdx-imports.test.ts` enforces this.
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
- Element storybook: every distinct element used in templates (for example a StatDot
  field or a section) or in documentation (for example DataCatalog or the Star Wars
  object size comparison), with each of its variants, MUST appear in the draft-only
  storybook under `docs/`, alongside every palette color the application uses. A new or
  changed element is not done until the storybook shows it.
- Template-editor parity for new elements: when a setting needs an element that does not
  exist yet, it is built as a template element that user templates can configure in the
  editor (and so it appears in the storybook), not as a setting-only component. Extending
  an existing element with an option is preferred over adding a new element of similar
  function.

Rationale: consistency is what makes module handoffs feel like one application, and
accessibility is non-negotiable because the audience includes assistive-technology users.
One storybook makes element changes cheap to review, and building setting needs as
configurable elements keeps shipped and user templates equally capable.

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
- Entity collections (documents, notes, catalog-linked entities) MUST stay usable at
  thousands of entries: query through IndexedDB indexes instead of loading every entity
  into memory, virtualize long lists, and bound graph or relationship views. Designs
  that only work for tens of documents need an explicit scale note in their spec.
- A change that adds a route, dependency, generated CSS, or shared component MUST run
  `yarn verify:full` and be reviewed for its bundle impact, because these change what
  every user downloads.

Rationale: modularity that ships a slow product is a failure; budgets keep autonomy
from becoming bloat.

### VIII. Respectful Use of Third-Party Material

Game systems and settings belong to their publishers; the product supports play without
republishing their books. Rules:

- Rules documentation and catalog descriptions are written in the project's own words.
  Verbatim passages, tables, or art from published books MUST NOT be copied; trait,
  mechanic, and item names MAY be used.
- Each ruleset and setting declares the publisher policies it relies on (e.g. Paradox
  Dark Pack for World of Darkness 5th Edition material, the SRD CC-BY attribution for
  D&D, R. Talsorian's Homebrew Content Policy for Cyberpunk RED) as machine-readable
  metadata. A policy is declared only where it actually grants rights to the material: the
  Dark Pack covers World of Darkness 5th Edition material only, so classic World of Darkness
  engines and conversions built on them (such as the Star Wars WoD 2e hybrid) declare no Dark
  Pack notice and rely on the own-words and trait-name rules above. Required notices and badges are rendered from that metadata, in the form the
  policy requires: a policy's full statement MAY live on one dedicated documentation page,
  with surfaces that use the material (sheets) showing the required badge linking to it, and
  exports carrying the notice text. A page MUST NOT carry notices or attributions for
  material it does not use.
- The badge confirms that the project accepts the policy's terms. It is placed once, in a
  prominent place, on the surface that presents the publisher's material (e.g. the
  character sheet); it MUST NOT be repeated on every view, panel, toast, history entry, or
  message that happens to touch that material. Game mechanics on their own (dice
  procedures, success counting, outcome names) are not publisher material and carry no
  notice.
- A combination inherits every applicable policy: a setting run on another publisher's
  engine shows both notices.
- Content under a non-commercial policy stays free, with no purchases or monetized
  transactions attached to it. Any future monetization MUST exclude that content or rest
  on a separate license.
- Hiding information on the client (templates, personas) is presentation, not
  protection, and MUST NOT be described as secure. Real secrecy requires server-side
  projection; client-side encryption of game data is out of scope.
- A spec introducing a new system or setting MUST name its source material, the
  applicable policy, and the resulting notice requirements.

Rationale: staying inside publishers' community policies is what keeps a free fan tool
online; policy-driven notices keep compliance correct as systems multiply.

## Quality & Standards Matrix

The per-module table is the operational summary of Principles IV–VII. Where a conflict
is perceived, the principles govern and this table clarifies application.

| Module | Code Quality Bar | Testing Standard | Experience Duty | Performance Duty |
| --- | --- | --- | --- | --- |
| `dice_roller/dice-logic` | Pure, deterministic core; zero UI/DOM/store deps; limits as invariants | Exhaustive unit tests: edge cases, malformed input, deterministic randoms | Errors readable and actionable, matching documented notation | Sub-millisecond evaluation; allocation-light |
| `dice_roller` UI | Strict TS, hooks rules, store discipline (Zustand) | Component + store tests: pool, history, roll flow, 2D/3D toggle | Consistent roll feedback, history, sound/3D preferences | 3D renderer and sounds lazy-loaded; never block input |
| `sheet_manager` | Envelope + registered definition schemas (Zod) as single source; systems via registry, ruleset/setting/module layers | Round-trip, import (legacy strip), migration, and persistence integration tests | Modal/collapsible a11y; consistent stat display and editing | IndexedDB async persistence; derived stats memoized |
| `integrations/*` | Bounded adapters only; queue + retry + backoff for side effects | Contract tests against both sides' public APIs | Seamless handoffs; graceful, actionable failure paths | Rate-limited delivery; no unbounded retries |
| `shared/*` | System- and feature-independent primitives; no per-system logic | Unit tests for hooks and utils | Reusable primitives (DataCatalog, EntityCard, SecretField) look and behave the same everywhere | Generic by default; no heavy assets |
| `docs/` + `i18n/` | MDX conventions (admonitions, cross-refs, dice notation, `@site/` imports); own-words rules text; canonical YAML sources | `validate:data`, `validate:i18n`, `build:translations`, MDX import test | Docs render correctly in both locales; notation examples match UI behavior; required publisher notices shown | No heavy embeds without lazy loading |
| Data catalogs (`data/`) | Schema-validated entries; filters and table configs typed | `validate:data` | Cards, filters, and tables follow shared catalog UX | Catalog payloads trimmed; no duplicate media |

## Verification Workflow

- **Tier 1 — Fast check** (`yarn verify:fast`): lint + typecheck. Required for any small
  code edit; the default for most branches.
- **Tier 2 — Logic and schema** (`yarn verify`): lint + typecheck + dead-code audit + full
  test suite. Required for edits to `dice-logic`, schemas, stores, or persistence.
- **Tier 3 — Full verification** (`yarn verify:full`): lint + typecheck + tests +
  production build. Required for config, dependency, route, generated-CSS, or
  documentation-path changes.
- **Dead-code gate** (`yarn audit:dead-code`, inside Tier 2): knip fails the run on any
  unused file, export, or dependency and names the file and symbol. An export that exists
  deliberately without importers (for example an exhaustiveness guard) is exempted at its
  declaration with `@knipignore` and a stated reason — never by a broad ignore pattern.
  Removing a dependency to satisfy the gate stays a human decision.
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

**Version**: 1.5.0 | **Ratified**: 2026-09-02 | **Last Amended**: 2026-09-25
