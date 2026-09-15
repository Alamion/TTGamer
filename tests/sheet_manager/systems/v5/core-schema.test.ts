import {
    V5_ATTRIBUTE_KEYS,
    V5_SKILL_KEYS,
} from '@site/src/sheet_manager/systems/v5/ruleset/profile';
import {
    createV5CoreDefault,
    V5_LIMITS,
    V5CoreSchema,
} from '@site/src/sheet_manager/systems/v5/ruleset/schema';
import { describe, expect, it } from 'vitest';

const withAttribute = (key: string, value: unknown) => ({ attributes: { [key]: { value } } });
const withSkill = (key: string, skill: unknown) => ({ skills: { [key]: skill } });

describe('V5 core schema', () => {
    it('has 9 attributes and 27 skills', () => {
        expect(V5_ATTRIBUTE_KEYS).toHaveLength(9);
        expect(V5_SKILL_KEYS).toHaveLength(27);
        expect(new Set(V5_SKILL_KEYS).size).toBe(27);
    });

    it('creates attributes at 1, skills at 0 without a specialization, and empty tracks', () => {
        const data = createV5CoreDefault();
        for (const key of V5_ATTRIBUTE_KEYS) expect(data.attributes[key]).toEqual({ value: 1 });
        for (const key of V5_SKILL_KEYS) {
            expect(data.skills[key]).toEqual({ value: 0, specializationText: '' });
        }
        expect(data.health).toEqual({ levels: [], bonus: 0 });
        expect(data.willpower).toEqual({ levels: [], bonus: 0 });
        expect(data.advantages).toEqual([]);
        expect(data.experience).toEqual({ total: 0, spent: 0 });
    });

    it.each([0, 6, 2.5])('rejects attribute value %s', (value) => {
        expect(V5CoreSchema.safeParse(withAttribute('strength', value)).success).toBe(false);
    });

    it('rejects a skill above 5', () => {
        expect(V5CoreSchema.safeParse(withSkill('occult', { value: 6 })).success).toBe(false);
    });

    it('bounds the specialization text and migrates draft specialty lists', () => {
        expect(
            V5CoreSchema.safeParse(
                withSkill('medicine', {
                    value: 3,
                    specializationText: 'x'.repeat(V5_LIMITS.specialization.maxLength + 1),
                })
            ).success
        ).toBe(false);
        expect(
            V5CoreSchema.parse(
                withSkill('medicine', { value: 3, specialties: ['Trauma', 'Triage'] })
            ).skills.medicine
        ).toEqual({ value: 3, specializationText: 'Trauma, Triage' });
    });

    it('bounds track marks and adjustment, and migrates draft mark counts', () => {
        expect(
            V5CoreSchema.safeParse({ health: { levels: Array(16).fill('slash') } }).success
        ).toBe(false);
        expect(V5CoreSchema.safeParse({ health: { levels: ['bruised'] } }).success).toBe(false);
        expect(V5CoreSchema.safeParse({ health: { bonus: -6 } }).success).toBe(false);
        expect(V5CoreSchema.safeParse({ willpower: { bonus: 11 } }).success).toBe(false);
        expect(V5CoreSchema.safeParse({ willpower: { bonus: 10 } }).success).toBe(true);
        expect(
            V5CoreSchema.parse({ health: { superficial: 2, aggravated: 1, bonus: 1 } }).health
        ).toEqual({ levels: ['cross', 'slash', 'slash'], bonus: 1 });
    });

    it('moves draft equipment text into one inventory item', () => {
        const parsed = V5CoreSchema.parse({ equipment: 'Trauma kit, torch' });
        expect(parsed).not.toHaveProperty('equipment');
        expect(parsed.inventory).toEqual([
            expect.objectContaining({ text: 'Equipment', description: 'Trauma kit, torch' }),
        ]);
        expect(V5CoreSchema.parse({ equipment: '  ' }).inventory).toEqual([]);
    });

    it('bounds text length', () => {
        expect(V5CoreSchema.safeParse({ name: 'x'.repeat(201) }).success).toBe(false);
        expect(V5CoreSchema.safeParse({ notes: 'x'.repeat(10_001) }).success).toBe(false);
    });

    it('strips unknown keys and round-trips a filled object', () => {
        const filled = V5CoreSchema.parse({
            name: 'Lena Varga',
            unknown: true,
            attributes: { stamina: { value: 3 } },
            skills: { medicine: { value: 3, specializationText: 'Trauma' } },
            health: { levels: ['cross', 'slash'], bonus: 1 },
            advantages: [{ id: 'a1', label: 'Contacts', points: 2 }],
            touchstones: [
                { id: 't1', name: 'Her brother', conviction: 'Never leave anyone behind' },
            ],
            experience: { total: 10, spent: 4 },
        });
        expect(filled).not.toHaveProperty('unknown');
        expect(V5CoreSchema.parse(JSON.parse(JSON.stringify(filled)))).toEqual(filled);
    });
});
