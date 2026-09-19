---
name: ui-i18n
description: Maintain TTGamer's YAML-canonical UI and catalog localization, the book-term glossary, and the translation coverage verifier. Use when adding or changing user-visible React strings, YAML translation resources, generated Docusaurus code.json entries, locale-aware catalog fields, glossary terms, or translation validation.
---

# TTGamer UI i18n

## Source and generated files

- Edit `translations/source/<locale>/ui/**/*.yaml` for UI messages and `data/<catalogId>.yaml` for localized catalog fields. English owns the tree; every locale mirrors its UI leaves and interpolation names. Catalog data may lag behind English (the code value is the fallback); coverage is tracked by the verifier.
- Never edit `ttgamer.*` entries of `i18n/*/code.json` or `src/i18n/generated/*`; run `yarn build:translations` (`--check` fails when they are stale).
- Docusaurus-owned entries in code.json are outside this compiler's ownership.
- A UI message file cannot use `message`, `description`, or `plural` as a top-level key (they mark a message leaf); nest them (`meta.pageTitle`).

## UI messages

- Use `translate(uiMessages....)` for props and non-JSX strings, `<Translate id="ttgamer.ui...." />` only for rendered JSX where a component is appropriate. Never construct ids dynamically; use explicit descriptor maps.
- Counts: YAML `plural: true`, forms separated by `|` (en `one|other`, ru `one|few|many`), rendered with `usePluralMessage()` from `src/shared/hooks/usePluralMessage.ts`. Never write "(s)".
- Default labels written into data (template editor "New section", picked item effects) are translated at creation time.
- Do not add a custom locale runtime. Docusaurus owns the active locale.

## Catalog data

- Keep mechanics and stable ids in `src/data`; YAML holds only display fields: strings, string lists (`specialties`, `scale`; same length as English), and the reserved `_labels` map for enumerated values (`_labels.category.<English value>`).
- Read catalog text only through `catalogEntryText` / `catalogEntryList` / `entryEnumLabel` / binding `entryText`, `entryLabel`, `pickLabel` (`src/sheet_manager/systems/catalogs.ts`). Never display `entry.name` directly.
- Pickers show `pickLabel` ("Русский (English)"); tables and sheet rows show the localized name. Search through `normalizeSearchText` / `matchesSearch` (`src/shared/utils/normalizeSearchText.ts`), which folds case, `ё`, and diacritics; search texts include the English name.
- Items picked from a catalog store the English name plus `entryRef` (`<catalogId>/<entryId>`); `resolveItemName` shows the localized name until the user renames the item.
- The browser ships only entry names for English (`catalogTranslations.en`); other locales ship every localized field.
- New catalogs: add the English source, register the id in `scripts/catalogSources.ts` when it is not a plugin catalog, and translate names (100%) and short descriptions (≥ 90% per catalog, FR-024).

## Glossary (book terms)

- `translations/glossary/<system>.yaml`: `id`, `en`, `ru`, optional `ruShort`, `note`, and `refs` (UI ids or `catalog:<catalogId>/<entryId>`). A label is a book term exactly when its ref is listed; it then gets the English-name hint (`TermLabel`), follows the "Game terms" preference, and must match `ru` everywhere.
- A term longer than a row's budget needs `ruShort` (verifier `overflow` rule; budgets in `scripts/i18n-verifier/config.ts`).
- Russian docs write a term's first mention on a page as «Русский (English)».

## Verifier (`yarn i18n:verify`)

- Rules: `interface` (user-facing literals via the TypeScript AST), `keys`, `unused` (warning), `identical`, `plural`, `pickers`, `catalog`, `glossary`, `overflow`, `docs`, `docs-terms`, `exceptions`. Flags: `--area`, `--rule`, `--all`, `--json`. Gate levels per rule live in `scripts/i18n-verifier/config.ts`.
- User-facing positions: JSX text, props in the user-facing list or named `*Label`/`*Title`/`*Placeholder`/`*Text`/`*Message`, `toast`/`alert`/`confirm` arguments, and `label`/`title`/… object properties in UI files unless the object also has `labelMessage`.
- Exceptions go to `translations/i18n-exceptions.yaml` with a reason; treat a new one like a lint disable. Unmatched exceptions are reported.

## Workflow

1. Change mirrored English/Russian YAML (and the glossary when a game term is involved).
2. `yarn build:translations`, then use the generated descriptor or catalog output in code.
3. `yarn i18n:verify` (and `yarn i18n:status` for coverage).
4. `yarn verify:fast` (runs `build:translations --check` and `validate:i18n`); `yarn verify:full` when generated adapters, CSS, or Docusaurus configuration change.
