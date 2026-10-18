import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { z } from 'zod';

import { dense, group, reference, section, text } from '../../../templates/builders';
import {
    DocumentDefinitionIdSchema,
    DocumentKindSchema,
    DocumentViewIdSchema,
    SystemIdSchema,
} from '../../../types/document';
import {
    type CustomTemplate,
    type GroupNode,
    type SectionNode,
    TEMPLATE_SCHEMA_VERSION,
    type TemplateField,
    type TemplateNode,
} from '../../../types/template';
import { portraitFieldBinding } from '../../portraitBinding';
import type { DocumentBindingDescriptor, FieldBinding } from '../../templateBindings';
import type { DocumentDefinition } from '../../types';
import { V5_LIMITS, V5MetadataSchema } from '../ruleset/schema';
import { portraitGroup, v5Text } from '../ruleset/templateParts';
import { GROUP_EXAMPLES } from './examples';
import { STORYTELLER_KIND } from './storytellerBindings';

/**
 * A V5 group (spec 040): a coterie of rivals, a hunter cell, a cult, a company. The system keeps
 * its name and emblem; everything else, members included, is a field of its page (value bag).
 */

export const GROUP_KIND = 'v5-group';

const v5 = uiMessages.sheet.v5;
const labels = v5.group;
const kinds: ReadonlySet<string> = new Set([GROUP_KIND]);

/** Every V5 document kind: a group's members, and the kinds a "Member of" list reads. */
export const V5_MEMBER_KINDS = ['mortal', STORYTELLER_KIND, 'character', 'vampire', GROUP_KIND];

const GroupObjectSchema = z.object({
    metadata: V5MetadataSchema.prefault({}),
    name: z.string().max(V5_LIMITS.text.short).default(''),
});

export const groupTemplateBindings: readonly DocumentBindingDescriptor[] = [
    {
        key: 'field:name',
        kind: 'field',
        label: v5.fields.name.message,
        documentKinds: kinds,
        path: ['name'],
        valueType: 'string',
        coordinate: 'name',
        syncsTitle: true,
    } satisfies FieldBinding,
    portraitFieldBinding(kinds),
];

const field = (
    id: string,
    label: { id: string; message: string },
    options: { multiline?: boolean; compact?: boolean; column?: number; hideLabel?: boolean } = {}
) => text(`${id}-field`, label.message, id, { labelMessage: label, ...options });

const THREAT: TemplateField = {
    id: 'threat-field',
    type: 'rating',
    label: labels.fields.threat.message,
    labelMessage: labels.fields.threat.id,
    valueKey: 'threat',
    min: 0,
    max: 5,
    presentation: 'dots',
    compact: false,
    required: false,
} as TemplateField;

const members = (compact = false) =>
    reference('members-field', labels.fields.members.message, 'members', V5_MEMBER_KINDS, {
        labelMessage: labels.fields.members,
        multiple: true,
        compact,
        // The heading of its section or group names the list.
        hideLabel: true,
    });

const identity = (compact = false) =>
    group(
        'identity',
        v5.sections.identity.message,
        compact
            ? [
                  // Placed in columns: five dots in a row of flowing cells shrink to nothing.
                  v5Text('name', 'name', v5.fields.name, { compact, column: 1 }),
                  field('group-kind', labels.fields.kind, { compact, column: 2 }),
                  { ...THREAT, compact, column: 1 },
              ]
            : [
                  v5Text('name', 'name', v5.fields.name),
                  field('group-kind', labels.fields.kind),
                  THREAT,
              ],
        { hideTitle: true, labelMessage: v5.sections.identity, ...(compact ? { columns: 2 } : {}) }
    );

/** A brief's folded block of one long text. */
const foldedText = (id: string, label: { id: string; message: string }) =>
    dense(
        group(
            id,
            label.message,
            [field(`group-${id}`, label, { multiline: true, hideLabel: true })],
            {
                labelMessage: label,
            }
        ),
        { collapsed: true }
    );

function page(id: string, name: string, children: TemplateNode[]): CustomTemplate {
    return {
        id,
        name,
        systemId: SystemIdSchema.parse('wod-v5'),
        documentKind: DocumentKindSchema.parse(GROUP_KIND),
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children,
    };
}

export const v5GroupSheetTemplate = page('v5-group-sheet', 'Group — Full sheet', [
    section(
        'group',
        labels.section.message,
        undefined,
        [portraitGroup(1), { ...identity(), column: 2 }],
        { columns: 2, columnWidths: [1, 2], labelMessage: labels.section }
    ),
    section(
        'members-section',
        labels.fields.members.message,
        undefined,
        [group('members', labels.fields.members.message, [members()], { hideTitle: true })],
        { labelMessage: labels.fields.members }
    ),
    section(
        'about',
        labels.fields.about.message,
        undefined,
        [
            group(
                'about-group',
                labels.fields.about.message,
                [
                    field('group-about', labels.fields.about, { multiline: true, column: 1 }),
                    field('group-goals', labels.fields.goals, { multiline: true, column: 2 }),
                    field('group-resources', labels.fields.resources, {
                        multiline: true,
                        column: 1,
                    }),
                    field('group-notes', labels.fields.notes, { multiline: true, column: 2 }),
                ],
                { columns: 2, hideTitle: true }
            ),
        ],
        { labelMessage: labels.fields.about }
    ),
]);

export const v5GroupBriefTemplate = page('v5-group-brief', 'Group — Brief', [
    dense(identity(true)),
    dense(
        group('members', labels.fields.members.message, [members(true)], {
            labelMessage: labels.fields.members,
        })
    ),
    foldedText('goals', labels.fields.goals),
    foldedText('resources', labels.fields.resources),
]);

const views = labels.views;

export const v5GroupDefinition: DocumentDefinition = {
    id: DocumentDefinitionIdSchema.parse(GROUP_KIND),
    kind: DocumentKindSchema.parse(GROUP_KIND),
    label: labels.type,
    schemaVersion: 1,
    schema: GroupObjectSchema,
    createDefault: () => GroupObjectSchema.parse({}),
    defaultViewId: DocumentViewIdSchema.parse('v5-group-sheet'),
    views: [
        {
            id: DocumentViewIdSchema.parse('v5-group-sheet'),
            label: views.sheet,
            layout: { type: 'declarative', templateId: 'v5-group-sheet' },
        },
        {
            id: DocumentViewIdSchema.parse('v5-group-brief'),
            label: views.brief,
            layout: { type: 'declarative', templateId: 'v5-group-brief' },
        },
    ],
    migrate: (data) => data,
    examples: GROUP_EXAMPLES,
};

/** The "Member of" list of a V5 character: the groups whose members name it. */
export function memberOfField(compact = false): TemplateField {
    return {
        ...reference('member-of-field', labels.memberOf.message, 'member-of', [GROUP_KIND], {
            labelMessage: labels.memberOf,
            multiple: true,
            compact,
        }),
        incoming: true,
    } as TemplateField;
}

/** The "Member of" block every V5 character page ends with; a brief folds it under a heading. */
export function memberOfGroup(compact = false): GroupNode {
    // The heading of the brief's group or of the sheet's section names the list.
    const listField = { ...memberOfField(compact), hideLabel: true };
    const block = group('member-of', labels.memberOf.message, [listField], {
        labelMessage: labels.memberOf,
        hideTitle: !compact,
    });
    return compact ? dense(block, { collapsed: true }) : block;
}

/** The full sheet's "Member of" section. */
export function memberOfSection(): SectionNode {
    return section('member-of-section', labels.memberOf.message, undefined, [memberOfGroup()], {
        labelMessage: labels.memberOf,
    });
}
