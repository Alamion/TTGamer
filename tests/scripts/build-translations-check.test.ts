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
        'i18n/ru/code.json': JSON.stringify({ 'theme.keep': { message: 'Оставить' } }),
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
        expect(bookTerms).toContain("'ttgamer.ui.sheet.title': {");
        expect(bookTerms).toContain("ruShort: 'Загл.'");
    });
});
