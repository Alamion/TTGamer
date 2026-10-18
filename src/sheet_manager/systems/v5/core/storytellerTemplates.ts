import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { dense, formula, group, list, primitive, section } from '../../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import {
    type ButtonNode,
    type CustomTemplate,
    TEMPLATE_SCHEMA_VERSION,
    type TemplateNode,
} from '../../../types/template';
import { portraitGroup, trackGroup, V5_DOCS, v5Text } from '../ruleset/templateParts';
import { memberOfGroup, memberOfSection } from './group';
import { STORYTELLER_KIND } from './storytellerBindings';

/**
 * The Storyteller character's pages (spec 040): identity, the three standard pools with the
 * exceptional pools and powers, Health and Willpower of a set length, the simple-foe Difficulty,
 * and notes.
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
    options: { compact?: boolean; column?: number; hideLabel?: boolean; shortForm?: boolean } = {}
) =>
    primitive(id, bindingKey, {
        label: label.message,
        labelMessage: label,
        ...options,
    });

const nameAndType = (compact = false) => [
    v5Text('name', 'name', v5.fields.name, { compact }),
    bound('storyteller-type', 'field:storyteller-type', storyteller.fields.kind, { compact }),
];

const concept = (compact = false) =>
    v5Text('concept', 'concept', storyteller.fields.concept, { compact });

const identity = () =>
    group('identity', v5.sections.identity.message, [...nameAndType(), concept()], {
        hideTitle: true,
        labelMessage: v5.sections.identity,
    });

/** The brief's identity: name and type share a row, the concept takes the next one whole. */
const briefIdentity = () => [
    dense(
        group('identity', v5.sections.identity.message, nameAndType(true), {
            hideTitle: true,
            labelMessage: v5.sections.identity,
        })
    ),
    dense(
        group('concept', storyteller.fields.concept.message, [concept(true)], {
            hideTitle: true,
            labelMessage: storyteller.fields.concept,
        })
    ),
];

/** The Difficulty, the pool it gives (twice the Difficulty), and the roll of that pool. */
const simpleFoe = (compact = false) =>
    group(
        'simple-foe',
        storyteller.sections.simpleFoe.message,
        [
            bound('difficulty', 'field:difficulty', storyteller.fields.difficulty, { compact }),
            formula('foe-pool', storyteller.fields.foePool.message, 'difficulty * 2', {
                labelMessage: storyteller.fields.foePool,
                compact,
            }),
            simpleFoeButton(),
        ],
        {
            labelMessage: storyteller.sections.simpleFoe,
            hideTitle: !compact,
            ...(compact ? {} : { columns: 3 }),
        }
    );

/** Physical, Social, Mental: rows with their names on a sheet, short chips in a brief. */
const pools = (compact = false) =>
    group(
        'pools',
        storyteller.sections.pools.message,
        (['physical', 'social', 'mental'] as const).map((key, index) =>
            bound(`pool-${key}`, `trait:pools:${key}`, storyteller.fields[key], {
                compact,
                shortForm: compact,
                ...(compact ? {} : { column: index + 1 }),
            })
        ),
        { labelMessage: storyteller.sections.pools, hideTitle: compact, columns: 3 }
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

const SIMPLE_FOE_DOCS = '/docs/wod-v5/storyteller/storyteller-characters#simple-foes';

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
            [portraitGroup(1), { ...identity(), column: 2 }],
            { columns: 2, columnWidths: [1, 2], labelMessage: storyteller.section }
        ),
        section(
            'pools-section',
            storyteller.sections.allPools.message,
            undefined,
            [{ ...pools(), span: 2 }, traitList('exceptional'), traitList('powers')],
            { columns: 2, labelMessage: storyteller.sections.allPools }
        ),
        section(
            'condition',
            v5.sections.condition.message,
            V5_DOCS.damage,
            [trackGroup('health', { column: 1 }), trackGroup('willpower', { column: 2 })],
            { columns: 2, labelMessage: v5.sections.condition }
        ),
        section(
            'simple-foe-section',
            storyteller.sections.simpleFoe.message,
            SIMPLE_FOE_DOCS,
            [simpleFoe()],
            { labelMessage: storyteller.sections.simpleFoe }
        ),
        section('notes-section', storyteller.sections.notes.message, undefined, [notes()], {
            labelMessage: storyteller.sections.notes,
        }),
        memberOfSection(),
    ]
);

export const v5StorytellerBriefTemplate = page(
    'v5-storyteller-brief',
    'Storyteller character — Brief',
    [
        ...briefIdentity(),
        dense(pools(true)),
        dense(
            group(
                'condition',
                v5.sections.condition.message,
                [
                    ...trackGroup('health', { compact: true }).children,
                    ...trackGroup('willpower', { compact: true }).children,
                ],
                { labelMessage: v5.sections.condition, hideTitle: true }
            )
        ),
        dense(traitList('exceptional')),
        dense(simpleFoe(true)),
        dense(traitList('powers'), { collapsed: true }),
        dense(notes(), { collapsed: true }),
        memberOfGroup(true),
    ]
);
