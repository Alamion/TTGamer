import type { UnknownDocumentEnvelope } from '../../../../types/document';
import { VampireSchema } from './schema';

/**
 * Mirela Voss — an example fledgling for page previews and the template editor's sample data
 * (spec 037). A legal starting Toreador with the Siren predator type. Invented for this project;
 * all wording is our own.
 */
export const MIRELA_VOSS_DATA = VampireSchema.parse({
    name: 'Mirela Voss',
    concept: 'Restorer of old paintings',
    chronicle: 'Nights of the Old Port',
    sire: 'Aurelio, a gallery owner who never explained himself',
    clan: 'Toreador',
    generation: 12,
    predatorType: 'Siren',
    ambition: 'Restore the fresco her sire keeps hidden in the cellar.',
    desire: 'Hear someone laugh at her joke tonight.',
    hunger: 2,
    humanity: 7,
    stains: 1,
    bloodPotency: 1,
    attributes: {
        strength: { value: 1 },
        dexterity: { value: 3 },
        stamina: { value: 2 },
        charisma: { value: 3 },
        manipulation: { value: 2 },
        composure: { value: 2 },
        intelligence: { value: 2 },
        wits: { value: 3 },
        resolve: { value: 2 },
    },
    skills: {
        craft: { value: 3, specializationText: 'Painting restoration' },
        persuasion: { value: 2, specializationText: 'Seduction' },
        insight: { value: 2 },
        awareness: { value: 2 },
        etiquette: { value: 2 },
        academics: { value: 2 },
        subterfuge: { value: 1 },
        athletics: { value: 1 },
        stealth: { value: 1 },
        streetwise: { value: 1 },
        investigation: { value: 1 },
        performance: { value: 1 },
    },
    disciplines: [
        { id: 'mirela-auspex', name: 'Auspex', value: 2 },
        { id: 'mirela-presence', name: 'Presence', value: 1 },
    ],
    powers: [
        {
            id: 'mirela-power-senses',
            name: 'Heightened Senses',
            discipline: 'Auspex',
            level: '1',
            note: 'Smells turpentine through two walls.',
            entry: 'auspex-heightened-senses',
            rouse: '0',
        },
        {
            id: 'mirela-power-unseen',
            name: 'Sense the Unseen',
            discipline: 'Auspex',
            level: '2',
            note: '',
            entry: 'auspex-sense-the-unseen',
            rouse: '0',
        },
        {
            id: 'mirela-power-awe',
            name: 'Awe',
            discipline: 'Presence',
            level: '1',
            note: '',
            entry: 'presence-awe',
            rouse: '0',
        },
    ],
    advantages: [
        { id: 'mirela-adv-beautiful', label: 'Beautiful', points: 2 },
        { id: 'mirela-adv-haven', label: 'Haven: studio above the gallery', points: 1 },
    ],
    flaws: [{ id: 'mirela-flaw-prey', label: 'Prey Exclusion: the gallery staff', points: 1 }],
    touchstones: [
        {
            id: 'mirela-ts-dana',
            name: 'Dana, her old apprentice',
            conviction: 'Never ruin a work someone made with love.',
        },
    ],
    health: { levels: [], bonus: 0 },
    willpower: { levels: ['slash'], bonus: 0 },
    experience: { total: 0, spent: 0 },
});

export const MIRELA_VOSS_DOCUMENT: UnknownDocumentEnvelope = {
    id: 'mirela-voss::example',
    kind: 'vampire' as UnknownDocumentEnvelope['kind'],
    systemId: 'wod-v5' as UnknownDocumentEnvelope['systemId'],
    definitionId: 'vampire' as UnknownDocumentEnvelope['definitionId'],
    schemaVersion: 1,
    metadata: { title: 'Mirela Voss', tags: [] },
    templateValues: {},
    data: MIRELA_VOSS_DATA,
};
