---
name: ui-i18n
description: Maintain TTGamer's YAML-canonical UI and catalog localization. Use when adding or changing user-visible React strings, YAML translation resources, generated Docusaurus code.json entries, locale-aware catalog fields, or translation validation.
---

# TTGamer UI i18n

## Source and generated files

- Edit translations/source/<locale>/ui/**/\*.yaml for UI messages and data/**/\*.yaml for localized catalog fields. English owns the tree; every locale mirrors its leaves and interpolation names.
- Never edit i18n/_/code.json entries beginning ttgamer. or src/i18n/generated/_; run yarn build:translations.
- Docusaurus-owned entries in code.json are outside this compiler's ownership.

## UI messages

- Use translate(uiMessages....) for props and non-JSX strings. The generated descriptor supplies Docusaurus's required English fallback and stable literal ID.
- Use id-only <Translate id="ttgamer.ui...." /> only for rendered JSX where a component is appropriate.
- Do not add a custom locale store or runtime lookup. Docusaurus owns the active locale.
- Do not construct translation IDs dynamically. Use explicit maps when selection is necessary.

## Catalog messages

- Keep mechanics and stable IDs in src/data; provide only localized display fields in YAML.
- Pass Docusaurus's currentLocale into localizeCatalogEntry(). It falls back to the existing English record.
- Extend scripts/validate-translations.ts deliberately when a new catalog becomes a pilot; unknown catalog IDs must fail validation.

## Workflow

1. Change mirrored English/Russian YAML sources.
2. Run yarn build:translations, then use the generated descriptor or catalog output in code.
3. Run yarn validate:i18n and yarn i18n:status.
4. Run yarn verify:fast; run yarn verify:full when generated adapters or Docusaurus configuration changes.
