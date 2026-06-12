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

- [/] **Documentation:** Write Docusaurus docs about the system built
- [ ] **Droid & Vehicle Characters:** Add vehicle char list and droid specifics to main character sheet
- [/] **i18n internalization:** Add support for multiple languages
- [x] **Dice rolls**: Add dice roll visualizer - UI/UX; dice pool, history of rolls, etc.
- [x] **3D Dice Rolls:** Implement flexible dice rolls in 3D
- [ ] **Database + Auth:** Replace localStorage with a proper database + authentication layer
- [ ] **Trait System:** Add list of traits (merits/flaws) usable in character sheets with mechanical effects + mechanism for adding custom traits
- [ ] **Item Catalog:** Add pre-existing items list (lasers, lightsabers, food, drinks, etc.) — players can add items to inventory or create new items in their db
- [ ] **Vehicle Catalog:** Add pre-existing vehicles with their own character lists
- [ ] **Creature Catalog:** Add pre-existing creatures with their own character lists
- [ ] **WoD Systems:** Start implementing other systems (e.g., original WoD's VtM)

### Minor

- [ ] Make a bunch of tabs in Dice Pool (when there will a need for new systems, e.g. Pathfinder) look useful
    - Show 3-4 frequently used ones
    - The "More" button → bottom sheet with a full list, search and the ability to add to favorites
- [ ] Discord hooks (Only after we have a Backend as discord hooks is a sensitive info)
- [ ] Inline dice rolls
- [ ] Lazy load of 3d dices packages (three, cannon-es, etc.)
