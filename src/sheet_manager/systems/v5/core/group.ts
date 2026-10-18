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
    type BriefNode,
    type CustomTemplate,
    type GroupNode,
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
        [
            v5Text('name', 'name', v5.fields.name, { compact }),
            field('group-kind', labels.fields.kind, { compact }),
            // Five dots read better under their name than under three letters.
            compact ? { ...THREAT, fullLabel: true as const } : THREAT,
        ],
        { hideTitle: true, labelMessage: v5.sections.identity }
    );

/** The portrait card placed by the section's flow (its own helper places it in column 1). */
function flowingPortrait(): GroupNode {
    const portrait = portraitGroup(1);
    delete portrait.column;
    return portrait;
}

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

function page(id: string, name: string, children: TemplateNode[], brief = false): CustomTemplate {
    return {
        id,
        name,
        systemId: SystemIdSchema.parse('wod-v5'),
        documentKind: DocumentKindSchema.parse(GROUP_KIND),
        ...(brief ? { pageKind: 'brief' as const } : {}),
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children,
    };
}

/**
 * One section (a group has few fields): the portrait beside the identity card, then the members
 * and the description, which fold (the list grows, the texts are rarely needed in play).
 */
export const v5GroupSheetTemplate = page('v5-group-sheet', 'Group — Full sheet', [
    section(
        'group',
        labels.section.message,
        undefined,
        [
            flowingPortrait(),
            identity(),
            {
                ...group('members', labels.fields.members.message, [members()], {
                    labelMessage: labels.fields.members,
                    collapsible: true,
                }),
                span: 2,
            },
            {
                ...group(
                    'about-group',
                    labels.fields.about.message,
                    [
                        field('group-about', labels.fields.about, { multiline: true }),
                        field('group-goals', labels.fields.goals, { multiline: true }),
                        field('group-resources', labels.fields.resources, { multiline: true }),
                        field('group-notes', labels.fields.notes, { multiline: true }),
                    ],
                    { columns: 2, collapsible: true, labelMessage: labels.fields.about }
                ),
                span: 2,
            },
        ],
        { columns: 2, columnWidths: [1, 2], labelMessage: labels.section }
    ),
]);

export const v5GroupBriefTemplate = page(
    'v5-group-brief',
    'Group — Brief',
    [
        dense(identity(true)),
        dense(
            group('members', labels.fields.members.message, [members(true)], {
                labelMessage: labels.fields.members,
            })
        ),
        foldedText('goals', labels.fields.goals),
        foldedText('resources', labels.fields.resources),
    ],
    true
);

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

/** A V5 character brief's "Member of", folded under its heading (the heading names the list). */
export function memberOfBriefGroup(): BriefNode {
    return dense(
        group('member-of', labels.memberOf.message, [{ ...memberOfField(true), hideLabel: true }], {
            labelMessage: labels.memberOf,
        }),
        { collapsed: true }
    );
}
