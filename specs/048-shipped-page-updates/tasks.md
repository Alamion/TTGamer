# Tasks: Shipped page updates for edited copies

**Input**: [spec.md](spec.md), [design.md](design.md)

Delivery order (design "Approach"): Foundation (store, revision, base recording), US2 (merge
review), US3 (difference list), US1 (banner and dismissal), US4 (files and reset), Finish. US1 is
built after US2 and US3 because its **Review changes** opens their review mode; the banner alone
would lead nowhere. Paths are under `src/sheet_manager/` unless they start with `tests`, `docs`,
`i18n`, `translations`, or `specs`.

## Foundation - Revision, base record, recording on save

**Check**: an edited copy has a stored base after its first save, a plain later edit keeps it, reset
removes it, and a revision is stable and changes with any content change.

- [x] T001 Write `tests/sheet_manager/shipped-revision.test.ts` first: `revisionOf` is equal for the
      same page with keys in another order, differs after any change of a label, a node, or an
      order; two builds of every shipped page in `systemRegistry` have equal revisions (the
      determinism pin, design D3); `shippedPageFor(systemId, viewId)` returns the registry page and
      `undefined` for an unknown view
- [x] T002 Write `tests/sheet_manager/template-store.bases.test.ts` first:
      `setDefaultOverride(template, { base })` records `{ base, revision }`; a call without a base
      keeps the stored one (or none); a call with a base replaces it; the store imports no registry;
      `clearDefaultOverride` removes copy and base; `migrateTemplateStoreState` from version 6 adds
      `{}`, parses each base with the template schema, drops an unparseable one and reports
      `template-update-unreadable`
- [x] T003 Create `features/sheet/data/shippedRevision.ts`: `revisionOf(template)` (canonical JSON
      with sorted keys, `cyrb53` as hex, memoized in a `WeakMap`),
      `shippedPageFor(systemId, viewId)` through `systemRegistry`, and the pure
      `pendingUpdate({ shipped, copy, record })` with its states (none, base equal, base differs, no
      base and differs, dismissed) that design D7 lists
- [x] T004 `store/templateStore.ts`: version 6 → 7,
      `overrideBases: Record<string, { base: CustomTemplate; revision: string; dismissed?: string }>`
      in state, `partialize`, and `migrateTemplateStoreState`;
      `setDefaultOverride(template, options?: { base?: CustomTemplate })` stores the base it is
      given and never looks one up (design D6: the caller passes it);
      `dismissUpdate(systemId, viewId, revision)`; `clearDefaultOverride` removes the base too; add
      the codes `template-update-unreadable` and `template-merge-failed` to `diagnostics.ts` (the
      codes list in `.agents/skills/sheet-templates/SKILL.md` is updated in T031)
- [x] T005 `features/template-editor/session/useTemplateSave.ts` `saveDefault` passes the base: the
      shipped page as it is now on a first edit of a page with no stored base, nothing on a later
      plain edit (design D6); extend the cases of T002 through the dialog
- [x] T006 Run the checks for a schema, store, and persistence change (`yarn verify`, AGENTS.md §11)
      and commit the foundation

## User Story 2 - Review the shipped changes merged into my copy (P1)

**Check**: build a base, a shipped page, and a copy that differ as in the spec's independent test;
the review shows every merged item with its mark, a conflict defaults to the player's version and
switches back and forth, cancelling stores nothing, saving records the new base.

- [x] T007 [US2] Write `tests/sheet_manager/template-editor/merge.test.ts` first: added, removed,
      moved, and changed by shipped only (taken, origin `shipped`); by the copy only (kept); by both
      to the same value (no item); by both to different values (conflict, copy wins); removed by the
      copy and unchanged by shipped (stays removed, no item); removed by the copy and changed by
      shipped (conflict, default removed); both added the same id (conflict); moved by both to
      different places (conflict); the order of a node new from shipped, including one inside a
      container the copy removed (it lands in the nearest remaining ancestor, else at the page's
      end, never dropped) and a language switch raising no item (values are compared as stored);
      page props (`name`, `description`, `pageKind`) and that `systemId`, `documentKind`, and
      `schemaVersion` come from the shipped page; and, on every shipped page in `systemRegistry`,
      merge(copy = base) equals shipped and merge(shipped = base) equals the copy (SC-002)
- [x] T008 [US2] Create `features/template-editor/merge/flatten.ts` (a tree to
      `id → { parent,     index, props }`, props = every key but `children`, compared deep) and
      `merge.ts` (`mergePages(base, shipped, copy)` returns `{ draft, items }`, pure, never throws:
      an unexpected shape returns `{ error }`, which the caller reports as `template-merge-failed`),
      then `items.ts`: `ReviewItem { key, nodeId, path, kind,     origin, userValue, shippedValue }`
      and `itemState(draft, item)` (copy's or shipped's value by deep equality),
      `switchItem(draft, item, to)` as a draft change (design D4, D5)
