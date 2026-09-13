import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import {
    group,
    primitive,
    reference,
    section,
    select,
    table,
    text,
    toggle,
} from '../../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import type { CustomTemplate, TemplateField, TemplateNode } from '../../../types/template';
import { TEMPLATE_SCHEMA_VERSION } from '../../../types/template';
import { DOCS } from './docs';

/**
 * Vehicle pages (conversion book vehicle sheet): identification with catalog-model fill, crew
 * and capacity, systems with per-slot damage, weapons with arcs, crew stations linked to
 * characters, one damage track per squadron member, modifications, and details.
 */

const fields = uiMessages.sheet.documents.fields;
const entities = uiMessages.sheet.templates.entities;

const SYSTEM_ID = SystemIdSchema.parse('star-wars-wod');
const KIND = DocumentKindSchema.parse('vehicle');
const CREW_KINDS = ['character'] as const;

type Message = { id: string; message: string };

const SYSTEM_RATINGS: ReadonlyArray<[coordinate: string, label: string, message: Message]> = [
    ['maneuverability', 'Maneuverability', fields.maneuverability],
    ['durability', 'Durability', fields.durability],
    ['communications-sensors', 'Communications / Sensors', fields.communicationsSensors],
    ['hyperdrive', 'Hyperdrive', fields.hyperdrive],
    ['shields', 'Shields', fields.shields],
    ['front-shields', 'Front shields', fields.frontShields],
    ['rear-shields', 'Rear shields', fields.rearShields],
];

const CATALOG_FILLS: Readonly<Record<string, string>> = {
    model: 'model',
    scale: 'scale',
    category: 'category',
    crew: 'crew',
    passengers: 'passengers',
    cargo: 'cargo-capacity',
    consumables: 'consumables',
    length: 'length',
    maneuverability: 'maneuverability',
    durability: 'durability',
    durabilityReroll: 'durability-reroll',
    speed: 'speed',
    altitude: 'altitude',
    hyperdrive: 'hyperdrive',
    navComputer: 'navigation-computer',
    commSensors: 'communications-sensors',
    sensorRange: 'sensor-range',
    shields: 'shields',
    weapons: 'weapons',
    description: 'description',
};

function modelCatalog(): TemplateField {
    return select(
        'model-catalog',
        'Catalog model',
        'model-catalog',
        [{ id: 'custom', label: 'Custom' }],
        {
            labelMessage: entities.modelCatalog,
            binding: {
                catalogId: 'vehicles',
                fills: Object.fromEntries(
                    Object.entries(CATALOG_FILLS).map(([detail, target]) => [
                        detail,
                        { targetFieldId: target },
                    ])
                ),
            },
        }
    );
}

/** Table columns store inside their row: no coordinate of their own. */
function column(field: TemplateField): TemplateField {
    const rest = { ...field };
    delete rest.valueKey;
    return rest;
}

const textAt = (key: string, label: string, message: Message, compact = false) =>
    text(`field-${key}`, label, key, { labelMessage: message, compact });

function rating(coordinate: string, label: string, message: Message, compact = false) {
    return primitive(`resource-${coordinate}`, `resource:${coordinate}`, {
        label,
        labelMessage: message,
        compact,
    });
}

function crewStations(): TemplateNode[] {
    const station = (key: string, label: string, message: Message, multiple = false) =>
        reference(`crew-${key}`, label, `crew-${key}`, CREW_KINDS, {
            labelMessage: message,
            multiple,
        });
    return [
        station('pilot', 'Pilot', entities.pilot),
        station('copilot', 'Co-pilot', entities.copilot),
        station('gunners', 'Gunners', entities.gunners, true),
        station('engineer', 'Engineer', entities.engineer),
        station('sensors', 'Sensors', entities.sensors),
        station('comms', 'Comms', entities.comms),
    ];
}

function damageTrack(compact = false) {
    return primitive('damage-track', 'track:members-damage', {
        compact,
        hideLabel: !compact,
        label: 'Damage',
        labelMessage: fields.damage,
        maxMembers: 24,
    });
}

