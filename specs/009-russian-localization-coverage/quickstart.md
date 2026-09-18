# Quickstart: Validating Russian Localization Coverage

Prerequisites: `yarn install`; a Hunter character and a Star Wars character in the local document
store (create them from the sheet page if needed). Run the Russian site with `yarn start --locale ru`
and the English one with `yarn start`. Browser devtools device mode at 360 px width is used for the
phone checks.

## 1. Verifier catches planted gaps (US2, SC-002)

1. `yarn i18n:verify` on a clean tree → exit 0 once every area is gated; the summary table shows
   `missing 0` for interface and docs.
2. On a scratch branch, plant one gap of each kind:
    - JSX text `<span>Planted label</span>` in any sheet component;
    - `translate(uiMessages.sheet.base.<new key>)` with the key only in `en`;
    - a ru YAML value copied verbatim from en;
    - remove one `name` from `translations/source/ru/data/species.yaml`;
    - delete one ru docs page, and add an English paragraph to another;
    - build one picker option list with `entry.name` instead of `pickLabel`;
    - change the ru message at a glossary ref.
3. `yarn i18n:verify` → one error per planted gap with its location (contracts/verifier-cli.md);
   exit 1. `git stash` → exit 0.
4. Add an exception without `reason` → error; add one that matches nothing → warning.

## 2. No English in the Russian interface (US1, SC-001)

Walk, in the Russian build: home page; docs index; character manager (create, import, delete
confirmation); Star Wars full and brief sheets; Hunter full and brief sheets; add a weapon, armor, and
inventory item on each (T-060); template editor; a docs catalog page (merits and flaws); the dice roller
(roll, settings, history, a failed Discord delivery with a bad webhook URL). Expected: no English text
except entries in `translations/i18n-exceptions.yaml`; counts read "1 документ / 3 документа /
5 документов". Repeat the route in the English build: no regressions.

## 3. Bilingual pickers (US3, SC-003)

In the Russian build open each picker: species, merits/flaws, abilities, Force powers, weapons, armor,
gear, vehicles, creatures, Hunter edges/perks/creeds/drives. For each: options read "Русское (English)";
typing a fragment of the English name finds the entry; typing a Russian fragment with "е" finds a name
spelled with "ё". Pick an entry → the sheet row shows only the Russian name. Switch to the English
build → the same row shows the English name. Rename the item → the rename survives a locale switch.

## 4. Book-term hint (US4, SC-004)

1. Clear site data, open a Hunter sheet in the Russian build → the one-time notice appears; dismiss it;
   reload → it stays hidden.
2. Desktop: hover "Воровство" → after a short delay a popover shows "Larceny"; Tab to the label →
   the popover opens; Esc closes it. Clicking dots or typing a specialization never opens it.
3. Phone (360 px, touch emulation): tap the label → popover; tap elsewhere → closes; the value did not change.
4. Time five lookups of English names without leaving the sheet: each under 10 s.
5. "Game terms" menu → English: skill labels show "Larceny", the rest of the UI stays Russian, the
   hint shows "Воровство". "Russian without hints": no popovers, labels are no longer tab stops.
6. Screen reader (Orca or NVDA): focusing the label announces "Воровство", then "Larceny" as a description.
7. Custom trait "Кулинария" → no hint, normal cursor.

## 5. Template editor and hint performance (FR-016a, SC-009)

1. Template editor → Hunter sheet copy → rename "Воровство" to "Карманничество" → the field shows
   "Book term: Larceny" and the hint toggle is on. Save → the sheet shows "Карманничество" with the
   hint "Larceny". Turn the toggle off → no hint. Export the template, import it on a clean profile →
   the rename, link, and toggle survive.
2. Performance: `yarn test term-hint.perf` prints hints-on vs. hints-off render time for the largest
   shipped sheet; the ratio is ≤ 1.05. Devtools Network: no request is made when a hint opens.

## 6. Long labels (US5, SC-005)

At 360 px open every shipped sheet (Star Wars character, creature, fodder, vehicle; Hunter full and
brief). Every trait row keeps a specialization input showing at least 8 characters; "Обращение с
животными" shows its glossary short form and the hint shows the full name and "Animal Ken".
`yarn i18n:verify --rule overflow` → no findings.

## 7. Catalog content and terminology (US6, SC-006, SC-007)

1. `yarn i18n:status` → catalog area: 100% names, ≥ 90% short descriptions; the remaining descriptions
   are listed.
2. Pick 20 random glossary terms; for each compare the sheet label, picker option, docs catalog cell,
   and first mention in the docs page: all use the glossary `ru` form, and the docs first mention is
   "ru (en)".

## 8. Pipeline

`yarn verify:fast` runs `build:translations --check` and `validate:i18n` and passes; `yarn verify:full`
passes before merge (new route-level shared component and generated file).
