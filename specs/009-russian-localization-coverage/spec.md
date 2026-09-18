# Feature Specification: Complete Russian Localization with Verified Coverage

**Feature Branch**: `009-russian-localization-coverage`

**Created**: 2026-09-19

**Status**: Draft

**Input**: User description: "Let's take on T-021, T-060, and the other translation tasks. The main goal is to validate the existing translations, fill the gaps, and confirm that every interface element, data entry, and documentation page has a Russian translation. Per one of the tasks, most selectable fields use the 'Russian (English)' format. A verifier script, similar to the one in `context/`, should parse the whole codebase to find these gaps. Also consider this case: a Russian-speaking player who has always played from the English core book wants to try Russian. A skill such as 'Воровство' means nothing to them, because they know it by its English name. Duplicating both names the way pickers do is a bad fit: the specialization inputs between skill names and dots would no longer fit. The Russian WoD Animal Ken label already leaves very little room. Find an intuitive way for the player to understand and remember what they are looking at without cluttering the interface."

Backlog tasks covered: T-021 (UI i18n migration), T-060 (localized equipment item cards),
T-022 (catalog data i18n), T-062 (Star Wars pickers with book names), T-061 (V5/Hunter Russian
terminology review), T-023 (translation source audit). Existing foundation: T-020 (YAML
translation sources, typed adapters, locale/key/placeholder mirror validation, status command)
and the documentation-page existence check.

## Clarifications

### Session 2026-09-19

- Q: What does the hint show when a template author renames a book-defined field (for example "Воровство" → "Карманничество" in a fantasy re-skin)? → A: The link to the book term is stored separately from the label and survives renaming; the hint keeps showing the English book name, and the template editor offers a per-field switch to turn the hint off.
- Q: How does the reader learn that a label has an English-name hint? → A: No persistent marker on labels. A one-time dismissible notice on the first Russian sheet the reader opens explains that tapping or hovering a trait name shows the English term, and the desktop cursor over such labels signals help.
- Q: What happens to templates already edited before this feature, where renaming dropped the book-term link? → A: No migration; there are no active users with such templates yet. Those fields stay literal labels without a hint, and FR-016a applies to renames made from now on.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Russian reader sees no English interface text (Priority: P1)

A Russian-speaking reader opens the Russian build of the site and works through the home page, the
docs, the character manager, a Star Wars sheet, a Hunter sheet, the template editor, catalogs, the
dice roller with its settings and history, and the Discord sharing dialog. Every button, label,
placeholder, tooltip, accessible name, empty state, toast, validation message, and confirmation
dialog appears in Russian. This includes the weapon, armor, and inventory item cards shared by
all sheets.

**Why this priority**: this is the core promise of a Russian build. A half-translated interface
does more harm than an English-only one because it looks unfinished.

**Independent Test**: switch to the Russian build, walk the route list above, and confirm that no
English user-facing text appears except items on the approved exception list.

**Acceptance Scenarios**:

1. **Given** the Russian build, **When** the reader opens the home page, **Then** all headings, descriptions, and calls to action are in Russian.
2. **Given** a Star Wars or Hunter sheet in the Russian build, **When** the reader adds a weapon, armor, or inventory item, **Then** the card's buttons, field labels, placeholders, and accessible names are in Russian.
3. **Given** the dice roller in the Russian build, **When** the reader rolls, opens settings, opens history, or gets a Discord delivery error, **Then** every message is in Russian.
4. **Given** the English build, **When** the reader walks the same routes, **Then** nothing that worked in English regresses.

---

### User Story 2 - Contributors get a coverage verifier that catches gaps (Priority: P1)

A contributor adds a component with a hard-coded English label, a catalog entry without a Russian
name, an English page without a Russian counterpart, or a picker that shows only one language.
Running the verification pipeline reports each gap with its file and location and fails. The
contributor can also run the verifier on its own to get a coverage report across interface
strings, catalog data, and documentation.

**Why this priority**: coverage cannot be confirmed by hand, and without an automatic check the
translation decays with every new feature. The verifier also produces the work list for the rest
of this spec.

**Independent Test**: add a deliberately untranslated label, an untranslated catalog name, and
a missing Russian doc page to a scratch branch. The verifier reports all three with their
locations and returns a failing result. Removing them makes it pass.

**Acceptance Scenarios**:

