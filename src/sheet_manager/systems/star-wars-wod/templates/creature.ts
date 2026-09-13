import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import {
    formula,
    group,
    list,
    primitive,
    section,
    select,
    text,
} from '../../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import type { CustomTemplate, TemplateField } from '../../../types/template';
import { TEMPLATE_SCHEMA_VERSION } from '../../../types/template';
import { dotsTrait, traitCoordinate } from '../../wod-like/templateBuilders';
import { DOCS } from './docs';

/**
 * Creature pages (conversion book creature sheet + what the conversion steps and bestiary use):
 * identity with bestiary fill, physical/mental attributes, abilities, merits & flaws, combat
 * with tier-dependent soak, one health track per pack member, and collapsed details.
 */

const fields = uiMessages.sheet.documents.fields;
const defaults = uiMessages.sheet.templates.defaults;
const entities = uiMessages.sheet.templates.entities;

const SYSTEM_ID = SystemIdSchema.parse('star-wars-wod');
const KIND = DocumentKindSchema.parse('creature');

export const CREATURE_PHYSICAL = ['Strength', 'Dexterity', 'Stamina'] as const;
export const CREATURE_MENTAL = ['Perception', 'Intelligence', 'Wits'] as const;

const SOAK = 'stamina + armor-armor-rating';
const NOT_FODDER = { coordinate: 'threat-tier', equals: 'fodder', not: true } as const;
const FODDER = { coordinate: 'threat-tier', equals: 'fodder' } as const;

const trait = (key: string, compact = false) =>
    dotsTrait(key, { compact, labelMessage: `catalog:attributes/${traitCoordinate(key)}` });

/** Bestiary pick: overwrites every mapped creature value (contracts/catalog-fill.md). */
function speciesCatalog(): TemplateField {
    const fills: Record<string, string> = {
        name: 'species',
        type: 'creature-type',
        scale: 'scale',
        size: 'size',
        willpower: 'willpower',
        abilities: 'abilities',
        armorName: 'armor-name',
        armorRating: 'armor-armor-rating',
        attacks: 'attacks',
        movement: 'movement',
        merits: 'creature-merits',
        flaws: 'creature-flaws',
        description: 'description',
        source: 'source',
    };
    for (const key of [...CREATURE_PHYSICAL, ...CREATURE_MENTAL]) {
        fills[traitCoordinate(key)] = traitCoordinate(key);
    }
    return select(
        'species-catalog',
        'Bestiary entry',
        'species-catalog',
        [{ id: 'custom', label: 'Custom' }],
        {
            labelMessage: entities.speciesCatalog,
            binding: {
                catalogId: 'creatures',
                fills: Object.fromEntries(
                    Object.entries(fills).map(([detail, target]) => [
                        detail,
                        { targetFieldId: target },
                    ])
                ),
            },
        }
    );
}

function threatTier(compact = false): TemplateField {
    return select(
        'threat-tier',
        'Threat tier',
        'threat-tier',
        [
            { id: 'named', label: 'Named', labelMessage: entities.tierNamed },
            { id: 'fodder', label: 'Fodder', labelMessage: entities.tierFodder },
        ],
        { labelMessage: entities.threatTier, compact }
    );
}

function soakRows(compact = false): TemplateField[] {
    return [
        formula('soak-all', 'Soak (lethal and bashing)', SOAK, {
            labelMessage: entities.soakAll,
            visibleWhen: NOT_FODDER,
            compact,
        }),
        formula('soak-bashing', 'Soak (bashing only)', SOAK, {
            labelMessage: entities.soakBashingOnly,
            visibleWhen: FODDER,
            compact,
        }),
    ];
}

