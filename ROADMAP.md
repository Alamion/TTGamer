# ROADMAP

Product-level intent for the TTGamer helper tool: what each enhancement path must
achieve for its users and why. This document is the single source of truth for path
scope, status, and dependencies.

**Relationship to [TODO.md](TODO.md)**: `TODO.md` is the execution task queue. Tasks
there reference paths by slug (for example `core-book-docs`) and must not restate
path scope, status, or dependencies — those live only here.

**Status vocabulary**: `done` — usable in the product today; `in progress` — with
remaining gaps listed explicitly; `not started`. Closed outcomes: `shipped`,
`declined` (with a brief reason), `superseded (by <slug>)`. A closed path is never
silently deleted; it stays visible with its outcome. Status changes land in the same
review as the work itself. A proposed future path that is not on the roadmap yet is
added as a new entry through the same review flow, before any planning session
references it.

**Paths are business outcomes, not code modules**: entries never prescribe internal
code organization; how a path maps to modules is decided in that path's own planning
cycle. Priority numbers are the owner's indicative order refined by real
dependencies — they are not identifiers; slugs are.

**Offline-first**: shipped functionality keeps the offline guarantee (see
`offline-support`); networked paths below are recorded as future intent.

## Overview

| Slug                      | Path                               | Status      | Priority |
| ------------------------- | ---------------------------------- | ----------- | -------- |
| `multi-system-sheets`     | Multi-system character sheets      | in progress | 1        |
| `character-creation-flow` | Interactive character creation     | not started | 2        |
| `core-book-docs`          | Per-system core-book documentation | in progress | 3        |
| `gm-notes-templates`      | GM notes and template builder      | in progress | 4        |
| `offline-support`         | Full offline support               | done        | 5        |
| `app-packaging`           | App packaging and distribution     | not started | 6        |
| `note-tree`               | Hierarchical note structure        | not started | 7        |
| `campaigns`               | Campaigns                          | not started | 8        |
| `map-notes`               | Map note entities                  | not started | 9        |
| `note-showcase`           | Multi-note showcase                | not started | 10       |
| `online-mode`             | Online accounts and cloud space    | not started | 11       |
| `multiplayer-groups`      | Multiplayer groups                 | not started | 12       |
| `online-forum`            | Online forum                       | not started | 13       |
| `llm-integrations`        | LLM integrations                   | not started | 14       |

## Path entries

### `multi-system-sheets` — Multi-system character sheets

- **Status**: in progress
- **Priority**: 1
- **Users**: players and GMs
- **Depends on**: none
- **Scope**: Players can create and maintain character sheets in different game
  systems, each following that system's own rules. The Star Wars WEG/WoD 2e system
  is usable today: sentient and droid characters, vehicle crews, and creature or
  fodder groups all have editable, validated sheets. Hunter: the Reckoning 5e player
  characters are usable on a shared World of Darkness 5th Edition ruleset, with full and
  brief sheets and beginner documentation. Further systems remain to be added.
- **Open questions**: none recorded.
- **Notes**:
    - 2026-09-15 — next systems decided: Hunter: the Reckoning 5e first (a table game
      depends on it), then Vampire: the Masquerade 5e on the same V5 ruleset, then the
      classic World of Darkness lines. Systems are layered as ruleset (mechanics) +
      setting + supernatural module; a character carries one module by default and
      crossovers extend the sheet through templates.

### `character-creation-flow` — Interactive character creation

- **Status**: not started
- **Priority**: 2
- **Users**: players
- **Depends on**: none
- **Scope**: A guided, step-by-step experience for creating a character: the tool
  walks the player through concept, attributes, skills, and equipment choices, and
  produces a valid sheet without requiring rulebook knowledge. New players can
  finish a legal character on their own.
- **Open questions**: how the guided flow reuses the written system documentation so
  rules stay consistent between reading and creating.

### `core-book-docs` — Per-system core-book documentation

- **Status**: in progress
- **Priority**: 3
- **Users**: players and GMs
- **Depends on**: none
- **Scope**: Every supported system has a core-book documentation set covering its
  rules — attributes, skills, dice mechanics, and system-specific subsystems —
  written to be usable at the table. One system (Star Wars WEG/WoD 2e) is fully
  written; a second (Vampire: the Masquerade 2e) has its structure started.