1. **Given** a component that renders a literal user-visible English string outside the translation sources, **When** the verifier runs, **Then** it reports the file, line, and string.
2. **Given** a translation key used in code that is missing from the English or Russian source, **When** the verifier runs, **Then** it reports the key and locale.
3. **Given** a Russian translation value identical to its English value, **When** the verifier runs, **Then** it flags the value as a probable untranslated copy, unless the value is on the exception list (proper names, abbreviations, dice notation).
4. **Given** a catalog entry whose user-facing fields lack Russian values, **When** the verifier runs, **Then** it reports the catalog, the entry, and the missing fields.
5. **Given** an English documentation page with no Russian counterpart, or a Russian page that still holds English prose paragraphs, **When** the verifier runs, **Then** it reports the page.
6. **Given** a picker that shows catalog entries without the bilingual format, **When** the verifier runs, **Then** it reports the picker.
7. **Given** a deliberate exception, **When** a contributor records it on the exception list with a reason, **Then** the verifier stops reporting it and prints the exception count in its summary.
8. **Given** a translation key present in the sources but used nowhere, **When** the verifier runs, **Then** it reports the key as unused, as a warning that does not fail the check.

---

### User Story 3 - Pickers show "Русский (English)" names everywhere (Priority: P2)

A Russian reader picks a species, merit or flaw, ability, Force power, piece of equipment,
vehicle, creature, Hunter edge, perk, creed, or drive. Each option reads "Русское название
(English name)", the same way Hunter pickers already do, and typing either the Russian or the
English name finds it.

**Why this priority**: pickers are where players cross-reference the English book most often, and
the bilingual format costs nothing there because the option list has room.

**Independent Test**: open each Star Wars and Hunter picker in the Russian build, type a Russian
name, then an English name, and confirm that both find the entry and the option shows both names.

**Acceptance Scenarios**:

1. **Given** the Russian build, **When** the reader opens any catalog picker, **Then** each option shows "Russian (English)".
2. **Given** a picker, **When** the reader types part of the English name, **Then** the entry appears in the results.
3. **Given** an entry chosen from a picker, **When** it is shown in a sheet row, **Then** the row shows only the Russian name, and the English name stays available through the original-term hint (User Story 4).
4. **Given** the English build, **When** the reader opens a picker, **Then** options show only the English name, with no redundant parentheses.

---

### User Story 4 - A veteran of English books recognizes terms without clutter (Priority: P2)

A player who has always played from the English core book switches to Russian. The sheet row
"Воровство" means nothing to them, because they know the skill as "Larceny". Without leaving the
sheet, they can find out and remember which English term each Russian label stands for, while the
row keeps its current layout: label, specialization input, and dots.

**Why this priority**: this keeps players from migrating to the English build. It is also what
makes the Russian build usable at a table where people speak Russian but learned the game in
English.

**Independent Test**: in the Russian build, on a phone and on desktop, find the English name of
five skills on a Hunter sheet within 10 seconds each, without opening another page. Confirm that
the row layout and the specialization input width did not change.

**Acceptance Scenarios**:

1. **Given** a sheet in the Russian build, **When** the reader hovers over or keyboard-focuses a trait label on desktop, **Then** a hint shows the English book name (for example "Larceny") near the label without shifting the layout.
2. **Given** a touch device, **When** the reader taps a trait label, **Then** the same hint appears, and tapping elsewhere dismisses it. The tap does not change the trait's value.
3. **Given** the reader-level "Game terms" preference, **When** the reader chooses "English", **Then** game-term labels (attributes, skills, disciplines, edges, and similar) on sheets show their English book names while the rest of the interface stays Russian, and the Russian name moves into the hint.
4. **Given** "Game terms" set to "Russian" (the default), **When** the reader views a sheet, **Then** labels carry no persistent marker and no extra text in the row; on the first Russian sheet the reader ever opens, a one-time dismissible notice explains that hovering or tapping a trait name shows its English term.
5. **Given** the documentation in Russian, **When** a game term first appears on a page, **Then** it is written as "Russian (English)", and later mentions on the same page use the Russian name only.
6. **Given** a custom trait created by the user, **When** it has no book name, **Then** no hint is shown for it and its label does not signal one on hover.
7. **Given** a template in which the author renamed a book-defined field, **When** the reader views the sheet, **Then** the label shows the author's name and the hint still shows the English book name, unless the author turned the hint off for that field.

---

### User Story 5 - Long Russian labels fit their rows (Priority: P2)

