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
import { memberOfBriefGroup, memberOfField } from './group';
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

/** The brief's simple foe: the Difficulty and the roll of twice it (the button says so). */
const simpleFoe = () =>
    group(
        'simple-foe',
        storyteller.sections.simpleFoe.message,
        [
            bound('difficulty', 'field:difficulty', storyteller.fields.difficulty, {
                compact: true,
            }),
            simpleFoeButton(),
        ],
        { labelMessage: storyteller.sections.simpleFoe }
    );

/** The brief's Physical, Social, and Mental: short chips with their dice. */
const briefPools = () =>
    group(
        'pools',
        storyteller.sections.pools.message,
        (['physical', 'social', 'mental'] as const).map((key) =>
            bound(`pool-${key}`, `trait:pools:${key}`, storyteller.fields[key], {
                compact: true,
                shortForm: true,
            })
        ),
        { labelMessage: storyteller.sections.pools, hideTitle: true }
    );

/** A list that grows with the character: its card folds on the full sheet. */
const traitList = (id: 'exceptional' | 'powers', collapsible = false) =>
    group(
        id,
        storyteller.sections[id].message,
        [list(`${id}-list`, { bindingKey: `list:${id}` }, storyteller.sections[id].message)],
        { labelMessage: storyteller.sections[id], collapsible }
    );

const notes = (options: { collapsible?: boolean } = {}) =>
    group(
        'notes',
        storyteller.sections.notes.message,
        [
            v5Text('notes', 'notes', storyteller.sections.notes, {
                multiline: true,
                hideLabel: true,
            }),
        ],
        { labelMessage: storyteller.sections.notes, ...options }
    );

const STORYTELLER_DOCS = '/docs/wod-v5/storyteller/storyteller-characters';

const trackRow = (id: 'health' | 'willpower') =>
    primitive(`${id}-track`, `track:${id}`, {
        label: v5.sections[id].message,
        labelMessage: v5.sections[id],
    });

/**
 * The full sheet's identity card: name and type, the concept, the simple foe's Difficulty with
 * its roll, and the groups the character belongs to.
 */
const identityCard = () =>
    group(
        'identity',
        v5.sections.identity.message,
        [
            ...nameAndType(),
            { ...concept(), span: 2 },
            bound('difficulty', 'field:difficulty', storyteller.fields.difficulty),
            simpleFoeButton(),
            { ...memberOfField(), span: 2 },
        ],
        { hideTitle: true, labelMessage: v5.sections.identity, columns: 2, column: 2 }
    );

/** The standard pools card holds the whole stat block of the rules: pools, Health, Willpower. */
const standardCard = () =>
    group(
        'pools',
        storyteller.sections.pools.message,
        [
            ...(['physical', 'social', 'mental'] as const).map((key) =>
                bound(`pool-${key}`, `trait:pools:${key}`, storyteller.fields[key])
            ),
            trackRow('health'),
            trackRow('willpower'),
        ],
        { labelMessage: storyteller.sections.pools, docsPath: V5_DOCS.damage }
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
            STORYTELLER_DOCS,
            [portraitGroup(1), identityCard()],
            { columns: 2, columnWidths: [1, 2], labelMessage: storyteller.section }
        ),
        section(
            'pools-section',
            storyteller.sections.allPools.message,
            undefined,
            [
                standardCard(),
                traitList('exceptional', true),
                traitList('powers', true),
                { ...notes({ collapsible: true }), span: 3 },
            ],
            { columns: 3, labelMessage: storyteller.sections.allPools }
        ),
    ]
);

export const v5StorytellerBriefTemplate = page(
    'v5-storyteller-brief',
    'Storyteller character — Brief',
    [
        ...briefIdentity(),
        dense(briefPools()),
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
        dense(simpleFoe()),
        dense(traitList('powers'), { collapsed: true }),
        dense(notes(), { collapsed: true }),
        memberOfBriefGroup(),
    ]
);
