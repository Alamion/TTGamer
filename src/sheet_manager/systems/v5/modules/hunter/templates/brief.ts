import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { group } from '../../../../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../../../../types/document';
import { type CustomTemplate, TEMPLATE_SCHEMA_VERSION } from '../../../../../types/template';
import { compactTraitsGroup, equipmentGroup, trackGroup } from '../../../ruleset/templateParts';
import { hunterCellGroup, hunterEdgesGroup, hunterIdentityGroup } from './sheet';

const v5 = uiMessages.sheet.v5;

/**
 * At-the-table view: no sections, only the groups glanced at during a scene — who, how hurt,
 * what to roll, and what the hunter can pull out.
 */
export const hunterBriefTemplate: CustomTemplate = {
    id: 'v5-hunter-brief',
    name: 'Hunter: the Reckoning 5e — Brief',
    systemId: SystemIdSchema.parse('v5'),
    documentKind: DocumentKindSchema.parse('character'),
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    children: [
        hunterIdentityGroup({ compact: true }),
        group(
            'condition',
            v5.sections.condition.message,
            [
                ...[
                    ...trackGroup('health', { compact: true }).children,
                    ...trackGroup('willpower', { compact: true }).children,
                ].map((node) => ({ ...node, column: 1 })),
                ...hunterCellGroup({ compact: true }).children.map((node) => ({
                    ...node,
                    column: 2,
                })),
            ],
            { columns: 2, labelMessage: v5.sections.condition }
        ),
        compactTraitsGroup('attributes'),
        compactTraitsGroup('skills', { collapsible: true }),
        hunterEdgesGroup(),
        equipmentGroup('weapons'),
    ],
};
