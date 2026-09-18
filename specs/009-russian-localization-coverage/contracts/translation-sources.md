# Contract: Translation Sources, Glossary, and Exceptions

## Directory layout

```text
translations/
├── source/
│   ├── en/ui/<domain>/**.yaml      existing; new domains: dice/, shared/, site/, integrations/, catalogs/
│   ├── ru/ui/<domain>/**.yaml      mirror of en
│   ├── en/data/<catalogId>.yaml    Star Wars catalogs added (data-model §2)
│   └── ru/data/<catalogId>.yaml
├── glossary/
│   ├── star-wars-wod.yaml          data-model §3
│   ├── v5.yaml
│   └── v5-hunter.yaml
└── i18n-exceptions.yaml            data-model §7
```

UI domain → message id prefix: `ttgamer.ui.<domain>.<path>`. New domains:

| Domain         | Covers                                                                           |
| -------------- | -------------------------------------------------------------------------------- |
| `site`         | home page (`src/pages/index.tsx`), navbar/footer strings not owned by Docusaurus |
| `dice`         | `src/dice_roller/**` UI, settings, history, notation help, sharing feedback      |
| `shared`       | `src/shared/components/**` (DataCatalog chrome, BottomSheet, SlidePanel)         |
| `integrations` | Discord delivery messages and errors shown to users                              |
| `catalogs`     | column headers, filter labels, detail labels of `src/data/*Config.tsx`           |
| `sheet.items`  | weapon, armor, inventory, implant cards (T-060)                                  |

## Consuming rules for code

- UI text: `translate(uiMessages.<path>)`, `translate(uiMessages.<path>, { name })`, or
  `<Translate id=…>` with a generated id. No literal message ids outside generated descriptors.
- Counts: messages with `plural: true` render through `usePluralForm().selectMessage(count, translate(desc, { count }))`.
- Catalog text: `entryText`, `entryLabel`, `pickLabel`, `entryList`, `entryEnumLabel` from
  `systems/catalogs.ts`; never read `entry.name` for display.
- Book-term labels: through `TermLabel` (contracts/term-hint.md).
- Search: `normalizeSearchText` from `src/shared/utils/normalizeSearchText.ts`.

## Docs conventions (ru)

- First mention of a glossary term on a page: `Воровство (Larceny)`; later mentions Russian only.
- Catalog embeds pass translation descriptors for headers and filter labels, never literals.

## Governance

- A new user-facing string without en + ru entries fails `yarn verify:fast`.
- Adding an exception requires a `reason`; reviewers treat new exceptions like new lint disables.
- Glossary changes that rename a `ru` term must update every ref in the same change (the `glossary`
  rule enforces it).
