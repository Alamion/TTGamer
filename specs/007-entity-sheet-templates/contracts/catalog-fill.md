# Contract: Catalog Suggestion Fill

Applies to every `select` with `binding.catalogId`, for any kind and setting.

## Registration

`features/sheet/data/catalogBindings.ts` registers catalogs by id. New: `creatures` (from `src/data/creatureData.ts`), `vehicles` (from `src/data/vehicleData.ts`). A catalog entry exposes **details**; a detail is produced by an **adapter** owned by the system module that registers the catalog's sheet mapping:

```text
CatalogDetailAdapter(entry) → Record<detailKey, DetailValue | undefined>
DetailValue = string | number | boolean | null | Row[]        // Row = Record<string, string | number | boolean>
```

## Fill semantics (FR-005)

1. Selecting an entry stores the entry id on the select's coordinate.
2. For each non-disabled fill `detailKey → targetFieldId`:
    - adapter returns `undefined` → target **untouched**;
    - returns `null` or `''` → target **cleared**;
    - otherwise target **overwritten** with the converted value.
3. Targets are resolved through the coordinate router: bridged coordinates write `document.data` via the lens (schema re-parse); bag coordinates write `templateValues`.
4. Row-valued details replace the whole target table/list (entries get fresh ids).
5. A select inside a table column may target sibling column ids; it writes that row only.
6. All writes from one selection are applied as one update (one undo step, one persist).
7. Clearing the select writes nothing else.

## Conversions (Star Wars adapters)

| Input                    | Output                                       | Out of range                                                 |
| ------------------------ | -------------------------------------------- | ------------------------------------------------------------ |
| `'5D'`, `'5D+2'`         | 5 (pips ignored)                             | clamp to target bounds, report `catalog-detail-out-of-range` |
| `'Speeder'`              | `speeder`                                    | unknown → `undefined` (untouched), report                    |
| willpower `'6D'`         | `{ current: 6, max: 6 }`                     | clamp                                                        |
| armor `'Tough hide +1D'` | `{ name: 'Tough hide', armorRating: '+1D' }` | no rating → name only                                        |
| weapon arc `'Turret'`    | `turret`                                     | unknown → raw text kept                                      |
| `hyperdrive: null`       | 0                                            | —                                                            |

## Failure

Catalog not loaded → select shows its existing unavailable state and reports `catalog-unavailable`; no writes.
