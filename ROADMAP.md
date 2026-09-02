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
| `multiplayer-groups`      | Multiplayer groups                 | not started | 11       |
| `online-forum`            | Online forum                       | not started | 12       |
| `llm-integrations`        | LLM integrations                   | not started | 13       |

## Path entries

### `multi-system-sheets` — Multi-system character sheets

- **Status**: in progress
- **Priority**: 1
- **Users**: players and GMs
- **Depends on**: none
- **Scope**: Players can create and maintain character sheets in different game
  systems, each following that system's own rules. The Star Wars WEG/WoD 2e system
  is usable today: sentient and droid characters, vehicle crews, and creature or
  fodder groups all have editable, validated sheets. Additional systems remain to be
  added.
- **Open questions**: which system to support next.

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

### `offline-support` — Full offline support

- **Status**: done
- **Priority**: 5
- **Users**: players and GMs
- **Depends on**: none
- **Scope**: The tool works fully without a network connection: sheets, catalogs,
  dice, and notes all run on local data. The only optional network capability is
  sharing roll results to an external Discord channel; every other behavior runs
  locally.
- **Open questions**: none recorded.
- **Notes**:
    - 2026-09-02 — confirmed done: the Discord delivery integration is optional and
      the product is fully usable without it.

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
  images, map entities).

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

### `multiplayer-groups` — Multiplayer groups

- **Status**: not started
- **Priority**: 11
- **Users**: GMs and players
- **Depends on**: `campaigns`
- **Scope**: A GM creates a party where each player manages their own notes and
  character, while the GM can view and manage everything in the party. Some notes
  can be shared with or hidden from players within chosen campaigns.
- **Open questions**: how sharing and hiding interact with campaign membership.

### `online-forum` — Online forum

- **Status**: not started
- **Priority**: 12
- **Users**: players and GMs
- **Depends on**: none
- **Scope**: A community space with discussions, feature voting, and announcements,
  so players and GMs can coordinate and influence the tool's direction outside of
  game sessions.
- **Open questions**: none recorded.

### `llm-integrations` — LLM integrations

- **Status**: not started
- **Priority**: 13
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
