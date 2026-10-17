import { MIRELA_VOSS_DATA } from '@site/src/sheet_manager/systems/v5/modules/vampire/example';
import { V5_SKILL_GROUPS } from '@site/src/sheet_manager/systems/v5/ruleset/profile';
import { describe, expect, it } from 'vitest';

/**
 * The Vampire documentation builds Mirela Voss step by step; these checks keep her a legal
 * starting character so the prose and the example document cannot drift apart.
 */

const counts = (values: readonly number[]) =>
    values.reduce<Record<number, number>>((all, value) => {
        all[value] = (all[value] ?? 0) + 1;
        return all;
    }, {});

const fromPredator = (label: string) => label.includes('(Siren)');

describe('Mirela Voss, the example vampire', () => {
    it('spreads attributes 4/3/3/3/2/2/2/2/1', () => {
        const values = Object.values(MIRELA_VOSS_DATA.attributes).map(({ value }) => value);
        expect(values).toHaveLength(9);
        expect(counts(values)).toEqual({ 4: 1, 3: 3, 2: 4, 1: 1 });
    });

    it('uses the Balanced skill spread on known skills', () => {
        const known = new Set(
            V5_SKILL_GROUPS.flatMap((group) => group.traits.map(({ key }) => key))
        );
        const skills = Object.entries(MIRELA_VOSS_DATA.skills).filter(([, { value }]) => value > 0);
        for (const [id] of skills) expect(known.has(id), id).toBe(true);
        expect(counts(skills.map(([, { value }]) => value))).toEqual({ 3: 3, 2: 5, 1: 7 });
    });

    it('has the free specialties: Academics, Craft, Performance, one more, and the Siren one', () => {
        const special = Object.entries(MIRELA_VOSS_DATA.skills)
            .filter(([, skill]) => skill.specializationText)
            .map(([id]) => id)
            .sort();
        expect(special).toEqual(['academics', 'craft', 'insight', 'performance', 'persuasion']);
    });

    it('takes clan disciplines at 2 and 1 plus the predator dot, one power per dot', () => {
        const dots = MIRELA_VOSS_DATA.disciplines.map(({ value }) => value);
        expect(dots.reduce((sum, value) => sum + value, 0)).toBe(4);
        for (const discipline of MIRELA_VOSS_DATA.disciplines) {
            const powers = MIRELA_VOSS_DATA.powers.filter(
                (power) => power.discipline === discipline.name
            );
            expect(powers).toHaveLength(discipline.value);
            for (const power of powers) {
                expect(Number(power.level)).toBeLessThanOrEqual(discipline.value);
            }
        }
    });

    it('spends 7 advantage and 2 flaw points besides the predator type', () => {
        const sum = (items: readonly { label: string; points: number }[]) =>
            items
                .filter(({ label }) => !fromPredator(label))
                .reduce((all, { points }) => all + points, 0);
        expect(sum(MIRELA_VOSS_DATA.advantages)).toBe(7);
        expect(sum(MIRELA_VOSS_DATA.flaws)).toBe(2);
    });

    it('starts at Humanity 7 with one Touchstone per Conviction', () => {
        expect(MIRELA_VOSS_DATA.humanity).toBe(7);
        for (const touchstone of MIRELA_VOSS_DATA.touchstones) {
            expect(touchstone.name && touchstone.conviction).toBeTruthy();
        }
    });
});
