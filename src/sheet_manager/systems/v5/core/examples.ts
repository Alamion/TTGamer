import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { UnknownDocumentEnvelope } from '../../../types/document';
import type { DocumentExample } from '../../types';
import { V5StorytellerSchema } from './storyteller';

/**
 * The Storyteller examples of the V5 documentation (spec 040, D9): a mortal, a ghoul retainer, an
 * animal, a creature, and a group whose members are copied with it. Invented for this project;
 * all wording is ours, no published stat block.
 */

const labels = uiMessages.sheet.documents.examples;

type Envelope = UnknownDocumentEnvelope;

function storyteller(id: string, data: object): Envelope {
    const parsed = V5StorytellerSchema.parse(data);
    return {
        id,
        kind: 'storyteller' as Envelope['kind'],
        systemId: 'wod-v5' as Envelope['systemId'],
        definitionId: 'v5-storyteller' as Envelope['definitionId'],
        schemaVersion: 1,
        metadata: { title: parsed.name, tags: [] },
        templateValues: {},
        data: parsed,
    };
}

const pools = (physical: number, social: number, mental: number) => ({
    physical: { value: physical },
    social: { value: social },
    mental: { value: mental },
});

/** Four base boxes plus the track's own +/−. */
const boxes = (count: number) => ({ levels: [], bonus: count - 4 });

const INES_RUIZ = storyteller('ines-ruiz::example', {
    name: 'Ines Ruiz',
    concept: 'Homicide detective who keeps a second notebook',
    type: 'mortal',
    pools: pools(3, 5, 4),
    health: boxes(5),
    willpower: boxes(5),
    exceptional: [
        { id: 'ruiz-investigation', name: 'Investigation', value: 7 },
        { id: 'ruiz-insight', name: 'Insight', value: 6 },
        { id: 'ruiz-firearms', name: 'Firearms', value: 5 },
    ],
    notes: 'Notices when a witness does not blink. Calls for backup before she opens a door.',
});

const BRUNO_KESSEL = storyteller('bruno-kessel::example', {
    name: 'Bruno Kessel',
    concept: 'Driver and doorman to the Sheriff',
    type: 'ghoul',
    pools: pools(4, 2, 2),
    health: boxes(6),
    willpower: boxes(4),
    exceptional: [
        { id: 'kessel-brawl', name: 'Brawl', value: 6 },
        { id: 'kessel-drive', name: 'Driving', value: 5 },
        { id: 'kessel-intimidation', name: 'Intimidation', value: 5 },
    ],
    powers: [{ id: 'kessel-potence', name: 'Potence', value: 1 }],
    notes: 'Mends one Superficial damage a turn while he has his domitor’s blood in him.',
});

const YARD_DOGS = storyteller('yard-dogs::example', {
    name: 'The yard dogs',
    concept: 'Two mastiffs that patrol the scrapyard at night',
    type: 'animal',
    difficulty: 2,
    pools: pools(5, 1, 1),
    health: boxes(5),
    willpower: boxes(2),
    exceptional: [
        { id: 'dogs-brawl', name: 'Brawl', value: 6 },
        { id: 'dogs-awareness', name: 'Awareness', value: 5 },
    ],
    notes: 'One sheet for both: mark each dog’s damage in turn, or treat them as a simple foe.',
});

const PINE_THING = storyteller('pine-thing::example', {
    name: 'The thing in the pines',
    concept: 'Something wearing the shape of a wolf, and not well',
    type: 'supernatural',
    pools: pools(7, 2, 3),
    health: boxes(10),
    willpower: boxes(6),
    exceptional: [
        { id: 'pines-brawl', name: 'Brawl', value: 9 },
        { id: 'pines-stealth', name: 'Stealth', value: 7 },
        { id: 'pines-awareness', name: 'Awareness', value: 6 },
    ],
    powers: [{ id: 'pines-regrowth', name: 'Regrowth', value: 3 }],
    notes: 'Fire and silver deal Aggravated damage; anything else heals by the next night.',
});

export const STORYTELLER_EXAMPLES: readonly DocumentExample[] = [
    { id: INES_RUIZ.id, label: labels.inesRuiz, create: () => INES_RUIZ },
    { id: BRUNO_KESSEL.id, label: labels.brunoKessel, create: () => BRUNO_KESSEL },
    { id: YARD_DOGS.id, label: labels.yardDogs, create: () => YARD_DOGS },
    { id: PINE_THING.id, label: labels.pineThing, create: () => PINE_THING },
];

const LANTERN_CHOIR: Envelope = {
    id: 'lantern-choir::example',
    kind: 'v5-group' as Envelope['kind'],
    systemId: 'wod-v5' as Envelope['systemId'],
    definitionId: 'v5-group' as Envelope['definitionId'],
    schemaVersion: 1,
    metadata: { title: 'The Lantern Choir', tags: [] },
    templateValues: {
        'group-kind': 'Cult',
        threat: 3,
        'group-about':
            'A small congregation that sings in a flooded chapel at the edge of the pines.',
        'group-goals': 'Feed the thing in the pines, and keep the Sheriff looking the other way.',
        'group-resources': 'The chapel, a delivery van, and a debt the Sheriff owes them.',
        members: [PINE_THING.id, BRUNO_KESSEL.id, 'ottilie-brandt::example'],
    },
    data: { metadata: {}, name: 'The Lantern Choir' },
};

export const GROUP_EXAMPLES: readonly DocumentExample[] = [
    {
        id: LANTERN_CHOIR.id,
        label: labels.lanternChoir,
        create: () => LANTERN_CHOIR,
        companions: [
            { definitionId: 'v5-storyteller', exampleId: PINE_THING.id },
            { definitionId: 'v5-storyteller', exampleId: BRUNO_KESSEL.id },
            { definitionId: 'vampire', exampleId: 'ottilie-brandt::example' },
        ],
    },
];
