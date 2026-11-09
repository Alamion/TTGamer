# Design: Shipped page updates for edited copies

**Spec**: [spec.md](spec.md) | **Date**: 2026-11-07

## Approach

An edited shipped page is `templateStore.defaultOverrides[systemId:viewId]`. The feature keeps that
map as it is and adds a parallel record per override: the **base** (the shipped page the copy was
last brought up to date with) and the **dismissed revision**. A pure merge engine compares base,
shipped page, and copy by node id and returns a draft plus a list of **review items**. The template
editor gains a review mode: it opens that draft, lists the items beside the page, and saves through
the usual default-override path, recording the new base. A banner above the page is the entry.
Copies with no base use the same item list, built from a two-way comparison, every item on "keep".

Delivery order: store record, revision, and recording on save → merge engine and difference engine
(pure) → editor review mode (US2, US3) → banner and dismissal (US1) → files and reset (US4) → guide
and current-state docs. The banner's **Review changes** needs the review mode, so US2 lands before
US1.

## Decisions

- **D1 — Keep the whole base per copy.** `overrideBases[key] = { base, revision, dismissed? }`
  stores the shipped page as it was. _Why_: a three-way merge needs the base's content, and measured
  pages are small (0.6–26 KB, 240 KB for all 23; a copy costs at most one extra page). _Rejected_: a
  hash only (cannot merge); shipping old revisions in the bundle (grows every download for every
  user).
- **D2 — Parallel record, not a new override shape.** `defaultOverrides` stays
  `Record<key, CustomTemplate>`; `overrideBases` sits beside it (store v7, migration adds `{}`).
  _Why_: the resolver, library tree, and import read overrides as templates; a changed shape touches
  all of them. _Rejected_: wrapping each override as `{ template, base }` (touches every reader).
- **D3 — Revision = hash of the shipped page's canonical JSON** (sorted keys, `cyrb53` as hex,
  memoized per template object). _Why_: it changes exactly when content changes (FR-001) and needs
  no bookkeeping when someone edits a shipped page. Shipped pages build with no random ids
  (checked), so it is stable; a test pins that. _Rejected_: a hand-bumped number per page
  (forgotten, or bumped for nothing); a build-time snapshot file (a second source of truth).
- **D4 — Merge by node id, per property, in one pure module** (`features/template-editor/merge/`).
  The three trees are flattened to `id → { parent, index, props }` (props = every key but
  `children`; each value compared deep, whole). Per id: added/removed/moved/changed by shipped only
  → taken (item origin `shipped`); by the copy only → kept (origin `user`, no item unless it
  matters); by both and different → conflict, copy wins. Removal by the copy loses to nothing unless
  shipped also changed the node (conflict, default removed). Order: start from the copy's order; a
  node new from shipped goes into its shipped parent, after its nearest shipped predecessor that is
  in the result, else first in that parent; if the parent is gone from the copy, it goes into the
  nearest shipped ancestor that remains, else at the end of the page (never dropped), and the item
  says where it landed. Page props (`name`, `description`, `pageKind`) merge the same way;
  `systemId`, `documentKind`, and `schemaVersion` come from the shipped page. Values are compared as
  stored, never through `localizeTemplate`: a label kept as a `labelMessage` key is one value in
  every language, so switching language raises no change. _Rejected_: text/JSON-patch diff (ignores
  identity, breaks on moves); finer-than-property grain (setting objects such as `options` are
  atomic here).
- **D5 — One item model for merge and difference list.**
  `ReviewItem { key, nodeId, path, kind: added|removed|moved|changed, origin: shipped|user|conflict|difference, userValue, shippedValue }`;
  its state (copy's or shipped value) is read from the draft by deep equality, and switching one is
  an ordinary draft edit with one undo step. No-base copies compare shipped against copy with the
  same flattening: every item is `difference`, state keep. _Why_: US2 and US3 share the list, the
  marks, and the switch; no recomputation loses later edits. _Rejected_: recomputing the merge with
  a choices map on each switch (drops edits made after opening).
- **D6 — Recording the base.** `setDefaultOverride(template, { base })`: the store never reads the
  registry (`systems/index.ts` already imports the store, so it would be a cycle); the caller passes
  the base. `useTemplateSave.saveDefault` passes the shipped page as it is now when the page has no
  stored base and the save is a first edit, passes the compared shipped page when saving a review,
  and passes nothing on a later plain edit, which keeps the stored base (or none). Import passes the
  file's base. Reset removes both records. _Rejected_: recording the base on every save (would hide
  pending shipped changes the player never saw); the store looking the page up itself (cycle).
- **D7 — Pending state is derived, not stored.** `pendingUpdate(key)`: no override → none; base
  present → `revision(shipped) !== base.revision`; none → `revision(shipped) !== revision(copy)`. In
  both, a notice shows only if `dismissed !== revision(shipped)` and the merge or list would change
  the copy; when it would not, the base advances silently once (an effect, one store write). FR-017:
  only overrides, `overrideBases`, and registry pages are read.
- **D8 — Banner and entry points.** `UpdateBanner` renders in `CharacterSheet.tsx`'s `DocumentSheet`
  above the effective page when `effective.modified` (one per shown page); it is a labelled region
  (`role="region"`, not an alert) in the style of `FallbackNotice`, and **Review changes** mounts
  `TemplateEditorDialog` through `React.lazy`, so the editor stays off the sheet's load path. **Not
  now** writes `dismissed`. The editor header also offers **Review shipped changes** while the draft
  equals the stored copy (otherwise disabled, naming why): the merge for a copy with a base, the
  difference list for one without, and the list as well when a merge fails (reported as
  `template-merge-failed`, with a line saying the page could not be merged). _Rejected_: a toast
  (can vanish unseen); a library-only badge (not found).
