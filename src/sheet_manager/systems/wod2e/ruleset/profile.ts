import { HEALTH_LEVELS } from '../../../types/character';
import { defineWodSheetProfile } from '../../wod-like';

/** A 0–5 dots trait of a WoD 2e profile (the id is the kebab form of the key). */
export const wodTrait = (key: string, minimum = 0) => ({
    id: key
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    key,
    label: key,
    minimum,
    maximum: 5,
    catalog: 'attributes',
});

export const WOD2E_ATTRIBUTE_GROUPS = [
    {
        id: 'physical',
        label: 'Physical',
        role: 'attribute' as const,
        traits: ['Strength', 'Dexterity', 'Stamina'].map((key) => wodTrait(key, 1)),
    },
    {
        id: 'social',
        label: 'Social',
        role: 'attribute' as const,
        traits: ['Charisma', 'Manipulation', 'Appearance'].map((key) => wodTrait(key, 1)),
    },
    {
        id: 'mental',
        label: 'Mental',
        role: 'attribute' as const,
        traits: ['Perception', 'Intelligence', 'Wits'].map((key) => wodTrait(key, 1)),
    },
];

/** Classic World of Darkness 2nd Edition abilities (trait names only). */
export const WOD2E_ABILITIES = {
    talents: [
        'Alertness',
        'Athletics',
        'Brawl',
        'Dodge',
        'Empathy',
        'Expression',
        'Intimidation',
        'Leadership',
        'Streetwise',
        'Subterfuge',
    ],
    skills: [
        'Animal Ken',
        'Crafts',
        'Drive',
        'Etiquette',
        'Firearms',
        'Melee',
        'Performance',
        'Security',
        'Stealth',
        'Survival',
    ],
    knowledges: [
        'Academics',
        'Computer',
        'Finance',
        'Investigation',
        'Law',
        'Linguistics',
        'Medicine',
        'Occult',
        'Politics',
        'Science',
    ],
} as const;

export const WOD2E_HEALTH_TRACK = {
    id: 'health',
    label: 'Health',
    levels: HEALTH_LEVELS.map(({ name, penalty }) => ({
        id: name.toLowerCase(),
        label: name,
        penalty: penalty === 0 ? null : penalty,
    })),
};

export const WOD2E_WILLPOWER = {
    id: 'willpower',
    label: 'Willpower',
    mode: 'pool' as const,
    minimum: 0,
    maximum: 10,
};

/** The engine profile: attributes, classic abilities, virtues, Willpower, Health. */
export const wod2eProfile = defineWodSheetProfile({
    id: 'wod2e-core',
    label: 'World of Darkness 2nd Edition',
    traitGroups: [
        ...WOD2E_ATTRIBUTE_GROUPS,
        {
            id: 'talents',
            label: 'Talents',
            role: 'ability',
            traits: WOD2E_ABILITIES.talents.map((key) => wodTrait(key)),
        },
        {
            id: 'skills',
            label: 'Skills',
            role: 'ability',
            traits: WOD2E_ABILITIES.skills.map((key) => wodTrait(key)),
        },
        {
            id: 'knowledges',
            label: 'Knowledges',
            role: 'ability',
            traits: WOD2E_ABILITIES.knowledges.map((key) => wodTrait(key)),
        },
        {
            id: 'virtues',
            label: 'Virtues',
            role: 'virtue',
            traits: ['Conscience', 'Self-Control', 'Courage'].map((key) => wodTrait(key, 1)),
        },
    ],
    resources: [WOD2E_WILLPOWER],
    conditionTracks: [WOD2E_HEALTH_TRACK],
});
