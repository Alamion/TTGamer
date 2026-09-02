# Feature Specification: TTRPG Product Roadmap

**Feature Branch**: `001-product-roadmap`

**Created**: 2026-09-02

**Status**: Draft

**Input**: User description: "My goal is to create a great helper tool for TTRPG party that could be modullarily enchanced in different ways. Main paths are: 1. Useful character sheets so users can do them in different systems (in progress, only WoD SW system done); 2. Make a step-by-step interactive character creation (merged with docs point thanks to docusaurus functions); 3. Create a doc filled with all core book stuff about systems (in progress, only WoD SW done, and it still needs proper validaiton and testing on real players); 4. Create additional notes for GM to fill notes about different things, not only characters (in progress, done WoD SW specific stuff, need more broad things like event/organization/item/place/map/etc. and need a template builder so everyone can create their own character/other entity sheets); 5. Full offline support (done since we have only one discord optional network function, the other is local js client code); 5.5 Compiling an app out of current project (I think we should just add a github CI/CD with compiling to .exe/.apk/.deb/... releases at some point, but maybe there is another way); 6. File structure of notes (that means I want to be able to recursively create folders of notes, not just plain list of them; not even started); 7. Campaigns (literally sets of notes that can be exported/imported as an archive); 8. Map note entities (literally large canvas with with pastable images; drawable things, ability to set points-links to other notes); 10. multinote showcase on one page; 11. Multi-players in group (that means GM can create a party of players, where each player can manage his note, and GM can manage all party's notes + share/hide some notes within campaign(s) chosen); 12. Online forum (with discussions, votes for features and announcements); different LLMs integration (so users can generate notes/images for them / roll dices / go through LLM-driven story narration / use LLMs as players / etc.). As you can see most of the goals are not in project yet, so it will be useful to write them somewhere."

## Clarifications

### Session 2026-09-02

- Q: Where does the current TODO.md live once the roadmap document exists — how is responsibility split between the roadmap and the task queue? → A: Option A — the roadmap gets a new dedicated file; TODO.md remains the human-written execution task queue (Major/Minor), entries reference roadmap paths rather than duplicating their scope.
- Q: How should the thirteen roadmap paths be identified so tasks, future specs, and commit messages can reference them unambiguously over time? → A: Option A — each path carries a stable lowercase slug used in all cross-references; the 1–13 enumeration remains indicative priority only, never an identifier.
- Q: In which language or languages should the roadmap document exist? → A: Option A — English only. Russian is a mirror for the application UI exclusively; repository-level specs and the codebase remain English-only as a standing project convention.

## User Scenarios & Testing _(mandatory)_

The primary actors are the **product owner** (the person driving the tool's direction) and **contributors** (anyone who picks up work on the project). Players and GMs benefit indirectly: the roadmap ensures the enhancements they need are recorded, prioritized, and not forgotten between work sessions.

**Important distinction — paths are business goals, not code modules**: The thirteen paths describe _what the product must achieve for its users_ and _why_. They are deliberately unrelated to the project's internal code module structure (the constitution's named modules). One path may be delivered by one module, cut across several, or require new ones — that mapping is a solution decision made during each path's own planning cycle, and the roadmap MUST NOT prejudge it. A reader must never infer code organization from the roadmap, nor scope a path by the modules that happen to exist today.

### User Story 1 - Roadmap Captured as Single Source of Truth (Priority: P1)

A contributor opens the project and finds every planned enhancement path written down in one place, each with a plain-language description and its current status (done / in progress / not started). Nothing lives only in the product owner's head or in scattered chat messages: the thirteen enumerated paths — multi-system character sheets, interactive character creation, system core-book documentation, GM notes with a template builder, full offline support, app packaging/distribution, hierarchical note structure, campaigns with archive export/import, map note entities (large canvas with pasteable images, drawing, and points/links to other notes), multi-note showcase on one page, multiplayer groups (GM-managed parties with per-player notes and share/hide within campaigns), online forum, and LLM integrations — are all persistently recorded.

**Why this priority**: Without the roadmap written down, every other goal risks being forgotten or re-litigated. This is the smallest slice that delivers standalone value and unblocks all later planning.

**Independent Test**: Can be fully tested by opening the roadmap and checking that all thirteen enumerated paths appear with a status and a readable description; delivers a durable record of product intent.

**Acceptance Scenarios**:

1. **Given** a fresh copy of the project, **When** a contributor opens the roadmap, **Then** all thirteen enumerated paths appear, each with a plain-language scope description and a status of done, in progress, or not started.
2. **Given** the roadmap is open, **When** the reader checks "full offline support", **Then** it is marked done with a note that the only optional network capability is an external delivery integration, while all other product behavior works without connectivity.
3. **Given** a non-technical party member reads the roadmap, **When** they finish, **Then** they can explain what the product is and what is planned without help.

---

### User Story 2 - Each Path Is Plannable Independently (Priority: P2)

