import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    buildTranslationOutputs,
    staleOutputs,
    writeOutputs,
} from '../../scripts/translation-build';
import { writeFixture } from './fixtureFiles';

async function fixturePaths() {
    const root = await writeFixture({
        'translations/source/en/ui/sheet.yaml': 'title: Title\n',
        'translations/source/ru/ui/sheet.yaml': 'title: Заголовок\n',
        'translations/glossary/v5.yaml':
            '- id: title\n  en: Title\n  ru: Заголовок\n  ruShort: Загл.\n  refs: [ttgamer.ui.sheet.title]\n',
        'translations/source/ru/docusaurus.json': JSON.stringify({
            'theme.keep': { message: 'Оставить' },
        }),
    });
    return {
        root,
        paths: {
            sourceRoot: path.join(root, 'translations/source'),
            glossaryRoot: path.join(root, 'translations/glossary'),
            i18nRoot: path.join(root, 'i18n'),
            generatedRoot: path.join(root, 'src/i18n/generated'),
        },
    };
}

describe('build-translations --check', () => {
    it('reports every file that would change, then nothing after writing', async () => {
        const { root, paths } = await fixturePaths();
        const { outputs } = await buildTranslationOutputs(paths);
        const stale = (await staleOutputs(outputs)).map((file) => path.relative(root, file));
        expect(stale.sort()).toEqual([
            'i18n/en/code.json',
            'i18n/ru/code.json',
            'src/i18n/generated/bookTerms.ts',
            'src/i18n/generated/catalogTranslations.ts',
            'src/i18n/generated/uiMessages.ts',
        ]);
        await writeOutputs(outputs);
        expect(await staleOutputs((await buildTranslationOutputs(paths)).outputs)).toEqual([]);
    });

    it('keeps Docusaurus keys and generates book terms from the glossary', async () => {
        const { root, paths } = await fixturePaths();
        await writeOutputs((await buildTranslationOutputs(paths)).outputs);
        const code = JSON.parse(await readFile(path.join(root, 'i18n/ru/code.json'), 'utf8'));
        expect(code['theme.keep']).toEqual({ message: 'Оставить' });
        expect(code['ttgamer.ui.sheet.title']).toEqual({ message: 'Заголовок' });
        const bookTerms = await readFile(
            path.join(root, 'src/i18n/generated/bookTerms.ts'),
            'utf8'
        );
        expect(bookTerms).toContain('"ttgamer.ui.sheet.title": {');
        expect(bookTerms).toContain('"ruShort": "Загл."');
    });

    it('moves the long fields of a `_lazy` catalog into its own module (spec 037, D9)', async () => {
        const root = await writeFixture({
            'translations/source/en/ui/sheet.yaml': 'title: Title\n',
            'translations/source/ru/ui/sheet.yaml': 'title: Заголовок\n',
            'translations/source/en/data/clans.yaml':
                "_lazy: [summary, bane]\nbrujah:\n    name: 'Brujah'\n    summary: 'Rebels.'\n    bane: 'Fury.'\n",
            'translations/source/ru/data/clans.yaml':
                "brujah:\n    name: 'Бруха'\n    summary: 'Бунтари.'\n    bane: 'Ярость.'\n",
            'translations/source/en/data/plain.yaml':
                "one:\n    name: 'One'\n    summary: 'Kept.'\n",
            'translations/source/ru/data/plain.yaml':
                "one:\n    name: 'Один'\n    summary: 'Да.'\n",
        });
        const generatedRoot = path.join(root, 'src/i18n/generated');
        const { outputs } = await buildTranslationOutputs({
            sourceRoot: path.join(root, 'translations/source'),
            glossaryRoot: path.join(root, 'translations/glossary'),
            i18nRoot: path.join(root, 'i18n'),
            generatedRoot,
        });
        const catalog = outputs.get(path.join(generatedRoot, 'catalogTranslations.ts'))!;
        expect(catalog).toContain('"Бруха"');
        expect(catalog).not.toContain('Бунтари');
        expect(catalog).not.toContain('_lazy');
        expect(catalog).toContain('"Да."');

        const lazy = outputs.get(path.join(generatedRoot, 'catalogText', 'clans.ts'))!;
        expect(lazy).toContain('"Rebels."');
        expect(lazy).toContain('"Ярость."');
        expect(lazy).not.toContain('"Brujah"');
        expect(outputs.has(path.join(generatedRoot, 'catalogText', 'plain.ts'))).toBe(false);
    });
});
