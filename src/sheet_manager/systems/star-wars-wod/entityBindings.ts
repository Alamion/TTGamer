import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type {
    BindingOption,
    DocumentBindingDescriptor,
    FieldBinding,
    ResourceBinding,
    RowsBinding,
    RowsColumn,
    TrackBinding,
    TrackLevel,
} from '../templateBindings';
import {
    buildWodTrackBindings,
    buildWodTraitBindings,
    toCoordinate,
} from '../wod-like/templateBindings';
import { starWarsWodProfile } from './profile';
import { CombatScaleSchema } from './schema';

/**
 * Bindings of the Star Wars entity documents (creature, vehicle, fodder group): which typed
 * document data their templates may read and write. Labels are untranslated fallbacks; the
 * shipped templates carry the translation references.
 */

const fields = uiMessages.sheet.documents.fields;
const entities = uiMessages.sheet.templates.entities;

const CREATURE: ReadonlySet<string> = new Set(['creature']);
const VEHICLE: ReadonlySet<string> = new Set(['vehicle']);
const GROUP: ReadonlySet<string> = new Set(['group']);

const scaleMessages = fields.scaleOptions;
const SCALE_MESSAGES: Record<string, { id: string; message: string }> = {
    'death-star': scaleMessages.deathStar,
    capital: scaleMessages.capital,
    transport: scaleMessages.transport,
    starfighter: scaleMessages.starfighter,
    walker: scaleMessages.walker,
    speeder: scaleMessages.speeder,
    character: scaleMessages.character,
    vermin: scaleMessages.vermin,
};

export const SCALE_OPTIONS: readonly BindingOption[] = CombatScaleSchema.options.map((id) => ({
    id,
    label: SCALE_MESSAGES[id]!.message,
    translation: SCALE_MESSAGES[id],
}));

/** Weapon arcs; stored as these ids (older free-text arcs stay visible until changed). */
export const ARC_OPTIONS: readonly BindingOption[] = [
    { id: 'front', label: 'Front', translation: entities.arcFront },
    { id: 'rear', label: 'Rear', translation: entities.arcRear },
    { id: 'left', label: 'Left', translation: entities.arcLeft },
    { id: 'right', label: 'Right', translation: entities.arcRight },
    { id: 'turret', label: 'Turret', translation: entities.arcTurret },
    { id: 'all', label: 'All', translation: entities.arcAll },
];

const ATTACK_TYPE_OPTIONS: readonly BindingOption[] = [
    { id: 'L', label: 'Lethal', translation: entities.lethal },
    { id: 'B', label: 'Bashing', translation: entities.bashing },
];

/** Leading signed integer of a dice label (`'+3D'` → 3, `'-2D'` → −2); none → undefined. */
export function leadingInteger(raw: unknown): number | undefined {
    if (typeof raw === 'number') return raw;
    if (typeof raw !== 'string') return undefined;
    if (raw.trim() === '') return 0;
    const match = raw.match(/[+-]?\d+/);
    return match ? Number(match[0]) : undefined;
}

/** `['armor', 'armorRating']` → `armor-armor-rating`. */
function pathCoordinate(path: readonly string[]): string {
    return toCoordinate(path.map((part) => part.replace(/([a-z])([A-Z])/g, '$1-$2')).join('-'));
}

function textField(
    documentKinds: ReadonlySet<string>,
    path: readonly string[],
    label: string,
    extra: Partial<FieldBinding> = {}
): FieldBinding {
    return {
        key: `field:${path.join('.')}`,
        kind: 'field',
        label,
        documentKinds,
        path,
        valueType: 'string',
        coordinate: pathCoordinate(path),
        ...extra,
    };
}

function scaleField(documentKinds: ReadonlySet<string>): FieldBinding {
    return textField(documentKinds, ['scale'], 'Scale', {
        valueType: 'enum',
        options: SCALE_OPTIONS,
    });
}

function armorFields(documentKinds: ReadonlySet<string>): FieldBinding[] {
    return [
        textField(documentKinds, ['armor', 'name'], 'Armor'),
        textField(documentKinds, ['armor', 'armorRating'], 'Armor rating', {
            numeric: leadingInteger,
        }),
        textField(documentKinds, ['armor', 'dexterityModifier'], 'Dexterity modifier'),
    ];
}

