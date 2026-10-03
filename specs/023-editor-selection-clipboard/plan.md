# Implementation Plan: Copy, paste, multi-selection, and the element menu

**Branch**: `023-editor-selection-clipboard` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-editor-selection-clipboard/spec.md`
(clarified 2026-10-03).

## Summary

The template editor gets one notion of "the selection" and one list of editor commands, and
everything else is built on them. Template and document shapes do not change.

1. **Selection.** The history snapshot holds the selected ids and an anchor instead of one id.
   Ctrl/⌘+click toggles, Shift+click selects a sibling range, and every structural command acts
   on the normalized selection (ancestors win, page order) as one undo step.
2. **Clipboard.** Copy and cut write a versioned JSON envelope of the selected subtrees to the
   system clipboard through the browser's `copy`/`cut` events, and keep the same envelope in
   memory for the tab. Paste reads the `paste` event (any source, clarification Q1), validates the
   envelope with the template schema, gives every node fresh ids, remaps references inside the
   copy, and inserts at the anchor (after a field, at the end of a group, or at the end of the
   page), falling back to the nearest place the limits allow.
3. **Shared settings.** With several elements selected, the settings area shows a fixed list of
   shared-setting descriptors, filtered to the ones every selected element supports, with
   "Mixed" for differing values; a change writes every element as one undo step.
4. **Commands.** A single command registry gives each action its shortcut, label, group, and
   availability. The keyboard matcher, the context menu (Radix Context Menu, one per surface), and
   the shortcut list dialog all read it, and a test keeps the guide's table equal to it.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19

**Primary Dependencies**: Docusaurus 3.10, Zustand 5, Zod 3, Tailwind 3, lucide-react,
Radix Dialog and Popover. One new dependency: `@radix-ui/react-context-menu` 2.x (research R4).

**Storage**:

- Copied elements live in the system clipboard (text) and in a module-level memory slot for the
  tab; nothing is persisted in localStorage or IndexedDB.
- Template and document shapes are unchanged.

**Testing**: Vitest 4 with jsdom and Testing Library. The selection normalizer, multi-node draft
operations, clipboard envelope (serialize, parse, remap, placement), shared-setting descriptors,
and command registry are pure and unit-tested. Component tests fire `copy`/`cut`/`paste` events
with a stub `clipboardData`, Ctrl/Shift clicks, and `contextmenu` events.

**Target Platform**: browser; desktop editor with mouse and keyboard, phones with the tabbed
editor and long press.

**Project Type**: web site with client-side tools (`sheet_manager` module).

**Performance Goals**:

- SC-005: copy, paste, remove, and a shared-setting change on a selection of every element of the
  full Star Wars sheet each finish within 1 s (jsdom, within today's editor performance suite).
- A selection change re-renders only frames whose selected state changed (memoized frames keep
  their bail-out).

**Constraints**:

- No schema or document migration (FR-019).
- Shortcuts match physical keys or browser clipboard events, never layout-dependent letters.
- Pasted text is untrusted input: schema-validated, bounded by `TEMPLATE_LIMITS`, never executed.
- Every surface is accessible: menu roles, focus return, counts announced; strings through YAML.

**Scale/Scope**:

- About 15 editor files touched, 5 new.
- About 45 new strings, en and ru.
- 1 docs page, en and ru (`docs/template-editor/index.mdx`).
- 5 user stories.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                             | Check                                                                                                                                                                                                                                                                              | Status |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Modular semi-autonomy              | All work stays in `sheet_manager/components/dialogs/template-editor` and the dialog. The clipboard is editor-local, not `shared/`. No system conditionals: bindings of another system surface through the existing draft issues.                                                   | PASS   |
| II. Explicit contracts                | The clipboard envelope has a format id and version and is parsed with the template node schema before use (contract in [contracts/editor-ui.md](./contracts/editor-ui.md)). Strings go through YAML; the guide is mirrored and its shortcut table is checked against the registry. | PASS   |
| III. Pleasurable interactions         | Paste never fails silently: refused text gets a plain message; a refused place falls back to the nearest legal one. Every multi action is one undo step that restores the previous selection. Unreadable clipboard text reports `template-clipboard-invalid`.                      | PASS   |
| IV. Fit-for-purpose quality           | One command registry replaces three parallel action lists (keys, buttons, menu). Multi-node ops are pure functions beside the single-node ones in `draft.ts`. No `any`.                                                                                                            | PASS   |
| V. Risk-proportional testing          | Untrusted paste input gets schema and limit tests (damaged, wrong version, too many nodes, foreign system). Unit tests cover the pure helpers; component tests cover keys, clicks, menu, and dialog; the performance suite gains a full-sheet selection case.                      | PASS   |
| VI. Consistent, accessible experience | Radix Context Menu gives menu roles, keyboard navigation, and focus return; the shortcut list is a Radix Dialog. The selection count is announced. No template element variant changes, so no new storybook stories.                                                               | PASS   |
| VII. Performance budget               | Selection is a stable context value with a `Set`; frames re-render only when their own selected flag changes. Multi ops reuse structural sharing.                                                                                                                                  | PASS   |
| VIII. Third-party material            | Not touched (copied elements carry no catalog text beyond what the template already holds).                                                                                                                                                                                        | PASS   |

Post-design re-check: PASS. Complexity Tracking: one new dependency, justified below.

## Project Structure

### Documentation (this feature)

```text
specs/023-editor-selection-clipboard/
├── spec.md, checklists/requirements.md
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/editor-ui.md
└── tasks.md                     # /speckit-tasks
```

### Source Code (repository root)

```text
src/sheet_manager/components/dialogs/template-editor/
├── selection.ts                 # new: EditorSelectionState, toggle/range/normalize, page order
├── clipboard.ts                 # new: envelope serialize/parse, memory slot, fresh ids + remap,
│                                #      paste placement with fallback
├── commands.ts                  # new: command registry (id, keys, label, group, available, run)
├── sharedSettings.tsx           # new: shared-setting descriptors + MultiSettings panel
├── EditorContextMenu.tsx        # new: Radix Context Menu for page and outline surfaces
├── ShortcutList.tsx             # new: shortcut list dialog (platform notation)
├── history.ts                   # snapshot { draft, selection }; select() takes a selection
├── draft.ts                     # removeNodes, duplicateNodes, placeNodes, moveEachByCommand,
│                                # insertNodesAt; cloneWithFreshIds shared with paste + remap
├── shortcuts.ts                 # matcher derived from the command registry; copy/cut/paste
│                                # through clipboard events; "?" key
├── editorActions.ts             # EditorSelection context: selected Set + anchor
├── EditorNodeFrame.tsx, EditorPage.tsx, OutlineTree.tsx
│                                # modifier clicks, multi marks, context-menu surfaces
├── useEditorDrag.ts             # drag a set of node ids; preview + commit via placeNodes
├── ElementSettings.tsx          # MultiSettings when several are selected
└── EditorHelp.tsx               # shortcuts anchor
src/sheet_manager/components/dialogs/TemplateEditorDialog.tsx
                                 # selection state, command handlers, clipboard events, toolbar
                                 # shortcuts button, announcements