On a WoD sheet, the Russian skill "Обращение с животными" (Animal Ken), and every other label
longer than its English original, fits its row without pushing the specialization input below a
usable width and without hiding part of the name for good.

**Why this priority**: Russian labels are often 30–60% longer than English ones. The sheet was
laid out for English, so a Russian player gets cramped or broken rows exactly where they type
specializations.

**Independent Test**: render every shipped sheet in the Russian build at the smallest supported
phone width and at the desktop layout, then confirm that each trait row shows a readable label, a
specialization input with room for at least 8 characters, and the dots on one visual row group.

**Acceptance Scenarios**:

1. **Given** a label that does not fit its available width, **When** the row renders, **Then** it shows the approved short form from the glossary (for example an abbreviation), and the full Russian name plus the English book name stay available in the hint.
2. **Given** any trait row at the smallest supported width, **When** it renders, **Then** the specialization input keeps room for at least 8 visible characters.
3. **Given** the glossary, **When** a term has no approved short form and its full name overflows at the smallest supported width, **Then** the verifier or layout test reports it.

---

### User Story 6 - Catalog content and terminology are consistent in Russian (Priority: P3)

A Russian reader browses Star Wars docs pages and catalogs (skills, Force powers, virtues,
merits and flaws, equipment, vehicles, creatures, species) and Hunter catalogs, and sees the
same Russian term for the same concept on sheets, in pickers, in catalogs, and in docs.

**Why this priority**: consistency is what makes the Russian build trustworthy, but it depends
on the coverage work in Stories 1–3.

**Independent Test**: pick 20 terms from the glossary. For each, confirm that the sheet, the
picker, the catalog, and the docs use the glossary's Russian form.

**Acceptance Scenarios**:

1. **Given** the glossary, **When** a Russian term differs from its glossary form in interface strings, catalog data, or docs, **Then** the verifier reports the mismatch.
2. **Given** Star Wars catalog pages in the Russian docs, **When** the reader opens them, **Then** entry names and short descriptions are in Russian, with the English name kept for reference.
3. **Given** the V5/Hunter terms chosen during spec 008, **When** the glossary review is done, **Then** each term (module name, Storyteller, Touchstones, Edges/Perks, Creed/Drive, Advantages, gear) has one reviewed Russian form that every source follows.

---

### Edge Cases

- A user-typed value (character name, custom trait, notes) is never translated and never flagged by the verifier.
- Identifiers that look like text (dice notation such as `3d10>=6`, CSS class names, storage keys, log messages, test fixtures, developer-only errors) are not user-facing and are not flagged.
- Proper names that stay the same in both languages (Dark Pack, Discord, planet names chosen to stay in Latin script) are recorded on the exception list with a reason instead of being translated.
- A catalog entry has a Russian name but no Russian description: the picker still shows the bilingual name, the catalog shows the English description, and the verifier reports the missing description.
- Documents saved in one language are opened in the other: the stored data contains stable identifiers, not display names, so labels follow the reader's language. An older document that stored display text keeps showing it unchanged.
- Document export writes data only (no labels) and there is no print view, so export is unaffected by the locale and the "Game terms" preference.
- The hint on a trait label must not interfere with editing: focusing the specialization input or clicking dots never opens it.
- Screen-reader users get the English book name as an accessible description of the label, not as a second label.
- A template edited before this feature, where a rename already dropped the book-term link, is not migrated: the field keeps its literal label and shows no hint. The verifier does not report user-edited templates stored in the browser; it only checks shipped templates.
- Plural and number forms in Russian (1 кубик / 2 кубика / 5 кубиков) are rendered correctly wherever counts appear in text.

## Requirements _(mandatory)_

### Functional Requirements

**Interface coverage (T-021, T-060)**

- **FR-001**: Every user-visible string in the application interface — sheets, template editor, character manager, catalogs, dice roller, integrations, shared components, site shell, and home page — MUST come from the translation sources and exist in both English and Russian.
- **FR-002**: Accessible names and descriptions, placeholders, tooltips, toasts, empty states, validation and error messages, and confirmation dialogs MUST be covered by FR-001 in the same way as visible labels.
- **FR-003**: Weapon, armor, and inventory item cards MUST be fully localized once and reused by every system's sheets.
- **FR-004**: Text that includes counts MUST use the correct Russian plural forms.

**Coverage verifier (T-023)**