function rating(
    documentKinds: ReadonlySet<string>,
    dataKey: string,
    label: string,
    maximum: number
): ResourceBinding {
    return {
        key: `resource:${pathCoordinate([dataKey])}`,
        kind: 'resource',
        label,
        documentKinds,
        resourceId: pathCoordinate([dataKey]),
        dataKey,
        mode: 'rating',
        maximum,
        coordinate: pathCoordinate([dataKey]),
    };
}

function column(
    key: string,
    label: string,
    translation: { id: string; message: string },
    extra: Partial<RowsColumn> = {}
): RowsColumn {
    return { key, label, translation, type: 'text', ...extra };
}

function attacksRows(
    documentKinds: ReadonlySet<string>,
    dataKey: string,
    maxRows: number,
    options: { arc?: boolean; label: string; catalog?: RowsBinding['catalog'] }
): RowsBinding {
    return {
        key: `rows:${dataKey}`,
        kind: 'rows',
        label: options.label,
        documentKinds,
        dataKey,
        coordinate: dataKey,
        maxRows,
        columns: [
            column('name', 'Name', fields.name),
            ...(options.arc
                ? [column('arc', 'Arc', fields.arc, { type: 'enum', options: ARC_OPTIONS })]
                : [
                      column('type', 'Type', fields.attackType, {
                          type: 'enum',
                          options: ATTACK_TYPE_OPTIONS,
                      }),
                  ]),
            column('damage', 'Damage', fields.damage),
            column('range', 'Range', fields.range),
        ],
        ...(options.catalog ? { catalog: options.catalog } : {}),
    };
}

function abilitiesList(documentKinds: ReadonlySet<string>): DocumentBindingDescriptor {
    return {
        key: 'list:abilities',
        kind: 'list',
        label: 'Abilities',
        documentKinds,
        listId: 'abilities',
        dataKey: 'abilities',
        entryShape: 'trait',
        coordinate: 'abilities',
    };
}

function willpowerPool(documentKinds: ReadonlySet<string>): ResourceBinding {
    return {
        key: 'resource:willpower',
        kind: 'resource',
        label: 'Willpower',
        documentKinds,
        resourceId: 'willpower',
        dataKey: 'willpower',
        mode: 'pool',
        maximum: 10,
        coordinate: 'willpower',
        currentRaisesMax: true,
    };
}

const baseTracks = buildWodTrackBindings(starWarsWodProfile, {
    health: {
        dataKey: 'members',
        documentKinds: new Set(['creature', 'group']),
        levelTranslations: fields.healthLevels,
    },
    'vehicle-damage': {
        dataKey: 'members',
        documentKinds: VEHICLE,
        levelTranslations: fields.damageLevels,
    },
});

const healthTrack = baseTracks.find(({ trackId }) => trackId === 'health')!;
const damageTrack = baseTracks.find(({ trackId }) => trackId === 'vehicle-damage')!;

const levelsById = (ids: readonly string[]): TrackLevel[] =>
    ids.map((id) => healthTrack.levels.find((level) => level.id === id)!);

/** Fodder health variants (Building Encounters: typical 3, tough 5; conversion sheet 7). */
export const FODDER_TRACK_VARIANTS: Readonly<Record<number, readonly TrackLevel[]>> = {
    3: levelsById(['hurt', 'injured', 'incapacitated']),
    5: levelsById(['bruised', 'hurt', 'injured', 'wounded', 'incapacitated']),
    7: healthTrack.levels,
};

const memberTracks: TrackBinding[] = [
    {
        ...healthTrack,
        key: 'track:members-health',
        documentKinds: CREATURE,
        members: { trackKey: 'health', maxMembers: 24 },
    },
    {
        ...healthTrack,
        key: 'track:members-health',
        documentKinds: GROUP,
        members: { trackKey: 'health', maxMembers: 12 },
        variants: { lengthPath: ['trackLength'], levelsByLength: FODDER_TRACK_VARIANTS },
    },
    {
        ...damageTrack,
        key: 'track:members-damage',
        documentKinds: VEHICLE,
        members: { trackKey: 'damage', maxMembers: 24 },
    },
];