- **Open questions**: none recorded.
- **Notes**:
    - 2026-09-02 — Star Wars set complete (45 documents, both locales); VtM 2e
      structure started (clans, disciplines, Blood Points, Humanity). Validation and
      real-player testing of the written system are still pending.

### `gm-notes-templates` — GM notes and template builder

- **Status**: in progress
- **Priority**: 4
- **Users**: GMs
- **Depends on**: none
- **Scope**: GMs can keep structured notes about anything in their game, not only
  characters: events, organizations, items, places, maps, and more. System-specific
  note types for the Star Wars system exist today; broad non-character entity types
  and a template builder that lets anyone create their own note or entity sheets are
  still to come.
- **Open questions**: which broad entity types ship first; how custom templates are
  shared between users.
- **Notes**:
    - 2026-09-25 — spec 012 shipped the template builder: a visual editor on the live page,
      user-defined document types in any setting, user settings on the WoD 2e and V5 rules,
      and type files; custom templates are shared by file, and document exports carry their
      type.

### `offline-support` — Full offline support

- **Status**: done
- **Priority**: 5
- **Users**: players and GMs
- **Depends on**: none
- **Scope**: The tool works fully without a network connection: sheets, catalogs,
  dice, and notes all run on local data. The only optional network capability is
  sharing roll results to an external chat service (a Discord channel or a Matrix
  room); every other behavior runs locally.
- **Open questions**: none recorded.
- **Notes**:
    - 2026-09-02 — confirmed done: the Discord delivery integration is optional and
      the product is fully usable without it.
    - 2026-10-02 — spec 021 adds Matrix rooms (hookshot generic webhooks) as a second
      optional sharing service; still optional, still off the critical path.
    - 2026-10-08 — the cloud space (`online-mode`) is an addition, not a replacement:
      the local space keeps this guarantee with or without an account.

### `app-packaging` — App packaging and distribution

- **Status**: not started
- **Priority**: 6
- **Users**: players and GMs
- **Depends on**: none
- **Scope**: The tool can be installed as a standalone application on common
  platforms — desktop and mobile — so non-technical players do not need a dev server
  or hosting to use it.
- **Open questions**: automated multi-platform package builds (for example `.exe`,
  `.apk`, `.deb` releases) versus an alternative distribution route.

### `note-tree` — Hierarchical note structure

- **Status**: not started
- **Priority**: 7
- **Users**: GMs
- **Depends on**: none
- **Scope**: Notes can be organized in recursive folders instead of a single flat
  list, so campaign material can be nested the way the GM thinks about it —
  regions inside worlds, sessions inside arcs, and so on.
- **Relates to**: `map-notes` (map points can link to notes; the direction of the
  dependency between the two paths is decided during their planning).
- **Open questions**: none recorded.

### `campaigns` — Campaigns

- **Status**: not started
- **Priority**: 8
- **Users**: GMs
- **Depends on**: `note-tree`
- **Scope**: A campaign is a named set of notes that can be exported as a single
  archive and imported elsewhere — a GM can back up, share, or reuse campaign
  material as one unit.
- **Open questions**: archive format; what exactly a campaign bundles (settings,
  images, map entities); how a campaign is delimited inside the folder structure.
- **Notes**:
    - 2026-09-15 — direction decided: entities live in one shared library connected by
      links; campaigns and worlds are kinds of tags that slice that graph, so one entity
      can belong to several campaigns. The library must stay usable with thousands of
      entities.
    - 2026-09-15 (later, supersedes the note above) — the tag-sliced graph is dropped:
      entities are organized in a file system of folders holding sheets, markdown
      documents, canvases, and further types, so `note-tree` returns as the structural
      base for this path. Links between entities remain as cross-references, not as the
      primary navigation structure. The thousands-of-entities scale requirement is
      unchanged.

### `map-notes` — Map note entities

- **Status**: not started
- **Priority**: 9
- **Users**: GMs
- **Depends on**: none
- **Scope**: A large spatial canvas where a GM can paste images, draw freehand, and
  place points that link to other notes — a visual map of the game world that
  connects to the rest of the campaign material.
- **Relates to**: `note-tree` (map points can link to notes; the direction of the
  dependency between the two paths is decided during their planning).
