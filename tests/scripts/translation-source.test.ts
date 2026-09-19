import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    flattenStringLeaves,
    flattenUiMessages,
    loadExceptions,
    loadGlossary,
    loadTranslationSources,
} from '../../scripts/translation-source';
import { writeFixture } from './fixtureFiles';

describe('translation sources', () => {
    it('accepts plural messages, string lists, and catalog labels', async () => {
        const root = await writeFixture({
            'en/ui/sheet.yaml':
                'deleted:\n  message: "{count} document|{count} documents"\n  plural: true\n',
            'ru/ui/sheet.yaml':
                'deleted:\n  message: "{count} документ|{count} документа|{count} документов"\n  plural: true\n',
            'en/data/abilities.yaml':
                'blaster:\n  name: Blaster\n  specialties: [Pistol, Rifle]\n_labels:\n  category:\n    Combat: Combat\n',
            'ru/data/abilities.yaml':
                'blaster:\n  name: Бластер\n  specialties: [Пистолет, Винтовка]\n_labels:\n  category:\n    Combat: Боевые\n',
        });
        const sources = await loadTranslationSources(root);
        expect(flattenUiMessages(sources.ui.en)['sheet.deleted']).toEqual({
            message: '{count} document|{count} documents',
            plural: true,
        });
        expect(flattenStringLeaves(sources.data.ru)).toMatchObject({
            'abilities.blaster.specialties.1': 'Винтовка',
            'abilities._labels.category.Combat': 'Боевые',
        });
    });

    it('rejects empty list items and unknown UI message keys', async () => {
        const badList = await writeFixture({
            'en/data/abilities.yaml': 'blaster:\n  specialties: [Pistol, ""]\n',
        });
        await expect(loadTranslationSources(badList)).rejects.toThrow(/non-empty strings/);
        const badKey = await writeFixture({
            'en/ui/sheet.yaml': 'title:\n  message: Title\n  context: nope\n',
        });
        await expect(loadTranslationSources(badKey)).rejects.toThrow(/plural/);
    });
});

describe('glossary', () => {
    it('loads terms tagged with their system file', async () => {
        const root = await writeFixture({
            'v5.yaml':
                '- id: larceny\n  en: Larceny\n  ru: Воровство\n  refs: [ttgamer.ui.sheet.v5.skills.larceny]\n',
            'star-wars-wod.yaml':
                '- id: blaster\n  en: Blaster\n  ru: Бластер\n  ruShort: Бласт.\n  refs: ["catalog:abilities/blaster"]\n',
        });
        const terms = await loadGlossary(root);
        expect(terms.map((term) => [term.system, term.id, term.ruShort])).toEqual([
            ['star-wars-wod', 'blaster', 'Бласт.'],
            ['v5', 'larceny', undefined],
        ]);
    });

    it('rejects a ref owned by two terms', async () => {
        const root = await writeFixture({
            'a.yaml': '- id: one\n  en: One\n  ru: Один\n  refs: [ttgamer.ui.x]\n',
            'b.yaml': '- id: two\n  en: Two\n  ru: Два\n  refs: [ttgamer.ui.x]\n',
        });
        await expect(loadGlossary(root)).rejects.toThrow(/already belongs to term a\/one/);
    });

    it('rejects malformed refs and duplicate ids', async () => {
        const badRef = await writeFixture({
            'a.yaml': '- id: one\n  en: One\n  ru: Один\n  refs: [sheet.one]\n',
        });
        await expect(loadGlossary(badRef)).rejects.toThrow(/not a UI id or catalog ref/);
        const duplicate = await writeFixture({
            'a.yaml': '- id: one\n  en: One\n  ru: Один\n- id: one\n  en: Uno\n  ru: Один\n',
        });
        await expect(loadGlossary(duplicate)).rejects.toThrow(/duplicate term id/);
    });

    it('treats a missing glossary directory as empty', async () => {
        const root = await writeFixture({});
        await expect(loadGlossary(path.join(root, 'missing'))).resolves.toEqual([]);
    });
});

describe('exceptions', () => {
    it('requires a reason', async () => {
        const root = await writeFixture({
            'ok.yaml': '- rule: interface\n  match: Discord\n  reason: product name\n',
            'bad.yaml': '- rule: interface\n  match: Discord\n',
        });
        await expect(loadExceptions(path.join(root, 'ok.yaml'))).resolves.toEqual([
            { rule: 'interface', match: 'Discord', reason: 'product name' },
        ]);
        await expect(loadExceptions(path.join(root, 'bad.yaml'))).rejects.toThrow(/reason/);
    });
});
