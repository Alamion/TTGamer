import { describe, expect, it } from 'vitest';

import { runVerifier } from '../../../scripts/i18n-verifier/run';
import { fixtureOptions } from './fixture';
import { findingsOf } from './helpers';

describe('source rules', () => {
    it('keys: referenced ids missing in a locale and one-locale keys', async () => {
        const run = await runVerifier(await fixtureOptions(), { rules: ['keys'] });
        expect(findingsOf(run.findings, 'keys')).toEqual([
            'src/components/Planted.tsx:16 | ttgamer.ui.sheet.onlyEnglish is missing in ru',
            'translations/source/ru/ui | ttgamer.ui.sheet.onlyEnglish exists only in en',
        ]);
    });

    it('unused: unreferenced keys are warnings only', async () => {
        const run = await runVerifier(await fixtureOptions(), { rules: ['unused'] });
        expect(run.findings.every((finding) => finding.level === 'warning')).toBe(true);
        expect(run.findings.map((finding) => finding.match)).toEqual([
            'ttgamer.ui.sheet.copied',
            'ttgamer.ui.sheet.unusedKey',
            'ttgamer.ui.sheet.count',
            'ttgamer.ui.sheet.deleted',
        ]);
        expect(run.exitCode).toBe(0);
    });

    it('identical: Russian copies of English values', async () => {
        const run = await runVerifier(await fixtureOptions(), { rules: ['identical'] });
        expect(findingsOf(run.findings, 'identical')).toEqual([
            'translations/source/ru/ui sheet.copied | same as English: "Copied text"',
        ]);
    });

    it('plural: "(s)" in English and wrong form counts', async () => {
        const run = await runVerifier(await fixtureOptions(), { rules: ['plural'] });
        expect(findingsOf(run.findings, 'plural')).toEqual([
            'translations/source/en/ui sheet.count | "(s)" plural; use a plural message: "{count} item(s)"',
            'translations/source/ru/ui sheet.deleted | 2 plural forms; ru needs 3',
        ]);
    });
});
