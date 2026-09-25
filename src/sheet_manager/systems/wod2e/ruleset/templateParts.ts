import {
    formula,
    group,
    list,
    number,
    primitive,
    section as neutralSection,
    text,
} from '../../../templates/builders';
import type {
    GroupNode,
    PrimitiveNode,
    SectionNode,
    TemplateField,
    TemplateNode,
} from '../../../types/template';
import { dotsTrait as trait } from '../../wod-like/templateBuilders';

/**
 * Page parts of WoD 2e characters (spec 012): sections and groups every setting on the ruleset
 * lays out the same way. Settings pass their own documentation links and extras; the parts never
 * name a setting.
 */

export function wodSection(
    id: string,
    title: string,
    docsPath: string | undefined,
    children: TemplateNode[],
    columns?: number,
    columnWidths?: number[]
): SectionNode {
    return neutralSection(id, title, docsPath, children, { columns, columnWidths });
}

export function systemList(id: string, bindingKey: string, title: string) {
    return list(id, { bindingKey }, title);
}

export function resource(
    id: string,
    bindingKey: string,
    label: string,
    options: {
        maxFrom?: string;
        minFrom?: string;
        compact?: boolean;
        part?: 'current' | 'max';
    } = {}
): PrimitiveNode {
    return primitive(id, bindingKey, { label, ...options });
}

export const ATTRIBUTE_GROUPS: ReadonlyArray<{ id: string; title: string; keys: string[] }> = [
    { id: 'attributes-physical', title: 'Physical', keys: ['Strength', 'Dexterity', 'Stamina'] },
    { id: 'attributes-social', title: 'Social', keys: ['Charisma', 'Manipulation', 'Appearance'] },
    { id: 'attributes-mental', title: 'Mental', keys: ['Perception', 'Intelligence', 'Wits'] },
];

export interface AbilityGroup {
    id: string;
    title: string;
    list: string;
    bindingKey: string;
    listTitle: string;
    keys: string[];
}

/** The three ability groups with their custom lists, for a setting's ability names. */
export function abilityGroups(names: {
    talents: readonly string[];
    skills: readonly string[];
    knowledges: readonly string[];
}): AbilityGroup[] {
    return [
        {
            id: 'abilities-talents',
            title: 'Talents',
            list: 'list-talents',
            bindingKey: 'list:customTalents',
            listTitle: 'Custom talents',
            keys: [...names.talents],
        },
        {
            id: 'abilities-skills',
            title: 'Skills',
            list: 'list-skills',
            bindingKey: 'list:customSkills',
            listTitle: 'Custom skills',
            keys: [...names.skills],
        },
        {
            id: 'abilities-knowledges',
            title: 'Knowledges',
            list: 'list-knowledges',
            bindingKey: 'list:customKnowledges',
            listTitle: 'Custom knowledges',
            keys: [...names.knowledges],
        },
    ];
}

export const PORTRAIT: TemplateField = {
    id: 'portrait-image',
    type: 'image',
    label: 'Portrait',
    valueKey: 'portrait',
    compact: false,
    required: false,
};

export const APPEARANCE_FIELDS: ReadonlyArray<[valueKey: string, label: string]> = [
    ['gender', 'Gender'],
    ['height', 'Height'],
    ['build', 'Build'],
    ['hair', 'Hair'],
    ['eyes', 'Eyes'],
    ['features', 'Features'],
];

export const textFields = (fields: ReadonlyArray<[string, string]>, compact = false) =>
    fields.map(([key, label]) => text(`field-${key}`, label, key, { compact }));

/** Portrait, identity (three columns), appearance, and biography. */
export function baseSection(
    docsPath: string | undefined,
    identityFields: ReadonlyArray<[string, string]>
): SectionNode {
    return wodSection(
        'base',
        'Base',
        docsPath,
        [
            group('base-portrait', 'Portrait', [{ ...PORTRAIT, hideLabel: true }], {
                column: 1,
                collapsible: true,
            }),
            group('identity-fields', 'Identity', textFields(identityFields), {
                column: 2,
                columns: 3,
                hideTitle: true,
            }),
            group('base-appearance', 'Appearance', textFields(APPEARANCE_FIELDS), {
                column: 2,
                columns: 3,
                collapsible: true,
            }),
            group(
                'base-biography',
                'Biography',
                [
                    text('field-biography', 'Biography', 'biography', {
                        multiline: true,
                        hideLabel: true,
                        placeholder: 'Character biography...',
                    }),
                ],
                { column: 2, collapsible: true }
            ),
        ],
        2
    );
}

export function attributesSection(docsPath: string | undefined): SectionNode {
    return wodSection(
        'attributes',
        'Attributes',
        docsPath,
        ATTRIBUTE_GROUPS.map(({ id, title, keys }) =>
            group(
                id,
                title,
                keys.map((key) => trait(key))
            )
        ),
        3
    );
}

/** The ability groups; `extras` appends setting-specific fields to each group (by list id). */
export function skillsSection(
    groups: readonly AbilityGroup[],
    docsPath: string | undefined,
    extras: (list: string) => TemplateNode[] = () => []
): SectionNode {
    return wodSection(
        'skills',
        'Skills',
        docsPath,
        groups.map(({ id, title, list, bindingKey, listTitle, keys }) =>
            group(id, title, [
                ...keys.map((key) => trait(key)),
                systemList(list, bindingKey, listTitle),
                ...extras(list),
            ])
        ),
        3
    );
}

export function advantagesSection(docsPath: string | undefined): SectionNode {
    return wodSection(
        'advantages',
        'Advantages',
        docsPath,
        [
            group('advantages-backgrounds', 'Backgrounds', [
                systemList('list-backgrounds', 'list:backgrounds', 'Backgrounds'),
            ]),
            group('advantages-merits', 'Merits', [
                systemList('list-merits', 'list:merits', 'Merits'),
            ]),
            group('advantages-flaws', 'Flaws', [systemList('list-flaws', 'list:flaws', 'Flaws')]),
        ],
        3
    );
}

export function virtuesGroup(
    keys: readonly string[],
    column: number,
    docsPath: string | undefined
): GroupNode {
    return group(
        'force-virtues',
        'Virtues',
        keys.map((key) => trait(key)),
        { column, docsPath }
    );
}

export function experienceGroup(docsPath: string | undefined): GroupNode {
    return group(
        'experience',
        'Experience',
        [
            number('field-experience-total', 'Total XP', 'experience-total'),
            number('field-experience-spent', 'Spent', 'experience-spent'),
            formula(
                'derived-experience-available',
                'Available',
                'experience-total - experience-spent'
            ),
        ],
        { docsPath }
    );
}

export function notesGroup(): GroupNode {
    return group('notes', 'Notes', [
        text('field-notes', 'Notes', 'notes', { multiline: true, hideLabel: true }),
    ]);
}

/** Standard initiative of the classic engine. */
export const STANDARD_INITIATIVE = 'wits + alertness';
