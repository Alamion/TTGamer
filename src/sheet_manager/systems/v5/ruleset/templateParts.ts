import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import {
    formula,
    group,
    list,
    number,
    primitive,
    section,
    text,
} from '../../../templates/builders';
import type { GroupNode, SectionNode, TemplateField } from '../../../types/template';
import { V5_ATTRIBUTE_GROUPS, V5_SKILL_GROUPS, type V5TraitGroup } from './profile';

/**
 * Setting-neutral page parts for every V5 module: sections gather related field groups, and
 * modules compose their own sections from these groups. Node ids are stable (documentation
 * embeds them): sections `attributes`, `skills`, `advantages`, `equipment`, `other`; groups
 * `portrait`, `biography`, `health`, `willpower`, `touchstones`, `chronicle`, `weapons`,
 * `inventory`, `experience`, `notes`.
 */

const v5 = uiMessages.sheet.v5;

type Message = { id: string; message: string };

/** Rules pages linked from section and group headers. */
export const V5_DOCS = {
    attributes: '/docs/wod-v5/rules/attributes-skills',
    skills: '/docs/wod-v5/rules/attributes-skills#specialties',
    damage: '/docs/wod-v5/rules/damage-willpower',
} as const;

export const v5Text = (
    id: string,
    coordinate: string,
    label: Message,
    options: { multiline?: boolean; compact?: boolean; hideLabel?: boolean; column?: number } = {}
) => text(`${id}-field`, label.message, coordinate, { labelMessage: label, ...options });

function traitGroupNodes(
    groups: readonly V5TraitGroup[],
    map: 'attributes' | 'skills',
    compact: boolean
): GroupNode[] {
    return groups.map((traitGroup, index) =>
        group(
            `${map}-${traitGroup.id}`,
            traitGroup.label.message,
            traitGroup.traits.map((trait) =>
                primitive(
                    `${map === 'attributes' ? 'attribute' : 'skill'}-${trait.key}`,
                    `trait:${map}:${trait.key}`,
                    { label: trait.label.message, labelMessage: trait.label, compact }
                )
            ),
            { labelMessage: traitGroup.label, column: index + 1, hideTitle: compact }
        )
    );
}

export function attributesSection(options: { compact?: boolean } = {}): SectionNode {
    return section(
        'attributes',
        v5.sections.attributes.message,
        V5_DOCS.attributes,
        traitGroupNodes(V5_ATTRIBUTE_GROUPS, 'attributes', options.compact ?? false),
        { columns: 3, labelMessage: v5.sections.attributes }
    );
}

export function skillsSection(options: { compact?: boolean } = {}): SectionNode {
    return section(
        'skills',
        v5.sections.skills.message,
        V5_DOCS.skills,
        traitGroupNodes(V5_SKILL_GROUPS, 'skills', options.compact ?? false),
        { columns: 3, labelMessage: v5.sections.skills }
    );
}

/** Brief-view trait block: one group, the three trait columns side by side. */
export function compactTraitsGroup(
    id: 'attributes' | 'skills',
    options: { collapsible?: boolean } = {}
): GroupNode {
    const groups = id === 'attributes' ? V5_ATTRIBUTE_GROUPS : V5_SKILL_GROUPS;
    const label = id === 'attributes' ? v5.sections.attributes : v5.sections.skills;
    return group(
        id,
        label.message,
        traitGroupNodes(groups, id, true).flatMap((column) =>
            column.children.map((child) => ({ ...child, column: column.column }))
        ),
        { columns: 3, labelMessage: label, collapsible: options.collapsible ?? false }
    );
}

const PORTRAIT: TemplateField = {
    id: 'portrait-image',
    type: 'image',
    label: v5.sections.portrait.message,
    labelMessage: v5.sections.portrait.id,
    valueKey: 'portrait',
    compact: false,
    required: false,
    hideLabel: true,
};

export function portraitGroup(column: number): GroupNode {
    return group('portrait', v5.sections.portrait.message, [PORTRAIT], {
        column,
        collapsible: true,
        labelMessage: v5.sections.portrait,
    });
}

