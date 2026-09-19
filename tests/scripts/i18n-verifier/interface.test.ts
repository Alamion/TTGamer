import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../scripts/i18n-verifier/config';
import { isUserFacingText, userFacingLiterals } from '../../../scripts/i18n-verifier/positions';
import { runVerifier } from '../../../scripts/i18n-verifier/run';
import { fixtureOptions } from './fixture';
import { findingsOf } from './helpers';

function literals(code: string, file = 'src/components/Example.tsx') {
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    return userFacingLiterals(source, file, DEFAULT_CONFIG).map((item) => item.text);
}

describe('interface rule', () => {
    it('reports each user-facing position with file and line', async () => {
        const run = await runVerifier(await fixtureOptions(), { rules: ['interface'] });
        expect(findingsOf(run.findings, 'interface')).toEqual([
            'src/components/Planted.tsx:9 | JSX text "Planted label"',
            'src/components/Planted.tsx:10 | attribute aria-label "Close dialog"',
            'src/components/Planted.tsx:11 | JSX expression "Inline expression"',
            'src/components/Planted.tsx:13 | attribute placeholder "Ready text"',
            'src/components/Planted.tsx:13 | attribute placeholder "Waiting text"',
            'src/components/Planted.tsx:24 | message toast.error "Save failed"',
            'src/components/fields.ts:4 | property label "Object label"',
        ]);
        expect(run.excepted.map((finding) => finding.match)).toEqual(['Discord']);
    });

    it('ignores class names, keys, urls, notation, logging, errors, and tests', () => {
        expect(
            literals(`
                const view = <div className="flex gap-2" key="row" data-id="x" href="/docs/a">3d10+2</div>;
                console.log('Debug text here');
                throw new Error('Developer facing error');
            `)
        ).toEqual([]);
    });

    it('treats label-like component props as user-facing', () => {
        expect(
            literals(`const panel = <SlidePanel closeAriaLabel="Close panel" labelKey="name" />;`)
        ).toEqual(['Close panel']);
    });

    it('treats a label next to labelMessage as a translated fallback', () => {
        expect(
            literals(
                `export const a = { label: 'Strength', labelMessage: 'catalog:attributes/strength' };`
            )
        ).toEqual([]);
        expect(literals(`export const b = { label: 'Strength' };`)).toEqual(['Strength']);
        expect(literals(`export const c = { label: 'Strength' };`, 'src/lib/util.ts')).toEqual([]);
    });

    it('classifies literal text', () => {
        expect(isUserFacingText('Save changes')).toBe(true);
        expect(isUserFacingText('Сохранить')).toBe(true);
        for (const text of [
            'HP',
            '4d20kh3',
            'https://example.com',
            'ttgamer.ui.sheet.title',
            'melee-weapons',
            'specialtyText',
            '{count}',
            '—',
        ]) {
            expect(isUserFacingText(text), text).toBe(false);
        }
    });
});
