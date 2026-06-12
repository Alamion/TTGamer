import { describe, it, expect } from 'vitest';
import {
    buildGroupKey,
    formatModifiers,
    applyKeepDrop,
    formatRollValues,
} from '@site/src/dice_roller/dice-logic/utils';
import type { DiceModifiers, DiceRoll } from '@site/src/dice_roller/dice-logic';

describe('buildGroupKey', () => {
    it('builds a key for a basic dice group', () => {
        const node = { type: 'DiceGroup' as const, count: 2, sides: 6, modifiers: {} };
        expect(buildGroupKey(node, 0)).toBe('2d6__0_');
    });

    it('includes fudge flag in key', () => {
        const node = { type: 'DiceGroup' as const, count: 4, sides: 3, fudge: true, modifiers: {} };
        expect(buildGroupKey(node, 1)).toBe('4d3_f_1_');
    });

    it('includes custom faces in key', () => {
        const node = {
            type: 'DiceGroup' as const,
            count: 1,
            sides: 6,
            customFaces: [1, 3, 5],
            modifiers: {},
        };
        expect(buildGroupKey(node, 2)).toBe('1d6__2_1,3,5');
    });

    it('handles fudge + custom faces combination', () => {
        const node = {
            type: 'DiceGroup' as const,
            count: 3,
            sides: 4,
            fudge: true,
            customFaces: [2, 4],
            modifiers: {},
        };
        expect(buildGroupKey(node, 0)).toBe('3d4_f_0_2,4');
    });

    it('handles inline object without type', () => {
        const node = { count: 5, sides: 8, fudge: false };
        expect(buildGroupKey(node, 3)).toBe('5d8__3_');
    });

    it('handles inline object with customFaces', () => {
        const node = { count: 2, sides: 6, fudge: false, customFaces: [2, 4, 6] };
        expect(buildGroupKey(node, 0)).toBe('2d6__0_2,4,6');
    });
});

