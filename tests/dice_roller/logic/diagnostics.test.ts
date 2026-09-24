import type { NotationDiagnostic } from '@site/src/dice_roller/dice-logic';
import { diagnoseNotation, validateNotation } from '@site/src/dice_roller/dice-logic';
import { describe, expect, it } from 'vitest';

const PRIMARY = ['number', 'dice', '('];

const cases: [string, Partial<NotationDiagnostic>][] = [
    ['5d10>=6f', { kind: 'missing-compare-value', offset: 7, length: 1, expected: ['compare'] }],
    ['2d6 & 1', { kind: 'unknown-character', offset: 4, length: 1, found: '&' }],
    ['2d6$', { kind: 'unknown-character', offset: 3, length: 1, found: '$' }],
    ['(2d10:h', { kind: 'unclosed-group', offset: 0, length: 1 }],
    ['(2d6+1', { kind: 'unclosed-group', offset: 0, length: 1 }],
    ['2d6)', { kind: 'trailing-input', offset: 3, length: 1, found: ')' }],
    ['2d6 3', { kind: 'trailing-input', offset: 4, length: 1, found: '3' }],
    ['2d6+', { kind: 'unexpected-end', offset: 4, length: 0, expected: PRIMARY }],
    ['+', { kind: 'unexpected-end', offset: 1, length: 0, expected: PRIMARY }],
    ['2d6*', { kind: 'unexpected-end', offset: 4, length: 0, expected: PRIMARY }],
    ['(2d6 1d4)', { kind: 'unexpected-token', offset: 5, length: 3, expected: [')'] }],
    ['kh3', { kind: 'unexpected-token', offset: 0, length: 3, expected: PRIMARY }],
    ['2d6>', { kind: 'missing-compare-value', offset: 3, length: 1, expected: ['number'] }],
    ['2d6>=', { kind: 'missing-compare-value', offset: 3, length: 2, expected: ['number'] }],
    ['2d6r>', { kind: 'missing-compare-value', offset: 4, length: 1 }],
    ['2d10>=6:h', { kind: 'label-position', offset: 7, length: 2 }],
    ['(2d10):h', { kind: 'label-position', offset: 6, length: 2 }],
    ['5:h', { kind: 'label-position', offset: 1, length: 2 }],
    ['3d6x3=6', { kind: 'set-bonus-needs-target', offset: 3, length: 2 }],
    ['6d10>=6x1=10', { kind: 'invalid-set-size', offset: 7, length: 2 }],
    ['6d10>=6x2', { kind: 'unexpected-end', offset: 9, length: 0, expected: ['compare'] }],
    ['6d10>=6x2=10x3=9', { kind: 'unexpected-token', offset: 12, length: 2 }],
    [
        '2d10@1',
        {
            kind: 'forced-values-count',
            offset: 4,
            length: 2,
            limit: { name: 'dice-count', max: 2 },
        },
    ],
    ['2d10@1,2,3>=6', { kind: 'forced-values-count', offset: 4, length: 6 }],
    [
        '300d6',
        { kind: 'limit-exceeded', offset: 0, length: 5, limit: { name: 'dice-count', max: 200 } },
    ],
    ['1d100001', { kind: 'limit-exceeded', limit: { name: 'dice-sides', max: 100_000 } }],
    ['1d[1-1001]', { kind: 'limit-exceeded', limit: { name: 'custom-faces', max: 1000 } }],
    [
        '9999999999',
        { kind: 'limit-exceeded', limit: { name: 'numeric-literal', max: 1_000_000_000 } },
    ],
];

describe('notation diagnostics (SC-005)', () => {
    it('covers at least 20 invalid notations', () => {
        expect(cases.length).toBeGreaterThanOrEqual(20);
    });

    it.each(cases)('%s', (notation, expected) => {
        expect(validateNotation(notation)).toBe(false);
        expect(diagnoseNotation(notation)).toMatchObject(expected);
    });

    it('covers every error kind', () => {
        const kinds = new Set(cases.map(([, diagnostic]) => diagnostic.kind));
        expect([...kinds].sort()).toEqual(
            [
                'forced-values-count',
                'invalid-set-size',
                'label-position',
                'limit-exceeded',
                'missing-compare-value',
                'set-bonus-needs-target',
                'trailing-input',
                'unclosed-group',
                'unexpected-end',
                'unexpected-token',
                'unknown-character',
            ].sort()
        );
    });

    it('keeps every span inside the input', () => {
        for (const [notation] of cases) {
            const diagnostic = diagnoseNotation(notation)!;
            expect(diagnostic.offset + diagnostic.length).toBeLessThanOrEqual(notation.length);
        }
    });

    it.each([
        '2d6+3',
        '4d6kh3',
        '2d20kl1',
        '5d10>=6',
        '5d10>=6f=1',
        '(3d10+1d10)>=6f=1',
        '6d10!!>=8',
        '4dF',
        '2d[1,3,5]',
        '1d100',
        '3d6r1ro<2',
        '(4d10+2d10:h)>=6x2=10',
        '2d10:h@10,4>=6',
        '2d20cs>=19cf=1',
        '10d6min2max5sd',
    ])('returns null for valid %s', (notation) => {
        expect(validateNotation(notation)).toBe(true);
        expect(diagnoseNotation(notation)).toBeNull();
    });

    it('does not diagnose empty input', () => {
        expect(diagnoseNotation('')).toBeNull();
        expect(diagnoseNotation('   ')).toBeNull();
    });
});