function vehicleSheet(): CustomTemplate {
    return {
        id: 'vehicle-sheet',
        name: 'Vehicle sheet',
        systemId: SYSTEM_ID,
        documentKind: KIND,
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            section(
                'identity',
                'Identification',
                DOCS.vehicleSheet,
                [
                    group(
                        'vehicle-identity',
                        'Identification',
                        [
                            modelCatalog(),
                            textAt('name', 'Name', fields.name),
                            textAt('model', 'Model', fields.model),
                            text('field-category', 'Category', 'category', {
                                labelMessage: entities.category,
                            }),
                            textAt('owner', 'Owner', fields.owner),
                            primitive('field-scale', 'field:scale', {
                                label: 'Scale',
                                labelMessage: fields.scale,
                            }),
                        ],
                        { columns: 3, hideTitle: true, labelMessage: entities.identification }
                    ),
                ],
                { labelMessage: entities.identification }
            ),
            section(
                'capacity',
                'Crew & capacity',
                DOCS.vehicleSheet,
                [
                    group(
                        'vehicle-capacity',
                        'Crew & capacity',
                        [
                            textAt('crew', 'Crew', fields.crew),
                            textAt('passengers', 'Passengers', fields.passengers),
                            textAt('cargo-capacity', 'Cargo capacity', fields.cargoCapacity),
                            textAt('consumables', 'Consumables', fields.consumables),
                            textAt('length', 'Length', fields.length),
                        ],
                        { columns: 3, hideTitle: true, labelMessage: entities.crewCapacity }
                    ),
                ],
                { labelMessage: entities.crewCapacity }
            ),
            section(
                'systems',
                'Systems',
                DOCS.vehicleAttributes,
                [
                    group(
                        'vehicle-ratings',
                        'Systems',
                        [
                            ...SYSTEM_RATINGS.map(([coordinate, label, message]) =>
                                rating(coordinate, label, message)
                            ),
                            toggle(
                                'field-durability-reroll',
                                'Reroll 10s on Durability',
                                'durability-reroll',
                                {
                                    labelMessage: entities.durabilityReroll,
                                }
                            ),
                        ],
                        { column: 1, labelMessage: fields.systems }
                    ),
                    group(
                        'vehicle-movement',
                        'Movement and navigation',
                        [
                            textAt('speed', 'Speed', fields.speed),
                            textAt('altitude', 'Altitude', fields.altitude),
                            textAt('sensor-range', 'Sensor range', fields.sensorRange),
                            textAt(
                                'navigation-computer',
                                'Navigation computer',
                                fields.navigationComputer
                            ),
                        ],
                        { column: 2, columns: 2, labelMessage: fields.movementAndNavigation }
                    ),
                    group(
                        'vehicle-system-slots',
                        'System slots',
                        [
                            table(
                                'vehicle-systems',
                                undefined,
                                'vehicle-systems',
                                [
                                    column(
                                        text('slot-system', 'System', 'slot-system', {
                                            labelMessage: entities.system,
                                        })
                                    ),
                                    column(
                                        toggle('slot-damaged', 'Damaged', 'slot-damaged', {
                                            labelMessage: entities.damaged,
                                        })
                                    ),
                                ],
                                { maxRows: 10 }
                            ),
                        ],
                        {
                            column: 2,
                            labelMessage: entities.systemSlots,
                            docsPath: DOCS.vehicleDamage,
                        }
                    ),
                    group(
                        'vehicle-configuration',
                        'Configuration',
                        [
                            primitive('rows-configuration', 'rows:configuration', {
                                hideLabel: true,
                                label: 'Configuration',
                                labelMessage: fields.configuration,
                            }),
                        ],
                        { column: 2, defaultCollapsed: true, labelMessage: fields.configuration }
                    ),
                ],
                { columns: 2, labelMessage: fields.systems }
            ),
            section(
                'weapons',
                'Weapons',
                DOCS.vehicleWeapons,
                [
                    primitive('rows-weapons', 'rows:weapons', {
                        hideLabel: true,
                        label: 'Weapons',
                        labelMessage: fields.weapons,
                    }),
                ],
                { labelMessage: fields.weapons }
            ),
            section(
                'crew-stations',
                'Crew stations',
                DOCS.crewRoles,
                [
                    group('vehicle-crew', 'Crew stations', crewStations(), {
                        columns: 3,
                        hideTitle: true,
                        labelMessage: entities.crewStations,
                    }),
                ],
                { labelMessage: entities.crewStations }
            ),
            section('damage', 'Damage', DOCS.vehicleDamage, [damageTrack()], {
                labelMessage: fields.damage,
            }),
            section(
                'modifications',
                'Modifications & quirks',
                DOCS.modifications,
                [
                    table(
                        'vehicle-modifications',
                        undefined,
                        'vehicle-modifications',
                        [
                            column(
                                text('modification-name', 'Modification', 'modification-name', {
                                    labelMessage: entities.modification,
                                })
                            ),
                            column(
                                text('modification-effect', 'Effect', 'modification-effect', {
                                    labelMessage: entities.effect,
                                })
                            ),
                            column(
                                toggle('modification-quirk', 'Quirk', 'modification-quirk', {
                                    labelMessage: entities.quirk,
                                })
                            ),
                        ],
                        { maxRows: 30 }
                    ),
                ],
                { defaultCollapsed: true, labelMessage: entities.modifications }
            ),
            section(
                'details',
                'Details',
                DOCS.vehicleCatalog,
                [
                    text('field-description', 'Description', 'description', {
                        multiline: true,
                        labelMessage: entities.descriptionLabel,
                    }),
                    text('field-notes', 'Notes', 'notes', {
                        multiline: true,
                        labelMessage: fields.notes,
                    }),
                ],
                { defaultCollapsed: true, labelMessage: entities.details }
            ),
        ],
    };
}

