import type { UnknownDocumentEnvelope } from '../../../../types/document';
import { VampireSchema } from './schema';

/**
 * Mirela Voss — the running example of the Vampire documentation and the template editor's
 * sample data. A legal starting neonate Toreador with the Siren predator type: attributes
 * 4/3/3/3/2/2/2/2/1, the Balanced skill spread, Auspex 2 and Presence 1 from the clan plus the
 * Siren's Presence dot, 7 advantage and 2 flaw points besides the Siren's. Shown after her first
 * night (Hunger 2, one Stain, one spent Willpower). Invented for this project; all wording is ours.
 */
export const MIRELA_VOSS_DATA = VampireSchema.parse({
    name: 'Mirela Voss',
    metadata: { imageUrl: '/img/mirela_voss.webp' },
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
        dexterity: { value: 4 },
        stamina: { value: 2 },
        charisma: { value: 3 },
        manipulation: { value: 2 },
        composure: { value: 2 },
        intelligence: { value: 3 },
        wits: { value: 3 },
        resolve: { value: 2 },
    },
    skills: {
        craft: { value: 3, specializationText: 'Painting restoration' },
        persuasion: { value: 3, specializationText: 'Seduction' },
        academics: { value: 3, specializationText: 'Art history' },
        insight: { value: 2, specializationText: 'Artists' },
        awareness: { value: 2 },
        etiquette: { value: 2 },
        subterfuge: { value: 2 },
        investigation: { value: 2 },
        performance: { value: 1, specializationText: 'Singing' },
        athletics: { value: 1 },
        stealth: { value: 1 },
        streetwise: { value: 1 },
        driving: { value: 1 },
        technology: { value: 1 },
        larceny: { value: 1 },
    },
    disciplines: [
        { id: 'mirela-auspex', name: 'Auspex', value: 2 },
        { id: 'mirela-presence', name: 'Presence', value: 2 },
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
            id: 'mirela-power-premonition',
            name: 'Premonition',
            discipline: 'Auspex',
            level: '2',
            note: '',
            entry: 'auspex-premonition',
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
        {
            id: 'mirela-power-kiss',
            name: 'Lingering Kiss',
            discipline: 'Presence',
            level: '2',
            note: 'Her partners from the gallery openings call again.',
            entry: 'presence-lingering-kiss',
            rouse: '0',
        },
    ],
    advantages: [
        { id: 'mirela-adv-beautiful', label: 'Looks: Beautiful (Siren)', points: 2 },
        { id: 'mirela-adv-haven', label: 'Haven: studio above the gallery', points: 2 },
        { id: 'mirela-adv-resources', label: 'Resources: restoration commissions', points: 2 },
        { id: 'mirela-adv-contacts', label: 'Contacts: art dealers and auction houses', points: 2 },
        { id: 'mirela-adv-herd', label: 'Herd: regulars of the late openings', points: 1 },
    ],
    flaws: [
        { id: 'mirela-flaw-enemy', label: 'Enemy: a spurned lover (Siren)', points: 1 },
        { id: 'mirela-flaw-prey', label: 'Prey Exclusion: the gallery staff', points: 1 },
        { id: 'mirela-flaw-past', label: 'Living in the Past', points: 1 },
    ],
    touchstones: [
        {
            id: 'mirela-ts-dana',
            name: 'Dana, her old apprentice',
            conviction: 'Never ruin a work someone made with love.',
        },
        {
            id: 'mirela-ts-rosa',
            name: 'Rosa, her mother in a care home',
            conviction: 'Never let a frightened person feel alone.',
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
