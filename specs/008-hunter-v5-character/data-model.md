# Data Model: V5 Ruleset and Hunter: the Reckoning 5e Player Character

Decisions referenced as D# are in [research.md](research.md). The file-level JSON shape is in
[contracts/hunter-document.md](contracts/hunter-document.md).

## Layering

```text
SystemPlugin "v5"                      (ruleset: mechanics, policies: [dark-pack])
├── ruleset parts                      attributes, skills, damage tracks, advantages/flaws,
│                                      touchstones, experience, biography, equipment, notes
└── modules
    └── hunter                          (module: policies: [dark-pack])
        └── DocumentDefinition "hunter" kind "character", schemaVersion 1
            ├── views: v5-hunter-sheet (default), v5-hunter-brief
            └── catalogs: creeds, drives, edges, perks
```

A document's policies = plugin policies ∪ module policies (deduplicated).

## Entities

### PublisherPolicy (generic, `systems/policies.ts`)

| Field            | Type                   | Rule                                          |
| ---------------- | ---------------------- | --------------------------------------------- |
| `id`             | kebab id               | unique; `dark-pack`                           |
| `label`          | string                 | "Dark Pack"                                   |
| `officialNotice` | string[]               | verbatim required sentences; never translated |
| `explanation`    | translation descriptor | own-words explanation, en + ru                |
| `url`            | HTTPS URL              | policy page                                   |
| `nonCommercial`  | boolean                | `true` for Dark Pack                          |

### Plugin / definition additions (`systems/types.ts`, `systems/catalogs.ts`)

- `SystemPlugin.policies?: PolicyId[]`
- `SystemPlugin.catalogs?: readonly CatalogBindingEntry[]` (type moves to `systems/catalogs.ts`, D5);
  Star Wars declares its existing catalogs here too
- `DocumentDefinition.module?: { id: string; policies?: PolicyId[] }` — `module.id` is independent of
  `definitionId` (T-040 NPC definitions reuse `hunter`)
- `DocumentDefinition.label` becomes a translation descriptor (`{ id, message }`) instead of a plain
  string; Star Wars definitions take the ids from the removed create-dialog map

### Hunter document data (`definitionId: 'hunter'`)

**Ruleset part (V5 core)**

| Field                  | Type / range                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `name`                 | string ≤ 200, blank allowed (UI shows "New Hunter")                                                                                  |
| `attributes`           | record of 9 keys → `{ value: 1–5 }`: strength, dexterity, stamina, charisma, manipulation, composure, intelligence, wits, resolve    |
| `skills`               | record of 27 keys → `{ value: 0–5, specializationText: string ≤ 200 }` (revised; drafts with `specialties[]` are joined with commas) |
| `health`, `willpower`  | condition track `{ levels: ('empty' \| 'slash' \| 'cross')[] ≤ 15, bonus: −5…10 }` (revised; draft counts migrate to marks)          |
| `advantages`           | rows ≤ 50: `{ id, name ≤ 200, kind: 'advantage' \| 'flaw', dots: 1–5, note ≤ 500 }`                                                  |
| `touchstones`          | rows ≤ 20: `{ id, name ≤ 200, conviction ≤ 500 }`                                                                                    |
| `experience`           | `{ total: 0–9999, spent: 0–9999 }` (spent > total allowed, shown as warning-free value)                                              |
| `chronicleTenets`      | string ≤ 10 000                                                                                                                      |
| `weapons`, `inventory` | item cards: `WeaponItem[]` ≤ 30, `Item[]` ≤ 100 (shared schemas; draft `equipment` text → one inventory item)                        |
| `metadata`             | `{ portraitId?, imageUrl? }` — the shared portrait convention                                                                        |
| `(removed) equipment`  | string ≤ 10 000                                                                                                                      |
| `notes`                | string ≤ 10 000                                                                                                                      |
| `biography`            | `{ age ≤ 50, dateOfBirth ≤ 50, appearance ≤ 2000, features ≤ 2000, history ≤ 10 000 }`                                               |

Skill keys (three columns): athletics, brawl, craft, driving, firearms, larceny, melee, stealth,
survival · animal-ken, etiquette, insight, intimidation, leadership, performance, persuasion,
streetwise, subterfuge · academics, awareness, finance, investigation, medicine, occult, politics,
science, technology.

**Hunter module part**

