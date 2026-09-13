import type { ConditionMark } from '../../types/character';
import { DEFAULT_ATTRIBUTE_VALUE, DEFAULT_SKILL_VALUE } from '../../types/character';
import type { UnknownDocumentEnvelope } from '../../types/document';
import {
    STAR_WARS_WOD_SYSTEM_ID,
    starWarsCreatureDefinition,
    starWarsFodderDefinition,
    starWarsVehicleDefinition,
} from './index';
import {
    createDefaultCreatureData,
    createDefaultFodderData,
    createDefaultVehicleData,
    CreatureDataSchema,
    FodderDataSchema,
    VehicleDataSchema,
} from './schema';

/**
 * Fixed example documents for documentation previews. Values follow the page prose (not the
 * catalogs) so previews and text never disagree; ids end in `::preset`, which the store refuses
 * to write.
 */

const E: ConditionMark = 'empty';
const S: ConditionMark = 'slash';
const X: ConditionMark = 'cross';

type Definition =
    | typeof starWarsCreatureDefinition
    | typeof starWarsVehicleDefinition
    | typeof starWarsFodderDefinition;

function envelope(
    id: string,
    title: string,
    definition: Definition,
    data: unknown,
    templateValues: Record<string, unknown> = {}
): UnknownDocumentEnvelope {
    return {
        id,
        kind: definition.kind,
        systemId: STAR_WARS_WOD_SYSTEM_ID,
        definitionId: definition.id,
        schemaVersion: definition.schemaVersion,
        metadata: { title, tags: [], preferredViewId: definition.defaultViewId },
        templateValues: templateValues as UnknownDocumentEnvelope['templateValues'],
        data: definition.schema.parse(data),
    };
}

const dots = (value: number) => ({ ...DEFAULT_ATTRIBUTE_VALUE, value });
const ability = (label: string, value: number) => ({
    id: `ability-${label.toLowerCase()}`,
    label,
    ...DEFAULT_SKILL_VALUE,
    value,
});
const listEntries = (prefix: string, labels: readonly string[]) =>
    labels.map((label, index) => ({ id: `${prefix}-${index}`, label, value: 0 }));

function wampa(): UnknownDocumentEnvelope {
    const data = CreatureDataSchema.parse({
        ...createDefaultCreatureData(),
        name: 'Wampa',
        species: 'Wampa',
        type: 'Snow predator',
        scale: 'speeder',
        size: '3m tall',
        attributes: {
            Strength: dots(5),
            Dexterity: dots(3),
            Stamina: dots(5),
            Perception: dots(2),
            Intelligence: dots(2),
            Wits: dots(3),
        },
        abilities: [
            ability('Athletics', 3),
            ability('Brawl', 2),
            ability('Stealth', 3),
            ability('Survival', 3),
            ability('Intimidation', 3),
        ],
        willpower: { current: 6, max: 6 },
        armor: { name: 'Tough hide', armorRating: '+1D', dexterityModifier: '' },
        attacks: [
            { id: 'claw', name: 'Claw', type: 'L', damage: 'STR+1D', range: '' },
            { id: 'teeth', name: 'Teeth', type: 'L', damage: 'STR+2D', range: '' },
        ],
        notes: 'Hunts by tracking; buries prey in snow for later.',
        members: [{ id: 'wampa-a', label: 'A', health: { levels: [E, E, E, E, E, E, E] } }],
    });
    return envelope('wampa::preset', 'Wampa', starWarsCreatureDefinition, data, {
        'threat-tier': 'named',
        'creature-merits': listEntries('merit', [
            'Powerful +3',
            'Non-verbal Language (howl)',
            'Camouflage (snow)',
        ]),
    });
}

function stormtrooperSquad(): UnknownDocumentEnvelope {
    const data = FodderDataSchema.parse({
        ...createDefaultFodderData(),
        concept: 'Stormtrooper squad',
        attributes: {
            Strength: dots(3),
            Dexterity: dots(3),
            Stamina: dots(3),
            Charisma: dots(1),
            Manipulation: dots(1),
            Appearance: dots(1),
            Perception: dots(2),
            Intelligence: dots(2),
            Wits: dots(2),
        },
        abilities: [
            ability('Blaster', 3),
            ability('Dodge', 2),
            ability('Melee', 2),
            ability('Brawl', 2),
            ability('Athletics', 2),
            ability('Alertness', 2),
        ],
        willpower: 4,
        armor: { name: 'Stormtrooper armor', armorRating: '+3D', dexterityModifier: '-2D' },
        weapons: [{ id: 'rifle', name: 'Blaster Rifle', type: 'L', damage: '9D', range: '200' }],
        trackLength: 3,
        members: [
            { id: 'trooper-a', label: 'A', health: { levels: [E, E, E, E, E, E, E] } },
            { id: 'trooper-b', label: 'B', health: { levels: [S, E, E, E, E, E, E] } },
            { id: 'trooper-c', label: 'C', health: { levels: [X, S, E, E, E, E, E] } },
            { id: 'trooper-d', label: 'D', health: { levels: [X, X, X, E, E, E, E] } },
        ],
    });
    return envelope(
        'stormtrooper-squad::preset',
        'Stormtrooper squad',
        starWarsFodderDefinition,
        data
    );
}

