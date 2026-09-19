import { describe, expect, it } from 'vitest';

import { runVerifier } from '../../../scripts/i18n-verifier/run';
import { FIXTURE_FILES, fixtureOptions } from './fixture';
import { findingsOf } from './helpers';

describe('content rules', () => {
    it('catalog: sources, names, lists, labels, and short-description coverage', async () => {
        const run = await runVerifier(await fixtureOptions(), { rules: ['catalog'] });
        expect(findingsOf(run.findings, 'catalog')).toEqual([
            'vehicles | no translation source translations/source/en/data/vehicles.yaml',
            'species/human.eras | ru list length differs from English',
            'species/wookiee.name | missing ru name for "Wookiee"',
            'species/wookiee.shortDescription | missing ru shortDescription',
            'species/_labels.category | ru has no label for "Alien"',
            'species | ru short descriptions 1/2 (50%), below 90%',
        ]);
        const warning = run.findings.find((finding) => finding.level === 'warning');
        expect(warning?.location).toBe('species/wookiee.shortDescription');
    });

    it('pickers: raw entry names and unnormalized search filters', async () => {
        const run = await runVerifier(await fixtureOptions(), { rules: ['pickers'] });
        expect(findingsOf(run.findings, 'pickers')).toEqual([
            'src/sheet_manager/pickers.ts:2 | option name uses raw entry.name from SPECIES; use pickLabel',
            'src/sheet_manager/pickers.ts:5 | search filter lowercases without normalizeSearchText',
        ]);
    });

    it('docs: missing pages and English prose outside code', async () => {
        const run = await runVerifier(await fixtureOptions(), { rules: ['docs'] });
        expect(findingsOf(run.findings, 'docs')).toEqual([
            'i18n/ru/docusaurus-plugin-content-docs/current/wod-v5/index.mdx:14 | English prose: "This paragraph was never translated into Russian at all."',
            'docs/wod-v5/missing.mdx | no ru translation of wod-v5/missing.mdx',
        ]);
    });

    it('docs-terms: first mention without the English name', async () => {
        const run = await runVerifier(await fixtureOptions(), { rules: ['docs-terms'] });
        expect(findingsOf(run.findings, 'docs-terms')).toEqual([
            'i18n/ru/docusaurus-plugin-content-docs/current/wod-v5/index.mdx:12 | first mention of "Уклонение" without "(Dodge)"',
        ]);
    });

    it('glossary: unresolved refs, Russian mismatches, and short forms', async () => {
        const run = await runVerifier(await fixtureOptions(), { rules: ['glossary'] });
        expect(findingsOf(run.findings, 'glossary')).toEqual([
            'translations/glossary/v5.yaml#title | Russian text at ttgamer.ui.sheet.title is "Заголовок", glossary says "Название"',
            'translations/glossary/v5.yaml#ghost | ref ttgamer.ui.sheet.ghost does not resolve',
            'translations/glossary/v5.yaml#human | ruShort "Человек" is not shorter than "Человек"',
        ]);
    });

    it('overflow: long Russian terms without a fitting short form', async () => {
        const run = await runVerifier(await fixtureOptions(), { rules: ['overflow'] });
        expect(findingsOf(run.findings, 'overflow')).toEqual([
            'translations/glossary/v5.yaml#animal-ken | "Обращение с животными" (21) exceeds 14 characters for traitWithSpecialty rows; add ruShort',
        ]);
        const fixed = {
            ...FIXTURE_FILES,
            'translations/glossary/v5.yaml': FIXTURE_FILES['translations/glossary/v5.yaml'].replace(
                'ru: Обращение с животными\n',
                'ru: Обращение с животными\n  ruShort: Животные\n'
            ),
        };
        const after = await runVerifier(await fixtureOptions(fixed), { rules: ['overflow'] });
        expect(after.findings).toEqual([]);
    });

    it('exceptions: unmatched entries are warnings', async () => {
        const run = await runVerifier(await fixtureOptions(), { rules: ['interface'] });
        expect(findingsOf(run.findings, 'exceptions')).toEqual([
            'translations/i18n-exceptions.yaml | exception matches nothing: interface "Nothing matches this"',
        ]);
    });
});