/** Encounter card: handling, defenses, guns, who is flying, and the squadron's damage. */
function vehicleBrief(): CustomTemplate {
    return {
        id: 'vehicle-brief',
        name: 'Vehicle brief',
        systemId: SYSTEM_ID,
        documentKind: KIND,
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            group(
                'brief-identity',
                'Identification',
                [
                    textAt('name', 'Name', fields.name, true),
                    textAt('model', 'Model', fields.model, true),
                    primitive('field-scale', 'field:scale', {
                        compact: true,
                        label: 'Scale',
                        labelMessage: fields.scale,
                    }),
                ],
                { columns: 3, hideTitle: true, labelMessage: entities.identification }
            ),
            group(
                'brief-systems',
                'Systems',
                [
                    ...SYSTEM_RATINGS.filter(([coordinate]) =>
                        ['maneuverability', 'durability', 'shields'].includes(coordinate)
                    ).map(([coordinate, label, message]) => ({
                        ...rating(coordinate, label, message, true),
                        column: 1,
                    })),
                    { ...textAt('speed', 'Speed', fields.speed, true), column: 2 },
                    { ...textAt('altitude', 'Altitude', fields.altitude, true), column: 2 },
                ],
                { columns: 2, labelMessage: fields.systems }
            ),
            group(
                'brief-weapons',
                'Weapons',
                [
                    primitive('rows-weapons', 'rows:weapons', {
                        compact: true,
                        label: 'Weapons',
                        labelMessage: fields.weapons,
                    }),
                ],
                { labelMessage: fields.weapons }
            ),
            group(
                'brief-crew',
                'Crew stations',
                crewStations().filter(
                    (node) => node.id === 'crew-pilot' || node.id === 'crew-gunners'
                ),
                { columns: 2, collapsible: true, labelMessage: entities.crewStations }
            ),
            group('brief-damage', 'Damage', [damageTrack(true)], {
                hideTitle: true,
                labelMessage: fields.damage,
            }),
        ],
    };
}

export const starWarsVehicleTemplates: readonly CustomTemplate[] = [vehicleSheet(), vehicleBrief()];
