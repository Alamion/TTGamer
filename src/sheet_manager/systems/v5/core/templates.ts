import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { group, section } from '../../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import { type CustomTemplate, TEMPLATE_SCHEMA_VERSION } from '../../../types/template';
import {
    advantagesSection,
    attributesSection,
    biographyGroup,
    chronicleGroup,
    compactTraitsGroup,
    equipmentGroup,
    equipmentSection,
    otherSection,
    portraitGroup,
    skillsSection,
    touchstonesGroup,
    trackGroup,
    v5Text,
} from '../ruleset/templateParts';

/**
 * The V5 engine character without a supernatural module (spec 012): the base a user setting on
 * the V5 ruleset re-labels and extends. Built only from ruleset parts.
 */

const v5 = uiMessages.sheet.v5;
const core = v5.core;

const identity = (compact = false) =>
    group(
        'identity',
        v5.sections.identity.message,
        [v5Text('name', 'name', v5.fields.name, { compact })],
        {
            hideTitle: true,
            labelMessage: v5.sections.identity,
        }
    );

function page(id: string, name: string, children: CustomTemplate['children']): CustomTemplate {
    return {
        id,
        name,
        systemId: SystemIdSchema.parse('wod-v5'),
        documentKind: DocumentKindSchema.parse('mortal'),
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children,
    };
}

export const v5CoreSheetTemplate = page('v5-core-sheet', 'Mortal — Full sheet', [
    section(
        'mortal',
        core.section.message,
        undefined,
        [portraitGroup(1), { ...identity(), column: 2 }, biographyGroup(2)],
        { columns: 2, columnWidths: [1, 2], labelMessage: core.section }
    ),
    section(
        'condition',
        v5.sections.condition.message,
        undefined,
        [trackGroup('health', { column: 1 }), trackGroup('willpower', { column: 2 })],
        { columns: 2, labelMessage: v5.sections.condition }
    ),
    attributesSection(),
    skillsSection(),
    section(
        'purpose',
        v5.sections.touchstones.message,
        undefined,
        [touchstonesGroup(1), chronicleGroup(2)],
        { columns: 2, labelMessage: v5.sections.touchstones }
    ),
    advantagesSection(),
    equipmentSection(),
    otherSection(),
]);

export const v5CoreBriefTemplate = page('v5-core-brief', 'Mortal — Brief', [
    identity(true),
    group(
        'condition',
        v5.sections.condition.message,
        [
            ...trackGroup('health', { compact: true }).children.map((node) => ({
                ...node,
                column: 1,
            })),
            ...trackGroup('willpower', { compact: true }).children.map((node) => ({
                ...node,
                column: 2,
            })),
        ],
        { columns: 2, labelMessage: v5.sections.condition }
    ),
    compactTraitsGroup('attributes'),
    compactTraitsGroup('skills', { collapsible: true }),
    equipmentGroup('weapons'),
]);
