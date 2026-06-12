import { describe, it, expect } from 'vitest';
import {
    parseParts,
    makePartRaw,
    findLastMatch,
    applyAdvantage,
    applyDisadvantage,
    splitD100Value,
    handleDiceNotation,
} from '@site/src/dice_roller/dice-logic/notation-utils';

describe('parseParts', () => {
    it('returns empty array for empty string', () => {
        expect(parseParts('')).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
        expect(parseParts('   ')).toEqual([]);
    });

    it('parses a single dice notation', () => {
        const result = parseParts('2d6');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ raw: '2d6', count: 2, sides: 6, modifier: '' });
    });

    it('parses d20 as count=1', () => {
        const result = parseParts('d20');
        expect(result[0]).toMatchObject({ raw: 'd20', count: 1, sides: 20, modifier: '' });
    });

    it('parses fudge dice', () => {
        const result = parseParts('4dF');
        expect(result[0]).toMatchObject({ raw: '4dF', count: 4, sides: 'F', modifier: '' });
    });

    it('parses notation with modifiers', () => {
        const result = parseParts('3d6kh3');
        expect(result[0]).toMatchObject({
            raw: '3d6kh3',
            count: 3,
            sides: 6,
            modifier: 'kh3',
        });
    });

    it('parses multiple dice groups separated by +', () => {
        const result = parseParts('2d6+4d8');
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({ raw: '2d6', count: 2, sides: 6, modifier: '' });
        expect(result[1]).toMatchObject({ raw: '4d8', count: 4, sides: 8, modifier: '' });
    });

    it('parses complex multi-group notation with modifiers', () => {
        const result = parseParts('2d20kh1 + 4d6r1kh3 + 1d8');
        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({ raw: '2d20kh1', sides: 20, modifier: 'kh1' });
        expect(result[1]).toMatchObject({ raw: '4d6r1kh3', sides: 6, modifier: 'r1kh3' });
        expect(result[2]).toMatchObject({ raw: '1d8', sides: 8, modifier: '' });
    });

    it('parses groups with explode modifier', () => {
        const result = parseParts('2d6!');
        expect(result[0]).toMatchObject({ raw: '2d6!', modifier: '!' });
    });

    it('parses groups with compound explode', () => {
        const result = parseParts('2d6!!');
        expect(result[0]).toMatchObject({ raw: '2d6!!', modifier: '!!' });
    });

    it('parses groups with penetrating explode', () => {
        const result = parseParts('2d6!p');
        expect(result[0]).toMatchObject({ raw: '2d6!p', modifier: '!p' });
    });

    it('parses bare numbers as non-dice parts', () => {
        const result = parseParts('2d6+5');
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({ raw: '2d6', count: 2, sides: 6 });
        expect(result[1]).toMatchObject({ raw: '5', count: 0, sides: 0 });
    });
});

describe('makePartRaw', () => {
    it('builds notation with count > 1', () => {
        expect(makePartRaw(2, 6, '')).toBe('2d6');
    });

    it('builds notation with count === 1 omitting count', () => {
        expect(makePartRaw(1, 20, '')).toBe('d20');
    });

    it('builds notation with modifier', () => {
        expect(makePartRaw(3, 6, 'kh3')).toBe('3d6kh3');
    });

    it('builds notation for fudge dice', () => {
        expect(makePartRaw(4, 'F', '')).toBe('4dF');
    });

    it('builds notation for single fudge die', () => {
        expect(makePartRaw(1, 'F', '')).toBe('dF');
    });

    it('builds notation with modifier for fudge dice', () => {
        expect(makePartRaw(4, 'F', 'r1')).toBe('4dFr1');
    });
});

describe('findLastMatch', () => {
    it('returns the index of the last part matching sides', () => {
        const parts = parseParts('2d6 + 3d8 + 1d6');
        expect(findLastMatch(parts, 6)).toBe(2);
    });

    it('returns -1 when no match found', () => {
        const parts = parseParts('2d6 + 3d8');
        expect(findLastMatch(parts, 20)).toBe(-1);
    });

    it('finds last fudge dice match', () => {
        const parts = parseParts('2dF + 3d6 + 1dF');
        expect(findLastMatch(parts, 'F')).toBe(2);
    });

    it('returns -1 for empty parts', () => {
        expect(findLastMatch([], 6)).toBe(-1);
    });

    it('returns last index when multiple parts match', () => {
        const parts = parseParts('1d20 + 2d6 + 3d20 + 4d8');
        expect(findLastMatch(parts, 20)).toBe(2);
    });
});

describe('applyAdvantage', () => {
    it('returns 2d20kh1 for empty input', () => {
        expect(applyAdvantage('')).toBe('2d20kh1');
    });

    it('returns 2d20kh1 for whitespace input', () => {
        expect(applyAdvantage('   ')).toBe('2d20kh1');
    });

    it('doubles bare d20 and adds keep', () => {
        expect(applyAdvantage('1d20')).toBe('2d20kh1');
    });

    it('doubles bare d20 count with keep', () => {
        expect(applyAdvantage('2d20')).toBe('4d20kh2');
    });

    it('halves d20 count and removes kl when disadvantage was active', () => {
        expect(applyAdvantage('2d20kl1')).toBe('d20');
    });

    it('halves d20 count and removes dh when disadvantage was active', () => {
        expect(applyAdvantage('4d20dh2')).toBe('2d20');
    });

    it('handles non-integer halving (odd count) for opposite modifier', () => {
        expect(applyAdvantage('3d20kl1')).toBe('d20');
    });

    it('appends advantage if no d20 is present', () => {
        expect(applyAdvantage('2d6')).toBe('2d6 + 2d20kh1');
    });

    it('appends advantage to complex expressions without d20', () => {
        expect(applyAdvantage('2d6 + 4d8')).toBe('2d6 + 4d8 + 2d20kh1');
    });

    it('only modifies the first d20 group', () => {
        expect(applyAdvantage('1d20 + 2d6 + 1d20')).toBe('2d20kh1 + 2d6 + 1d20');
    });

    it('leaves non-d20 groups unchanged', () => {
        expect(applyAdvantage('2d6 + 4d8')).toContain('2d6');
        expect(applyAdvantage('2d6 + 4d8')).toContain('4d8');
    });
});

