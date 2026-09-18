import type { UnknownDocumentEnvelope } from '../../../../types/document';
import { HunterSchema } from './schema';

/**
 * Lena Varga — the running example of the Hunter documentation. A legal starting hunter:
 * attributes 4/3/3/3/2/2/2/2/1, the Balanced skill spread, one Edge with two Perks, 7 advantage
 * and 2 flaw points. Invented for this project; all wording is our own.
 */
export const LENA_VARGA_DATA = HunterSchema.parse({
    name: 'Lena Varga',
    concept: 'Night-shift paramedic',
    creed: 'Faithful',
    drive: 'Atonement',
    ambition: 'Find the thing that killed the patient she could not save.',
    desire: 'One full night of sleep.',
    redemption: 'Keeps a list of the people she has pulled back from the edge.',
    attributes: {
        strength: { value: 2 },
        dexterity: { value: 3 },
        stamina: { value: 3 },
        charisma: { value: 2 },
        manipulation: { value: 1 },
        composure: { value: 4 },
        intelligence: { value: 2 },
        wits: { value: 3 },
        resolve: { value: 2 },
    },
    skills: {
        medicine: { value: 3, specializationText: 'Trauma' },
        driving: { value: 3 },
        awareness: { value: 3 },
        athletics: { value: 2 },
        insight: { value: 2 },
        persuasion: { value: 2 },
        streetwise: { value: 2 },
        occult: { value: 2 },
        brawl: { value: 1 },
        firearms: { value: 1 },
        stealth: { value: 1 },
        etiquette: { value: 1 },
        investigation: { value: 1 },
        science: { value: 1, specializationText: 'Pharmacology' },
        technology: { value: 1 },
    },
    health: { levels: ['slash'], bonus: 0 },
    willpower: { levels: ['slash'], bonus: 0 },
    edges: [
        {
            id: 'lena-edge-sense',
            name: 'Sense the Unnatural',
            note: 'A cold pressure behind the eyes when something is wrong with a patient.',
        },
    ],
    perks: [
        { id: 'lena-perk-range', name: 'Range', edge: 'Sense the Unnatural' },
        { id: 'lena-perk-precision', name: 'Precision', edge: 'Sense the Unnatural' },
    ],
    advantages: [
        { id: 'lena-adv-contacts', label: 'Contacts: night staff at St. Anne hospital', points: 3 },
        { id: 'lena-adv-ally', label: 'Ally: Tomas, her ambulance partner', points: 2 },
        { id: 'lena-adv-stomach', label: 'Iron Stomach', points: 2 },
    ],
    flaws: [
        { id: 'lena-flaw-insomnia', label: 'Insomnia', points: 1 },
        { id: 'lena-flaw-shifts', label: 'Obligation: double shifts', points: 1 },
    ],
    touchstones: [
        {
            id: 'lena-ts-brother',
            name: 'Mark, her younger brother',
            conviction: 'Never leave anyone behind.',
        },
        {
            id: 'lena-ts-tomas',
            name: 'Tomas, her partner',
            conviction: 'No one dies on my watch if I can stop it.',
        },
    ],
    chronicleTenets:
        'Protect the living. Tell the truth to the cell. Leave no evidence for the police.',
    creedFields: 'Prayer, first aid, and the calm that holds a room together.',
    weapons: [
        {
            id: 'lena-weapon-shears',
            name: 'Trauma shears',
            damage: '+0',
            range: '',
            ammo: 0,
            maxAmmo: 0,
        },
        {
            id: 'lena-weapon-flare',
            name: 'Road flare',
            damage: '+1 (fire)',
            range: 'Thrown',
            ammo: 3,
            maxAmmo: 3,
        },
    ],
    inventory: [
        {
            id: 'lena-item-kit',
            text: 'Trauma kit',
            description: 'Dressings, tourniquets, a suture set.',
            effects: '+1 die to first aid',
            weight: '',
            price: '',
            quantity: 1,
            maxQuantity: 1,
            equipped: true,
        },
        {
            id: 'lena-item-torch',
            text: 'Pocket torch',
            description: '',
            effects: '',
            weight: '',
            price: '',
            quantity: 1,
            maxQuantity: 1,
            equipped: true,
        },
        {
            id: 'lena-item-rosary',
            text: 'Silver rosary',
            description: "Her grandmother's.",
            effects: '',
            weight: '',
            price: '',
            quantity: 1,
            maxQuantity: 1,
            equipped: true,
        },
        {
            id: 'lena-item-keys',
            text: 'Spare ambulance keys',
            description: '',
            effects: '',
            weight: '',
            price: '',
            quantity: 1,
            maxQuantity: 1,
            equipped: false,
        },
    ],
    desperation: 1,
    danger: 1,
    experience: { total: 0, spent: 0 },
});

export const LENA_VARGA_DOCUMENT: UnknownDocumentEnvelope = {
    id: 'lena-varga::example',
    kind: 'character' as UnknownDocumentEnvelope['kind'],
    systemId: 'wod-v5' as UnknownDocumentEnvelope['systemId'],
    definitionId: 'hunter' as UnknownDocumentEnvelope['definitionId'],
    schemaVersion: 1,
    metadata: { title: 'Lena Varga', tags: [] },
    templateValues: {},
    data: LENA_VARGA_DATA,
};
