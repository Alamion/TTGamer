import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import {
    formula,
    group,
    list,
    number,
    primitive,
    reference,
    section,
    select,
    text,
} from '../../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import type { CustomTemplate, TemplateField, TemplateNode } from '../../../types/template';
import { TEMPLATE_SCHEMA_VERSION } from '../../../types/template';
import { dotsTrait, traitCoordinate } from '../../wod-like/templateBuilders';
import { DOCS } from './docs';

/**
 * Fodder group pages (conversion book fodder sheet): shared statistics once, up to twelve
 * lettered members with a selectable health track (3/5/7), armor and weapons with catalog
 * suggestions, a bashing-only soak reminder, a leader link, and quick pools for mooks.
 */

const fields = uiMessages.sheet.documents.fields;
const defaults = uiMessages.sheet.templates.defaults;
const entities = uiMessages.sheet.templates.entities;

const SYSTEM_ID = SystemIdSchema.parse('star-wars-wod');
const KIND = DocumentKindSchema.parse('group');

const ATTRIBUTE_GROUPS = [
    {
        id: 'attributes-physical',
        title: 'Physical',
        message: defaults.physical,
        keys: ['Strength', 'Dexterity', 'Stamina'],
    },
    {
        id: 'attributes-social',
        title: 'Social',
        message: defaults.social,
        keys: ['Charisma', 'Manipulation', 'Appearance'],
    },
    {
        id: 'attributes-mental',
        title: 'Mental',
        message: defaults.mental,
        keys: ['Perception', 'Intelligence', 'Wits'],
    },
] as const;

const SOAK = 'stamina + armor-armor-rating';
const MAX_MEMBERS = 12;

const trait = (key: string, compact = false) =>
    dotsTrait(key, { compact, labelMessage: `catalog:attributes/${traitCoordinate(key)}` });

function armorCatalog(): TemplateField {
    return select(
        'armor-catalog',
        'Catalog armor',
        'armor-catalog',
        [{ id: 'custom', label: 'Custom' }],
        {
            labelMessage: entities.armorCatalog,
            binding: {
                catalogId: 'armor',
                fills: {
                    name: { targetFieldId: 'armor-name' },
                    ar: { targetFieldId: 'armor-armor-rating' },
                    dexPenalty: { targetFieldId: 'armor-dexterity-modifier' },
                },
            },
        }
    );
}

const soak = (compact = false) =>
    formula('soak-bashing', 'Soak (bashing only)', SOAK, {
        labelMessage: entities.soakBashingOnly,
        compact,
    });

const willpower = (compact = false) =>
    primitive('resource-willpower', 'resource:willpower', {
        compact,
        label: 'Willpower',
        labelMessage: fields.willpower,
    });

const leader = (compact = false) =>
    reference('field-leader', 'Leader', 'leader', ['character'], {
        labelMessage: entities.leader,
        compact,
    });

const membersTrack = (compact = false) =>
    primitive('damage-track', 'track:members-health', {
        compact,
        hideLabel: !compact,
        label: 'Members',
        labelMessage: fields.members,
        maxMembers: MAX_MEMBERS,
    });

const weapons = (compact = false) =>
    primitive('rows-weapons', 'rows:weapons', {
        compact,
        hideLabel: !compact,
        label: 'Weapons',
        labelMessage: fields.weapons,
    });

