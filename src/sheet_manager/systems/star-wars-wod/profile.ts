import { createWodSheetProfileVariant } from '../wod-like';
import {
    WOD2E_ATTRIBUTE_GROUPS,
    WOD2E_HEALTH_TRACK,
    WOD2E_WILLPOWER,
    wod2eProfile,
    wodTrait as trait,
} from '../wod2e/ruleset/profile';

/**
 * The Star Wars conversion as a variant of the WoD 2e engine profile (spec 012): the engine's
 * attributes, Willpower, and Health, with the setting's own abilities, Force skills, virtues
 * (Passion in place of Courage), Force resources, and vehicle systems.
 */
export const starWarsWodProfile = createWodSheetProfileVariant(wod2eProfile, {
    id: 'star-wars-wod-core',
    label: 'Star Wars WoD 2e',
    traitGroups: [
        ...WOD2E_ATTRIBUTE_GROUPS,
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
        WOD2E_WILLPOWER,
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
        WOD2E_HEALTH_TRACK,
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
