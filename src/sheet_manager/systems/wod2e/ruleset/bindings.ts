import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { portraitFieldBinding } from '../../portraitBinding';
import type {
    DocumentBindingDescriptor,
    EquipmentSectionId,
    ListCatalogSupport,
    SystemListShape,
} from '../../templateBindings';
import type { WodSheetProfile } from '../../wod-like';
import {
    buildWodResourceBindings,
    buildWodTrackBindings,
    buildWodTraitBindings,
    toCoordinate,
} from '../../wod-like/templateBindings';

/**
 * WoD 2e character bindings (spec 012): the data addresses every WoD 2e character has — traits,
 * Willpower, Health, custom abilities, advantages, equipment, identity, and experience. Settings
 * add their own (the Star Wars Force, droids, implants) around these.
 */

export interface Wod2eListDeclaration {
    listId: string;
    label: string;
    dataKey?: string;
    entryShape: SystemListShape;
    catalog?: ListCatalogSupport;
}

const CUSTOM_ABILITY_LISTS: readonly Wod2eListDeclaration[] = [
    { listId: 'customTalents', label: 'Custom talents', entryShape: 'trait' },
    { listId: 'customSkills', label: 'Custom skills', entryShape: 'trait' },
    { listId: 'customKnowledges', label: 'Custom knowledges', entryShape: 'trait' },
];

/**
 * Custom abilities, then the setting's own lists, then merits, flaws, and backgrounds (with the
 * setting's catalogs when it ships them).
 */
export function wod2eListBindings(
    documentKinds: ReadonlySet<string>,
    options: {
        settingLists?: readonly Wod2eListDeclaration[];
        catalogs?: { meritsFlaws?: string; backgrounds?: string };
    } = {}
): DocumentBindingDescriptor[] {
    const meritsFlaws = options.catalogs?.meritsFlaws;
    const backgrounds = options.catalogs?.backgrounds;
    const declarations: Wod2eListDeclaration[] = [
        ...CUSTOM_ABILITY_LISTS,
        ...(options.settingLists ?? []),
        {
            listId: 'merits',
            label: 'Merits',
            entryShape: 'merit-flaw',
            ...(meritsFlaws
                ? {
                      catalog: {
                          catalogId: meritsFlaws,
                          catalogFilter: { key: 'type', value: 'Merit' },
                      },
                  }
                : {}),
        },
        {
            listId: 'flaws',
            label: 'Flaws',
            entryShape: 'merit-flaw',
            ...(meritsFlaws
                ? {
                      catalog: {
                          catalogId: meritsFlaws,
                          catalogFilter: { key: 'type', value: 'Flaw' },
                      },
                  }
                : {}),
        },
        {
            listId: 'backgrounds',
            label: 'Backgrounds',
            entryShape: 'trait',
            ...(backgrounds ? { catalog: { catalogId: backgrounds } } : {}),
        },
    ];
    return declarations.map(({ listId, label, dataKey, entryShape, catalog }) => ({
        key: `list:${listId}`,
        kind: 'list',
        label,
        documentKinds,
        listId,
        dataKey: dataKey ?? listId,
        entryShape,
        ...(catalog ? { catalog } : {}),
    }));
}

const ENGINE_EQUIPMENT: ReadonlyArray<{ sectionId: EquipmentSectionId; label: string }> = [
    { sectionId: 'inventory', label: 'Inventory' },
    { sectionId: 'armor', label: 'Dressed — Armor' },
    { sectionId: 'weapons', label: 'Dressed — Weapons' },
];

/**
 * Equipment sections. `itemArrays` binds each section to its plain item array in document data
 * (the engine character); without it the sections go through the character capability, as the
 * Star Wars sheet does for its catalog fills.
 */
