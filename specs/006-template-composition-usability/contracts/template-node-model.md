# Contract: Template Node Model (file format v3)

**Feature**: 006-template-composition-usability | **Status**: Draft (Phase 1)
**Owner**: `src/sheet_manager/types/template.ts` + `store/templateStore.ts`

This contract defines the persisted template shape, the editor tree operations, and the
retirement rules for pre-feature templates. The schema validates **shape only** — binding,
formula, and depth-of-meaning checks happen where the owning system/formula module is
available (editor + renderer).

## 1. Document shape

```jsonc
// ttgamer-template file wrapper (v3)
{
    "wrapper": "ttgamer-template",
    "version": 3,
    "template": {
        "id": "my-sheet", // kebab-case identifier, unique in library
        "name": "My Sheet",
        "description": "optional",
        "systemId": "star-wars-wod", // compatibility: systemId + documentKind
        "documentKind": "character",
        "schemaVersion": 3,
        "children": [
            /* TemplateNode[] — page root */
        ],
    },
}
```

Import keeps validation-first semantics: the whole file parses against this contract before
any state change; unavailable bindings/formulas degrade at render, never at import.

## 2. Node union

| `type`      | Kind      | Persisted fields (beyond `id`)                                                                                                                                           |
| ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `section`   | container | `title`, `docsPath?`, `columns?` (1–4), `children`                                                                                                                       |
| `group`     | container | `title`, `collapsible?` (default false), `columns?` (1–4), `children`                                                                                                    |
| `field`     | leaf      | field union: `text`/`number`/`toggle`/`select`/`rating`/`resource`/`reference` + **`image`** + **`formula`**; `valueKey?`, `compact?`; `rating`/`number` gain `maxFrom?` |
| `table`     | leaf      | `title?`, `valueKey?`, `minRows`, `maxRows`, `columns: TemplateField[]`                                                                                                  |
| `list`      | leaf      | `title?`, exactly one of `valueKey` / `bindingKey`, `columns` (1–4, default 1), `presets?`                                                                               |
| `primitive` | leaf      | `bindingKey`, `label?`, `compact?`, `track?`, `maxFrom?` (resources only)                                                                                                |

Invariants:

- `maxDepth = 10` measured from the page root (root children are depth 1). The editor rejects
  deeper insertion with a named, actionable message; nothing is written.
- `nodesPerTemplate = 200` counts every node in the tree.
- All node ids are unique per template (one identifier namespace across every variant and
  level) and stable across edits.
- `field` ids double as value coordinates unless `valueKey` is set (unchanged D1/D2 rule).

## 3. View rendering contract (presentation)

| Node        | Rendering                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `section`   | collapsible block: no background, accent marker (automatic primary/secondary alternation), optional docs link that opens without toggling, optional column grid for **direct children** |
| `group`     | titled surface card (`bg-bgSurface`): title always visible; collapsible only if `collapsible: true`, state remembered per user under `template-<templateId>-<nodeId>`                   |
| `field`     | existing field controls; `image` renders upload/URL preview; `formula` renders read-only computed value with labeled error/degraded states                                              |
| `table`     | unchanged table renderer (rows under `tableValueKey`)                                                                                                                                   |
| `list`      | list editor molecule with configured columns; identical interface for both storage modes                                                                                                |
| `primitive` | 005 renderer switch on descriptor kind; resources honor `maxFrom` clamping                                                                                                              |

Accent colors derive from node parity per level; nothing stores accents. `compact` remains
the brief-format presentation flag.

## 4. Editor tree operations (draft model)

The editor draft performs pure tree operations; every operation re-validates limits:

- `insert(parentPath, index, node)` — parent may be the page root or any container; depth and
  node-count checks; new node gets a generated unique id.
- `remove(nodePath)` — removes the node **with its subtree**; stored bag values become
  orphaned and are retained (never destructively deleted).
- `move(nodePath, targetParentPath, index)` — moves the whole subtree; rejects moving a node
  into its own subtree (would create a cycle); preserves ids and children order.
- `update(nodePath, patch)` — shape-validated field updates.

## 5. Editor interaction affordances

- **Collapse**: chevron button on the panel's **right** edge; toggles visibility only
  (`aria-expanded`, persistent per editor session storage).
- **Reorder/move**: `GripVertical` handle on the panel's **left** edge; native HTML5 drag
  (pointer) reorders within the parent or drops into another container; keyboard: focused
  grip + ArrowUp/ArrowDown moves; dedicated ArrowUp/ArrowDown icon buttons remain visible as
  the keyboard-visible fallback. Collapse and reorder never share an icon, side, or hit area.
- **Add**: every container (and the page root) exposes an add-palette offering: field (per
  type), group, section, table, list, image, primitive (kind-scoped bindings by system+kind).
  Placement target is always the palette's own container — no global mode switching.

## 6. Retirement of pre-feature templates (store v2 → v3)

- `STORE_VERSION = 3`; `migrateTemplateStoreState` parses `templates` and
  `defaultOverrides` entries against the v3 schema. Pre-feature shapes (they carry `sections`
  and cannot satisfy `children`) fail → move to the bounded `quarantine` (max 100), surfaced
  by the library UI as incompatible entries.
- Documents are never modified by migration. A `metadata.templateId` pointing at a retired
  template resolves as `missing` → the built-in page renders with the existing stale-template
  notice; the assignment stays re-pointable in the page selector.
- Import of a v2 file: rejected with an explanatory message (validation-first), file untouched.