/** Biography: collapsed by default, it sits with the identity at the top of the page. */
export function biographyGroup(column: number): GroupNode {
    return group(
        'biography',
        v5.sections.biography.message,
        [
            v5Text('biography-age', 'biography-age', v5.fields.age, { column: 1 }),
            v5Text('biography-date-of-birth', 'biography-date-of-birth', v5.fields.dateOfBirth, {
                column: 2,
            }),
            v5Text('biography-appearance', 'biography-appearance', v5.fields.appearance, {
                multiline: true,
                column: 1,
            }),
            v5Text(
                'biography-distinguishing-features',
                'biography-distinguishing-features',
                v5.fields.distinguishingFeatures,
                { multiline: true, column: 2 }
            ),
            v5Text('biography-history', 'biography-history', v5.fields.history, {
                multiline: true,
                column: 1,
            }),
        ],
        { column, columns: 2, defaultCollapsed: true, labelMessage: v5.sections.biography }
    );
}

/** A Health or Willpower group: the track as a line of boxes under the group title. */
export function trackGroup(
    id: 'health' | 'willpower',
    options: { compact?: boolean; column?: number } = {}
): GroupNode {
    const label = v5.sections[id];
    const compact = options.compact ?? false;
    return group(
        id,
        label.message,
        [
            primitive(`${id}-track`, `track:${id}`, {
                label: label.message,
                labelMessage: label,
                hideLabel: !compact,
                compact,
            }),
        ],
        {
            ...(options.column ? { column: options.column } : {}),
            hideTitle: compact,
            docsPath: V5_DOCS.damage,
            labelMessage: label,
        }
    );
}

export function advantagesSection(): SectionNode {
    const meritList = (id: 'advantages' | 'flaws', column: number) =>
        group(
            `${id}-group`,
            v5.sections[id].message,
            [list(`${id}-list`, { bindingKey: `list:${id}` }, v5.sections[id].message)],
            { column, labelMessage: v5.sections[id] }
        );
    return section(
        'advantages',
        v5.sections.advantagesFlaws.message,
        undefined,
        [meritList('advantages', 1), meritList('flaws', 2)],
        { columns: 2, labelMessage: v5.sections.advantagesFlaws }
    );
}

export function touchstonesGroup(column: number): GroupNode {
    return group(
        'touchstones',
        v5.sections.touchstones.message,
        [
            primitive('touchstones-table', 'rows:touchstones', {
                label: v5.sections.touchstones.message,
                labelMessage: v5.sections.touchstones,
                hideLabel: true,
            }),
        ],
        { column, labelMessage: v5.sections.touchstones }
    );
}

export function chronicleGroup(column: number): GroupNode {
    return group(
        'chronicle',
        v5.fields.chronicleTenets.message,
        [
            v5Text('chronicle-tenets', 'chronicle-tenets', v5.fields.chronicleTenets, {
                multiline: true,
                hideLabel: true,
            }),
        ],
        { column, collapsible: true, labelMessage: v5.fields.chronicleTenets }
    );
}

/** One equipment group (the Star Wars item cards over the character's own item list). */
export function equipmentGroup(
    id: 'weapons' | 'inventory',
    options: { column?: number; collapsible?: boolean } = {}
): GroupNode {
    return group(id, v5.sections[id].message, [primitive(`${id}-items`, `equipment:${id}`)], {
        ...(options.column ? { column: options.column } : {}),
        collapsible: options.collapsible ?? true,
        labelMessage: v5.sections[id],
    });
}

export function equipmentSection(): SectionNode {
    return section(
        'equipment',
        v5.sections.equipment.message,
        undefined,
        [equipmentGroup('weapons', { column: 1 }), equipmentGroup('inventory', { column: 2 })],
        { columns: 2, labelMessage: v5.sections.equipment }
    );
}

/** Experience and free notes. */
export function otherSection(): SectionNode {
    return section(
        'other',
        v5.sections.other.message,
        undefined,
        [
            group(
                'experience',
                v5.sections.experience.message,
                [
                    number(
                        'experience-total-field',
                        v5.fields.experienceTotal.message,
                        'experience-total',
                        { labelMessage: v5.fields.experienceTotal }
                    ),
                    number(
                        'experience-spent-field',
                        v5.fields.experienceSpent.message,
                        'experience-spent',
                        { labelMessage: v5.fields.experienceSpent }
                    ),
                    formula(
                        'experience-left',
                        v5.fields.experienceLeft.message,
                        'experience-total - experience-spent',
                        { labelMessage: v5.fields.experienceLeft }
                    ),
                ],
                { column: 1, labelMessage: v5.sections.experience }
            ),
            group(
                'notes',
                v5.sections.notes.message,
                [
                    v5Text('notes', 'notes', v5.sections.notes, {
                        multiline: true,
                        hideLabel: true,
                    }),
                ],
                { column: 2, labelMessage: v5.sections.notes }
            ),
        ],
        { columns: 2, columnWidths: [1, 2], labelMessage: v5.sections.other }
    );
}
