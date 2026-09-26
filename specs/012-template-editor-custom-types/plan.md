# Implementation Plan: Visual template editor and template-defined document types

**Branch**: `testing` (spec directory `012-template-editor-custom-types`) | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/012-template-editor-custom-types/spec.md`

## Summary

Template authors see and arrange the page they are editing (T-054), with undo, duplication,
layout-independent shortcuts, and a quick preview. Templates stop being only views: users
create document types in any setting and settings of their own on the WoD 2e or V5 engine,
and share them as files. Star Wars moves onto a reusable WoD 2e ruleset (T-041), and
edited default pages are keyed by system and view (T-046).

Technical approach, from [research.md](research.md):

- **Editor**: the recursive panel tree becomes Outline | Page | Settings. The page is the
  real `DeclarativeSheetView` on the draft, with an overlay injected at its single node-render
  point (R1, R2). A writable in-memory scratch source keeps sample edits away from real
  documents (R3). Preview data comes from plugin-declared examples (R4). One reducer with
  bounded, coalescing history (R5), shortcuts matched by physical key code (R6), native drag
  and drop plus keyboard moves (R7), and `duplicateNode` (R8).
- **User types**: every `user-` document shares one empty data shape and keeps its values in
  `templateValues`. That makes loading independent of the type store, and deleting a type is
  safe (R11). A new `documentTypeStore` feeds a read-only registry overlay, so the 27 existing
  lookup call sites stay unchanged (R12). Pages are ordinary user templates, and a synthesized
  fallback page covers orphans (R13). Type files and documents with embedded types follow
  [contracts/type-file-format.md](contracts/type-file-format.md) (R15).
- **User settings**: a thin grouping over a ruleset's declared core definitions. V5 gains
  `v5-character` (R17, R18).
- **WoD 2e**: code-level extraction of `systems/wod2e/ruleset/`, with every Star Wars
  identity frozen and a separate engine plugin `wod-2e` (R19–R21).
- **Overrides**: template store v5, keyed `systemId:viewId` (R22).

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5 (persist, localForage), Zod, Radix
dialog/popover, Lucide, Tailwind 3. **No new dependencies** (native HTML5 drag and drop,
hand-written history).

**Storage**: IndexedDB through localForage.

- `templateStore` v4 → v5 (composite override keys).
- New `documentTypeStore` v1 (`universal-document-type-storage`).
- `documentStore` unchanged in version. Additive optional `metadata.settingId`, and the
  generic parse for `user-` definitions.

**Testing**: Vitest 4, jsdom 26, Testing Library 16. `tests/setup/sheetIssues.ts` fails on
unexpected sheet issues.

**Target Platform**: static site (Vercel), modern desktop and mobile browsers; the editor is
usable at phone width through tabs.

**Project Type**: single frontend project (Docusaurus site + React modules).

**Performance Goals**: on the Star Wars full sheet (~120 nodes), a keystroke or a move shows
on the page within 100 ms, and the preview opens within 1 s (SC-002). Editor chunks stay out
of the page-load path (the dialog is already opened on demand).

**Constraints**:

- Generic sheet code never imports a concrete system (ESLint pattern extended to `wod2e/`).
- Star Wars identities are frozen, with parse, page, and dice parity.
- No store bump for documents.
- Every new string goes through YAML in en and ru.
- Shortcuts are independent of the keyboard layout.
- No silent fallbacks (diagnostics channel).

**Scale/Scope**:

- Tens of user types and settings per user; up to thousands of documents.
- The type-delete count is linear over the already-loaded document list, and runs only on an
  explicit action.
- About 60 source files across `sheet_manager` (editor, renderer, stores, registry, systems),
  plus translations, tests, and module docs.

## Constitution Check

_GATE: checked before Phase 0 and re-checked after Phase 1._

| Principle                                    | Assessment                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Modular Semi-Autonomy                     | **Pass.** User types reach generic code only through the registry overlay; the editor reaches examples only through plugin declarations. The WoD 2e engine becomes one ruleset shared by the engine plugin and the Star Wars setting ("rulesets that share an engine MUST share one ruleset"). Settings are ruleset + setting; user settings add no mechanics. No system conditional enters generic code. |
| II. Explicit Contracts at Boundaries         | **Pass.** Four contracts are written down: editor interaction, user types and settings, file formats, WoD 2e layering. `user-` documents pass the envelope schema and a registered (generic) definition schema; failures still go to recovery. Type files are validated fully before any state change. Store changes are versioned (`templateStore` v5) or new (`documentTypeStore` v1).                  |
| III. Pleasurable Cross-Module Interactions   | **Pass.** Import of a document installs its type after the existing conflict choice. A deleted type degrades to a readable fallback page, never a blank page. Today `CharacterSheet` returns `null` for an unknown definition, and that case is fixed. Every new fallback reports through `diagnostics.ts`.                                                                                               |
| IV. Fit-for-Purpose Code Quality             | **Pass.** History, duplication, shortcut matching, move targets, orphan-page synthesis, and key migration are pure functions. The overloaded `ElementEditor.tsx` (795 lines) is split into outline, settings, and overlay pieces, which reduces a debt recorded in the skill.                                                                                                                             |
| V. Risk-Proportional Testing                 | **Pass.** Parity tests cover the Star Wars split: parse, page bytes, dice. Migration tests cover template store v5. There are round-trip tests for type files and embedded types, and component tests for every editor flow, including shortcuts with `code` under a non-Latin `key`. Tier 3 `yarn verify:full`.                                                                                          |
| VI. Consistent, Accessible Experience        | **Pass.** Radix dialog and Lucide icons; keyboard parity for every move; a polite live region; `aria-label` on grips and slots; `role="alert"` issues; tabs on narrow screens. New strings are in en and ru YAML. WoD 2e ability names are queued for glossary review.                                                                                                                                    |
| VII. Performance as a Shared Budget          | **Pass.** No new dependency or route. The page pane uses a deferred draft and memoized nodes. The preview mounts on demand. The type-delete count and the create dialog work on types, not documents, so no new unbounded list is added (scale note above).                                                                                                                                               |
| VIII. Respectful Use of Third-Party Material | **Pass.** User types and settings inherit their owner's policies, so V5 ones carry Dark Pack. The Dark Pack covers World of Darkness 5th Edition material only (constitution 1.4.2), so neither the `wod-2e` engine nor Star Wars declares it (maintainer decision, research R20). The source material for WoD 2e is classic mechanics and trait names; no book text is added.                            |

**Deviations**: none.

**Post-Phase-1 re-check**: unchanged. The design adds:

- one system folder (`systems/wod2e/`), under the existing ESLint pattern with one scoped
  allowance for the Star Wars setting;
- one store (`documentTypeStore`);
- optional plugin fields (`examples`, `coreDefinitions`).

## Project Structure

### Documentation (this feature)

```text
specs/012-template-editor-custom-types/
├── plan.md              # This file
├── research.md          # Phase 0 output (R1–R22)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── editor-interaction.md
│   ├── user-document-types.md
│   ├── type-file-format.md
│   └── wod2e-ruleset.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/sheet_manager/
├── components/dialogs/
│   ├── TemplateEditorDialog.tsx          # three areas, history reducer, preview switch, tabs
│   ├── template-editor/
│   │   ├── ElementEditor.tsx             # split: settings body → ElementSettings.tsx
│   │   ├── ElementSettings.tsx           # new: one element's settings (+ *Config moved here)
│   │   ├── OutlineTree.tsx               # new: compact tree, drag and drop, keyboard moves
│   │   ├── EditorPage.tsx                # new: page pane (renderer + overlay + sample source)
│   │   ├── EditorNodeFrame.tsx           # new: overlay frame, chip, slots, drop zones
│   │   ├── EditorPreview.tsx             # new: quick preview + data picker
│   │   ├── history.ts                    # new: bounded coalescing history (pure)
│   │   ├── shortcuts.ts                  # new: code-based keymap (pure match + hook)
│   │   ├── moveTargets.ts                # new: keyboard move target computation (pure)
│   │   ├── draft.ts                      # + duplicateNode, DraftIssue.nodeId, reference kinds
│   │   ├── CatalogBindingEditor.tsx      # catalog picker scoped to the draft's system
│   │   └── FieldEditor.tsx               # reference kind picker
│   ├── TemplateLibraryDialog.tsx         # types/settings actions, owner grouping, composite keys
│   ├── TemplateImportDialog.tsx          # type files; shipped-view-id collision fix
│   ├── DocumentCreateDialog.tsx          # owner groups, engines, user settings
│   └── DocumentManagerDialog.tsx         # type/setting labels via registry
├── features/sheet/
│   ├── declarative/DeclarativeSheetView.tsx  # overlay seam in renderNode + visibleWhen gate; memo NodeView
│   ├── declarative/editorOverlay.ts      # new: TemplateEditorOverlayContext
│   ├── data/templateValueWrites.ts       # new: extracted validateTemplatePageValues
│   ├── data/orphanPage.ts                # new: fallback page synthesis
│   ├── CharacterSheet.tsx                # fallback page instead of null; composite keys
│   └── shell/{documentFile,typeFile,templateFile,SheetWorkspace,ViewModeSelect}.ts(x)
├── hooks/useDocumentSource.ts            # preview flag, createScratchDocumentSource
├── store/
│   ├── templateStore.ts                  # v5 composite keys + migration
│   ├── documentTypeStore.ts              # new: types, settings, quarantine
│   └── documentStore.ts                  # uses extracted value writes; settingId on create
├── systems/
│   ├── registry.ts                       # user overlay, generic user-type parse, invariants
│   ├── index.ts                          # overlay subscription; register wod-2e plugin
│   ├── userTypes.ts                      # new: ids, UserTypeDataSchema, synthesized definitions
│   ├── types.ts                          # examples, coreDefinitions
│   ├── policies.ts                       # resolveDocumentPolicies via registry
│   ├── view.ts                           # composite keys; settingId filtering
│   ├── wod2e/ruleset/…                   # new: schema, profile, bindings, templateParts, dice
│   ├── wod2e/index.ts                    # new: engine plugin wod-2e
│   ├── star-wars-wod/…                   # composes the ruleset; declares examples
│   └── v5/{ruleset,index.ts}, v5/core/…  # v5-character definition + pages; examples
└── types/{document,template}.ts          # metadata.settingId, template settingId