- **FR-005**: The project MUST provide a translation coverage verifier that scans application source code, translation sources, catalog data, and documentation, then reports every gap with its location (file and line, or catalog and entry, or page).
- **FR-006**: The verifier MUST detect: (a) user-visible string literals in interface code that bypass the translation sources; (b) translation keys used in code but missing in any locale; (c) keys present in only one locale; (d) Russian values identical to their English values; (e) catalog entries missing Russian values for user-facing fields; (f) English documentation pages without a Russian counterpart; (g) Russian documentation pages that contain English prose paragraphs; (h) catalog pickers that do not use the bilingual label format; (i) Russian terms that contradict the glossary.
- **FR-007**: The verifier MUST detect string literals by parsing the code structure, not by pattern matching on raw text alone. It MUST ignore non-user-facing positions (class names, storage keys, identifiers, imports, test files, developer-only logging) through rules that are documented in one place.
- **FR-008**: Intentional exceptions MUST live in one reviewed exception list, where each entry carries a reason. The verifier MUST print the number of active exceptions and MUST report exceptions that no longer match anything.
- **FR-009**: Unused translation keys MUST be reported as warnings that do not fail the check.
- **FR-010**: The verifier MUST run as part of the standard verification pipeline and fail it on any error-level finding. It MUST also be runnable on its own and print a per-area coverage summary (interface, catalog data, documentation) in the existing translation status report.

**Validation of existing translations**

- **FR-011**: All existing Russian interface strings, catalog values, and documentation pages MUST be reviewed against the glossary and against the verifier findings. Every error-level finding is fixed before this feature is complete.
- **FR-012**: The existing mirror validation (missing keys, placeholder parity) MUST remain in force. The new verifier extends it and does not duplicate or weaken it.

**Bilingual pickers (T-062)**

- **FR-013**: In the Russian build, every picker or suggestion list that offers catalog entries MUST show each option as "Russian name (English name)". In the English build it MUST show the English name only.
- **FR-014**: Picker search MUST match both the Russian and the English name, case-insensitively and ignoring the letter ё/е distinction.
- **FR-015**: A chosen entry MUST be stored by its stable identifier, and sheet rows MUST display it in the reader's language without the parenthesized English name (the hint from FR-016 provides it).

**Original-term recall (veteran players)**

- **FR-016**: In the Russian build, every sheet label for a book-defined game term MUST provide its English book name as an on-demand hint: shown on hover and keyboard focus on desktop and on tap on touch devices, dismissed by moving away or tapping elsewhere, and never changing the row layout or the trait value.
- **FR-016a**: A field's link to its book term MUST be stored separately from its display label. Renaming the field in the template editor MUST NOT remove that link. The template editor MUST show which book term a field is linked to and offer a per-field switch to turn its hint off; the switch is saved with the template, and exported templates keep both the link and the switch.
- **FR-016b**: The hint MUST NOT add meaningful weight to sheets: English book names come from data already shipped with the page (no extra downloads), a sheet uses at most one hint surface at a time that is created on first use, and labels without an open hint carry no per-label overlay content.
- **FR-017**: Labels that have a hint MUST NOT carry a persistent visual marker. Discovery MUST come from (a) a one-time, dismissible notice shown on the first Russian sheet a reader opens, remembered per reader once dismissed and re-openable from the "Game terms" preference, and (b) a help cursor over hint-bearing labels on pointer devices. Labels without a book name (custom traits) MUST NOT show the help cursor.
- **FR-018**: Readers MUST be able to choose a "Game terms" preference with the values "Russian" (default), "English", and "Russian without hints". The preference changes game-term labels on sheets only, persists for that reader, and is reachable from the sheet toolbar, which is the sheet's settings surface.
- **FR-019**: Screen readers MUST announce the English book name as a description of the label, not as part of its name.
- **FR-020**: In the Russian documentation, the first mention of a game term on each page MUST be written as "Russian (English)". Later mentions on the same page use the Russian name.

**Long labels (Animal Ken and similar)**

- **FR-021**: At the smallest supported phone width and in the desktop layout, every trait row on every shipped sheet MUST show a readable label, a specialization input with room for at least 8 visible characters, and its dots, without horizontal scrolling.
- **FR-022**: When a full Russian label cannot fit, the row MUST show the short form approved in the glossary. The full Russian name and the English book name remain available through the hint from FR-016.
- **FR-023**: Every term that overflows at the smallest supported width MUST have an approved short form. An overflowing term without one is a verification failure.