function fodderSheet(): CustomTemplate {
    return {
        id: 'fodder-sheet',
        name: 'Fodder group sheet',
        systemId: SYSTEM_ID,
        documentKind: KIND,
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            section(
                'identity',
                'Group',
                DOCS.fodder,
                [
                    group(
                        'fodder-identity',
                        'Group',
                        [
                            text('field-concept', 'Concept', 'concept', {
                                labelMessage: fields.concept,
                            }),
                            leader(),
                        ],
                        { columns: 2, hideTitle: true, labelMessage: entities.group }
                    ),
                ],
                { labelMessage: entities.group }
            ),
            section(
                'attributes',
                'Attributes',
                DOCS.attributes,
                ATTRIBUTE_GROUPS.map(({ id, title, message, keys }, index) =>
                    group(
                        id,
                        title,
                        keys.map((key) => trait(key)),
                        { column: index + 1, labelMessage: message }
                    )
                ),
                { columns: 3, labelMessage: fields.attributes }
            ),
            section(
                'abilities',
                'Abilities',
                DOCS.encounterTiers,
                [
                    group(
                        'fodder-abilities',
                        'Abilities',
                        [
                            list('list-abilities', { bindingKey: 'list:abilities' }, 'Abilities', {
                                columns: 2,
                                labelMessage: fields.abilities,
                            }),
                        ],
                        { column: 1, hideTitle: true, labelMessage: fields.abilities }
                    ),
                    group('fodder-willpower', 'Willpower', [willpower()], {
                        column: 2,
                        labelMessage: fields.willpower,
                    }),
                ],
                { columns: 2, columnWidths: [3, 1], labelMessage: fields.abilities }
            ),
            section(
                'combat',
                'Combat',
                DOCS.combatFlow,
                [
                    group(
                        'fodder-armor',
                        'Armor',
                        [
                            armorCatalog(),
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
                            soak(),
                        ],
                        { column: 1, labelMessage: fields.armor, docsPath: DOCS.armor }
                    ),
                    group('fodder-weapons', 'Weapons', [weapons()], {
                        column: 2,
                        labelMessage: fields.weapons,
                        docsPath: DOCS.weapons,
                    }),
                ],
                { columns: 2, columnWidths: [1, 2], labelMessage: fields.combat }
            ),
            section('members', 'Members', DOCS.health, [membersTrack()], {
                labelMessage: fields.members,
            }),
            section(
                'quick-pools',
                'Quick pools',
                DOCS.quickNpcRolls,
                [
                    group(
                        'fodder-quick-pools',
                        'Quick pools',
                        [
                            number(
                                'field-quick-pool-specialty',
                                'Specialty pool',
                                'quick-pool-specialty',
                                {
                                    max: 10,
                                    labelMessage: entities.specialtyPool,
                                }
                            ),
                            number(
                                'field-quick-pool-secondary',
                                'Secondary pool',
                                'quick-pool-secondary',
                                {
                                    max: 10,
                                    labelMessage: entities.secondaryPool,
                                }
                            ),
                        ],
                        { columns: 2, hideTitle: true, labelMessage: entities.quickPools }
                    ),
                ],
                { defaultCollapsed: true, labelMessage: entities.quickPools }
            ),
            section(
                'details',
                'Notes',
                undefined,
                [
                    text('field-notes', 'Notes', 'notes', {
                        multiline: true,
                        hideLabel: true,
                        labelMessage: fields.notes,
                    }),
                ],
                { defaultCollapsed: true, labelMessage: fields.notes }
            ),
        ],
    };
}

/** Encounter card: shared pools, soak, weapons, and every member's track. */
function fodderBrief(): CustomTemplate {
    return {
        id: 'fodder-brief',
        name: 'Fodder group brief',
        systemId: SYSTEM_ID,
        documentKind: KIND,
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            group(
                'brief-identity',
                'Group',
                [
                    text('field-concept', 'Concept', 'concept', {
                        compact: true,
                        labelMessage: fields.concept,
                    }),
                    leader(true),
                ],
                { columns: 2, hideTitle: true, labelMessage: entities.group }
            ),
            group(
                'brief-pools',
                'Pools',
                [
                    ...ATTRIBUTE_GROUPS.flatMap(({ keys }, index) =>
                        keys.map((key) => ({ ...trait(key, true), column: index + 1 }))
                    ),
                    { ...willpower(true), column: 1 },
                    { ...soak(true), column: 2 },
                ] as TemplateNode[],
                { columns: 3, labelMessage: entities.pools }
            ),
            group(
                'brief-abilities',
                'Abilities',
                [
                    list('list-abilities', { bindingKey: 'list:abilities' }, 'Abilities', {
                        columns: 2,
                        labelMessage: fields.abilities,
                    }),
                ],
                { collapsible: true, labelMessage: fields.abilities }
            ),
            group('brief-weapons', 'Weapons', [weapons(true)], {
                labelMessage: fields.weapons,
            }),
            group('brief-members', 'Members', [membersTrack(true)], {
                hideTitle: true,
                labelMessage: fields.members,
            }),
        ],
    };
}

export const starWarsFodderTemplates: readonly CustomTemplate[] = [fodderSheet(), fodderBrief()];