- **D9 — Files.** The library file gets an optional `overrideBases` map (same key and parse as
  pages; version stays 2: additive, older readers ignore it, older files import as copies with no
  base). Only **Replace** of an override writes its base; **Keep both** makes a user template, which
  gets none. The dismissed revision is device state and is not exported.
- **D10 — No cross-tab handling.** The template store has no cross-tab sync today; two tabs saving
  the same page end with the last write, as every template save does. The spec's tab edge case is
  corrected to say so. _Rejected_: adding a sync layer for one feature.

## Changed types and data

- `store/templateStore.ts`: version 6 → 7;
  `overrideBases: Record<string, { base: CustomTemplate; revision: string; dismissed?: string }>`;
  `setDefaultOverride(template, options?)`, `dismissUpdate(systemId, viewId, revision)`,
  `clearDefaultOverride` removes both. Migration: absent → `{}`; an unparseable base is dropped with
  `template-update-unreadable` and its copy becomes a no-base copy.
- `features/sheet/data/shippedRevision.ts` (new): `shippedPageFor`, `revisionOf`, `pendingUpdate`.
- `features/template-editor/merge/` (new): `flatten.ts`, `merge.ts`, `differences.ts`, `items.ts`.
- `features/template-editor/session/`: `review` slice in the session store (items, mode), the save
  path passing base; `useTemplateSave.ts` `saveDefault` records the base.
  `TemplateEditorDialogProps .base` gains `{ kind: 'review'; … }`, the one addition to what code
  outside the editor may use.
- `features/sheet/shell/libraryFile.ts` / `libraryImport.ts`: the optional `overrideBases` map.
- `diagnostics.ts`: codes `template-update-unreadable` (a stored base fails to parse) and
  `template-merge-failed` (the merge or the difference engine returned an error).
- UI: `translations/source/{en,ru}/ui/sheet/templates*.yaml` (banner, review list, marks, buttons);
  guide `docs/guide/template-editor/` gets a section "Updates to shipped pages" in en and ru with an
  `EDITOR_GUIDE` anchor.

## Principles at risk

- **II (contracts)**: persisted shape changes with a store version, migration, and parse of every
  base through the template schema; the library file change is additive and tested both ways.
- **III (graceful degradation)**: an unreadable base, a failed merge, or a removed shipped page
  reports through diagnostics and leaves the copy untouched, with the difference list as fallback.
- **VI (accessibility, i18n)**: marks carry text (Added, Changed, Removed, Conflict), not only
  colour; banner and list are keyboard-reachable; every string is in en and ru. No template element
  is added, so the storybook is unchanged.
- **VII (performance)**: the dialog is lazy; revisions are memoized; the merge runs only for a
  pending copy, once per revision; documents are never read.
- **Module boundaries**: the merge lives in `template-editor/`, shipped-page lookup goes through
  `systemRegistry`; nothing imports a concrete system folder.

## Tests

- `tests/sheet_manager/template-editor/merge.test.ts`: added, removed, moved, changed by one side;
  both-side conflicts per kind; removal vs change; order of new nodes; property-level grain;
  merge(copy = base) equals shipped, merge(shipped = base) equals copy, on every shipped page
  (SC-002); a node new inside a container the copy removed; a language switch raises no item.
- `.../differences.test.ts`: no-base list, items start on keep, take applies, identical pages empty.
- `.../review-items.test.ts`: state read from the draft, switch and switch back, one undo step.
- `shipped-revision.test.ts`: revision stable across canonical orderings, differs on any content
  change; pending states (no copy, base equal, base differs, no base, dismissed, merge is a no-op).
- `template-store.test.ts`: v6 → v7 migration, base recorded on first edit only, plain edit keeps
  it, reset clears both, unreadable base dropped and reported.
- `update-banner.test.tsx`: once per revision, not for unedited pages, **Not now**, one banner per
  shown page, accessible name; `template-editor.review.test.tsx`: opening stores nothing (SC-003),
  save records the base and closes the banner, issues block the save, values untouched (SC-004).
- `library-file.test.ts`: round trip with bases, v2 file without them, Keep both gets no base.
- `tests-e2e/smoke/shipped-updates.spec.ts`: edit a page, make the shipped page look changed by
  rewriting the stored base in IndexedDB (no test hook in the product), see the banner, review,
  save, reload. Timing on a largest-page review in `tests-e2e/timings/`.

## Manual walk

1. Edit the Star Wars full sheet (rename one field), save → no banner; **Library** shows it edited.
2. On a dev build change a label in the shipped page source, reload → banner above the page, once.
3. **Not now**, reload → no banner; change another shipped label → banner again.
4. **Review changes** → editor opens with the new shipped label marked Changed, the renamed field
   marked as yours; Cancel → library and sheet unchanged.
5. Change the same label in both → marked Conflict showing yours; switch it, switch back, undo.
6. Save → banner gone, copy has both changes, values on documents intact.
7. Reset the page, edit again, then clear its base in IndexedDB (or use a pre-feature copy) → the
   banner lists differences, each on keep; take one, save → the copy has it.
8. Export the library with the copy, import on a clean profile → banner state matches.

## Implementation notes

- **Switching a conflict is not an exact inverse in two cases** (found by a random merge check on
  all shipped pages; data is never lost). Switching a "removed by shipped, changed by you" conflict
  to shipped and back reinserts the copy's whole subtree, so children the shipped page had removed
  separately return. A moved node whose anchor sibling has gone lands first in its parent. Accepted:
  the choice is the player's, each switch is one undo step, and the cases are rare on real pages.
