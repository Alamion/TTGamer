import { tokenize } from '@site/src/dice_roller/dice-logic/dice-lexer';
import { parseToAST } from '@site/src/dice_roller/dice-logic/dice-parser';
import {
    MAX_AST_NODES,
    MAX_CUSTOM_FACE_COUNT,
    MAX_DICE_COUNT,
    MAX_DICE_SIDES,
    MAX_NOTATION_LENGTH,
    MAX_NUMERIC_LITERAL,
} from '@site/src/dice_roller/utils/constants';
import { describe, expect, it } from 'vitest';

describe('dice input complexity limits', () => {
    it('enforces notation length', () => {
        expect(() => parseToAST('1'.repeat(MAX_NOTATION_LENGTH + 1))).toThrow(
            new RegExp(`${MAX_NOTATION_LENGTH} characters`)
        );
    });

    it('enforces the structural AST limit independently of notation length', () => {
        const terms = Math.floor(MAX_AST_NODES / 2) + 1;
        const notation = Array.from({ length: terms }, () => '1').join('+');
        expect(notation.length).toBeLessThanOrEqual(MAX_NOTATION_LENGTH);
        expect(() => parseToAST(notation)).toThrow(new RegExp(`${MAX_AST_NODES} expressions`));
    });

    it('enforces per-group and whole-roll dice counts', () => {
        expect(() => parseToAST(`${MAX_DICE_COUNT + 1}d6`)).toThrow(/Dice count/);
        expect(() => parseToAST(`${MAX_DICE_COUNT}d6+1d6`)).toThrow(
            new RegExp(`at most ${MAX_DICE_COUNT} dice`)
        );
    });

    it('enforces numeric side and literal magnitude', () => {
        expect(() => parseToAST(`1d${MAX_DICE_SIDES + 1}`)).toThrow(/Dice sides/);
        expect(() => parseToAST(String(MAX_NUMERIC_LITERAL + 1))).toThrow(
            new RegExp(`may not exceed ${MAX_NUMERIC_LITERAL}`)
        );
    });

    it('bounds explicit and ranged custom faces before evaluation', () => {
        const tooManyExplicitFaces = Array.from(
            { length: MAX_CUSTOM_FACE_COUNT + 1 },
            () => '1'
        ).join(',');
        expect(() => tokenize(`1d[${tooManyExplicitFaces}]`)).toThrow(
            new RegExp(`at most ${MAX_CUSTOM_FACE_COUNT} faces`)
        );
        expect(() => parseToAST(`1d[1-${MAX_CUSTOM_FACE_COUNT + 1}]`)).toThrow(
            new RegExp(`at most ${MAX_CUSTOM_FACE_COUNT} faces`)
        );
    });
});
