import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { dense, group } from '../../../../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../../../../types/document';
import { type CustomTemplate, TEMPLATE_SCHEMA_VERSION } from '../../../../../types/template';
import { memberOfBriefGroup } from '../../../core/group';
import {
    compactTraitsGroup,
    equipmentGroup,
    tracked,
    trackGroup,
} from '../../../ruleset/templateParts';
import { hunterCellGroup, hunterEdgesGroup, hunterIdentityGroup } from './sheet';

const v5 = uiMessages.sheet.v5;

/**
 * At-the-table view: no sections, only the groups glanced at during a scene — who, how hurt,
 * what to roll, and what the hunter can pull out.
 */
export const hunterBriefTemplate: CustomTemplate = {
    id: 'v5-hunter-brief',
    name: 'Hunter: the Reckoning 5e — Brief',
    systemId: SystemIdSchema.parse('wod-v5'),
    documentKind: DocumentKindSchema.parse('character'),
    pageKind: 'brief',
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    children: [
        dense(hunterIdentityGroup({ compact: true })),
        dense(
            group(
                'condition',
                v5.sections.condition.message,
                [
                    ...[
                        ...trackGroup('health', { compact: true }).children,
                        ...trackGroup('willpower', { compact: true }).children.map(tracked),
                    ].map((node) => ({ ...node, column: 1 })),
                    ...hunterCellGroup({ compact: true }).children.map((node) => ({
                        ...node,
                        column: 2,
                    })),
                ],
                { columns: 2, labelMessage: v5.sections.condition }
            )
        ),
        compactTraitsGroup('attributes'),
        compactTraitsGroup('skills', { collapsible: true }),
        dense(hunterEdgesGroup()),
        dense(equipmentGroup('weapons'), { collapsed: true }),
        memberOfBriefGroup(),
    ],
};
