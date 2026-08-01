import { describe, it, expect } from 'vitest';
import { BaseCharacterSchema } from '@site/src/sheet_manager/types/character';
import type { BaseCharacter } from '@site/src/sheet_manager/types/character';

function buildMaximalCharacter(): BaseCharacter {
    return {
        id: '00000000-0000-4000-8000-000000000001',
        metadata: {
            name: 'Test Character',
            type: 'sentient',
            template: 'standard',
            player: 'Tester',
            adventure: 'Test Adventure',
            concept: 'Test Concept',
            nature: 'Curious',
            demeanor: 'Rebel',
            species: 'Human',
            homeWorld: 'Coruscant',
            age: '25',
            setting: 'Star Wars WoD 2e',
            gender: 'male',
            height: '180',
            build: 'athletic',
            hair: 'brown',
            eyes: 'blue',
            features: 'scar on cheek',
            biography: 'A test character',
            imageUrl: 'https://example.com/portrait.jpg',
        },
        attributes: {
            Strength: { value: 3, specialization: false, experienced: false, practiced: false },
            Dexterity: { value: 4, specialization: false, experienced: false, practiced: false },
            Stamina: { value: 2, specialization: false, experienced: false, practiced: false },
            Charisma: { value: 3, specialization: false, experienced: false, practiced: false },
            Manipulation: { value: 2, specialization: false, experienced: false, practiced: false },
            Appearance: { value: 3, specialization: false, experienced: false, practiced: false },
            Perception: { value: 2, specialization: false, experienced: false, practiced: false },
            Intelligence: { value: 3, specialization: false, experienced: false, practiced: false },
            Wits: { value: 2, specialization: false, experienced: false, practiced: false },
        },
        skills: {
            Alertness: { value: 3, specialization: false, experienced: false, practiced: false },
            Brawl: { value: 2, specialization: false, experienced: false, practiced: false },
            Blaster: {
                value: 1,
                specialization: true,
                experienced: false,
                practiced: false,
                specializationText: 'Heavy',
            },
            Stealth: { value: 2, specialization: false, experienced: false, practiced: false },
            Melee: { value: 2, specialization: false, experienced: true, practiced: false },
        },
        forceSkills: {
            Rapport: { value: 2, specialization: false, experienced: false, practiced: false },
            Telekinesis: { value: 1, specialization: false, experienced: false, practiced: false },
            Dynamism: { value: 0, specialization: false, experienced: false, practiced: false },
        },
        virtues: {
            Conscience: { value: 3, specialization: false, experienced: false, practiced: false },
            Passion: { value: 2, specialization: false, experienced: false, practiced: false },
            'Self Control': {
                value: 4,
                specialization: false,
                experienced: false,
                practiced: false,
            },
        },
        backgrounds: [
            { id: 'bg-001', label: 'Resources', value: 2, catalogId: 'resources' },
            { id: 'bg-002', label: 'Mentor', value: 1 },
        ],
        merits: [
            { id: 'm-001', points: 3, label: 'Force Sensitive', catalogId: 'force-sensitive' },
        ],
        flaws: [{ id: 'f-001', points: 2, label: 'Code of Honor' }],
        willpower: { current: 7, max: 8 },
        forcePoints: { current: 5, max: 6 },
        darkSideResistance: 5,
        forcePowers: ['awareness', 'heal'],
        customForcePowers: [{ id: 'cfp-001', name: 'Custom Power' }],
        forcePowerItems: [
            { id: 'fpi-001', name: 'Awareness', value: 2, catalogId: 'awareness' },
            { id: 'fpi-002', name: 'Heal', value: 1 },
        ],
        health: {
            levels: ['empty', 'slash', 'empty', 'cross', 'empty', 'empty', 'empty'],
        },
        inventory: [
            { id: 'inv-001', text: 'Blaster Pistol' },
            { id: 'inv-002', text: 'Comlink' },
        ],
        armor: [{ id: 'arm-001', name: 'Flak Vest', classVal: '2', ar: '+1D', dex: '-1' }],
        weapons: [
            {
                id: 'wp-001',
                name: 'Blaster Pistol',
                damage: '4D',
                range: '10',
                ammo: 50,
                maxAmmo: 50,
            },
        ],
        implants: [
            { id: 'imp-001', name: 'Cyber Eye', type: 'sensory', effect: 'Low-light vision' },
        ],
        experience: { total: 15, spent: 12 },
        customTalents: [{ id: 'ct-001', label: 'Quick Draw', value: 1 }],
        customSkills: [{ id: 'cs-001', label: 'Piloting', value: 2, specialization: true }],
        customKnowledges: [{ id: 'ck-001', label: 'Alien Cultures', value: 1 }],
        notes: 'This is a test character for import/export round-trip testing.',
    };
}