A contributor selects one path (for example, "campaigns" or "map note entities") and finds, in its entry, enough context to start a dedicated planning/specification session: what the path covers, who uses it, which other paths it depends on, and which decisions remain open (for example, the undecided packaging/distribution approach for compiled apps, or the export format question for campaign archives). Distinct sub-capabilities are listed where a path bundles several features — for example, LLM integration lists note/image generation, dice rolling support, LLM-driven story narration, and LLM-as-player as separate capabilities.

**Why this priority**: A list of titles alone still forces the owner to re-explain every path before work starts. Recorded scope, dependencies, and open questions turn the roadmap from a wishlist into a planning instrument.

**Independent Test**: Can be fully tested by picking any single path entry and confirming that a planning session can start from it without re-interviewing the product owner; delivers faster, lower-friction planning.

**Acceptance Scenarios**:

1. **Given** the "campaigns" entry, **When** a planning session begins, **Then** its dependency on the hierarchical note structure and its open questions (archive format, what exactly is bundled) are already recorded in the entry.
2. **Given** the "LLM integration" entry, **When** it is read, **Then** the four sub-capabilities (content generation, dice support, story narration, LLM players) are each separately identified so they can be planned independently.
3. **Given** the "app packaging/distribution" entry, **When** it is read, **Then** the undecided approach (automated multi-platform package builds versus an alternative distribution route) is recorded as an open question rather than a hidden assumption.

---

### User Story 3 - Roadmap Stays Truthful Over Time (Priority: P3)

As work progresses, path statuses and notes are updated in the same rhythm as the work itself: a path is marked done when it is actually usable in the product, an in-progress path reflects its real gaps (for example, "character sheets" notes that only one system exists and more are pending), and dropped or replaced paths stay visible with an outcome (shipped / declined / superseded) instead of silently disappearing. The roadmap records intent and status only — it does not duplicate facts owned elsewhere (version numbers, release summaries), so it can never become a second, conflicting authority.

**Why this priority**: A stale roadmap is worse than none — it misleads contributors. This keeps the artifact trustworthy, but it only matters once the roadmap exists and is plannable (Stories 1–2).

**Independent Test**: Can be fully tested by auditing roadmap claims against the current product state — every "done" claim must correspond to a working capability today, and every "in progress" claim must describe its remaining gaps accurately.

**Acceptance Scenarios**:

1. **Given** a path reaches completion, **When** the change shipping it is reviewed, **Then** its roadmap status changes to done in the same review, never in a later, separate cleanup.
2. **Given** the "system core-book documentation" path, **When** its status is read, **Then** it reflects reality: one system written, validation and real-player testing still pending.
3. **Given** a path is dropped or folded into another, **When** the roadmap is updated, **Then** the entry remains visible marked as superseded (pointing to its replacement) or declined (with a brief reason), rather than deleted.

---

### Edge Cases