function creatureSheet(): CustomTemplate {
    return {
        id: 'creature-sheet',
        name: 'Creature sheet',
        systemId: SYSTEM_ID,
        documentKind: KIND,
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            section(
                'identity',
                'Identity',
                DOCS.creatureIdentity,
                [
                    group(
                        'creature-identity',
                        'Identity',
                        [
                            speciesCatalog(),
                            text('field-name', 'Name', 'name', { labelMessage: fields.name }),
                            text('field-species', 'Species', 'species', {
                                labelMessage: fields.species,
                            }),
                            text('field-type', 'Type', 'creature-type', {
                                labelMessage: fields.type,
                            }),
                            primitive('field-scale', 'field:scale', {
                                label: 'Scale',
                                labelMessage: fields.scale,
                            }),
                            text('field-size', 'Size', 'size', { labelMessage: fields.size }),
                            text('field-movement', 'Movement', 'movement', {
                                labelMessage: entities.movement,
                            }),
                            threatTier(),
                            text('field-owner', 'Owner', 'owner', { labelMessage: fields.owner }),
                        ],
                        { columns: 3, hideTitle: true, labelMessage: fields.identity }
                    ),
                ],
                { labelMessage: fields.identity }
            ),
            section(
                'attributes',
                'Attributes',
                DOCS.attributes,
                [
                    group(
                        'attributes-physical',
                        'Physical',
                        CREATURE_PHYSICAL.map((key) => trait(key)),
                        { labelMessage: defaults.physical }
                    ),
                    group(
                        'attributes-mental',
                        'Mental',
                        CREATURE_MENTAL.map((key) => trait(key)),
                        { labelMessage: defaults.mental }
                    ),
                ],
                { columns: 2, labelMessage: fields.attributes }
            ),
            section(
                'abilities',
                'Abilities',
                DOCS.creatureAbilities,
                [
                    list('list-abilities', { bindingKey: 'list:abilities' }, 'Abilities', {
                        columns: 2,
                        labelMessage: fields.abilities,
                    }),
                ],
                { labelMessage: fields.abilities }
            ),
            section(
                'advantages',
                'Merits & Flaws',
                DOCS.creatureMerits,
                [
                    group(
                        'creature-merits-group',
                        'Merits',
                        [
                            list('list-merits', { valueKey: 'creature-merits' }, 'Merits', {
                                labelMessage: fields.merits,
                            }),
                        ],
                        { labelMessage: fields.merits }
                    ),
                    group(
                        'creature-flaws-group',
                        'Flaws',
                        [
                            list('list-flaws', { valueKey: 'creature-flaws' }, 'Flaws', {
                                labelMessage: fields.flaws,
                            }),
                        ],
                        { labelMessage: fields.flaws }
                    ),
                ],
                { columns: 2, labelMessage: fields.meritsAndFlaws }
            ),
            section(
                'combat',
                'Combat',
                DOCS.creatureCombat,
                [
                    group(
                        'creature-resolve',
                        'Resolve',
                        [
                            primitive('resource-willpower', 'resource:willpower', {
                                label: 'Willpower',
                                labelMessage: fields.willpower,
                            }),
                            ...soakRows(),
                        ],
                        { column: 1, labelMessage: defaults.resolve }
                    ),
                    group(
                        'creature-armor',
                        'Armor',
                        [
                            text('field-armor-name', 'Armor', 'armor-name', {
                                labelMessage: fields.armorType,
                            }),
                            text('field-armor-rating', 'Armor rating', 'armor-armor-rating', {
                                labelMessage: fields.armorRating,
                            }),
                            text(
                                'field-armor-dexterity',
                                'Dexterity modifier',
                                'armor-dexterity-modifier',
                                { labelMessage: fields.dexterityModifier }
                            ),
                        ],
                        { column: 1, columns: 3, labelMessage: fields.armor }
                    ),
                    group(
                        'creature-attacks',
                        'Attacks',
                        [
                            primitive('rows-attacks', 'rows:attacks', {
                                hideLabel: true,
                                label: 'Attacks',
                                labelMessage: fields.attacks,
                            }),
                        ],
                        { column: 2, labelMessage: fields.attacks, docsPath: DOCS.combatScales }
                    ),
                ],
                { columns: 2, labelMessage: fields.combat }
            ),
            section(
                'health',
                'Health',
                DOCS.health,
                [
                    primitive('damage-track', 'track:members-health', {
                        hideLabel: true,
                        label: 'Health',
                        labelMessage: fields.health,
                        maxMembers: 24,
                    }),
                ],
                { labelMessage: fields.health }
            ),
            section(
                'details',
                'Details',
                DOCS.bestiary,
                [
                    text('field-description', 'Description', 'description', {
                        multiline: true,
                        labelMessage: entities.descriptionLabel,
                    }),
                    text('field-source', 'Source', 'source', { labelMessage: entities.source }),
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

/** Encounter card: pools, soak, attacks, and the pack's tracks. */
function creatureBrief(): CustomTemplate {
    return {
        id: 'creature-brief',
        name: 'Creature brief',
        systemId: SYSTEM_ID,
        documentKind: KIND,
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            group(
                'brief-identity',
                'Identity',
                [
                    text('field-name', 'Name', 'name', {
                        compact: true,
                        labelMessage: fields.name,
                    }),
                    text('field-species', 'Species', 'species', {
                        compact: true,
                        labelMessage: fields.species,
                    }),
                    primitive('field-scale', 'field:scale', {
                        compact: true,
                        label: 'Scale',
                        labelMessage: fields.scale,
                    }),
                    threatTier(true),
                ],
                { columns: 4, hideTitle: true, labelMessage: fields.identity }
            ),
            group(
                'brief-pools',
                'Pools',
                [
                    ...CREATURE_PHYSICAL.map((key) => ({ ...trait(key, true), column: 1 })),
                    ...CREATURE_MENTAL.map((key) => ({ ...trait(key, true), column: 2 })),
                    primitive('resource-willpower', 'resource:willpower', {
                        compact: true,
                        column: 3,
                        label: 'Willpower',
                        labelMessage: fields.willpower,
                    }),
                    ...soakRows(true).map((row) => ({ ...row, column: 3 })),
                ],
                { columns: 3, labelMessage: entities.pools }
            ),
            group(
                'brief-attacks',
                'Attacks',
                [
                    primitive('rows-attacks', 'rows:attacks', {
                        compact: true,
                        label: 'Attacks',
                        labelMessage: fields.attacks,
                    }),
                ],
                { labelMessage: fields.attacks }
            ),
            group(
                'brief-health',
                'Health',
                [
                    primitive('damage-track', 'track:members-health', {
                        compact: true,
                        label: 'Health',
                        labelMessage: fields.health,
                        maxMembers: 24,
                    }),
                ],
                { hideTitle: true, labelMessage: fields.health }
            ),
        ],
    };
}

export const starWarsCreatureTemplates: readonly CustomTemplate[] = [
    creatureSheet(),
    creatureBrief(),
];