describe('formatModifiers', () => {
    it('returns empty string for empty modifiers', () => {
        expect(formatModifiers({})).toBe('');
    });

    it('formats min modifier', () => {
        expect(formatModifiers({ min: 3 })).toBe('min3');
    });

    it('formats max modifier', () => {
        expect(formatModifiers({ max: 5 })).toBe('max5');
    });

    it('formats basic explode modifier', () => {
        expect(formatModifiers({ explode: {} })).toBe('!');
    });

    it('formats explode with compare point', () => {
        expect(formatModifiers({ explode: { comparePoint: { operator: '>', value: 8 } } })).toBe(
            '!>8'
        );
    });

    it('formats compound explode', () => {
        expect(formatModifiers({ explode: { compounding: true } })).toBe('!!');
    });

    it('formats penetrating explode', () => {
        expect(formatModifiers({ explode: { penetrating: true } })).toBe('!p');
    });

    it('formats compound penetrating explode', () => {
        expect(formatModifiers({ explode: { compounding: true, penetrating: true } })).toBe('!!p');
    });

    it('formats compound penetrating with compare point', () => {
        expect(
            formatModifiers({
                explode: {
                    compounding: true,
                    penetrating: true,
                    comparePoint: { operator: '>=', value: 6 },
                },
            })
        ).toBe('!!p>=6');
    });

    it('formats basic reroll', () => {
        expect(formatModifiers({ reroll: {} })).toBe('r');
    });

    it('formats reroll-once', () => {
        expect(formatModifiers({ reroll: { once: true } })).toBe('ro');
    });

    it('formats reroll with compare point', () => {
        expect(formatModifiers({ reroll: { comparePoint: { operator: '=', value: 1 } } })).toBe(
            'r=1'
        );
    });

    it('formats unique modifier', () => {
        expect(formatModifiers({ unique: {} })).toBe('u');
    });

    it('formats unique-once', () => {
        expect(formatModifiers({ unique: { once: true } })).toBe('uo');
    });

    it('formats unique with compare point', () => {
        expect(formatModifiers({ unique: { comparePoint: { operator: '=', value: 5 } } })).toBe(
            'u=5'
        );
    });

    it('formats keep modifiers', () => {
        const mods: DiceModifiers = {
            keepHighest: 3,
            keepLowest: 2,
            dropHighest: 1,
            dropLowest: 2,
        };
        expect(formatModifiers(mods)).toBe('kh3kl2dh1dl2');
    });

    it('formats target success', () => {
        expect(formatModifiers({ targetSuccess: { operator: '>=', value: 7 } })).toBe('>=7');
    });

    it('formats target failure', () => {
        expect(formatModifiers({ targetFailure: { operator: '<', value: 3 } })).toBe('f<3');
    });

    it('formats critical success (simple)', () => {
        expect(formatModifiers({ criticalSuccess: true })).toBe('cs');
    });

    it('formats critical success with compare point', () => {
        expect(formatModifiers({ criticalSuccess: { operator: '>=', value: 19 } })).toBe('cs>=19');
    });

    it('formats critical success with botch', () => {
        expect(formatModifiers({ criticalSuccess: true, criticalSuccessBotch: true })).toBe('csb');
    });

    it('formats critical failure (simple)', () => {
        expect(formatModifiers({ criticalFailure: true })).toBe('cf');
    });

    it('formats critical failure with compare point', () => {
        expect(formatModifiers({ criticalFailure: { operator: '<=', value: 2 } })).toBe('cf<=2');
    });

    it('formats critical failure with botch', () => {
        expect(formatModifiers({ criticalFailure: true, criticalFailureBotch: true })).toBe('cfb');
    });

    it('formats sort ascending', () => {
        expect(formatModifiers({ sort: 'asc' })).toBe('s');
    });

    it('formats sort descending', () => {
        expect(formatModifiers({ sort: 'desc' })).toBe('sd');
    });

    it('formats combined modifiers in evaluation order', () => {
        const mods: DiceModifiers = {
            explode: { comparePoint: { operator: '>', value: 8 } },
            reroll: { comparePoint: { operator: '=', value: 1 } },
            unique: { once: true },
            keepHighest: 3,
            sort: 'asc',
        };
        expect(formatModifiers(mods)).toBe('!>8r=1uokh3s');
    });
});