- [x] T009 [US2] Write `tests/sheet_manager/template-editor/review-items.test.ts` first: state read
      from the draft, switching a conflict to shipped and back, one undo step per switch, an edit
      made after opening survives a switch of another item
- [x] T010 [US2] Session: a `review` slice in `features/template-editor/session/store.ts` (mode,
      `items`, the shipped page and revision compared) and `TemplateEditorDialogProps.base` gains
      `{ kind: 'review'; template; shipped; items?; mode }` handled in `initialDraft` of
      `features/template-editor/TemplateEditorDialog.tsx`; `session/useTemplateSave.ts`
      `saveDefault` passes the compared shipped page as the base when the session is a review
      (design D6)
- [x] T011 [US2] Write `tests/sheet_manager/template-editor.review.test.tsx` first (helpers in
      `tests/sheet_manager/helpers/editor.ts`): opening and cancelling leaves the template store
      byte-identical (SC-003); saving records the new base and the merged page; issues the editor
      reports for any draft block the save (FR-012); a merge failure reports
      `template-merge-failed`, leaves the copy untouched, and opens the plain editor on the copy
      with a line saying the page could not be merged (the list of differences as the fallback is
      wired in the US3 tasks, FR-016); documents' `templateValues` and `data` are equal before and
      after a review and save (SC-004)
- [x] T012 [US2] UI: `features/template-editor/components/ReviewPanel.tsx` (a labelled region
      listing items by where they sit, the mark text Added, Changed, Removed, Moved, Conflict in
      words, the copy's and shipped value side by side, a switch for conflicts, a note that document
      values are kept), the marks on `EditorNodeFrame.tsx` and the outline rows through
      `data-review-origin` (the entry button in the editor header is the US3 task for **Review
      shipped changes**); keyboard reachable and announced through the session announcer (FR-015)
- [x] T013 [US2] Translations: `translations/source/{en,ru}/ui/sheet/templates.yaml` for the panel,
      marks, switch, and announcements; `yarn build:translations`
- [x] T014 [US2] Run the checks for a store, schema, and UI change (`yarn verify`; the storybook is
      unchanged, no element is added) and commit the story

## User Story 3 - Review a copy that has no recorded base (P2)

**Check**: a copy with no base and a changed shipped page lists every difference, each on keep;
taking some applies them; saving records the base even when all stay on keep; nothing is stored
before Save.

- [x] T015 [US3] Write `tests/sheet_manager/template-editor/differences.test.ts` first: identical
      pages give no items; one item per differing node and property with origin `difference`; every
      item starts on keep; taking one equals the shipped value at that place; items of added and
      removed nodes; a later change to the same shipped page merges (the base now exists)
- [x] T016 [US3] Create `features/template-editor/merge/differences.ts`
      (`differencesOf(shipped, copy)` returning the draft equal to the copy and its items, through
      the flatten of T008 and the item model of T008, design D5)
- [x] T017 [US3] Extend `tests/sheet_manager/template-editor.review.test.tsx`: the list for a copy
      with no base, take and keep per row, saving records the base whatever the answers were
      (FR-010), nothing stored before Save, an identical copy records the base without asking
- [x] T018 [US3] Review mode `mode: 'differences'` in the session and `ReviewPanel.tsx`: take / keep
      buttons per row in place of the conflict switch; a failed merge (`template-merge-failed`) now
      opens this list instead of the plain editor, with the same line saying the page could not be
      merged (FR-016, replacing the US2 stopgap); translations in
      `translations/source/{en,ru}/ui/sheet/templates.yaml`
- [x] T019 [US3] Editor header **Review shipped changes** in
      `features/template-editor/components/EditorTemplateFields.tsx`, while the draft equals the
      stored copy and an update is pending (disabled with its reason otherwise): it opens the merge
      for a copy with a base and the list of differences for one without (US1 scenario 4); add the
      cases to `tests/sheet_manager/template-editor.review.test.tsx`
- [x] T020 [US3] Run the checks (`yarn verify`) and commit the story

## User Story 1 - Learn that the shipped page changed (P1)

**Check**: an edited copy with a pending update shows one banner above the page that stays until
**Review changes** or **Not now**; not for an unedited page; again only for a newer revision.

- [x] T021 [US1] Write `tests/sheet_manager/update-banner.test.tsx` first: the banner shows for a
      pending copy with a base and for a copy with no base that differs; not for an unedited page;
      not for a dismissed revision; again for a newer one; one banner per shown page when two
      documents are shown; **Not now** writes `dismissed`; **Review changes** opens the review; the
      region is named, it is not an alert, and the page drawn is still the copy; a merge that would
      change nothing advances the base silently once and shows no banner; and, over every shipped
      page in `systemRegistry`, an edited copy shows one banner for a changed shipped revision and
      an unedited page shows none (SC-001) (FR-003, FR-004)
