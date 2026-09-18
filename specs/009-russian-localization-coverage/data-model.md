# Data Model: Complete Russian Localization with Verified Coverage

All additions are optional fields or new source files. There is no persisted-store version bump and
no migration (clarification Q3). Russian-language content lives only in `translations/**` and
`i18n/ru/**`; everything in this document is English, per Principle VI.

## 1. Translation source entry (extended)

Location: `translations/source/<locale>/ui/**/*.yaml` (existing).

| Field         | Type                            | Rule                                                       |
| ------------- | ------------------------------- | ---------------------------------------------------------- | ----------------------------------- | --- | -------------------------------------------------- |
| key path      | YAML path → `ttgamer.ui.<path>` | unchanged                                                  |
| `message`     | string                          | required; plain string leaf is shorthand for `{message}`   |
| `description` | string?                         | unchanged                                                  |
| `plural`      | boolean?                        | **new**. When `true`, `message` holds forms separated by ` | `: en exactly 2, ru exactly 3 (`one | few | many`). Every form keeps the same `{placeholders}` |

Validation (verifier `keys`, `identical`, `plural` rules): key mirror across locales (existing);
placeholder parity (existing); a ru value equal to its en value is an error unless excepted; plural
form counts per locale; English messages containing `(s)` are warnings.

## 2. Catalog localized fields (extended)

Location: `translations/source/<locale>/data/<catalogId>.yaml` (existing shape), new files for every
Star Wars catalog: `species`, `merits-flaws`, `backgrounds`, `abilities`, `force-powers`,
`force-skills`, `virtues`, `melee-weapons`, `ranged-weapons`, `consumable-weapons`, `armor`,
`tools-gear`, `vehicles`, `creatures`, `terminology`.

```yaml
# <entryId>: localized user-facing fields
blaster:
    name: …
    shortDescription: …
    description: … # optional; English fallback, tracked in coverage report
    specialties: […] # new: string arrays allowed; length must equal the English array
_labels: # new reserved key: enumerated values shared by all entries
    category: { Heavy: …, Light: … }
    era: { Rebellion: … }
```

| Rule                                                                          | Level                             |
| ----------------------------------------------------------------------------- | --------------------------------- |
| every entry in the English catalog has `name` in ru                           | error                             |
| per-catalog `shortDescription` coverage ≥ 90% (each missing one is a warning) | error when a catalog is below 90% |
| `description` present in ru                                                   | warning (report only)             |
| array fields: same length as English                                          | error                             |
| every enumerated value used by entries has a `_labels` translation            | error                             |
| ids in YAML exist in the catalog (generalizes the current `attributes` check) | error                             |

Runtime: `entryText` keeps its fallback; arrays and `_labels` get `entryList(entry, key, lang)` and
`entryEnumLabel(catalogId, field, value, lang)` next to `entryText` in `systems/catalogs.ts`.

## 3. Glossary term (new)

Location: `translations/glossary/<system>.yaml` (`star-wars-wod`, `v5`, `v5-hunter`).

```yaml
- id: larceny
  en: Larceny
  ru: Воровство
  ruShort: … # optional; used when the row is narrow
  note: … # optional; why this translation was chosen
  refs:
      - ttgamer.ui.sheet.v5.skills.larceny
- id: animal-ken
  en: Animal Ken
  ru: Обращение с животными
  ruShort: … # chosen during the T-061 review
  refs: [ttgamer.ui.sheet.v5.skills.animalKen]
```

| Field      | Rule                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `id`       | unique within the file, kebab-case                                                                                         |
| `en`, `ru` | non-empty; `en` must equal the English message/catalog name at every ref                                                   |
| `ruShort`  | shorter than `ru`; required when `ru` exceeds the overflow budget of any row kind where a ref is displayed                 |
| `refs`     | each ref resolves (UI id in the en source, or `catalog:<catalog>/<entry>` present in data); a ref belongs to one term only |

Consistency (`glossary` rule): the ru message or catalog name at every ref equals `ru`.

Generated: `src/i18n/generated/bookTerms.ts` — `Record<ref, { en: string; ruShort?: string }>` (only
fields needed at runtime; `ru` is already in `code.json`/catalog translations).

## 4. Book-term link on template nodes (new optional fields)

Location: `src/sheet_manager/types/template.ts` — `fieldBaseShape` and `PrimitiveNode`.

| Field          | Type                                 | Meaning                                              |
| -------------- | ------------------------------------ | ---------------------------------------------------- |
| `labelMessage` | existing ref?                        | localizes the label; deleted when the author renames |
| `termRef`      | ref? (same schema as `labelMessage`) | **new**. Book term of this node, kept across renames |
| `termHint`     | `false`?                             | **new**. Author turned the hint off; absent means on |

Effective term ref = `termRef ?? labelMessage`, and it only counts when listed in `bookTerms`.

State transitions in the editor:

| Action                                               | `label`          | `labelMessage` | `termRef`                                | `termHint` |
| ---------------------------------------------------- | ---------------- | -------------- | ---------------------------------------- | ---------- |
| shipped template                                     | English fallback | ref            | —                                        | —          |
| author renames                                       | new text         | deleted        | set to previous `labelMessage` if absent | unchanged  |
| author toggles hint off                              | —                | —              | —                                        | `false`    |
| field switched to a custom source (`sourceNodes.ts`) | unchanged        | deleted        | deleted                                  | deleted    |
| template exported/imported                           | kept             | kept           | kept                                     | kept       |

`TEMPLATE_SCHEMA_VERSION` and `TEMPLATE_FILE_VERSION` stay at 3 (optional additive keys).

## 5. Equipment item entry reference (new optional field)

Location: body item shapes in the Star Wars and V5 document schemas (weapons, armor, inventory,
implants).

| Field      | Type                       | Meaning                                |
| ---------- | -------------------------- | -------------------------------------- |
| `entryRef` | `"<catalogId>/<entryId>"`? | catalog entry the item was picked from |

Display name: the localized entry name while stored `name` is empty or equals the entry's English
name; otherwise the stored `name` (user override). Copied numeric/stat fields are unchanged.

## 6. Reader preferences (new)

Location: `src/shared/store/readerPrefsStore.ts`, `localStorage` key `ttgamer-reader-prefs`, version 1.

| Field                     | Type                         | Default |
| ------------------------- | ---------------------------- | ------- |
| `gameTerms`               | `'ru' \| 'en' \| 'ru-plain'` | `'ru'`  |
| `termHintNoticeDismissed` | boolean                      | `false` |

Only applies when the site locale is not English. Corrupt or missing storage → defaults (wrapped in
try/catch; private mode works).

## 7. Exception list entry (new)

Location: `translations/i18n-exceptions.yaml`.

```yaml
- rule: interface # interface | keys | identical | catalog | docs | docs-terms | pickers | glossary | plural | overflow
  file: src/dice_roller/components/DiceNotationHelp.tsx # optional glob
  match: 'd100' # exact text, or /regex/
  reason: dice notation shown verbatim
```

An entry without `reason` is an error; an entry that matches nothing is a warning.

## 8. Coverage report (verifier output)

```text
Finding { rule, level: 'error' | 'warning', location: file:line | catalog/entry[.field] | docs page | ref, message }
AreaSummary { area: 'interface' | 'catalog' | 'docs', covered, missing, excepted }
```

Exit code 1 when any finding is `error` in an area configured as `error`.
