import type { UnknownDocumentEnvelope } from '../../../../types/document';
import { VampireSchema } from './schema';

/**
 * Sheriff Ottilie Brandt — the antagonist vampire of the Storyteller documentation (spec 040):
 * a full vampire sheet run lightly, with Hunger and Willpower not tracked. Invented for this
 * project; all wording is ours.
 */
export const OTTILIE_BRANDT_DOCUMENT: UnknownDocumentEnvelope = {
    id: 'ottilie-brandt::example',
    kind: 'vampire' as UnknownDocumentEnvelope['kind'],
    systemId: 'wod-v5' as UnknownDocumentEnvelope['systemId'],
    definitionId: 'vampire' as UnknownDocumentEnvelope['definitionId'],
    schemaVersion: 1,
    metadata: { title: 'Sheriff Ottilie Brandt', tags: [] },
    templateValues: {},
    data: VampireSchema.parse({
        name: 'Sheriff Ottilie Brandt',
        concept: "The Prince's patient hound",
        chronicle: 'Nights of the Old Port',
        clan: 'Brujah',
        generation: 10,
        predatorType: 'Alleycat',
        ambition: 'Be the last Sheriff this city ever needs.',
        desire: 'Find who painted the warning on the Elysium door.',
        hunger: 2,
        humanity: 5,
        bloodPotency: 3,
        trackResources: false,
        attributes: {
            strength: { value: 4 },
            dexterity: { value: 3 },
            stamina: { value: 4 },
            charisma: { value: 2 },
            manipulation: { value: 3 },
            composure: { value: 4 },
            intelligence: { value: 2 },
            wits: { value: 4 },
            resolve: { value: 3 },
        },
        skills: {
            brawl: { value: 4 },
            firearms: { value: 3 },
            melee: { value: 3 },
            athletics: { value: 3 },
            intimidation: { value: 4 },
            investigation: { value: 3 },
            streetwise: { value: 3 },
            awareness: { value: 3 },
            insight: { value: 2 },
            politics: { value: 2 },
        },
        disciplines: [
            { id: 'ottilie-celerity', name: 'Celerity', value: 3 },
            { id: 'ottilie-potence', name: 'Potence', value: 2 },
            { id: 'ottilie-presence', name: 'Presence', value: 2 },
        ],
        notes: 'Arrives with two ghouls. Prefers a warning first, a broken arm second.',
    }),
};
