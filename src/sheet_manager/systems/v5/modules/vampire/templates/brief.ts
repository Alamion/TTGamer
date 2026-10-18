import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { dense, group, list } from '../../../../../templates/builders';
import { SystemIdSchema } from '../../../../../types/document';
import { type CustomTemplate, TEMPLATE_SCHEMA_VERSION } from '../../../../../types/template';
import { memberOfBriefGroup } from '../../../core/group';
import {
    compactTraitsGroup,
    equipmentGroup,
    tracked,
    trackGroup,
} from '../../../ruleset/templateParts';
import { VAMPIRE_KIND, vampireBloodGroup, vampireIdentityGroup } from './sheet';

const v5 = uiMessages.sheet.v5;
const vampire = uiMessages.sheet.v5Vampire;

/**
 * At-the-table view (spec 037, US4): who, how hungry and how hurt, what to roll, and the
 * disciplines with their dots (a discipline's die rolls with Hunger as on the full sheet).
 */
export const vampireBriefTemplate: CustomTemplate = {
    id: 'v5-vampire-brief',
    name: 'Vampire: the Masquerade 5e — Brief',
    systemId: SystemIdSchema.parse('wod-v5'),
    documentKind: VAMPIRE_KIND,
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    children: [
        dense(vampireIdentityGroup({ compact: true })),
        dense(
            group(
                'condition',
                v5.sections.condition.message,
                [
                    ...[
                        ...trackGroup('health', { compact: true }).children,
                        ...trackGroup('willpower', { compact: true }).children.map(tracked),
                    ].map((node) => ({ ...node, column: 1 })),
                    ...vampireBloodGroup({ compact: true }).children.map((node) => ({
                        ...node,
                        column: 2,
                    })),
                ],
                { columns: 2, labelMessage: v5.sections.condition }
            )
        ),
        compactTraitsGroup('attributes'),
        compactTraitsGroup('skills', { collapsible: true }),
        dense(
            group(
                'disciplines',
                vampire.sections.disciplines.message,
                [
                    list(
                        'disciplines-list',
                        { bindingKey: 'list:disciplines' },
                        vampire.sections.disciplineList.message
                    ),
                ],
                { collapsible: true, labelMessage: vampire.sections.disciplines }
            )
        ),
        dense(equipmentGroup('weapons'), { collapsed: true }),
        memberOfBriefGroup(),
    ],
};
