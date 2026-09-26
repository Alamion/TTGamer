# Contract: WoD 2e ruleset and the Star Wars setting

## Layers

```text
systems/wod-like/            shared WoD-family builders (profile, trait/resource/track bindings,
                             dotsTrait, classic dice pool) — unchanged role
systems/wod2e/
├── ruleset/                 engine: Wod2eCoreShape + migrate helpers, neutral classic profile,
│                            bindings builder (kinds + catalog ids as parameters), template parts
│                            (attributes, abilities, virtues + willpower, health, advantages,
│                            equipment, experience, standard formulas), dice
└── index.ts                 engine plugin `wod-2e`: definition `wod2e-character`, views
                             `wod2e-sheet` / `wod2e-brief`, coreDefinitions, no policies
systems/star-wars-wod/       setting: StarWarsShape, profile variant (SW abilities, Force skills,
                             FP/DSR, vehicle damage), Force/droid/entity bindings, catalogs and
                             adapters, examples, pages composed from ruleset parts, docs links
```

- The Star Wars plugin imports the WoD 2e ruleset. The engine never imports Star Wars.
- ESLint `no-restricted-imports` covers `systems/wod2e/` like every other system folder. The
  allowed importers are unchanged (`systems/index.ts`, `docsEmbeds.tsx`, the legacy path in
  `store/documentStore.ts`), and `systems/star-wars-wod/**` is added as an allowed importer of
  `systems/wod2e/ruleset/**` only.

## Frozen identities (must not change)

| Identity                  | Values                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| systemId                  | `star-wars-wod`                                                                                         |
| definition ids / kinds    | `character`, `droid` (kind `character`), `creature`, `vehicle`, `fodder-group` (kind `group`)           |
| view ids + legacy ids     | `full-sheet`, `brief` (`npc-card`), `droid-sheet`, `droid-brief`, `creature-*`, `vehicle-*`, `fodder-*` |
| coordinates / data fields | every trait key, resource id, identity field key, and data field name of the envelope                   |
| docs embed parameters     | `template`, `node`, `systemId`, example ids                                                             |

## Parity guarantees (tested)

1. **Parse parity**: every Star Wars fixture document (character, droid, creature, vehicle,
   fodder, the legacy `characters[]` path) parses to a deeply equal value before and after the
   split.
2. **Page parity**: shipped Star Wars templates serialize byte-identically
   (`fixtures/character-templates.pre-007.json` plus snapshots for entity pages).
3. **Dice parity**: `traitPool` output is unchanged for every `(value, flags)` pair in
   `dice-rules.test.ts`.
4. **Notice parity**: Star Wars documents and exports carry the same policies as before
   (none). The Dark Pack covers V5 material only (constitution 1.4.2, research R20).
5. **Store parity**: no store version bump and no `RENAMED_SYSTEM_IDS` entry for this change.
   Persisted documents, overrides (after the separate T-046 re-key), custom templates, and
   files load unchanged.

## Engine character (`wod-2e` / `wod2e-character`)

- Data: `Wod2eCoreShape` only. No Force, droid, implants, species, or home world.
- Abilities: classic Talents / Skills / Knowledges names (translated in
  `ui/sheet/wod2e.yaml`; Russian terms queued for glossary review).
- Pages: `wod2e-sheet` (full) and `wod2e-brief`, built only from ruleset parts.
- Dice: the classic pool. Catalogs: none shipped (merits and backgrounds are free entries).
- Policies: none. The Dark Pack covers World of Darkness 5th Edition only, so the sheet shows no
  badge and exports carry no notice.
- `coreDefinitions: ['wod2e-character']`, so user settings may be built on it.