**Catalog data and terminology (T-022, T-061)**

- **FR-024**: User-facing fields of Star Wars catalogs (species, skills and abilities, Force powers, virtues, merits and flaws, equipment, vehicles, creatures, and the smaller embedded lists on docs pages) MUST have Russian names for 100% of entries and Russian short descriptions for at least 90% of entries in each catalog; enumerated values (categories, types, eras, tags) MUST all be translated. Where a Russian description is missing, the English one is shown and the gap is listed in the coverage report.
- **FR-025**: One glossary MUST record, for each game term, its English book name, the approved Russian form, and an optional approved short form. Interface strings, catalog data, and documentation MUST follow it.
- **FR-026**: The V5/Hunter terms chosen during spec 008 MUST be reviewed and entered into the glossary, and every source MUST be updated to match.
- **FR-027**: Russian catalog text MUST be written in the project's own words, following the third-party material principle. No verbatim passages from official Russian or English books.

### Key Entities

- **Translation source entry**: one user-facing message with a stable key, an English value, a Russian value, and optional placeholders and plural forms.
- **Catalog localized fields**: for each catalog entry, the user-facing fields (name, short description, and similar) in each locale, keyed by the entry's stable identifier.
- **Book-term link**: a field's reference to a book-defined game term (a system message or catalog entry), independent of the field's display label; carries the author's hint on/off choice.
- **Glossary term**: an English book name, the approved Russian form, an optional short form, the systems it applies to, and an optional note on the chosen translation.
- **Exception list entry**: a location or value the verifier must not report, with the reason and the finding kind it suppresses.
- **Coverage report**: per-area counts of covered, missing, and excepted items, plus the list of findings with severity (error or warning) and location.
- **Game terms preference**: the reader's choice of how game-term labels are shown; it is stored per reader and does not affect other readers or saved documents.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A walkthrough of the Russian build over the routes in User Story 1 finds 0 English user-facing strings outside the exception list.
- **SC-002**: The verifier reports 0 error-level findings on the main branch, and it catches 100% of deliberately planted gaps (one of each kind from FR-006) in a test run.
- **SC-003**: 100% of catalog pickers in the Russian build show bilingual options and find entries by either name.
- **SC-004**: A player who knows only the English book terms finds the English name of any sheet label in under 10 seconds, on first try, on both phone and desktop, without leaving the sheet.
- **SC-005**: At the smallest supported phone width, 100% of trait rows on shipped sheets keep a specialization input with room for at least 8 visible characters.
- **SC-006**: 100% of user-facing fields in shipped catalogs have a Russian name, and at least 90% of short descriptions have a Russian value, with the rest listed in the coverage report.
- **SC-007**: For 20 randomly chosen glossary terms, the sheet, picker, catalog, and docs use the same Russian form in 100% of cases.
- **SC-009**: Opening and editing the largest shipped sheet with hints enabled takes no more than 5% longer than with hints turned off (checked manually per quickstart §5; the automated test only catches gross regressions), and the page downloads no additional data for hints.
- **SC-008**: The verifier finishes a full scan in under 30 seconds on a contributor machine, so it can stay in the standard pipeline.

## Assumptions

- Russian is the only second locale in scope. The verifier and glossary are built so another locale could be added later, but no third locale ships with this feature.
- The existing YAML translation sources, generated adapters, mirror validation, documentation-page check, and status command (T-020) remain the foundation. No second localization runtime is introduced.
- `context/localization_example/validator.js` is the reference for the verifier's report style (missing, extra, used-but-absent, present-but-unused keys). The new verifier goes further by parsing interface code instead of relying on one call-pattern regex.
- The default original-term mechanism is a hint on hover, focus, or tap, plus the reader-level "Game terms" preference. Always-visible bilingual labels on sheet rows are rejected because they break the specialization input width, which is the constraint the user named.
- Short forms for overflowing labels are approved as part of the glossary review. The hint and one-time notice styling follow the existing design language (Principle VI) and are chosen during planning.
- The "smallest supported phone width" is the narrowest width the sheets already target. This feature does not change it.
- Russian catalog descriptions are paraphrased summaries in the project's own words, consistent with T-037. Descriptions without a reviewed paraphrase fall back to English and are tracked in the coverage report rather than blocking the feature.
- Repository working documents (specs, TODO/TOFIX, code comments) stay English-only, per Principle VI.
- The newcomer hallway test that remains for T-038 is not part of this feature.
