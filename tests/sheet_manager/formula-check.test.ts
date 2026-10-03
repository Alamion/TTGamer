import { describe, expect, it } from 'vitest';

import { checkFormulaInput } from '../../src/sheet_manager/features/sheet/data/formulaCheck';

const coordinates = new Set(['passion', 'self-control', 'willpower.max']);

describe('checkFormulaInput (spec 022, FR-003)', () => {
    it('says nothing about an empty box', () => {
        expect(checkFormulaInput(undefined, coordinates)).toEqual({ kind: 'empty' });
        expect(checkFormulaInput('   ', coordinates)).toEqual({ kind: 'empty' });
    });

    it('lists the values a valid formula reads', () => {
        expect(checkFormulaInput('passion + self-control', coordinates)).toEqual({
            kind: 'ok',
            reads: ['passion', 'self-control'],
        });
        expect(checkFormulaInput('3', coordinates)).toEqual({ kind: 'ok', reads: [] });
    });

    it('points at the character where parsing fails', () => {
        expect(checkFormulaInput('passion +', coordinates)).toMatchObject({
            kind: 'error',
            code: 'parse',
        });
        const check = checkFormulaInput('passion ) 2', coordinates);
        expect(check).toEqual({ kind: 'error', code: 'parse', position: 9 });
    });

    it('names the first unknown value', () => {
        expect(checkFormulaInput('curage + 2', coordinates)).toEqual({
            kind: 'error',
            code: 'unknown',
            name: 'curage',
        });
    });

    it('accepts dotted coordinates of resource parts', () => {
        expect(checkFormulaInput('willpower.max - 1', coordinates)).toEqual({
            kind: 'ok',
            reads: ['willpower.max'],
        });
        expect(checkFormulaInput('strength.max', coordinates)).toMatchObject({
            kind: 'error',
            code: 'unknown',
            name: 'strength.max',
        });
    });
});
