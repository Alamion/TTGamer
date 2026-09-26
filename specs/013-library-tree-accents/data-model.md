# Data Model: Library tree for rules, settings, types, and pages

Phase 1 of [plan.md](./plan.md). Persisted shapes are marked **stored**. Everything else is derived
on each render and is never persisted.

## Stored changes

### `SystemPlugin.ruleset` (code-owned declaration)

| Field     | Type                    | Rule                                                                                                                                                 |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ruleset` | `SystemId \| undefined` | Only for a setting system. It must name a registered plugin that has no `ruleset` itself; the registry constructor checks this. Star Wars: `wod-2e`. |

### `UserDocumentType` (**stored**, `documentTypeStore` v2)

| Field               | Change                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `defaultTemplateId` | Now **optional**. When present, it must be a user template of this type; otherwise the writer drops it. |

Other fields are unchanged: `id`, `name`, `description`, `owner`, `createdAt`, `updatedAt`.

### `UserSetting` (**stored**, unchanged shape)

`pages[definitionId]` stays the default page of the core character inside the setting. After a
move to another ruleset, it holds only the new ruleset's core definitions.

### `defaultPages` (**stored**, new in `documentTypeStore` v2)

`Record<PageScopeKey, string>`, where `PageScopeKey = systemId:definitionId` (a shipped type).

The value is a shipped view id of that definition, or the id of a user template compatible with
it. The value is dropped when:

- that page is deleted or moved away;
- the type disappears (a system is removed).

Migration v1 → v2 does the following:

- adds `defaultPages: {}`;
- re-parses types, where a missing `defaultTemplateId` is now allowed;
- keeps quarantine behavior as is.

### `DocumentEnvelope` (**stored**, `documentStore` v4, shape unchanged)

Moves may rewrite these fields:

- `systemId`, for documents of a user type;
- `metadata.settingId`;
- `metadata.templateId`.

`documentStore.relocateDocuments(changes: DocumentRelocation[])` applies them in one write. Each
change is `{ id, systemId?, settingId?: string | null, templateId?: string | null }`, where
`null` clears the field. Documents of shipped definitions are never re-systemed.

## Derived: the library tree

```ts
type LibraryLevel = 'ruleset' | 'setting' | 'type' | 'page';
type Ownership = 'shipped' | 'user';

interface LibraryNodeBase {
    key: string; // stable, see "Node keys"
    level: LibraryLevel;
    name: string; // translated for shipped nodes, as written for user nodes
    description?: string;
    ownership: Ownership;
    documentCount: number; // sum over the subtree
    unavailable?: boolean; // its ruleset (or its owner setting) is not registered
}

interface RulesetNode extends LibraryNodeBase {
    level: 'ruleset';
    systemId: string;
    settings: SettingNode[];
}

interface SettingNode extends LibraryNodeBase {
    level: 'setting';
    ref:
        | { kind: 'rules'; systemId: string }
        | { kind: 'module'; systemId: string; moduleId: string }
        | { kind: 'system'; systemId: string }
        | { kind: 'user'; settingId: string };
    types: TypeNode[];
}

interface TypeNode extends LibraryNodeBase {
    level: 'type';
    ref:
        | { kind: 'shipped'; systemId: string; definitionId: string }
        | { kind: 'core'; systemId: string; definitionId: string; settingId: string }
        | { kind: 'user'; typeId: string };
    defaultPageKey?: string; // missing: stored values (user type) or "Rules only" fallback (core)
    fallback?: 'stored-values' | 'rules-only';
    pages: PageNode[];
}

