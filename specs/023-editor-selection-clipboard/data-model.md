# Data model: spec 023

Nothing here is stored in templates or documents. All state is editor-session state, except the
clipboard envelope, which is text other editors read.

## Editor selection

```ts
interface EditorSelectionState {
    /** Selected node ids in click order, without duplicates. */
    ids: readonly string[];
    /** Last element clicked without Shift: Shift-range start and paste place; null when empty. */
    anchor: string | null;
}

interface EditorSnapshot {
    draft: EditorDraft;
    selection: EditorSelectionState; // was: selectedId
}
```

Rules:

- `anchor` is in `ids` whenever `ids` is not empty.
- Plain click → `{ ids: [id], anchor: id }`.
- Click on empty page, or Escape with a selection (research R9) → `EMPTY_SELECTION`.
- Ctrl/⌘+click → toggles `id`; the anchor becomes `id` when added, or the last remaining id when
  removed.
- Shift+click → when `id` and the anchor share a parent: anchor's siblings from anchor to `id`
  (inclusive) are added, anchor unchanged; otherwise `ids = [anchor, id]`.
- `normalizeSelection(draft, ids)` → ids that exist, without descendants of other selected ids,
  in page order. Every command uses this list.
- `primaryId` → the anchor when `ids.length === 1`, else null (multi panel).
- Selection changes without a draft change do not add an undo step (as today's `select`).

## Clipboard envelope

```ts
interface CopiedElements {
    format: 'ttgamer-template-elements';
    formatVersion: 1;
    source: { templateId: string; systemId?: string; documentKind: string };
    /** Normalized selection subtrees, page order, as stored in the template. */
    nodes: TemplateNode[];
}
```

Validation (paste): JSON → `format` equals the id → `formatVersion` is an integer `1 ≤ v ≤ 1` →
`nodes` is a non-empty array that parses as template children with the template schema →
insertion respects `TEMPLATE_LIMITS.nodesPerTemplate` and `maxDepth`. Failures:

| Stage        | Result on the page                       | Diagnostics                              |
| ------------ | ---------------------------------------- | ---------------------------------------- |
| not JSON     | ignored (not a copy of elements)         | none                                     |
| other format | ignored                                  | none                                     |
| version      | refused: "made by a newer version"       | `template-clipboard-invalid` (`version`) |
| schema       | refused: "could not be read"             | `template-clipboard-invalid` (`schema`)  |
| limits       | refused with today's count/depth message | none (author-facing limit, not a fault)  |

Memory slot: `let lastCopied: CopiedElements | undefined` in `clipboard.ts`, per tab, cleared on
reload.

## Paste identity

- Fresh ids for every node, column, option, entry field (`cloneWithFreshIds`).
- Value keys: dropped on the same page; kept on another page unless the coordinate exists in the
  target; system-data coordinates always kept.
- `remap: Map<oldCoordinate, newCoordinate>` over nodes inside the copy, applied to `formula`,
  `maxFrom`, `minFrom`, `maxMinFrom`, `visibleWhen.coordinate` within the copy.
- Names: same page → the Duplicate "copy" suffix; another page → unchanged.

## Paste placement

Given the normalized selection's last element `a` (or none):

1. none → end of the page root;
2. `a` is a container (section, group) → end of `a`'s children;
3. otherwise → after `a` in its parent, in `a`'s column.

If the insert is refused by the depth limit, try after the container (case 2) / the enclosing
container (case 3), then the end of the page. The count limit refuses the paste.

## Multi-node operations (`draft.ts`)

| Function                                 | Result                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `removeNodes(draft, ids)`                | draft without them; next selection = the element after the last removed |
| `duplicateNodes(draft, ids)`             | each copy after its original; selection = the copies                    |
| `insertNodesAt(draft, placement, nodes)` | nodes inserted together in order; `DraftOpResult`                       |
| `placeNodes(draft, ids, placement)`      | set moved to the placement in page order; refused inside the set        |
| `moveEachByCommand(draft, ids, command)` | Alt-arrow rules of research R7; unchanged draft when nothing can move   |

Each is applied with one `applyChange` (one undo step) and the new selection. After a paste or a
move, the new selection is revealed on the page and in the outline, opening folded ancestors.

## Shared setting descriptor

```ts
interface SharedSetting<Value> {
    key: string; // data-setting key (spec 022)
    group: SettingsGroupId;
    label: MessageDescriptor;
    control: 'boolean' | 'number' | 'text' | 'condition' | 'docs-link';
    appliesTo(node: TemplateNode): boolean;
    read(node: TemplateNode): Value | undefined;
    write(node: TemplateNode, value: Value | undefined): TemplateNode;
}
```

Shown when `appliesTo` holds for every normalized selected node; value = common `read` or
`MIXED`. A write maps every node through `write` in one draft change, coalesced per setting key.

## Editor command

```ts
interface EditorCommand {
    id:
        | EditorShortcut
        | 'cut'
        | 'copy'
        | 'paste'
        | 'add-to-selection'
        | 'toggle-selection'
        | 'range-selection'
        | 'clear-selection'
        | 'shortcuts';
    group: 'edit' | 'selection' | 'arrange' | 'history';
    label: MessageDescriptor;
    /** Physical keys; Apple platforms may list their own (e.g. Backspace for Remove). */
    keys?: { code: string; mod?: true; shift?: true; alt?: true; apple?: boolean }[] | { key: '?' };
    /** Also bound to the browser clipboard event, with the keydown fallback of research R2. */
    clipboard?: 'copy' | 'cut' | 'paste';
    /** A mouse binding shown in the list and the guide (Ctrl/⌘+click, Shift+click). */
    pointer?: 'toggle' | 'range';
    inMenu: boolean;
    touchOnly?: true;
    available(context: CommandContext): boolean;
}

interface CommandContext {
    selection: readonly string[]; // normalized
    draft: EditorDraft;
    hasCopy: boolean;
    canUndo: boolean;
    canRedo: boolean;
}
```

The keyboard matcher, the context menu, the shortcut list, and the guide table test all read the
same array. Escape is the `clear-selection` command (`keys: [{ code: 'Escape' }]`), handled through
the dialog's `onEscapeKeyDown` (research R9), not the generic matcher.