describe('Character import/export round-trip', () => {
    it('export then import preserves all data', () => {
        const original = buildMaximalCharacter();

        const json = JSON.stringify(original, null, 2);
        expect(json).toBeTruthy();

        const parsed = JSON.parse(json);

        let validated: BaseCharacter;
        expect(() => {
            validated = BaseCharacterSchema.parse(parsed);
        }).not.toThrow();

        expect(validated!.id).toBe(original.id);
        expect(validated!.metadata.name).toBe(original.metadata.name);
        expect(validated!.metadata.type).toBe('sentient');
        expect(validated!.attributes.Strength.value).toBe(3);
        expect(validated!.skills.Blaster.specialization).toBe(true);
        expect(validated!.skills.Blaster.specializationText).toBe('Heavy');
        expect(validated!.forceSkills.Telekinesis.value).toBe(1);
        expect(validated!.backgrounds).toHaveLength(2);
        expect(validated!.merits).toHaveLength(1);
        expect(validated!.flaws).toHaveLength(1);
        expect(validated!.willpower.current).toBe(7);
        expect(validated!.willpower.max).toBe(8);
        expect(validated!.forcePoints.current).toBe(5);
        expect(validated!.health.levels[1]).toBe('slash');
        expect(validated!.inventory).toHaveLength(2);
        expect(validated!.armor).toHaveLength(1);
        expect(validated!.weapons).toHaveLength(1);
        expect(validated!.implants).toHaveLength(1);
        expect(validated!.experience.total).toBe(15);
        expect(validated!.experience.spent).toBe(12);
        expect(validated!.forcePowerItems).toHaveLength(2);
        expect(validated!.notes).toBe(original.notes);
    });

    it('imports the real exported file (Кэсседи)', () => {
        const jsonStr = JSON.stringify({
            id: '5c3a7a4f-80e0-418f-b868-e99d214bdadb',
            metadata: {
                name: 'Кэсседи',
                type: 'sentient',
                template: 'standard',
                player: 'Desp',
                adventure: 'фыв',
                concept: 'Loner',
                nature: 'Curious',
                demeanor: 'Rebel',
                species: 'Атоанец',
                homeWorld: 'Togoria',
                age: '12',
                setting: 'Star Wars WoD 2e',
                gender: 'male',
                height: '165',
                build: 'lean',
                hair: 'dark',
                eyes: 'green',
            },
            attributes: {
                Strength: { value: 2, specialization: false, experienced: false, practiced: false },
                Dexterity: {
                    value: 4,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Stamina: { value: 1, specialization: false, experienced: false, practiced: false },
                Charisma: { value: 4, specialization: false, experienced: false, practiced: false },
                Manipulation: {
                    value: 2,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Appearance: {
                    value: 3,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Perception: {
                    value: 1,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Intelligence: {
                    value: 3,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Wits: { value: 1, specialization: false, experienced: false, practiced: false },
            },
            skills: {
                Intimidation: {
                    value: 0,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                    specializationText: '-низя',
                },
                Alertness: {
                    value: 2,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Subterfuge: {
                    value: 1,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Brawl: { value: 2, specialization: false, experienced: false, practiced: false },
                Athletics: {
                    value: 2,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Empathy: { value: 2, specialization: false, experienced: false, practiced: false },
                Gunnery: {
                    value: 0,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                    specializationText: '-низя',
                },
                Streetwise: {
                    value: 0,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                    specializationText: '-низя',
                },
                Pilot: {
                    value: 0,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                    specializationText: '-низя',
                },
                Ride: {
                    value: 0,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                    specializationText: '-низя',
                },
                Astrogation: {
                    value: 0,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                    specializationText: '-низя(1макс)',
                },
                Bureaucracy: {
                    value: 0,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                    specializationText: '-низя',
                },
                Blaster: {
                    value: 0,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                    specializationText: '-низя',
                },
                Politics: {
                    value: 0,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                    specializationText: '-низя',
                },
                Trade: {
                    value: 0,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                    specializationText: '-низя',
                },
                Stealth: { value: 1, specialization: false, experienced: false, practiced: false },
                Melee: { value: 2, specialization: false, experienced: false, practiced: false },
                Dodge: { value: 2, specialization: false, experienced: false, practiced: false },
                Medicine: { value: 2, specialization: false, experienced: false, practiced: false },
                Interfaces: {
                    value: 2,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Tech: { value: 1, specialization: false, experienced: false, practiced: false },
                Languages: {
                    value: 1,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Investigation: {
                    value: 1,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
            },
            forceSkills: {
                Rapport: { value: 0, specialization: false, experienced: false, practiced: false },
                Telekinesis: {
                    value: 1,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Dynamism: { value: 0, specialization: false, experienced: false, practiced: false },
            },
            virtues: {
                Conscience: {
                    value: 3,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
                Passion: { value: 3, specialization: false, experienced: false, practiced: false },
                'Self Control': {
                    value: 4,
                    specialization: false,
                    experienced: false,
                    practiced: false,
                },
            },
            backgrounds: [
                {
                    id: 'e3763632-5cb1-4956-b99e-380ed45c362b',
                    label: 'Mentor(Jedi mentor)',
                    value: 1,
                    catalogId: 'mentor',
                },
                {
                    id: 'f8b5df91-811f-41f1-8a7b-2abee4fd1534',
                    label: 'Mentor(Jedi Атоанка)',
                    value: 2,
                },
            ],
            merits: [
                {
                    id: 'f0df50f8-4fa4-4e46-91d2-b189437084ce',
                    points: 2,
                    label: 'Powerful',
                    catalogId: 'ap-powerful',
                },
                {
                    id: '78bc9a0c-ce20-4705-8bbc-f9fb4105c5c9',
                    points: 3,
                    label: 'Force Spirit Mentor',
                    catalogId: 'force-spirit-mentor',
                },
            ],
            flaws: [
                {
                    id: '5ecda40c-2fe1-44fe-8c20-0ea49e463e7a',
                    points: 2,
                    label: 'Weak Vascular System(х2 от блида,+2 стаб)',
                },
            ],
            willpower: { current: 7, max: 5 },
            forcePoints: { current: 7, max: 7 },
            darkSideResistance: 5,
            health: {
                levels: ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
            },
            inventory: [
                { id: '8dd69816-1bd5-45f7-a65e-eea48716603b', text: 'Comlink (Short-Range)' },
            ],
            armor: [
                {
                    id: '84c66a06-a48b-4a14-849f-56d99cbe05f4',
                    name: 'Jedi Robes',
                    classVal: '1',
                    ar: '+0D',
                    dex: '0',
                },
            ],
            weapons: [],
            experience: { total: 0, spent: 0 },
            customTalents: [],
            customSkills: [],
            customKnowledges: [],
            notes: 'Force Spirit Mentor -> Mentor(Jedi Атоанка)\n\nесть Training Lightsaber, но не у меня',
            forcePowerItems: [
                {
                    id: '0b6bff56-653e-4904-b3f8-cceb9d109358',
                    name: 'Awareness',
                    value: 1,
                    catalogId: 'awareness',
                },
                { id: '3aca34fe-f745-4990-be1a-9c83778c4e62', name: 'Meditate', value: 1 },
                {
                    id: '0b416846-c3e0-43f1-a636-b09a98e62571',
                    name: 'Manipulate Object',
                    value: 1,
                    catalogId: 'manipulate-object',
                },
                {
                    id: '0f0f0ae0-c479-4bd5-95e1-e49b501253de',
                    name: 'Heave',
                    value: 1,
                    catalogId: 'heave',
                },
                {
                    id: '207e4c50-428c-42c9-90db-42ebbadd8852',
                    name: 'Summon Object',
                    value: 1,
                    catalogId: 'summon-object',
                },
            ],
        });

        const parsed = JSON.parse(jsonStr);

        let validated: BaseCharacter;
        expect(() => {
            validated = BaseCharacterSchema.parse(parsed);
        }).not.toThrow();

        expect(validated!.metadata.name).toBe('Кэсседи');
        expect(validated!.attributes.Dexterity.value).toBe(4);
        expect(validated!.backgrounds).toHaveLength(2);
        expect(validated!.forcePowerItems).toHaveLength(5);
    });
});