describe('applyKeepDrop', () => {
    const baseRolls: DiceRoll[] = [
        { sides: 6, value: 1, dropped: false },
        { sides: 6, value: 6, dropped: false },
        { sides: 6, value: 3, dropped: false },
        { sides: 6, value: 4, dropped: false },
    ];

    it('returns rolls unchanged when no keep/drop modifiers', () => {
        const result = applyKeepDrop(baseRolls, {});
        expect(result).toHaveLength(4);
        expect(result.every((r) => !r.dropped)).toBe(true);
    });

    it('kh3 keeps highest 3', () => {
        const result = applyKeepDrop(baseRolls, { keepHighest: 3 });
        const kept = result.filter((r) => !r.dropped);
        expect(kept).toHaveLength(3);
        expect(kept.map((r) => r.value)).toContain(6);
        expect(kept.map((r) => r.value)).toContain(3);
        expect(kept.map((r) => r.value)).toContain(4);
        const dropped = result.filter((r) => r.dropped);
        expect(dropped).toHaveLength(1);
        expect(dropped[0].value).toBe(1);
    });

    it('kl1 keeps lowest 1', () => {
        const result = applyKeepDrop(baseRolls, { keepLowest: 1 });
        const kept = result.filter((r) => !r.dropped);
        expect(kept).toHaveLength(1);
        expect(kept[0].value).toBe(1);
    });

    it('dh1 drops highest 1', () => {
        const result = applyKeepDrop(baseRolls, { dropHighest: 1 });
        const dropped = result.filter((r) => r.dropped);
        expect(dropped).toHaveLength(1);
        expect(dropped[0].value).toBe(6);
    });

    it('dl2 drops lowest 2', () => {
        const result = applyKeepDrop(baseRolls, { dropLowest: 2 });
        const dropped = result.filter((r) => r.dropped);
        expect(dropped).toHaveLength(2);
        expect(dropped.map((r) => r.value)).toEqual(expect.arrayContaining([1, 3]));
    });

    it('keeps all when keep > count', () => {
        const result = applyKeepDrop(baseRolls, { keepHighest: 10 });
        expect(result.every((r) => !r.dropped)).toBe(true);
    });

    it('drops all when drop >= count', () => {
        const result = applyKeepDrop(baseRolls, { dropLowest: 4 });
        expect(result.every((r) => r.dropped)).toBe(true);
    });

    it('handles single die rolls', () => {
        const single: DiceRoll[] = [{ sides: 20, value: 15, dropped: false }];
        const result = applyKeepDrop(single, { keepHighest: 1 });
        expect(result[0].dropped).toBe(false);
    });

    it('kh with tied values keeps correct count', () => {
        const ties: DiceRoll[] = [
            { sides: 6, value: 5, dropped: false },
            { sides: 6, value: 5, dropped: false },
            { sides: 6, value: 3, dropped: false },
        ];
        const result = applyKeepDrop(ties, { keepHighest: 2 });
        const kept = result.filter((r) => !r.dropped);
        expect(kept).toHaveLength(2);
    });

    it('kl with tied values keeps correct count', () => {
        const ties: DiceRoll[] = [
            { sides: 6, value: 2, dropped: false },
            { sides: 6, value: 2, dropped: false },
            { sides: 6, value: 5, dropped: false },
        ];
        const result = applyKeepDrop(ties, { keepLowest: 2 });
        const kept = result.filter((r) => !r.dropped);
        expect(kept).toHaveLength(2);
    });

    it('empty rolls returns empty array', () => {
        const result = applyKeepDrop([], { keepHighest: 2 });
        expect(result).toEqual([]);
    });
});