src/sheet_manager/diagnostics.ts # code template-clipboard-invalid
translations/source/{en,ru}/ui/sheet/templates.yaml
docs/template-editor/index.mdx + i18n/ru mirror
tests/sheet_manager/             # new: editor-selection, editor-clipboard, editor-commands,
                                 #      editor-shared-settings, editor-context-menu; updated suites
package.json (dependency, v3.21.0), CHANGELOG.md, TODO.md, src/sheet_manager/AGENTS.md,
.agents/skills/sheet-templates/SKILL.md
```

**Structure Decision**: the selection, clipboard, and command logic are new pure modules beside
`draft.ts` and `history.ts`; UI pieces stay in `template-editor/`.

## Phasing

1. **Foundation**
    - Selection state in history, normalizer, page order.
    - Command registry with today's commands; matcher derived from it (no behavior change).
    - Multi-node draft operations.
    - Diagnostics code, strings scaffold.
2. **US1, copy and paste (P1)**
    - Envelope, memory slot, `copy`/`cut`/`paste` events.
    - Fresh ids, reference remap, cross-page key rule, placement fallback.
    - Refusal messages and diagnostics.
3. **US2, multi-selection (P1)**
    - Ctrl/Shift clicks on page and outline, marks, count and announcement.
    - Remove, duplicate, copy, Alt-moves on the selection; multi drag with preview.
4. **US3, shared settings (P2)**: descriptors, MultiSettings panel, Mixed, one-step writes.
5. **US4, context menu (P2)**: Radix Context Menu on page and outline, long press, Shift+F10,
   touch "Add to selection", empty-page Paste.
6. **US5, shortcut list (P3)**: dialog, toolbar button, "?" key, guide table sync test.
7. **Polish**
    - Guide en/ru, module notes and skill, backlog closed, CHANGELOG v3.21.0.
    - Performance case, `yarn verify:full`, quickstart walk on the dev server.

## Complexity Tracking

| Addition                       | Why needed                                                                                                                                                                  | Simpler alternative rejected because                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@radix-ui/react-context-menu` | Right click, touch long press, Shift+F10 / menu key, typeahead, submenu-free keyboard navigation, focus return, and collision-aware placement, as one accessible primitive. | A Popover-based menu would re-implement the menu pattern (roles, roving focus, pointer-up selection, long press) the project rule says to take from Radix (AGENTS.md UI Rules). |
