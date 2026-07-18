# TODO

Tasks are grouped by **area** (logical dependency) and ordered by priority within each area.
Each task includes: name, description, priority, effort, impact, and dependencies.

---

## Legend

- ✅ **DONE** — fully implemented (see [CHANGELOG.md](CHANGELOG.md))
- 🟡 **IN PROGRESS** — partially implemented
- ⬜ **NOT DONE** — not started

---

### Major

- [x] **Documentation:** Write Docusaurus docs about the system built
    - ✅ Full 29-file docs across 10 sections (core rules, character creation, combat, vehicles, GM section, bestiary, example of play)
- [ ] **Droid & Vehicle Characters:** Add vehicle char list and droid specifics to main character sheet
- [x] **Dice rolls**: 3D dice roller with physics, sound, 2D SVG fallback, roll history
- [x] **Trait System:** Data catalog for species, backgrounds, merits/flaws, Force powers, abilities — mechanical effects integration pending
- [x] **Item Catalog:** Ranged/melee weapons, armor, consumables, tools with search/sort/filter
- [x] **Vehicle Catalog:** 200+ vehicle entries with scale badges, stat display, weapon details
- [x] **Creature Catalog:** Creature stat blocks with scale classification
- [x] **i18n docs translation:** English and Russian documentation complete
- [/] **WoD (VtM 2e) System Docs:** Structure started — clans, disciplines, Blood Points, Humanity
- [ ] **Database + Auth:** Replace IndexedDB/localForage with proper database + authentication

### Minor

- [ ] **Lazy load 3D packages:** three.js, cannon-es lazy loading for perf
- [x] **Inline dice rolls** in documentation
- [ ] **Multi-system dice pool tabs:** Show tabs for D&D, Pathfinder, etc. with favorites
- [ ] **Discord webhooks:** Dice roll output to Discord (backend required)
- [x] **Character context & presets** (CharacterContext, presets.ts)
- [x] **Empty character name placeholder** (default name is `''` instead of `'New Character'`)