interface PageNode extends LibraryNodeBase {
    level: 'page';
    ref:
        | { kind: 'shipped'; systemId: string; viewId: string; edited: boolean }
        | { kind: 'user'; templateId: string };
    isDefault: boolean;
}
```

### Node keys

The key is stable across renders, so it serves as the selection, expansion, and export id.

| Node                 | Key                                 |
| -------------------- | ----------------------------------- |
| Ruleset              | `r:<systemId>`                      |
| "Rules only"         | `s:rules:<systemId>`                |
| Module setting       | `s:module:<systemId>:<moduleId>`    |
| Setting system       | `s:system:<systemId>`               |
| User setting         | `s:user:<settingId>`                |
| Shipped type         | `t:<systemId>:<definitionId>`       |
| Core in user setting | `t:core:<settingId>:<definitionId>` |
| User type            | `t:user:<typeId>`                   |
| Shipped page         | `p:<systemId>:<viewId>`             |
| User page            | `p:user:<templateId>`               |

### Placement rules

The rules below are the ones `buildLibraryTree` applies. Research R2 and R3 explain them.

- A user type with owner `{settingId}` goes under that user setting. A setting that is missing
  is shown as an unavailable user setting with that id, so the type is never dropped.
- A user setting whose `systemId` is not a registered ruleset goes under a synthetic ruleset node
  with key `r:unavailable`, rendered last as "Unavailable" (`unavailable: true`). Its subtree is
  read-only: no create, move in or out, or export.
- A user type with owner `{systemId, moduleId?}` is placed in one of three ways:
    - under the module setting, when a `moduleId` is given;
    - under the setting system, when the system declares `ruleset`;
    - under "Rules only", otherwise.
- A user template is placed in one of three ways:
    - under its user type, when `documentKind` is a user type;
    - under the core type of its user setting, when it has a `settingId` and a core kind;
    - under the shipped type whose definition has that kind in that system, otherwise.
- Shipped pages are `system.defaultTemplates` whose id is one of the definition's views. A page
  is `edited` when `defaultOverrides[overrideKey(systemId, viewId)]` exists.
- A page's `isDefault` is resolved in this order:
    1. the type's `defaultTemplateId` (user type);
    2. the setting's `pages[definitionId]` (core in a user setting);
    3. `defaultPages[systemId:definitionId]`;
    4. the definition's `defaultViewId` (shipped type).

## Derived: move plans

```ts
type MoveSubject = { level: 'page' | 'type' | 'setting'; key: string };

interface MovePlan {
    crossesSystem: boolean; // requires confirmation (FR-014)
    documentsMoving: number;
    documentsStaying: number; // FR-015a: old core character documents (pinned to the page they used)
    pagesStaying: number; // old core character pages left on the old ruleset
    writes: {
        types: UserDocumentType[];
        settings: UserSetting[];
        templates: CustomTemplate[];
        documents: DocumentRelocation[];
        defaultPages: Record<string, string | null>;
    };
}
```

**Valid targets** (`canMove`):

| Subject       | May go to                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------- |
| User page     | Any type other than its current one.                                                          |
| User type     | Any setting except "Rules only" and its current setting.                                      |
| User setting  | Any ruleset except its current one.                                                           |
| Anything else | Nothing. This covers shipped items, core types, "Rules only", and unavailable items (FR-013). |

## Derived: export selection

```ts
type Tick = 'checked' | 'unchecked' | 'partial';

interface ExportSelection {
    picked: Set<string>; // node keys the user ticked
}

interface ExportClosure {
    picked: Set<string>;
    auto: Set<string>; // user parents added for installation (tertiary)
    addresses: LibraryAddress[]; // shipped places the selection attaches to
}
```

- A node is **exportable** when it is a user node, an edited shipped page, or a shipped
  container with exportable descendants. Shipped containers only tick their user descendants.
- A node's tick state is `checked` when every exportable descendant is picked, and `partial` when
  some are.
- The closure adds, for each picked node:
    - its user ancestors (type and setting) to `auto`;
    - its shipped ancestors to `addresses`.

## Derived: import preview

```ts
type ImportState = 'new' | 'same' | 'conflict' | 'unavailable';

interface ImportEntry {
    key: string; // node key as it would be once installed
    level: LibraryLevel;
    state: ImportState;
    reason?: string; // translated note, e.g. "2 pages in the file, 0 here"
    choice?: 'replace' | 'keep-both'; // conflicts only; default 'replace'
    picked: boolean; // 'same' and 'unavailable' can never be picked
    auto: boolean; // picked because a picked child needs it
    children: ImportEntry[];
}
```

State transitions of the import flow:

1. **choose file**
2. **parsed**, or **rejected**, which shows the error (FR-021) and writes nothing.
3. **preview**, where the user ticks entries and chooses Replace or Keep both.
4. **confirm**, which writes in one batch and closes, then shows a summary toast. Cancelling at
   any point writes nothing (SC-005).
