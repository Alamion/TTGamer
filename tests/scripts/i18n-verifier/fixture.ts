import { DEFAULT_CONFIG, type VerifierConfig } from '../../../scripts/i18n-verifier/config';
import type { LoadOptions } from '../../../scripts/i18n-verifier/context';
import type { TraitRowKind } from '../../../scripts/i18n-verifier/types';
import { writeFixture } from '../fixtureFiles';

/** Fixture project with one planted gap per verifier rule (spec 009 T016). */
export const FIXTURE_FILES: Record<string, string> = {
    'src/components/Planted.tsx': `
import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

export function Planted({ ready }: { ready: boolean }) {
    const skills = uiMessages.sheet.skills;
    return (
        <div className="flex items-center gap-2" data-testid="planted-root" key="root">
            <span>Planted label</span>
            <button aria-label="Close dialog" title={translate(uiMessages.sheet.title)}>
                {'Inline expression'}
            </button>
            <input placeholder={ready ? 'Ready text' : 'Waiting text'} />
            <span>3d10+2</span>
            <span>HP</span>
            <a href="https://example.com/help">{translate({ id: 'ttgamer.ui.sheet.onlyEnglish' })}</a>
            <span>{skills.dodge.message}</span>
            <span>Discord</span>
        </div>
    );
}

export function notify(error: unknown) {
    toast.error('Save failed');
    console.log('Debug message only');
    if (error) throw new Error('Developer error message');
}
`,
    'src/components/fields.ts': `
export const fields = [
    { id: 'title', label: 'Fallback label', labelMessage: 'ttgamer.ui.sheet.title' },
    { id: 'other', label: 'Object label' },
];
`,
    'src/sheet_manager/pickers.ts': `
export const options = SPECIES.map((entry) => ({ id: entry.id, name: entry.name }));
export const labelled = SPECIES.map((entry) => ({ id: entry.id, name: pickLabel(entry, 'ru') }));
export const search = (items: { name: string }[], query: string) =>
    items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
export const normalized = (items: { name: string }[], query: string) =>
    items.filter((item) => normalizeSearchText(item.name).includes(normalizeSearchText(query)));
`,
    'src/components/Planted.test.tsx': `export const ignored = <span>Test only text</span>;`,
    'translations/source/en/ui/sheet.yaml': `
title: Title
onlyEnglish: Only English
copied: Copied text
unusedKey: Never referenced
count: "{count} item(s)"
deleted:
  message: "{count} document|{count} documents"
  plural: true
skills:
  dodge: Dodge
  animalKen: Animal Ken
`,
    'translations/source/ru/ui/sheet.yaml': `
title: Заголовок
copied: Copied text
unusedKey: Нигде не используется
count: "{count} предмет(ов)"
deleted:
  message: "{count} документ|{count} документов"
  plural: true
skills:
  dodge: Уклонение
  animalKen: Обращение с животными
`,
    'translations/source/en/data/species.yaml': `
human:
  name: Human
  shortDescription: Common folk
  eras: [Old, New]
wookiee:
  name: Wookiee
  shortDescription: Tall and strong
_labels:
  category:
    Near-Human: Near-Human
    Alien: Alien
`,
    'translations/source/ru/data/species.yaml': `
human:
  name: Человек
  shortDescription: Обычные люди
  eras: [Старая]
_labels:
  category:
    Near-Human: Почти люди
`,
    'translations/glossary/v5.yaml': `
- id: dodge
  en: Dodge
  ru: Уклонение
  refs: [ttgamer.ui.sheet.skills.dodge]
- id: animal-ken
  en: Animal Ken
  ru: Обращение с животными
  refs: [ttgamer.ui.sheet.skills.animalKen]
- id: title
  en: Title
  ru: Название
  refs: [ttgamer.ui.sheet.title]
- id: ghost
  en: Ghost
  ru: Призрак
  refs: [ttgamer.ui.sheet.ghost]
- id: human
  en: Human
  ru: Человек
  ruShort: Человек
  refs: ["catalog:species/human"]
`,
    'translations/i18n-exceptions.yaml': `
- rule: interface
  file: src/components/*.tsx
  match: Discord
  reason: product name
- rule: interface
  match: Nothing matches this
  reason: stale entry
`,
    'docs/index.mdx': '# Docs\n',
    'docs/wod-v5/index.mdx': '---\ntitle: V5\n---\n\n# V5\n\nDodge keeps you alive.\n',
    'docs/wod-v5/missing.mdx': '# Missing\n',
    'i18n/ru/docusaurus-plugin-content-docs/current/index.mdx': '# Документация\n',
    'i18n/ru/docusaurus-plugin-content-docs/current/wod-v5/index.mdx': [
        '---',
        'title: V5',
        '---',
        '',
        "import { Thing } from '@site/src/thing';",
        'import {',
        '    Other,',
        "} from '@site/src/other';",
        '',
        '# Пятая редакция',
        '',
        'Уклонение помогает выжить. Позже Уклонение снова.',
        '',
        'This paragraph was never translated into Russian at all.',
        '',
        '<Thing',
        '    title="Some English title in props"',
        '/>',
        '',
        '```ts',
        'const english = "code stays English and is fine";',
        '```',
        '',
        'Навыки: Воровство (Larceny) и Уклонение (Dodge).',
    ].join('\n'),
};

export const FIXTURE_ROW_KINDS = new Map<string, Set<TraitRowKind>>([
    ['ttgamer.ui.sheet.skills.animalKen', new Set<TraitRowKind>(['traitWithSpecialty'])],
    ['ttgamer.ui.sheet.skills.dodge', new Set<TraitRowKind>(['traitWithSpecialty'])],
]);

/** Every rule gated, so planted gaps fail the run. */
export const GATED_CONFIG: VerifierConfig = {
    ...DEFAULT_CONFIG,
    levels: Object.fromEntries(
        Object.keys(DEFAULT_CONFIG.levels).map((rule) => [rule, 'error'])
    ) as VerifierConfig['levels'],
};

/** Every rule in report mode: findings are listed but never fail the run. */
export const REPORT_CONFIG: VerifierConfig = {
    ...DEFAULT_CONFIG,
    levels: Object.fromEntries(
        Object.keys(DEFAULT_CONFIG.levels).map((rule) => [rule, 'report'])
    ) as VerifierConfig['levels'],
};

export async function fixtureOptions(
    files: Record<string, string> = FIXTURE_FILES,
    config: VerifierConfig = GATED_CONFIG
): Promise<LoadOptions & { root: string }> {
    return {
        root: await writeFixture(files),
        config,
        catalogIds: ['species', 'vehicles'],
        rowKinds: FIXTURE_ROW_KINDS,
    };
}