interface VehicleExample {
    id: string;
    name: string;
    values: Record<string, unknown>;
    reroll?: boolean;
}

function vehicle({ id, name, values, reroll }: VehicleExample): UnknownDocumentEnvelope {
    const data = VehicleDataSchema.parse({
        ...createDefaultVehicleData(),
        name,
        ...values,
        members: [{ id: `${id}-a`, label: 'A', damage: { levels: [E, E, E, E, E, E, E] } }],
    });
    return envelope(
        `${id}::preset`,
        name,
        starWarsVehicleDefinition,
        data,
        reroll ? { 'durability-reroll': true } : {}
    );
}

const weapon = (name: string, arc: string, range: string, damage: string) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    type: '',
    arc,
    range,
    damage,
});

const redFive = () =>
    vehicle({
        id: 'red-five',
        name: 'Red Five',
        values: {
            model: 'Incom T-65 X-wing',
            scale: 'starfighter',
            crew: '1 + astromech droid',
            length: '12.5m',
            cargoCapacity: '110kg',
            passengers: '0',
            consumables: '1 week',
            durability: 4,
            maneuverability: 3,
            speed: '11 (1,050 kmh)',
            altitude: 'space',
            communicationsSensors: 2,
            sensorRange: '25',
            hyperdrive: 3,
            navigationComputer: 'Astromech nav comp',
            shields: 2,
            weapons: [
                weapon('4 laser cannons', 'front', '12', '8D'),
                weapon('2 proton torpedo launchers', 'front', '3', '11D'),
            ],
        },
    });

const lukesLandspeeder = () =>
    vehicle({
        id: 'lukes-landspeeder',
        name: "Luke's Landspeeder",
        values: {
            model: 'SoroSuub X-34',
            scale: 'speeder',
            crew: '1',
            length: '3.4m',
            cargoCapacity: '100kg',
            passengers: '1',
            consumables: '1 day',
            durability: 2,
            maneuverability: 3,
            speed: '4 (400 kmh)',
            altitude: '1m',
        },
    });

const millenniumFalcon = () =>
    vehicle({
        id: 'millennium-falcon',
        name: 'Millennium Falcon',
        reroll: true,
        values: {
            model: 'Corellian YT-1300',
            scale: 'transport',
            crew: '2 (+ 2 gunners; skeleton 1)',
            length: '26.7m',
            cargoCapacity: '100 metric tons (10% in hidden compartments)',
            passengers: '6',
            consumables: '2 months',
            durability: 4,
            maneuverability: 4,
            speed: '12 (1,200 kmh)',
            altitude: 'space',
            communicationsSensors: 4,
            sensorRange: '60',
            hyperdrive: 5,
            navigationComputer: 'Full nav comp (×0.5)',
            shields: 3,
            weapons: [
                weapon('2 quad laser cannons', 'turret', '12', '8D'),
                weapon('2 concussion missile launchers', 'front', '3', '11D'),
                weapon('1 blaster cannon (Speeder scale)', 'turret', '1', '5D'),
            ],
        },
    });

const BUILDERS: Readonly<Record<string, () => UnknownDocumentEnvelope>> = {
    'wampa::preset': wampa,
    'stormtrooper-squad::preset': stormtrooperSquad,
    'red-five::preset': redFive,
    'lukes-landspeeder::preset': lukesLandspeeder,
    'millennium-falcon::preset': millenniumFalcon,
};

const built = new Map<string, UnknownDocumentEnvelope>();

export const STAR_WARS_EXAMPLE_IDS: readonly string[] = Object.keys(BUILDERS);

/** A documentation example document (built once, shared by every preview of it). */
export function starWarsExampleDocument(id: string): UnknownDocumentEnvelope | undefined {
    const builder = BUILDERS[id];
    if (!builder) return undefined;
    let document = built.get(id);
    if (!document) {
        document = builder();
        built.set(id, document);
    }
    return document;
}

/** A single vehicle whose damage track shows the given marks. */
export function vehicleDamageDocument(levels: readonly ConditionMark[]): UnknownDocumentEnvelope {
    return envelope(
        'vehicle-damage-preview::preset',
        '',
        starWarsVehicleDefinition,
        VehicleDataSchema.parse({
            ...createDefaultVehicleData(),
            members: [{ id: 'preview-a', label: 'A', damage: { levels: [...levels] } }],
        })
    );
}