- **Open questions**: none recorded.

### `note-showcase` — Multi-note showcase

- **Status**: not started
- **Priority**: 10
- **Users**: players and GMs
- **Depends on**: none
- **Scope**: Several notes can be displayed together on one page as a curated
  showcase, so related material (a faction, a region, a session recap) can be read
  as one document without opening each note separately.
- **Open questions**: none recorded.

### `online-mode` — Online accounts and cloud space

- **Status**: not started
- **Priority**: 11
- **Users**: players and GMs
- **Depends on**: none
- **Scope**: Players and GMs who sign in get a cloud space beside the local one: they
  move chosen records and library items there, open them on other devices, and later
  share them with other users inside the tool. Whatever other people see — shared
  rolls, shared records — comes from the server, never trusted from the browser. The
  local space keeps working without an account or a network.
- **Open questions**: how a schema change is migrated — proposed: the server migrates
  its own structures (envelope, metadata, quotas, rights, API version) and the client
  migrates document data by `schemaVersion`, showing a document of a newer version
  read-only; whether the contract moves to a shared private repository or each side
  keeps its own copy; whether a cloud document can be edited offline and sent
  later or stays read-only from the cache; quota sizes and how usage is shown; account
  management (deletion, data export, email verification).
- **Notes**:
    - 2026-10-08 — direction agreed with the backend developer; details may change as
      the product is built:
        - One library shows two spaces, "on this device" and "in the cloud", instead of
          a global mode switch or automatic full sync. A document has one home: moving
          it to the cloud keeps its id, and downloading a cloud document makes a local
          copy with a new id.
        - Sync is selective, per kind: records (characters, markdown, folders,
          canvases) and library items (settings, rulesets, types, templates) move to
          the cloud; favorite rolls likely do; roll history and recent rolls do not.
          Everything else exists in one space only.
        - Trust boundary: anything other people see is not trusted from the client. A
          roll others see uses a seed the server issues after storing the notation;
          the client evaluates the roll with a deterministic SHA-256 based generator
          over that seed, and every viewer recomputes the result. A roll for oneself
          stays local.
        - Cloud storage has quotas (larger ones may come with paid plans much later);
          the local space has none.
        - Accounts exist only for the cloud space; the local space never asks for one.
        - Moving a record offers the library items it uses (template, type, setting)
          along with it; items shared with other users become immutable published
          versions that documents pin.
        - Only the personal data the cloud space needs is stored.
        - Backend: Go with ArangoDB, JWT sessions, and an OpenAPI contract both sides
          propose changes to, with snake_case fields on the wire. It runs in
          Docker on a VPS deployed by Jenkins; the production site moves there from
          Vercel once the VPS exists.

### `multiplayer-groups` — Multiplayer groups

- **Status**: not started
- **Priority**: 12
- **Users**: GMs and players
- **Depends on**: `campaigns`, `online-mode`
- **Scope**: A GM creates a party where each player manages their own notes and
  character, while the GM can view and manage everything in the party. Some notes
  can be shared with or hidden from players within chosen campaigns.
- **Open questions**: how sharing and hiding interact with campaign membership.
- **Notes**:
    - 2026-09-15 — deception/restricted views (personas: several faces of one document,
      chosen per audience) belong here: they are only meaningful once data is projected
      server-side. Before multiplayer, hiding sections through templates is sufficient.

### `online-forum` — Online forum

- **Status**: not started
- **Priority**: 13
- **Users**: players and GMs
- **Depends on**: none
- **Scope**: A community space with discussions, feature voting, and announcements,
  so players and GMs can coordinate and influence the tool's direction outside of
  game sessions.
- **Open questions**: none recorded.

### `llm-integrations` — LLM integrations

- **Status**: not started
- **Priority**: 14
- **Users**: players and GMs
- **Depends on**: none
- **Scope**: Optional AI assistance across the tool. Each capability below is a
  separately plannable sub-path.
- **Sub-capabilities**:
    - Note and image generation for game content.
    - Dice-rolling support through conversational interfaces.
    - LLM-driven story narration for solo or improvised play.
    - LLM as a player character at the table.
- **Open questions**: which sub-capability ships first; how each respects the
  offline-first guarantee for shipped functionality.