export function wod2eEquipmentBindings(
    documentKinds: ReadonlySet<string>,
    settingSections: ReadonlyArray<{ sectionId: EquipmentSectionId; label: string }> = [],
    { itemArrays = false }: { itemArrays?: boolean } = {}
): DocumentBindingDescriptor[] {
    return [...ENGINE_EQUIPMENT, ...settingSections].map(({ sectionId, label }) => ({
        key: `equipment:${sectionId}`,
        kind: 'equipment',
        label,
        documentKinds,
        sectionId,
        ...(itemArrays ? { dataKey: sectionId } : {}),
    }));
}

const toNonNegativeInteger = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

/** Experience stays schema-valid: whole non-negative numbers, spent never above total. */
function constrainExperience(record: unknown): unknown {
    const experience = (record ?? {}) as { total?: unknown; spent?: unknown };
    const total = toNonNegativeInteger(experience.total);
    return { total, spent: Math.min(toNonNegativeInteger(experience.spent), total) };
}

/** Portrait, identity metadata (in the setting's order), notes, and experience. */
export function wod2eFieldBindings(
    documentKinds: ReadonlySet<string>,
    metadataFields: ReadonlyArray<[key: string, label: string]>
): DocumentBindingDescriptor[] {
    return [
        portraitFieldBinding(documentKinds),
        ...metadataFields.map(
            ([fieldKey, label]): DocumentBindingDescriptor => ({
                key: `field:${fieldKey}`,
                kind: 'field',
                label,
                documentKinds,
                path: ['metadata', fieldKey],
                valueType: 'string',
                coordinate: toCoordinate(label),
            })
        ),
        {
            key: 'field:notes',
            kind: 'field',
            label: 'Notes',
            documentKinds,
            path: ['notes'],
            valueType: 'string',
            coordinate: 'notes',
        },
        {
            key: 'field:experience-total',
            kind: 'field',
            label: 'Total XP',
            documentKinds,
            path: ['experience', 'total'],
            valueType: 'number',
            coordinate: 'experience-total',
            constrain: constrainExperience,
        },
        {
            key: 'field:experience-spent',
            kind: 'field',
            label: 'Spent XP',
            documentKinds,
            path: ['experience', 'spent'],
            valueType: 'number',
            coordinate: 'experience-spent',
            constrain: constrainExperience,
        },
    ];
}

/** Engine identity fields: no species or home world (those are the Star Wars setting's). */
export const WOD2E_METADATA_FIELDS: ReadonlyArray<[key: string, label: string]> = [
    ['name', 'Name'],
    ['concept', 'Concept'],
    ['player', 'Player'],
    ['nature', 'Nature'],
    ['adventure', 'Chronicle'],
    ['demeanor', 'Demeanor'],
    ['age', 'Age'],
    ['gender', 'Gender'],
    ['height', 'Height'],
    ['build', 'Build'],
    ['hair', 'Hair'],
    ['eyes', 'Eyes'],
    ['features', 'Features'],
    ['biography', 'Biography'],
];

/** Every binding of the engine character (the `wod-2e` plugin). */
export function buildWod2eCoreBindings(
    profile: WodSheetProfile,
    documentKinds: ReadonlySet<string>
): DocumentBindingDescriptor[] {
    return [
        ...buildWodTraitBindings(profile, {
            documentKinds,
            recordFor: ({ role }) =>
                role === 'attribute' ? 'attributes' : role === 'virtue' ? 'virtues' : 'skills',
            defaultValueFor: ({ role }) => (role === 'ability' ? 0 : 1),
        }),
        ...buildWodResourceBindings(profile, {
            documentKinds,
            currentRaisesMax: new Set(['willpower']),
            dataKeys: { willpower: 'willpower' },
        }),
        ...buildWodTrackBindings(profile, {
            health: {
                dataKey: 'health',
                documentKinds,
                levelTranslations: uiMessages.sheet.documents.fields.healthLevels,
            },
        }),
        ...wod2eListBindings(documentKinds),
        ...wod2eEquipmentBindings(documentKinds, [], { itemArrays: true }),
        ...wod2eFieldBindings(documentKinds, WOD2E_METADATA_FIELDS),
    ];
}
