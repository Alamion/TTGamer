import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { dense, group, list, primitive, section } from '../../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import {
    type ButtonNode,
    type CustomTemplate,
    TEMPLATE_SCHEMA_VERSION,
    type TemplateNode,
} from '../../../types/template';
import { portraitGroup, trackGroup, V5_DOCS, v5Text } from '../ruleset/templateParts';
import { STORYTELLER_KIND } from './storytellerBindings';

/**
 * The Storyteller character's pages (spec 040): identity, the simple-foe Difficulty, the three
 * standard pools, Health and Willpower of a set length, exceptional pools, powers, and notes.
 */

const v5 = uiMessages.sheet.v5;
const storyteller = v5.storyteller;

/** The rules' optional roll for a simple foe: twice its Difficulty in dice. */
export function simpleFoeButton(): ButtonNode {
    return {
        id: 'simple-foe-roll',
        type: 'button',
        label: storyteller.rollSimpleFoe.message,
        labelMessage: storyteller.rollSimpleFoe.id,
        icon: 'dice',
        availableWhen: 'difficulty > 0',
        roll: { notation: '{difficulty * 2}d10>=6', successAt: 1, gameDice: true },
        onSuccess: [],
        onFailure: [],
        always: [],
    };
}

const bound = (
    id: string,
    bindingKey: string,
    label: { id: string; message: string },
    options: { compact?: boolean; column?: number; hideLabel?: boolean } = {}
) =>
    primitive(id, bindingKey, {
        label: label.message,
        labelMessage: label,
        ...options,
    });

const identity = (compact = false) =>
    group(
        'identity',
        v5.sections.identity.message,
        [
            v5Text('name', 'name', v5.fields.name, { compact }),
            v5Text('concept', 'concept', storyteller.fields.concept, { compact }),
            bound('storyteller-type', 'field:storyteller-type', storyteller.fields.kind, {
                compact,
            }),
        ],
        { hideTitle: true, labelMessage: v5.sections.identity, columns: compact ? 3 : 1 }
    );

const simpleFoe = (compact = false) =>
    group(
        'simple-foe',
        storyteller.sections.simpleFoe.message,
        [
            bound('difficulty', 'field:difficulty', storyteller.fields.difficulty, { compact }),
            simpleFoeButton(),
        ],
        { labelMessage: storyteller.sections.simpleFoe, columns: 2 }
    );

const pools = (compact = false) =>
    group(
        'pools',
        storyteller.sections.pools.message,
        (['physical', 'social', 'mental'] as const).map((key, index) =>
            bound(`pool-${key}`, `trait:pools:${key}`, storyteller.fields[key], {
                compact,
                column: index + 1,
            })
        ),
        { columns: 3, labelMessage: storyteller.sections.pools, layout: 'area' }
    );

const traitList = (id: 'exceptional' | 'powers', column?: number) =>
    group(
        id,
        storyteller.sections[id].message,
        [list(`${id}-list`, { bindingKey: `list:${id}` }, storyteller.sections[id].message)],
        { labelMessage: storyteller.sections[id], ...(column ? { column } : {}) }
    );

const notes = () =>
    group(
        'notes',
        storyteller.sections.notes.message,
        [
            v5Text('notes', 'notes', storyteller.sections.notes, {
                multiline: true,
                hideLabel: true,
            }),
        ],
        { labelMessage: storyteller.sections.notes }
    );

function page(id: string, name: string, children: TemplateNode[]): CustomTemplate {
    return {
        id,
        name,
        systemId: SystemIdSchema.parse('wod-v5'),
        documentKind: DocumentKindSchema.parse(STORYTELLER_KIND),
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children,
    };
}

export const v5StorytellerSheetTemplate = page(
    'v5-storyteller-sheet',
    'Storyteller character — Full sheet',
    [
        section(
            'storyteller',
            storyteller.section.message,
            undefined,
            [portraitGroup(1), { ...identity(), column: 2 }, { ...simpleFoe(), column: 2 }],
            { columns: 2, columnWidths: [1, 2], labelMessage: storyteller.section }
        ),
        section('pools-section', storyteller.sections.pools.message, undefined, [pools()], {
            labelMessage: storyteller.sections.pools,
        }),
        section(
            'condition',
            v5.sections.condition.message,
            V5_DOCS.damage,
            [trackGroup('health', { column: 1 }), trackGroup('willpower', { column: 2 })],
            { columns: 2, labelMessage: v5.sections.condition }
        ),
        section(
            'abilities',
            storyteller.sections.exceptional.message,
            undefined,
            [traitList('exceptional', 1), traitList('powers', 2)],
            { columns: 2, labelMessage: storyteller.sections.exceptional }
        ),
        section('notes-section', storyteller.sections.notes.message, undefined, [notes()], {
            labelMessage: storyteller.sections.notes,
        }),
    ]
);

export const v5StorytellerBriefTemplate = page(
    'v5-storyteller-brief',
    'Storyteller character — Brief',
    [
        dense(identity(true)),
        dense(simpleFoe(true)),
        dense(pools(true)),
        dense(
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
            )
        ),
        dense(traitList('exceptional')),
        dense(traitList('powers'), { collapsed: true }),
        dense(notes(), { collapsed: true }),
    ]
);
