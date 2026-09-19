import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { group, primitive, section, toggle } from '../../../../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../../../../types/document';
import {
    type CustomTemplate,
    type GroupNode,
    type SectionNode,
    TEMPLATE_SCHEMA_VERSION,
} from '../../../../../types/template';
import {
    advantagesSection,
    attributesSection,
    biographyGroup,
    chronicleGroup,
    equipmentSection,
    otherSection,
    portraitGroup,
    skillsSection,
    touchstonesGroup,
    trackGroup,
    v5Text,
} from '../../../ruleset/templateParts';

/**
 * Hunter pages built for the screen rather than copied from the printed sheet: what is touched
 * most during play comes first, sections gather related field groups, and rarely edited groups
 * (portrait, biography, chronicle) collapse.
 */

const v5 = uiMessages.sheet.v5;
const hunter = uiMessages.sheet.v5Hunter;

export const HUNTER_DOCS = {
    creedDrive: '/docs/wod-v5/hunter/first-hunter/creed-drive',
    cell: '/docs/wod-v5/hunter/reference/desperation-danger-despair',
    edges: '/docs/wod-v5/hunter/first-hunter/edges-perks',
    advantages: '/docs/wod-v5/hunter/reference/advantages-flaws',
    equipment: '/docs/wod-v5/hunter/reference/weapons-gear',
    aims: '/docs/wod-v5/hunter/first-hunter/concept-ambition-desire',
    touchstones: '/docs/wod-v5/hunter/first-hunter/touchstones',
} as const;

/** Name, Concept, Creed, and Drive. */
export function hunterIdentityGroup(options: { compact?: boolean; column?: number } = {}) {
    const compact = options.compact ?? false;
    return group(
        'identity',
        v5.sections.identity.message,
        [
            v5Text('name', 'name', v5.fields.name, { compact }),
            v5Text('concept', 'concept', hunter.fields.concept, { compact }),
            v5Text('creed', 'creed', hunter.fields.creed, { compact }),
            v5Text('drive', 'drive', hunter.fields.drive, { compact }),
        ],
        {
            ...(options.column ? { column: options.column } : {}),
            columns: compact ? 4 : 2,
            hideTitle: true,
            docsPath: HUNTER_DOCS.creedDrive,
            labelMessage: v5.sections.identity,
        }
    );
}

/** Despair, Desperation, and Danger: the hunter's and the cell's state. */
export function hunterCellGroup(options: { compact?: boolean; column?: number } = {}): GroupNode {
    const compact = options.compact ?? false;
    return group(
        'cell',
        hunter.sections.cell.message,
        [
            toggle('despair-field', hunter.fields.despair.message, 'despair', {
                labelMessage: hunter.fields.despair,
                compact,
            }),
            primitive('desperation', 'resource:desperation', {
                label: hunter.fields.desperation.message,
                labelMessage: hunter.fields.desperation,
                compact,
            }),
            primitive('danger', 'resource:danger', {
                label: hunter.fields.danger.message,
                labelMessage: hunter.fields.danger,
                compact,
            }),
        ],
        {
            ...(options.column ? { column: options.column } : {}),
            hideTitle: compact,
            docsPath: HUNTER_DOCS.cell,
            labelMessage: hunter.sections.cell,
        }
    );
}

function hunterSection(): SectionNode {
    return section(
        'hunter',
        hunter.sections.hunter.message,
        undefined,
        [portraitGroup(1), hunterIdentityGroup({ column: 2 }), biographyGroup(2)],
        { columns: 2, columnWidths: [1, 2], labelMessage: hunter.sections.hunter }
    );
}

/** Health, Willpower, and the cell: everything that changes scene to scene. */
export function hunterConditionSection(): SectionNode {
    return section(
        'condition',
        v5.sections.condition.message,
        undefined,
        [
            trackGroup('health', { column: 1 }),
            trackGroup('willpower', { column: 2 }),
            hunterCellGroup({ column: 3 }),
        ],
        { columns: 3, labelMessage: v5.sections.condition }
    );
}

function tableGroup(
    id: 'edge-list' | 'perk-list',
    bindingKey: string,
    title: { id: string; message: string },
    options: { compact?: boolean; column?: number }
) {
    return group(
        id,
        title.message,
        [
            primitive(`${id}-table`, bindingKey, {
                label: title.message,
                labelMessage: title,
                hideLabel: true,
                compact: options.compact ?? false,
            }),
        ],
        { ...(options.column ? { column: options.column } : {}), labelMessage: title }
    );
}

export function hunterEdgesSection(): SectionNode {
    return section(
        'edges',
        hunter.sections.edges.message,
        HUNTER_DOCS.edges,
        [
            tableGroup('edge-list', 'rows:edges', hunter.sections.edgeList, { column: 1 }),
            tableGroup('perk-list', 'rows:perks', hunter.fields.perks, { column: 2 }),
        ],
        { columns: 2, labelMessage: hunter.sections.edges }
    );
}

/** Edges and Perks as one brief-view group. */
export function hunterEdgesGroup(): GroupNode {
    return group(
        'edges',
        hunter.sections.edges.message,
        [
            primitive('edge-list-table', 'rows:edges', {
                label: hunter.sections.edgeList.message,
                labelMessage: hunter.sections.edgeList,
                compact: true,
                column: 1,
            }),
            primitive('perk-list-table', 'rows:perks', {
                label: hunter.fields.perks.message,
                labelMessage: hunter.fields.perks,
                compact: true,
                column: 2,
            }),
        ],
        { columns: 2, collapsible: true, labelMessage: hunter.sections.edges }
    );
}

/** Why the hunter hunts and what holds them together. */
function hunterPurposeSection(): SectionNode {
    return section(
        'purpose',
        hunter.sections.purpose.message,
        undefined,
        [
            group(
                'aims',
                hunter.sections.aims.message,
                [
                    v5Text('ambition', 'ambition', hunter.fields.ambition, { multiline: true }),
                    v5Text('desire', 'desire', hunter.fields.desire, { multiline: true }),
                ],
                { column: 1, docsPath: HUNTER_DOCS.aims, labelMessage: hunter.sections.aims }
            ),
            group(
                'creed-drive',
                hunter.sections.creedDrive.message,
                [
                    v5Text('redemption', 'redemption', hunter.fields.redemption, {
                        multiline: true,
                    }),
                    v5Text('creed-fields', 'creed-fields', hunter.fields.creedFields, {
                        multiline: true,
                    }),
                ],
                {
                    column: 1,
                    docsPath: HUNTER_DOCS.creedDrive,
                    labelMessage: hunter.sections.creedDrive,
                }
            ),
            { ...touchstonesGroup(2), docsPath: HUNTER_DOCS.touchstones },
            chronicleGroup(2),
        ],
        { columns: 2, labelMessage: hunter.sections.purpose }
    );
}

/** Full hunter page. */
export const hunterSheetTemplate: CustomTemplate = {
    id: 'v5-hunter-sheet',
    name: 'Hunter: the Reckoning 5e — Full sheet',
    systemId: SystemIdSchema.parse('wod-v5'),
    documentKind: DocumentKindSchema.parse('character'),
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    children: [
        hunterSection(),
        hunterConditionSection(),
        attributesSection(),
        skillsSection(),
        hunterEdgesSection(),
        hunterPurposeSection(),
        { ...advantagesSection(), docsPath: HUNTER_DOCS.advantages },
        { ...equipmentSection(), docsPath: HUNTER_DOCS.equipment },
        otherSection(),
    ],
};