describe('formatRollValues', () => {
    const makeRoll = (value: number, overrides: Partial<DiceRoll> = {}): DiceRoll => ({
        sides: 6,
        value,
        dropped: false,
        ...overrides,
    });

    describe('with comma divider', () => {
        it('formats simple values', () => {
            const rolls = [makeRoll(3), makeRoll(5), makeRoll(1)];
            expect(formatRollValues(rolls, ',')).toBe('3, 5, 1');
        });

        it('marks dropped dice with ~~', () => {
            const rolls = [makeRoll(3), makeRoll(5, { dropped: true }), makeRoll(1)];
            expect(formatRollValues(rolls, ',')).toBe('3, ~~5~~, 1');
        });

        it('marks exploded dice with !', () => {
            const rolls = [makeRoll(6, { exploded: true }), makeRoll(4)];
            expect(formatRollValues(rolls, ',')).toBe('6!, 4');
        });

        it('marks compounded dice with !!', () => {
            const rolls = [makeRoll(6, { compounded: true }), makeRoll(4)];
            expect(formatRollValues(rolls, ',')).toBe('6!!, 4');
        });

        it('marks penetrating dice with !p', () => {
            const rolls = [makeRoll(6, { exploded: true, penetrating: true })];
            expect(formatRollValues(rolls, ',')).toBe('6!p');
        });

        it('marks critical success with **', () => {
            const rolls = [makeRoll(20, { criticalSuccess: true })];
            expect(formatRollValues(rolls, ',')).toBe('20**');
        });

        it('marks critical failure with __', () => {
            const rolls = [makeRoll(1, { criticalFailure: true })];
            expect(formatRollValues(rolls, ',')).toBe('1__');
        });

        it('marks critical success botch with ***', () => {
            const rolls = [makeRoll(20, { criticalSuccess: true, criticalSuccessBotch: true })];
            expect(formatRollValues(rolls, ',')).toBe('20***');
        });

        it('marks critical failure botch with ___', () => {
            const rolls = [makeRoll(1, { criticalFailure: true, criticalFailureBotch: true })];
            expect(formatRollValues(rolls, ',')).toBe('1___');
        });

        it('marks target success with *', () => {
            const rolls = [makeRoll(7, { targetSuccess: true })];
            expect(formatRollValues(rolls, ',')).toBe('7*');
        });

        it('marks target failure with _', () => {
            const rolls = [makeRoll(2, { targetFailure: true })];
            expect(formatRollValues(rolls, ',')).toBe('2_');
        });

        it('marks minRaised with ^', () => {
            const rolls = [makeRoll(3, { minRaised: true })];
            expect(formatRollValues(rolls, ',')).toBe('3^');
        });

        it('marks maxCapped with v', () => {
            const rolls = [makeRoll(3, { maxCapped: true })];
            expect(formatRollValues(rolls, ',')).toBe('3v');
        });

        it('shows faceLabel when present', () => {
            const rolls = [makeRoll(1, { faceLabel: 'F' })];
            expect(formatRollValues(rolls, ',')).toBe('F');
        });

        it('handles dropped + exploded combination correctly', () => {
            const rolls = [makeRoll(6, { dropped: true, exploded: true })];
            // dropped takes precedence over exploded in formatting
            expect(formatRollValues(rolls, ',')).toBe('~~6~~');
        });

        it('handles multiple flags with correct precedence', () => {
            const rolls = [
                makeRoll(1, { criticalSuccessBotch: true, criticalSuccess: true }),
                makeRoll(20, { exploded: true }),
                makeRoll(5),
                makeRoll(3, { dropped: true }),
            ];
            expect(formatRollValues(rolls, ',')).toBe('1***, 20!, 5, ~~3~~');
        });
    });

    describe('with plus divider', () => {
        it('filters dropped dice', () => {
            const rolls = [makeRoll(3), makeRoll(5, { dropped: true }), makeRoll(1)];
            expect(formatRollValues(rolls, '+')).toBe('3+1');
        });

        it('shows target success as 1', () => {
            const rolls = [makeRoll(7, { targetSuccess: true, hasTarget: true })];
            expect(formatRollValues(rolls, '+')).toBe('1');
        });

        it('shows target failure as -1', () => {
            const rolls = [makeRoll(2, { targetFailure: true, hasTarget: true })];
            expect(formatRollValues(rolls, '+')).toBe('-1');
        });

        it('shows no-target as 0 when hasTarget is true', () => {
            const rolls = [makeRoll(4, { hasTarget: true })];
            expect(formatRollValues(rolls, '+')).toBe('0');
        });

        it('adds +1 for critical success botch', () => {
            const rolls = [
                makeRoll(7, {
                    targetSuccess: true,
                    hasTarget: true,
                    criticalSuccessBotch: true,
                    criticalSuccess: true,
                }),
            ];
            expect(formatRollValues(rolls, '+')).toBe('1+1');
        });

        it('adds -1 for critical failure botch', () => {
            const rolls = [
                makeRoll(1, {
                    targetFailure: true,
                    hasTarget: true,
                    criticalFailureBotch: true,
                    criticalFailure: true,
                }),
            ];
            expect(formatRollValues(rolls, '+')).toBe('-1-1');
        });

        it('shows raw values when no target flags', () => {
            const rolls = [makeRoll(3), makeRoll(5), makeRoll(1)];
            expect(formatRollValues(rolls, '+')).toBe('3+5+1');
        });

        it('replaces +- with -', () => {
            const rolls = [
                makeRoll(3, { hasTarget: true }),
                makeRoll(2, {
                    targetFailure: true,
                    hasTarget: true,
                    criticalFailureBotch: true,
                    criticalFailure: true,
                }),
            ];
            const result = formatRollValues(rolls, '+');
            expect(result).toBe('0-1-1');
        });
    });
});
