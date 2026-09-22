import { HEALTH_LEVELS } from '../../types/character';
import { defineWodSheetProfile } from '../wod-like';

const trait = (key: string, minimum = 0) => ({
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

export const starWarsWodProfile = defineWodSheetProfile({
    id: 'star-wars-wod-core',
    label: 'Star Wars WoD 2e',
    traitGroups: [
        {
            id: 'physical',
            label: 'Physical',
            role: 'attribute',
            traits: ['Strength', 'Dexterity', 'Stamina'].map((key) => trait(key, 1)),
        },
        {
            id: 'social',
            label: 'Social',
            role: 'attribute',
            traits: ['Charisma', 'Manipulation', 'Appearance'].map((key) => trait(key, 1)),
        },
        {
            id: 'mental',
            label: 'Mental',
            role: 'attribute',
            traits: ['Perception', 'Intelligence', 'Wits'].map((key) => trait(key, 1)),
        },
        {
            id: 'talents',
            label: 'Talents',
            role: 'ability',
            traits: [
                'Alertness',
                'Athletics',
                'Brawl',
                'Command',
                'Diplomacy',
                'Dodge',
                'Empathy',
                'Intimidation',
                'Streetwise',
                'Subterfuge',
            ].map((key) => trait(key)),
        },
        {
            id: 'skills',
            label: 'Skills',
            role: 'ability',
            traits: [
                'Blaster',
                'Gunnery',
                'Melee',
                'Pilot',
                'Programming',
                'Repair',
                'Ride',
                'Security',
                'Stealth',
                'Survival',
            ].map((key) => trait(key)),
        },
        {
            id: 'knowledges',
            label: 'Knowledges',
            role: 'ability',
            traits: [
                'Astrogation',
                'Bureaucracy',
                'Cultures',
                'Interfaces',
                'Investigation',
                'Languages',
                'Medicine',
                'Politics',
                'Tech',
                'Trade',
            ].map((key) => trait(key)),
        },
        {
            id: 'force-skills',
            label: 'Force Skills',
            role: 'special',
            traits: ['Control', 'Dynamism', 'Rapport', 'Sense', 'Telekinesis'].map((key) =>
                trait(key)
            ),
        },
        {
            id: 'virtues',
            label: 'Virtues',
            role: 'virtue',
            traits: ['Conscience', 'Passion', 'Self Control'].map((key) => trait(key, 1)),
        },
        {
            id: 'vehicle-systems',
            label: 'Systems',
            role: 'attribute',
            traits: [
                'Durability',
                'Maneuverability',
                'Communications / Sensors',
                'Hyperdrive',
                'Shields',
                'Front Shields',
                'Rear Shields',
            ].map((key) => trait(key)),
        },
    ],
    resources: [
        { id: 'willpower', label: 'Willpower', mode: 'pool', minimum: 0, maximum: 10 },
        { id: 'force-points', label: 'Force Points', mode: 'pool', minimum: 0, maximum: 10 },
        {
            id: 'dark-side-resistance',
            label: 'Dark Side Resistance',
            mode: 'rating',
            minimum: 0,
            maximum: 10,
        },
    ],
    conditionTracks: [
        {
            id: 'health',
            label: 'Health',
            levels: HEALTH_LEVELS.map(({ name, penalty }) => ({
                id: name.toLowerCase(),
                label: name,
                penalty: penalty === 0 ? null : penalty,
            })),
        },
        {
            id: 'vehicle-damage',
            label: 'Damage',
            levels: [
                { id: 'cosmetic', label: 'Cosmetic', penalty: null },
                { id: 'light', label: 'Light', penalty: -1 },
                { id: 'moderate', label: 'Moderate', penalty: -2 },
                { id: 'heavy', label: 'Heavy', penalty: -3 },
                { id: 'severe', label: 'Severe', penalty: -4 },
                { id: 'crippled', label: 'Crippled', penalty: -5 },
                { id: 'wrecked', label: 'Wrecked', penalty: null },
            ],
        },
    ],
});
