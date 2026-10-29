# Tasks: Picture badges

> **Rejected (2026-10-29).** Built, then rejected by the maintainer on review: in the documents
> window, letters read better than marks and pictures on PC and phone. Telling characters apart by
> icons stays a good idea for another place. Kept from this spec: the module letters (VtM, HtR) and
> the badge resolution by setting (user setting → module → system). The full code, the approved
> marks, and the SVG cleaner are on the branch `archive/046-picture-badges`. Lesson: icon work is
> first tried as a concept in its real place, not only as icons on a sheet.

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order: US1 (shipped marks and setting badges), then US2 (a setting's own picture). US2
builds on the badge drawing US1 adds. The fix to spec 045's setting badges (`5ec4b0b`) is already on
this branch.

## User Story 1 - Recognize a game by its picture (P1)

**Check**: a Star Wars character, a hunter, and a vampire show their marks with no letters; a V5
Storyteller character and a note show V5 and General; full names on hover and to screen readers.

- [x] T001 [US1] Extend `tests/sheet_manager/documents-badges.test.tsx` first: Star Wars, hunter,
      and vampire rows draw a mask-image `span` (`aria-hidden`) with their mark's site path and no
      letters, named after the setting (Star Wars, Vampire: the Masquerade, Hunter: the Reckoning);
      a V5 Storyteller character shows "V5", a plain WoD 2e character "WoD 2e", a note "General"; a
      hunter beside a vampire is badged (their full names differ); one setting alone is not (FR-001,
      FR-002, FR-009, FR-010, FR-012)
- [x] T002 [US1] `src/sheet_manager/systems/types.ts`: `badgeMark?: string` on `SystemPlugin` and
      `DocumentModule`, `badge?: DocumentViewLabel` on `DocumentModule`; both `badge` doc comments
      say letters name the game line, not only its edition (a D&D ruleset is "D&D 5e")
- [x] T003 [US1] Set `badgeMark: '/img/settings/star-wars.svg'` in `systems/star-wars-wod/index.ts`;
      on the V5 modules in `systems/v5/modules/vampire/definition.ts` and
      `systems/v5/modules/hunter/definition.ts` set `badgeMark` (`vampire.svg`, `hunter.svg`) and
      `badge` from new YAML keys `sheet.v5Vampire.badge` (VtM) and `sheet.v5Hunter.badge` (HtR) in
      `translations/source/{en,ru}/ui/sheet/`; add the letters to
      `translations/i18n-exceptions.yaml`; `yarn build:translations`
- [x] T004 [US1] `src/sheet_manager/features/documents/labeler.ts`: `documentBadge` returns
      `{ badge, name, mark?, picture? }`, resolving the user setting, else the module of the kind's
      first definition (its `badge`, label as full name, `badgeMark`), else the system (design D8)
- [x] T005 [US1] `src/sheet_manager/components/documents/DocumentsTree.tsx` `SystemBadge`: with a
      `mark`, a 12 px `span` masked by the file (`useSitePath` for the absolute URL, set on the
      element, background `currentColor`) instead of the letters; the `title` and `sr-only` full
      name stay (design D1)
- [x] T006 [US1] E2E: in `tests-e2e/smoke/documents.spec.ts`, documents of Star Wars and a V5 module
      show their marks (the smoke run fails on a failed mark request); rerun the documents window
      timing with 3,000 documents against its last value (SC-002) and measure the main chunk
      (SC-004), recorded in design.md
- [x] T007 [US1] Run `yarn verify` and commit the story with the four mark files

## User Story 2 - Upload my setting's own picture (P1)

**Check**: a setting's form takes a small SVG, its documents show it; a script-laden SVG is cleaned
and the form says what was removed; a PNG and an oversized file are refused; removing it brings the
letters back; export and import keep it.

- [x] T008 [US2] Write `tests/shared/svg-picture.test.ts` first: keeps shapes, groups, gradients,
      `url(#id)` fills, and safe `style` properties; removes `<script>`, `on*`, `<foreignObject>`,
      `<image>`, `<use>`, `href`/`xlink:href`, external `url(...)`, and `<style>`, counting each
      kind; refuses non-SVG, nothing left to draw, over 8,192 bytes or 200 elements after cleaning,
      and input over 256 KB; cleaning its own output changes nothing (FR-005, FR-011, SC-003)
- [x] T009 [US2] `src/shared/utils/svgPicture.ts`: `cleanSvgPicture(text)` with the allowlist of
      design D4, returning `{ ok: true, svg, removed }` or `{ ok: false, reason }`
- [x] T010 [US2] `src/sheet_manager/systems/userTypes.ts`: `UserSetting.picture?: string`, cleaned
      by a schema transform that drops a picture failing the cleaner (design D3); a test in
      `tests/sheet_manager/library-file.test.ts` and `type-file.test.ts`: a file whose setting
      carries a script-laden picture imports with the cleaned picture, and export keeps it (FR-005,
      SC-003)
- [x] T011 [US2] Write `tests/sheet_manager/setting-picture.test.tsx` first: the setting form
      uploads an SVG, previews it, shows the removed-parts note; refuses a PNG and an oversized file
      with `role="alert"`, keeping the previous picture; **Remove picture** clears it; saving stores
      the cleaned string through `createSetting` / `renameItem` (FR-004, FR-007, FR-008)
- [x] T012 [US2] `components/dialogs/library/CreateForm.tsx`: the picture row (upload button over a
      hidden file input as in `ImportPreview.tsx`, 32 px preview as `<img>`, remove button, inline
      note); `LibraryPanel.tsx` passes the setting's picture in and out;
      `features/sheet/data/libraryActions.ts`: `createSetting` and `renameItem` take `picture`;
      strings in `translations/source/{en,ru}/ui/sheet/library.yaml` (design D6)
- [x] T013 [US2] `labeler.ts`: a setting's `picture` wins over its letters; `SystemBadge` draws it
      as `<img alt="" src="data:image/svg+xml;charset=utf-8,…">`, falls back to the letters on
      `onError` and reports `setting-picture-failed` once per setting (new code in
      `src/sheet_manager/diagnostics.ts`); extend `documents-badges.test.tsx` for both (FR-006,
      FR-010, design D5)
- [x] T014 [US2] Run `yarn verify` (schema and persisted shape change) and commit the story

## Finish

- [x] T015 Update `src/sheet_manager/AGENTS.md` (badges: marks, module letters, setting pictures,
      the cleaner at every way in), the `tailwind-theming` or `sheet-manager` skill only if a rule
      moves there, the guide en + ru (`guide/documents/index.mdx` badges,
      `guide/template-editor/     types-and-settings.mdx` setting picture); `TODO.md` T-129 closed
      with a note (Werewolf mark deferred to its module)
- [x] T016 Run `yarn verify:full`; walk the steps in design.md "Manual walk" on the dev server;
      record results in design.md

## Coverage

FR-001 T001 T003 T005 · FR-002 T001 T005 · FR-003 marks approved in both themes before tasks, T005
draws them with `currentColor` · FR-004 T011 · FR-005 T008 T010 · FR-006 T013 · FR-007 T011 · FR-008
T011 T012 · FR-009 T001 · FR-010 T001 T013 · FR-011 T008 T009 · FR-012 T001 T004 · SC-001 T001,
manual walk · SC-002 T006 · SC-003 T008 T010 · SC-004 T006