- [x] T022 [US1] `features/sheet/data/pendingUpdate.ts`: `usePendingUpdate(systemId, viewId)` over
      the template store, the registry page, and `pendingUpdate`; the silent advance as one store
      write in an effect (design D7); reads no document (FR-017)
- [x] T023 [US1] `features/sheet/UpdateBanner.tsx` (`role="region"`, in the style of
      `FallbackNotice` in `features/sheet/CharacterSheet.tsx`, named buttons **Review changes** and
      **Not now**), shown by `DocumentSheet` above the effective page when `effective.modified`; the
      editor mounts through `React.lazy` with the review base (design D8); translations in
      `translations/source/{en,ru}/ui/sheet/templates.yaml`
- [x] T024 [US1] Write `tests-e2e/smoke/shipped-updates.spec.ts`: edit the Star Wars full sheet and
      save, then make the shipped page look changed by rewriting the stored base in IndexedDB
      (`localforage` database, key `universal-template-storage`, as `layout.spec.ts` reads its own
      store: one label of `overrideBases[...]` changed; done after the app has loaded and before the
      reload, and checked that the store does not write itself back on start), reload, see the
      banner once, review, save, reload, no banner; the page keeps the player's edit
- [x] T025 [US1] Timings: `tests-e2e/timings/shipped-updates.spec.ts` records the review open time
      on the largest page against opening the editor without a review, and the sheet's open time
      with and without a pending copy (SC-005, reported, not blocking)
- [x] T026 [US1] Run the checks (`yarn verify`; e2e through `yarn ci:e2e`) and commit the story

## User Story 4 - Updates travel with the files and survive a reset (P3)

**Check**: a library file with an edited copy keeps its base through export and import; a file
without bases imports as copies with no base; reset removes copy and base.

- [ ] T027 [US4] Write the cases first in `tests/sheet_manager/library-file.test.ts` and
      `tests/sheet_manager/library-import.test.ts` (find them with
      `ls tests/sheet_manager | grep     library`): export writes `overrideBases` for edited pages
      only; import with Replace writes the base; Keep both writes none; a version 2 file without the
      field imports as copies with no base; a malformed base is dropped and reported, the copy is
      kept; the dismissed revision is never exported
- [ ] T028 [US4] `features/sheet/shell/libraryFile.ts` and `libraryImport.ts`: the optional
      `overrideBases` map in the payload, parsed like pages; `installImport` writes the base through
      `setDefaultOverride(template, { base })` for replaced overrides (design D9); the file version
      stays 2
- [ ] T029 [US4] `components/dialogs/LibraryPanel.tsx` reset case: the confirmation text says the
      copy and its update record go together; extend the reset test in `tests/sheet_manager` that
      already covers `clearDefaultOverride` (find it with `grep -rl clearDefaultOverride tests`) to
      assert the base and dismissed revision are gone (FR-014); translations in `en` and `ru`
- [ ] T030 [US4] Run the checks (`yarn verify`) and commit the story

## Finish

- [ ] T031 Update the guidance, one owner per rule:
      `.agents/skills/sheet-templates/references/pages.md` ("Stores and persistence":
      `templateStore` v7, `overrideBases`, revision, pending state) and `references/editor.md` (the
      review mode, merge module, items; the new `base.kind === 'review'` of
      `TemplateEditorDialogProps` beside "outside code imports only…"), `references/library.md` (the
      file's `overrideBases`), the diagnostics code list in
      `.agents/skills/sheet-templates/SKILL.md` (`template-update-unreadable`,
      `template-merge-failed`), and a short pointer in `src/sheet_manager/AGENTS.md` ("Custom Page
      Templates") that edited shipped pages carry a base and take updates through the review
- [ ] T032 User guide in English and Russian: a section "Updates to shipped pages" with an explicit
      anchor in `docs/guide/template-editor/library.mdx` and its mirror under
      `i18n/ru/docusaurus-plugin-content-docs/current/guide/template-editor/library.mdx`, an
      `EDITOR_GUIDE` entry in `features/template-editor/components/EditorHelp.tsx` linked from the
      banner and the review panel; `tests/docs/guide/template-editor-guide.test.ts` and
      `yarn validate:i18n` pass
- [ ] T033 Backlog: mark T-131 done with its summary in `TODO.md`, in the entry format of the
      `backlog` skill; `yarn validate:backlog`
- [ ] T034 Run `yarn verify:full`; walk the steps in design.md "Manual walk" on the dev server and
      record the results in design.md