describe('applyDisadvantage', () => {
    it('returns 2d20kl1 for empty input', () => {
        expect(applyDisadvantage('')).toBe('2d20kl1');
    });

    it('returns 2d20kl1 for whitespace input', () => {
        expect(applyDisadvantage('   ')).toBe('2d20kl1');
    });

    it('doubles bare d20 and adds keep-lowest', () => {
        expect(applyDisadvantage('1d20')).toBe('2d20kl1');
    });

    it('doubles bare d20 count with keep-lowest', () => {
        expect(applyDisadvantage('2d20')).toBe('4d20kl2');
    });

    it('halves d20 count and removes kh when advantage was active', () => {
        expect(applyDisadvantage('2d20kh1')).toBe('d20');
    });

    it('halves d20 count and removes dl when advantage was active', () => {
        expect(applyDisadvantage('4d20dl2')).toBe('2d20');
    });

    it('handles non-integer halving (odd count)', () => {
        expect(applyDisadvantage('3d20kh1')).toBe('d20');
    });

    it('appends disadvantage if no d20 is present', () => {
        expect(applyDisadvantage('2d6')).toBe('2d6 + 2d20kl1');
    });

    it('only modifies the first d20 group', () => {
        expect(applyDisadvantage('1d20 + 2d6 + 1d20')).toBe('2d20kl1 + 2d6 + 1d20');
    });
});

describe('splitD100Value', () => {
    it('splits 0 into 00 and 0', () => {
        expect(splitD100Value(0)).toEqual({ tens: '00', ones: '0' });
    });

    it('splits 10 into 10 and 0', () => {
        expect(splitD100Value(10)).toEqual({ tens: '10', ones: '0' });
    });

    it('splits 57 into 50 and 7', () => {
        expect(splitD100Value(57)).toEqual({ tens: '50', ones: '7' });
    });

    it('splits 100 into 00 and 0', () => {
        expect(splitD100Value(100)).toEqual({ tens: '00', ones: '0' });
    });

    it('splits 7 into 00 and 7', () => {
        expect(splitD100Value(7)).toEqual({ tens: '00', ones: '7' });
    });

    it('splits 90 into 90 and 0', () => {
        expect(splitD100Value(90)).toEqual({ tens: '90', ones: '0' });
    });
});

describe('handleDiceNotation', () => {
    it('increments existing die count', () => {
        expect(handleDiceNotation('2d6', 'd6', true)).toBe('3d6');
    });

    it('decrements existing die count', () => {
        expect(handleDiceNotation('3d6', 'd6', false)).toBe('2d6');
    });

    it('removes die group when decrementing to zero', () => {
        expect(handleDiceNotation('1d6', 'd6', false)).toBe('');
    });

    it('removes die group without affecting others', () => {
        expect(handleDiceNotation('1d6 + 2d8', 'd6', false)).toBe('2d8');
    });

    it('adds new die group when no match and incrementing', () => {
        expect(handleDiceNotation('2d20', 'd6', true)).toBe('2d20 + d6');
    });

    it('returns previous notation when no match and not incrementing', () => {
        expect(handleDiceNotation('2d20', 'd6', false)).toBe('2d20');
    });

    it('returns the button notation for empty prev with increment', () => {
        expect(handleDiceNotation('', 'd6', true)).toBe('d6');
    });

    it('returns empty for empty prev without increment', () => {
        expect(handleDiceNotation('', 'd6', false)).toBe('');
    });

    it('increments fudge dice', () => {
        expect(handleDiceNotation('2dF', 'dF', true)).toBe('3dF');
    });

    it('decrements fudge dice', () => {
        expect(handleDiceNotation('3dF', 'dF', false)).toBe('2dF');
    });

    it('increments dice with modifiers', () => {
        expect(handleDiceNotation('2d20kh1', 'd20', true)).toBe('3d20kh1');
    });

    it('handles WoD difficulty notation on increment', () => {
        expect(handleDiceNotation('', '1d10>=6', true, 6)).toBe('1d10>=6');
    });

    it('handles WoD difficulty on existing die', () => {
        expect(handleDiceNotation('1d10', '1d10>=6', true, 6)).toBe('2d10>=6');
    });

    it('increments WoD die with suffix', () => {
        expect(handleDiceNotation('1d10>=6', '1d10>=6', true, 6)).toBe('2d10>=6');
    });

    it('decrements WoD die', () => {
        expect(handleDiceNotation('3d10>=6', '1d10>=6', false, 6)).toBe('2d10>=6');
    });

    it('handles btnNotation without count prefix', () => {
        expect(handleDiceNotation('2d6', 'd6', true)).toBe('3d6');
    });

    it('handles btnNotation with explicit count', () => {
        expect(handleDiceNotation('2d6', '1d6', true)).toBe('3d6');
    });

    it('adds new group for non-matching sides with existing notation', () => {
        expect(handleDiceNotation('2d20', 'd8', true)).toBe('2d20 + d8');
    });

    it('preserves modifier on existing die when incrementing', () => {
        expect(handleDiceNotation('4d6kh3', 'd6', true)).toBe('5d6kh3');
    });

    it('preserves modifier on existing die when decrementing', () => {
        expect(handleDiceNotation('4d6kh3', 'd6', false)).toBe('3d6kh3');
    });
});