const creatureTraits = buildWodTraitBindings(starWarsWodProfile, {
    documentKinds: CREATURE,
    recordFor: ({ id }) => (id === 'physical' || id === 'mental' ? 'attributes' : undefined),
    defaultValueFor: () => 1,
});

const fodderTraits = buildWodTraitBindings(starWarsWodProfile, {
    documentKinds: GROUP,
    recordFor: ({ role }) => (role === 'attribute' ? 'attributes' : undefined),
    defaultValueFor: () => 1,
}).filter(({ key }) => !key.startsWith('trait:vehicle-systems:'));

const creatureBindings: DocumentBindingDescriptor[] = [
    textField(CREATURE, ['name'], 'Name', { syncsTitle: true }),
    textField(CREATURE, ['species'], 'Species'),
    textField(CREATURE, ['type'], 'Type', { coordinate: 'creature-type' }),
    scaleField(CREATURE),
    textField(CREATURE, ['size'], 'Size'),
    textField(CREATURE, ['owner'], 'Owner'),
    textField(CREATURE, ['notes'], 'Notes'),
    ...creatureTraits,
    abilitiesList(CREATURE),
    willpowerPool(CREATURE),
    ...armorFields(CREATURE),
    attacksRows(CREATURE, 'attacks', 50, { label: 'Attacks' }),
];

const VEHICLE_TEXT: ReadonlyArray<[key: string, label: string]> = [
    ['model', 'Model'],
    ['owner', 'Owner'],
    ['crew', 'Crew'],
    ['length', 'Length'],
    ['cargoCapacity', 'Cargo capacity'],
    ['passengers', 'Passengers'],
    ['consumables', 'Consumables'],
    ['speed', 'Speed'],
    ['altitude', 'Altitude'],
    ['sensorRange', 'Sensor range'],
    ['navigationComputer', 'Navigation computer'],
    ['notes', 'Notes'],
];

const VEHICLE_SYSTEMS: ReadonlyArray<[key: string, label: string]> = [
    ['durability', 'Durability'],
    ['maneuverability', 'Maneuverability'],
    ['communicationsSensors', 'Communications / Sensors'],
    ['hyperdrive', 'Hyperdrive'],
    ['shields', 'Shields'],
    ['frontShields', 'Front shields'],
    ['rearShields', 'Rear shields'],
];

const vehicleBindings: DocumentBindingDescriptor[] = [
    textField(VEHICLE, ['name'], 'Name', { syncsTitle: true }),
    scaleField(VEHICLE),
    ...VEHICLE_TEXT.map(([key, label]) => textField(VEHICLE, [key], label)),
    ...VEHICLE_SYSTEMS.map(([key, label]) => rating(VEHICLE, key, label, 5)),
    {
        key: 'rows:configuration',
        kind: 'rows',
        label: 'Configuration',
        documentKinds: VEHICLE,
        dataKey: 'configuration',
        coordinate: 'configuration',
        maxRows: 20,
        columns: [column('label', 'Label', fields.label)],
    } satisfies RowsBinding,
    attacksRows(VEHICLE, 'weapons', 50, { label: 'Weapons', arc: true }),
];

const groupBindings: DocumentBindingDescriptor[] = [
    textField(GROUP, ['concept'], 'Concept', { syncsTitle: true }),
    textField(GROUP, ['notes'], 'Notes'),
    ...fodderTraits,
    abilitiesList(GROUP),
    rating(GROUP, 'willpower', 'Willpower', 10),
    ...armorFields(GROUP),
    attacksRows(GROUP, 'weapons', 10, {
        label: 'Weapons',
        catalog: {
            catalogIds: ['ranged-weapons', 'melee-weapons'],
            column: 'name',
            fills: { name: 'name', damage: 'damage', range: 'range' },
        },
    }),
];

export const starWarsEntityBindings: readonly DocumentBindingDescriptor[] = [
    ...creatureBindings,
    ...vehicleBindings,
    ...groupBindings,
    ...memberTracks,
];
