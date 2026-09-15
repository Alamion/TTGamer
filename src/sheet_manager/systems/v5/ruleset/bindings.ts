import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { portraitFieldBinding } from '../../portraitBinding';
import type {
    DocumentBindingDescriptor,
    FieldBinding,
    TrackBinding,
    TraitBinding,
} from '../../templateBindings';
import { V5_ATTRIBUTE_GROUPS, V5_SKILL_GROUPS } from './profile';
import { V5_LIMITS } from './schema';

/**
 * Template bindings of the V5 core data, shared by every V5 module. Modules pass the document
 * kinds they apply to and append their own bindings.
 */

const v5 = uiMessages.sheet.v5;

function field(
    documentKinds: ReadonlySet<string>,
    key: string,
    path: readonly string[],
    label: string,
    extra: Partial<FieldBinding> = {}
): FieldBinding {
    return {
        key: `field:${key}`,
        kind: 'field',
        label,
        documentKinds,
        path,
        valueType: 'string',
        coordinate: key,
        ...extra,
    };
}

export function buildV5CoreBindings(
    documentKinds: ReadonlySet<string>
): DocumentBindingDescriptor[] {
    const attributes: TraitBinding[] = V5_ATTRIBUTE_GROUPS.flatMap((group) =>
        group.traits.map((trait) => ({
            key: `trait:attributes:${trait.key}`,
            kind: 'trait' as const,
            label: trait.label.message,
            documentKinds,
            map: 'attributes',
            traitKey: trait.key,
            minimum: V5_LIMITS.attribute.min,
            maximum: V5_LIMITS.attribute.max,
            defaultValue: V5_LIMITS.attribute.min,
            coordinate: trait.key,
            row: { specialization: false, flags: false },
        }))
    );
    const skills: TraitBinding[] = V5_SKILL_GROUPS.flatMap((group) =>
        group.traits.map((trait) => ({
            key: `trait:skills:${trait.key}`,
            kind: 'trait' as const,
            label: trait.label.message,
            documentKinds,
            map: 'skills',
            traitKey: trait.key,
            minimum: V5_LIMITS.skill.min,
            maximum: V5_LIMITS.skill.max,
            defaultValue: 0,
            coordinate: trait.key,
            row: { flags: false },
        }))
    );
    // Health and Willpower: condition tracks of unlabeled boxes (slash = Superficial, cross =
    // Aggravated) whose length follows the attributes plus the player's adjustment.
    const track = (id: 'health' | 'willpower', from: string, label: string): TrackBinding => ({
        key: `track:${id}`,
        kind: 'track',
        label,
        documentKinds,
        trackId: id,
        dataKey: id,
        levels: [],
        length: {
            from,
            adjustmentKey: 'bonus',
            adjustmentRange: { min: V5_LIMITS.track.minBonus, max: V5_LIMITS.track.maxBonus },
            maxLength: V5_LIMITS.track.maxLength,
        },
    });
    const experienceRange = { min: 0, max: V5_LIMITS.experience.max };
    return [
        ...attributes,
        ...skills,
        track('health', 'stamina + 3', v5.sections.health.message),
        track('willpower', 'composure + resolve', v5.sections.willpower.message),
        {
            key: 'list:advantages',
            kind: 'list',
            label: v5.sections.advantages.message,
            translation: v5.sections.advantages,
            documentKinds,
            listId: 'advantages',
            dataKey: 'advantages',
            entryShape: 'merit-flaw',
            polarity: 'positive',
        },
        {
            key: 'list:flaws',
            kind: 'list',
            label: v5.sections.flaws.message,
            translation: v5.sections.flaws,
            documentKinds,
            listId: 'flaws',
            dataKey: 'flaws',
            entryShape: 'merit-flaw',
            polarity: 'negative',
        },
        {
            key: 'rows:touchstones',
            kind: 'rows',
            label: v5.sections.touchstones.message,
            documentKinds,
            dataKey: 'touchstones',
            coordinate: 'touchstones',
            maxRows: V5_LIMITS.rows.touchstones,
            columns: [
                {
                    key: 'name',
                    label: v5.fields.touchstone.message,
                    translation: v5.fields.touchstone,
                    type: 'text',
                },
                {
                    key: 'conviction',
                    label: v5.fields.conviction.message,
                    translation: v5.fields.conviction,
                    type: 'text',
                },
            ],
        },
        field(documentKinds, 'name', ['name'], v5.fields.name.message, { syncsTitle: true }),
        field(
            documentKinds,
            'experience-total',
            ['experience', 'total'],
            v5.fields.experienceTotal.message,
            { valueType: 'number', range: experienceRange }
        ),
        field(
            documentKinds,
            'experience-spent',
            ['experience', 'spent'],
            v5.fields.experienceSpent.message,
            { valueType: 'number', range: experienceRange }
        ),
        field(
            documentKinds,
            'chronicle-tenets',
            ['chronicleTenets'],
            v5.fields.chronicleTenets.message
        ),
        portraitFieldBinding(documentKinds),
        {
            key: 'equipment:weapons',
            kind: 'equipment',
            label: v5.sections.weapons.message,
            documentKinds,
            sectionId: 'weapons',
            dataKey: 'weapons',
        },
        {
            key: 'equipment:inventory',
            kind: 'equipment',
            label: v5.sections.inventory.message,
            documentKinds,
            sectionId: 'inventory',
            dataKey: 'inventory',
        },
        field(documentKinds, 'notes', ['notes'], v5.sections.notes.message),
        field(documentKinds, 'biography-age', ['biography', 'age'], v5.fields.age.message),
        field(
            documentKinds,
            'biography-date-of-birth',
            ['biography', 'dateOfBirth'],
            v5.fields.dateOfBirth.message
        ),
        field(
            documentKinds,
            'biography-appearance',
            ['biography', 'appearance'],
            v5.fields.appearance.message
        ),
        field(
            documentKinds,
            'biography-distinguishing-features',
            ['biography', 'distinguishingFeatures'],
            v5.fields.distinguishingFeatures.message
        ),
        field(
            documentKinds,
            'biography-history',
            ['biography', 'history'],
            v5.fields.history.message
        ),
    ];
}