- What happens when two paths overlap (for example, map note entities and the hierarchical note structure both touch how notes relate)? The overlap and direction of dependency are stated in both entries; scope is never duplicated between them.
- What happens when a path's meaning shifts after user feedback (for example, GM notes grow a template-builder sub-goal)? The entry is updated with the expanded scope; significant revisions keep a dated note so history is readable.
- What happens when a status is arguable (for example, "mostly done")? The status vocabulary is limited to done / in progress / not started plus closed outcomes (shipped / declined / superseded); partial progress is expressed as "in progress" with an explicit list of remaining gaps.
- What happens when a future path is proposed that is not on the roadmap? It is added as a new entry through the same review flow as code changes before any planning session references it.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The roadmap MUST list every enhancement path enumerated by the product owner: (1) multi-system character sheets, (2) interactive step-by-step character creation, (3) per-system core-book documentation, (4) GM notes for non-character entities plus a custom template builder, (5) full offline support, (6) app packaging/distribution for compiled releases, (7) hierarchical (recursive folder) note structure, (8) campaigns as note sets with archive export/import, (9) map note entities with a large canvas, pasteable images, drawing, and points/links to other notes, (10) multi-note showcase on one page, (11) multiplayer groups with GM/party permission behavior, (12) online forum with discussions, feature voting, and announcements, and (13) LLM integrations.
- **FR-002**: Each path MUST carry exactly one status — done, in progress, or not started — matching the current project state.
- **FR-003**: Each path MUST include a plain-language scope description naming its intended users (players, GMs, or both) and what becomes possible when it is done.
- **FR-004**: Each path MUST record its dependencies on other paths (for example: campaigns depend on the folder structure; multiplayer groups depend on campaigns; map note entities relate to both) and any open questions where a decision is still pending.
- **FR-005**: The roadmap MUST be a human-authored document stored together with the project so it is versioned with code, editable without special tooling, and fully available offline.
- **FR-006**: The roadmap MUST NOT duplicate machine-readable facts owned elsewhere (such as version numbers or release summaries); it records intent, scope, dependencies, and status only, and defers to the owning sources for facts.
- **FR-007**: The roadmap MUST be readable by non-technical party members; entries avoid jargon or explain it inline.
- **FR-008**: Closed paths MUST remain visible with an outcome — shipped, declined, or superseded — and MUST NOT be silently deleted.
- **FR-009**: Where a path bundles distinct capabilities, the entry MUST list them separately (for example, LLM integration: note/image generation, dice support, story narration, LLM-as-player) so each can be planned and shipped independently.
- **FR-010**: Every change to the roadmap MUST go through the same review and versioning flow as other project documents, so the roadmap's history is auditable alongside the product's history.
- **FR-011**: Each path entry MUST contain enough information to seed its own dedicated specification session without requiring the product owner to re-supply basic scope from memory.
- **FR-012**: The roadmap MUST express paths as business outcomes only. A path MUST NOT prescribe, reference, or be scoped by the project's internal code structure; how a path decomposes into modules (existing or new) is decided exclusively in that path's own planning cycle. Validation of this requirement: no path entry names a code module, file, or layer, and no planning session treats a module boundary as the definition of a path's scope.
- **FR-013**: Path-level product intent is owned exclusively by the roadmap document. The existing TODO.md remains the human-written execution task queue: its entries MAY reference roadmap paths but MUST NOT restate path scope, status, or dependencies as a second authority; conversely, the roadmap MUST NOT absorb task-level execution detail from TODO.md. TODO entries whose content is path-level intent migrate into the roadmap rather than being copied.
- **FR-014**: Each path MUST carry a stable, lowercase slug identifier (for example, `campaigns`, `note-tree`) assigned at creation, never reused for a different path, and never renumbered. All cross-references (TODO tasks, future feature specs, commit messages) MUST use the slug; the owner's enumeration order (1–13) is indicative priority only and MUST NOT be used as an identifier.
- **FR-015**: The roadmap document MUST be written in English only. This follows the project-wide convention that repository-level specifications and codebase documents are English-only, while Russian localization applies exclusively to the application UI through the established translation sources; the roadmap MUST NOT maintain a Russian mirror.

### Key Entities _(include if feature involves data)_

- **Roadmap Path**: A planned product enhancement expressed as a business goal. Attributes: stable slug identifier (never reused, never renumbered), name, status (done / in progress / not started), indicative priority, plain-language scope summary, intended users, dependencies on other paths, open questions, and dated progress notes. A path is intentionally decoupled from code organization: it does not map one-to-one to any internal module, and its eventual solution shape is undefined until its own planning cycle.
- **Status**: The lifecycle state of a path. Active states: done, in progress, not started. Closed outcomes: shipped, declined, superseded (with a pointer to the replacing path or a brief reason).
- **Dependency**: A directional relationship between two paths stating that one cannot reasonably ship before the other (for example, campaigns require the hierarchical note structure).
- **Open Question**: A recorded, undecided aspect of a path (for example, the packaging/distribution approach for compiled releases), kept with the path it affects so future planning resolves it in context.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All thirteen enumerated paths appear in the roadmap with a status and description; a reviewer can verify 100% coverage against the product owner's list in under 5 minutes.
- **SC-002**: A new contributor with no prior context can read the roadmap and correctly pick a path to work on in under 10 minutes, without asking the product owner any questions.
- **SC-003**: For any single path, a planning session can start from that entry alone: scope, intended users, dependencies, and open questions are all present, requiring zero re-elicitation in 100% of paths.
- **SC-004**: Status accuracy: 100% of "done" claims correspond to capabilities usable in the product today, and 100% of "in progress" claims list their remaining gaps; a quarterly audit finds zero contradictions between the roadmap and the product's actual state.

## Assumptions

- Roadmap intent remains human-written markdown stored with the project, living in a dedicated roadmap document whose exact file location and structure are decided at planning time. The existing TODO.md remains the execution task queue; task entries reference roadmap paths rather than restating them (FR-013).
- Roadmap paths and the project's internal code modules are separate vocabularies. The constitution governs how code is organized; the roadmap governs what the product will achieve. The two align only incidentally, and no path is considered "done" merely because a related module exists — completion is judged by the user-visible capability.
- The product owner's enumeration order (paths 1–12, plus the LLM integration path) is treated as indicative priority, refined by real dependencies — for example, campaigns realistically follow the folder structure, and multiplayer groups follow campaigns.
- This specification covers persisting and maintaining the roadmap itself; it does not greenlight implementation of any individual path. Each path will receive its own dedicated specification and planning cycle later.
- Offline-first remains a standing product constraint that any future path must respect unless a dedicated specification explicitly revises it.
- The packaging/distribution approach for compiled releases (automated multi-platform package builds versus another route) is intentionally left as an open question inside that path rather than decided here.
- The forum path (12) and LLM integration path imply networked features; they are recorded on the roadmap as future intent while the product's current offline-first guarantee applies only to shipped functionality.