eslint.config.mjs                          # wod2e pattern + scoped Star Wars allowance
translations/source/{en,ru}/ui/sheet/      # templates.yaml (editor), documents.yaml (types,
                                           # settings, fallback), wod2e.yaml (new), v5.yaml
translations/glossary/                     # WoD 2e ability names for review
tests/sheet_manager/                       # editor, history, shortcuts, user types, type files,
                                           # store migration, systems/wod2e parity
.agents/skills/sheet-templates/SKILL.md, src/sheet_manager/AGENTS.md, AGENTS.md
```

**Structure Decision**: single project, existing module folders. The only new system folder is
`systems/wod2e/`, the ruleset the constitution asks for. All other additions are files inside
existing `sheet_manager` folders.

## Delivery order

Each step is independently testable. The stories map as shown.

1. **Foundations**: extract template value writes; the `preview` flag and the scratch source;
   `DraftIssue.nodeId`; `duplicateNode`; history reducer; shortcut and move-target pure
   modules.
2. **Editor (US1–US3)**: overlay seam in the renderer; `ElementSettings`, `OutlineTree`,
   `EditorPage`, `EditorNodeFrame`; the dialog's three areas and tabs; plugin `examples` and
   `EditorPreview`; performance pass (deferred draft, memo) with a timing test.
3. **T-046**: template store v5 with composite keys and migration; call sites; the import
   collision fix.
4. **WoD 2e (US7)**: parity fixtures first; extract `wod2e/ruleset`; recompose Star Wars;
   register the `wod-2e` engine plugin with pages, translations, and policy.
5. **User types (US4)**: `userTypes.ts`, `documentTypeStore`, registry overlay and generic
   parse; fallback page; the `CharacterSheet` fix; library and create dialog flows; catalog
   scoping; reference kind picker; policies through the registry.
6. **Sharing (US5)**: type file; embedded document type; conflict flows.
7. **User settings (US6)**: `coreDefinitions`; `v5-character`; the `UserSetting` store part;
   `settingId` on documents and templates; create dialog and view selector filtering.
8. **Docs and backlog**: skill, module AGENTS, root AGENTS, historical banners, TODO/ROADMAP
   statuses, `yarn verify:full`.

## Complexity Tracking

No constitution violations to justify.
