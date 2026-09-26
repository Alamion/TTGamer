# Quickstart: validating the library tree

## Prerequisites

- `yarn install` is done. The dev server runs at http://localhost:3000. Check before starting a
  new one.
- Open `/universal_sheet`, then the toolbar's library button.
- Example data (spec 012):
    - a user setting "Ashen Realms" on V5, with a user type "Cult" and one page;
    - a user type "Organization" in Star Wars;
    - one edited shipped Star Wars page.

## Automated checks

```bash
yarn test tests/sheet_manager/library-tree.test.ts        # tree derivation, placement, counts
yarn test tests/sheet_manager/library-moves.test.ts       # canMove, page/type/setting plans, FR-015a
yarn test tests/sheet_manager/library-file.test.ts        # export closure, file round trip, legacy files
yarn test tests/sheet_manager/library-import.test.ts      # states, Replace, Keep both remap
yarn test tests/sheet_manager/library-dialog.test.tsx     # UI contract: keyboard, drag, forms, modes
yarn test tests/sheet_manager/document-type-store.test.ts # v1 → v2 migration
yarn test tests/docs/template-editor-guide.test.ts        # guide anchors in both locales
yarn verify:full                                          # everything, including build (config + docs paths change)
```

## Manual scenarios

| #   | Steps                                                                                                      | Expected                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the library.                                                                                          | Two rulesets. WoD 2e holds "Rules only" and Star Wars. V5 holds "Rules only", Hunter, and Ashen Realms (_yours_). The Organization type sits under Star Wars (SC-001).                                  |
| 2   | Select WoD 2e, choose **New setting** "Misty Archipelago", then **New type** "Ship".                       | The setting lists the core character and Ship, and neither has a page. Ship's details say it shows stored values. The core character's details say it uses the "Rules only" page.                       |
| 3   | On Ship, choose **New page**, then **Blank**.                                                              | The editor opens. After saving, the page appears under Ship with ★ (SC-002: steps 2–3 take under 2 minutes).                                                                                            |
| 4   | Drag Cult onto Misty Archipelago.                                                                          | A confirmation opens (_other rules_). After confirming, Cult, its page, and its documents are under WoD 2e. In the editor the page shows binding issues, and the values are kept.                       |
| 5   | Drag Ashen Realms onto WoD 2e with 3 mortals present.                                                      | The confirmation says 3 documents and 1 page stay. After confirming, the mortals sit under V5 "Rules only", open on the same page as before (now a "Rules only" page), and keep their values (FR-015a). |
| 6   | Try to drag "Rules only", a shipped type, or a core character.                                             | They cannot be picked up, and their menu has no **Move…**.                                                                                                                                              |
| 7   | Switch to **Export** and tick only Ship's page.                                                            | Ship and Misty Archipelago are ticked in violet as "added for …". The preview has no shipped content, only addresses. Save the file.                                                                    |
| 8   | Delete Misty Archipelago, then **Import** the saved file.                                                  | Everything is _new_. After **Import selected**, the tree matches step 7 (SC-004).                                                                                                                       |
| 9   | Import the same file again after renaming the page.                                                        | The page shows _conflict_. Choose **Keep both**: both pages exist, and the new one is marked "(imported)" (SC-005).                                                                                     |
| 10  | Import a spec 012 type file and a `ttgamer-template` file.                                                 | Both preview and install.                                                                                                                                                                               |
| 11  | Import `{"format":"x"}`.                                                                                   | An alert names the format problem, and nothing changes.                                                                                                                                                 |
| 12  | Use the keyboard only: arrows, Enter on a page, Shift+F10, Delete.                                         | Every action is reachable without a mouse.                                                                                                                                                              |
| 13  | Narrow the window below 768 px.                                                                            | The Tree and Details tabs appear. Selecting a row shows Details.                                                                                                                                        |
| 14  | Look at the editor (select, Edit/Preview, insertion slots, help) and the library in light and dark themes. | No violet anywhere except the auto-included export and import boxes (SC-006). The storybook palette lists `tertiary`.                                                                                   |
| 15  | With 300 generated user pages, open the library.                                                           | The tree appears in under 1 s (SC-007).                                                                                                                                                                 |