| Field         | Type / range                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| `concept`     | string ≤ 200                                                                                                 |
| `creed`       | string ≤ 200 (suggestions: catalog `v5-hunter-creeds`)                                                       |
| `drive`       | string ≤ 200 (suggestions: catalog `v5-hunter-drives`)                                                       |
| `ambition`    | string ≤ 500                                                                                                 |
| `desire`      | string ≤ 500                                                                                                 |
| `redemption`  | string ≤ 500                                                                                                 |
| `creedFields` | string ≤ 2000                                                                                                |
| `edges`       | rows ≤ 20: `{ id, name ≤ 200, note ≤ 500 }`                                                                  |
| `perks`       | rows ≤ 60: `{ id, name ≤ 200, edge ≤ 200 (Edge name), note ≤ 500 }` (drafts' `edges[].perks` lift into rows) |
| `despair`     | boolean                                                                                                      |
| `desperation` | integer 0–5 (cell value, per-hunter copy; resource rating)                                                   |
| `danger`      | integer 0–5 (cell value, per-hunter copy)                                                                    |

Both parts live flat in `document.data`; the schema is composed as
`V5CoreSchema.extend(HunterModuleShape)`, so a Vampire module extends the same core.

**Defaults (`createDefault`)**: all attributes 1, all skills 0 with empty specialization, tracks
with no marks and bonus 0, empty lists, `despair: false`, `desperation: 0`, `danger: 0`.

### Derived values (not stored)

| Value            | Formula                                   | Clamp |
| ---------------- | ----------------------------------------- | ----- |
| Health length    | `stamina + 3` + `health.bonus`            | 1–15  |
| Willpower length | `composure + resolve` + `willpower.bonus` | 1–15  |
| Experience left  | `experience.total − experience.spent`     | none  |

### Health and Willpower marks (revised 2026-09-15)

Each box holds one condition mark: `slash` = Superficial, `cross` = Aggravated. Clicking a box
cycles empty → slash → cross → empty; the player keeps aggravated marks first and upgrades a mark
on a full track (no automation, as with Star Wars health). When the length shrinks, marks past
the last box are kept and reappear when it grows.

### Catalog entries (Hunter module)

| Catalog            | Entry fields                                                      | Count |
| ------------------ | ----------------------------------------------------------------- | ----- |
| `v5-hunter-creeds` | `id`, `name`, `summary` (own words, one line)                     | 5     |
| `v5-hunter-drives` | `id`, `name`, `summary`                                           | 7     |
| `v5-hunter-edges`  | `id`, `name`, `category` (assets/aptitudes/endowments), `summary` | 12    |
| `v5-hunter-perks`  | `id`, `name`, `edge` (edge id), `edgeName`                        | 49    |

Names are translated through `translations/source/{en,ru}/data/` YAML; summaries are project-written.

### Templates

- Shipped: `v5-hunter-sheet`, `v5-hunter-brief` (`systemId: 'v5'`, `documentKind: 'character'`).
- User copies keep `systemId: 'v5'`; compatibility requires matching `systemId` and `documentKind`
  (D2). Binding coordinates are listed in
  [contracts/template-bindings.md](contracts/template-bindings.md).

### Migrations

- Store version unchanged (3). Hunter definition starts at `schemaVersion: 1`; `migrate` is the
  identity until a later schema change.

### Translation sources (layered like the code)

| File                                            | Owner      | Content                                   |
| ----------------------------------------------- | ---------- | ----------------------------------------- |
| `translations/source/*/ui/sheet/policies.yaml`  | generic    | policy labels and own-words explanations  |
| `translations/source/*/ui/sheet/tracks.yaml`    | generic    | track length regulator, row reordering    |
| `translations/source/*/ui/sheet/v5.yaml`        | V5 ruleset | attributes, skills, core sections         |
| `translations/source/*/ui/sheet/v5-hunter.yaml` | Hunter     | hunter fields, sections, views, summaries |
| `translations/source/*/data/v5-hunter.yaml`     | Hunter     | creed/drive/edge/perk names               |

## Implementation notes (2026-09-15)

Deviations from the model above, decided during implementation:

- **Advantages and flaws** are two merit/flaw lists (`advantages`, `flaws`, entries
  `{ id, label, points 1–5 }`) instead of one rows table with a `kind` column — they reuse the
  existing merit/flaw list molecule, with a new generic `polarity` on list bindings.
- **Edges and Perks** (revised 2026-09-15) are two rows tables: Perks name their Edge as text,
  filled from the catalog when a book Perk is picked.
- **Catalog name translations** are one YAML file per catalog
  (`translations/source/<locale>/data/v5-hunter-{creeds,drives,edges,perks}.yaml`), because
  catalog localization is keyed by catalog id; UI strings for the Hunter module are in
  `ui/sheet/v5Hunter.yaml`, shared V5 strings in `ui/sheet/v5.yaml`, generic ones in
  `ui/sheet/policies.yaml` and `ui/sheet/tracks.yaml`.
- **Dark Pack** badge: shown bottom-left on sheets, full statement on `docs/v5/dark-pack` (revised 2026-09-15).
- **Reuse of existing elements** (revised 2026-09-15): Health/Willpower are condition tracks,
  Desperation/Danger resource ratings, skills keep the WoD specialization text; the severity
  track, tag-list input, and `tags` column were removed.
