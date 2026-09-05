# Contract: Catalog Binding Registry

Scope: the declared boundary between `src/data/` catalogs and declarative template fields.
Templates persist only ids; this registry is the code-owned resolution side (research R5).
Location: `src/sheet_manager/features/sheet/data/catalogBindings.ts`.

## Types

```ts
type CatalogFillKind = 'text' | 'number';

interface CatalogFillableDetail {
    key: string; // stable kebab id, e.g. 'damage', 'description'
    kind: CatalogFillKind; // target field compatibility
    label: string; // editor-facing label (translation descriptor)
}

interface CatalogBindingEntry<TEntry> {
    catalogId: string; // kebab id persisted inside templates
    entries: readonly TEntry[]; // the typed catalog array from src/data
    entryLabel: (entry: TEntry, lang: string) => string; // localized option label
    fillableDetails: readonly CatalogFillableDetail[];
    defaultMapping: Readonly<Record<string, string>>; // detailKey -> default target hint
}

type CatalogBindingRegistry = ReadonlyMap<string, CatalogBindingEntry<never>>;
```

## Registered catalogs (v1)

| catalogId        | Source                      | Notable fillable details                                 |
| ---------------- | --------------------------- | -------------------------------------------------------- |
| `melee-weapons`  | `data/meleeWeaponsData.ts`  | `name`, `damage`, `difficulty`, `conceal`, `description` |
| `ranged-weapons` | `data/rangedWeaponsData.ts` | `name`, `damage`, `range`, `description`                 |
| `armor`          | `data/armorData.ts`         | `name`, `rating`, `description`                          |
| `tools-gear`     | `data/toolsGearData.ts`     | `name`, `description`                                    |
| `force-powers`   | `data/forcePowersData.ts`   | `name`, `description`                                    |
| `force-skills`   | `data/forceSkills.ts`       | `name`, `description`                                    |
| `species`        | `data/speciesData.ts`       | `name`, `description`                                    |
| `merits-flaws`   | `data/meritsFlawsData.ts`   | `name`, `description`                                    |

(The exact detail lists are finalized per catalog at implementation time from the typed
entries; the registry declaration is the single source of truth, and this table tracks the
initial set. Adding a catalog = adding one registry entry + tests.)

## Rules

1. **Closed set**: a template's `fills` keys MUST ⊆ that catalog's `fillableDetails` keys.
   Unknown key at save/import ⇒ validation error naming the key (never silent).
2. **Kind compatibility**: a `text` detail may target `text` fields; a `number` detail may
   target `number`/`rating`/`resource` fields. Incompatible mapping ⇒ editor prevents it;
   save/import rejects it.
3. **Target scope**: `fills[detailKey].targetFieldId` MUST reference a field defined in the
   same template (any block/section); dangling target ⇒ validation error.
4. **Option labels**: rendered through `entryLabel(entry, lang)` — reuses the existing
   catalog localization adapter; labels are never stored in templates.
5. **Option values**: the stored selection is the catalog entry's `id` (stable across
   localization and content edits).
6. **Degradation**: unknown `catalogId` at render/import ⇒ field falls back to a manual
   choice field (static `options`; a template with a binding still carries at least one
   placeholder option so the schema stays valid) + user notice naming the affected fields
   (FR-21). Degradation never mutates the stored template silently — the notice is
   informational, the binding stays persisted so it recovers if the catalog returns.
7. **Copy-on-select**: selecting an entry copies mapped details into the target fields as
   ordinary character-owned values (replace ⇒ re-copy; clear ⇒ untouched — clarify Q1).
   Copying maps detail kinds to values: `text` → string, `number` → finite number.

## Failure modes (Constitution III)

| Failure                          | User-visible outcome                                                |
| -------------------------------- | ------------------------------------------------------------------- |
| Catalog missing on device        | Notice listing affected field labels; fields remain usable manually |
| Entry removed after copy         | Copied values stay; option list simply no longer contains it        |
| Corrupt binding in imported file | Import rejected (schema/registry validation) — never partial        |
| Editor references removed field  | Save blocked with the dangling target named                         |
