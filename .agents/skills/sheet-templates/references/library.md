# Sheet Templates — User Types, Settings, and the Library

Reference for the `sheet-templates` skill: user document types and settings (spec 012) and the
library tree (spec 013).

## User document types and settings (spec 012)

- Identity: a user type's id (`user-` + 8) is its document kind **and** definition id; shipped ids
  and kinds may not use the prefix (registry invariant). User settings are `user-setting-` + 8.
- Data: every `user-` document has empty `data` (`UserTypeDataSchema`); all values live in
  `templateValues`. `SystemRegistry.parseDocument` parses them without the type, so load order and
  deleted types never hide documents.
- Registry overlay: `systems/index.ts` feeds `setUserDocumentTypes({ types, settings, templates })`
  from `documentTypeStore` + `templateStore`. `getDocumentDefinition` / `listDefinitions` answer for
  user types with synthesized definitions (`systems/userTypes.ts`: pages = views, default first; a
  type owned by a module carries that module) and an orphan definition (the stored-values view) for
  unknown `user-` ids. `resolveDocumentPolicies` goes through the registry, so types inherit
  system + module policies. Components that list types subscribe to `useDocumentTypeStore` to
  re-render.
- User settings: `{ id, name, systemId, pages }` on a system with `coreDefinitions` (`wod-2e`,
  `wod-v5`); documents record `metadata.settingId`, templates `settingId`; the create dialog lists
  each setting with its ruleset's core definitions and its own types.
- Files: `features/sheet/shell/typeFile.ts` — `ttgamer-document-type` v1 (`type`, `setting?`,
  `templates`, `notices`), validated before any change; `typeInstallState` (new / same / conflict),
  `rewriteTypeIdentity` (keep both), `installTypePayload` (re-ids colliding templates). Document
  exports of user types embed `documentType`; imports install it first (`SheetWorkspace`); the
  library import reads type files too (see "Library").
- The library (spec 013) manages both; see "Library".

## Library (spec 013, `components/dialogs/LibraryDialog.tsx` + `library/`)

One tree replaces the page-template list: **ruleset → setting → document type → page**, derived on
every change by `buildLibraryTree` (`features/sheet/data/libraryTree.ts`) from the registry, the
type and template stores, and one-pass document counts (`countDocuments`). Nothing about the tree is
stored.

- Rulesets are plugins without `SystemPlugin.ruleset`; a setting system declares its ruleset (Star
  Wars: `ruleset: 'wod-2e'`). Under a ruleset: "Rules only" (its definitions without a module), one
  setting per module (Hunter), each setting system, then user settings. A user setting lists the
  ruleset's core definitions (`t:core:<setting>:<definition>`, pages = templates with that
  `settingId`, default = `setting.pages`) and its own types. A user template of a kind shared by
  several definitions (droid and character) is listed once, under the first. Unplaceable items go to
  a read-only "Unavailable" group (`r:unavailable`) and report `library-placement`; they are never
  dropped.
- Node keys (`libraryPages.ts`): `r:`, `s:rules|module|system|user:…`, `t:…`, `p:…`. Default pages:
  user type `defaultTemplateId` (else its first page, else stored values), core type
  `setting.pages`, shipped type `defaultPages` (else `defaultViewId`); `setDefaultWrites` picks the
  right store.
- Actions are pure plans returning `LibraryWrites` (`libraryActions.ts`: create setting/type — never
  a page —, rename, `deletePlan` with document counts, `pageDepartureWrites`) committed by
  `applyLibraryWrites` (one update per store). `availableActions` (`library/actions.ts`) feeds the
  details pane and the context menu alike.
- Moves (`libraryMoves.ts`): user pages → types (T-070 `planTemplateRetarget`), user types →
  settings (owner, template `systemId`/`settingId`, documents follow), user settings → rulesets (own
  types follow; the old core character's documents and pages stay on the old ruleset without
  `settingId`, documents pinned to the page they used). `crossesSystem` (the item's `systemId`
  changes, including Star Wars ↔ WoD 2e) requires the MovePanel confirmation; drag and drop (MIME
  `application/x-ttgamer-library-node`) applies other moves at once.
- Tree UI: flat WAI-ARIA `tree` of expanded rows (`LibraryTree`, `TreeRow`), roving tabindex,
  arrows/Home/End/type-ahead, Enter opens a page, Shift+F10 / Menu opens `ContextMenu` (a Popover
  rendered inside the dialog content so the focus trap keeps it), Delete deletes. Below `md` the
  tree and details are tabs.
- Files (`features/sheet/shell/libraryFile.ts`, `libraryImport.ts`): `ttgamer-library` v2 (v1 still
  reads) — flat `settings`, `types`, `templates`, `overrides` (edited shipped pages), `catalogs` (a
  picked page auto-adds the user catalogs it binds; Keep both rebinds the file's pages to the copy;
  beyond the owner limit an entry is unavailable, reason `limit`), `included` (`picked`/`auto`),
  informative `addresses`, `notices`. Export: tri-state ticks (`tickState`/`toggleTick`),
  `exportClosure` adds the user parents a pick needs (tertiary in the tree) and turns shipped
  ancestors into addresses; shipped content is never serialized. Import: `parseLibraryFile` also
  reads `ttgamer-document-type` v1 and `ttgamer-template` v3; the preview marks entries new / same /
  conflict / unavailable; Replace overwrites by id (a replaced type keeps installed pages missing
  from the file), Keep both re-ids the entry and its picked descendants with an "(imported)" suffix;
  templates colliding with shipped view ids or unrelated templates get fresh ids. Nothing is written
  before `installImport`.
- Catalogs (spec 015) are leaves: `RulesetNode.catalogs` (the ruleset's own, then the ruleset
  plugin's shipped catalogs) before its settings, `SettingNode.catalogs` (then a setting system's
  shipped catalogs) before its types; key `c:user:<id>` or `c:<systemId>:<catalogId>`. Shipped ones
  are read-only. `catalogOwnerFor(node)`, `createCatalog` (per-owner limit), rename, `deletePlan`
  (catalogs of a deleted setting go with it; a catalog delete names its bound templates), moves to
  any ruleset or setting (`lostBy`: templates that would no longer see it; a setting moved to other
  rules loses the old ruleset's catalogs). The details pane edits a catalog with
  `library/CatalogTable.tsx` (memoized rows keyed by entry id).
- Help anchors: `EDITOR_GUIDE.library*` → `docs/template-editor/library.mdx`; user catalogs →
  `values.mdx#your-catalogs`. Storybook: the "Library" page (`features/docs/LibraryStorybook.tsx`)
  and the "Your own catalog" element story.
