import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type {
    DocumentBindingDescriptor,
    EquipmentSectionId,
    ListCatalogSupport,
    SystemListShape,
} from '../templateBindings';
import {
    buildWodResourceBindings,
    buildWodTrackBindings,
    buildWodTraitBindings,
    toCoordinate,
} from '../wod-like/templateBindings';
import { starWarsEntityBindings } from './entityBindings';
import { starWarsWodProfile } from './profile';

/**
 * Star Wars WoD template bindings: the declaration of which document data a template may bind
 * to. Traits, resources, and tracks derive from the system profile (single owner of names and
 * limits); lists, equipment, and identity fields are declared here with their data keys.
 */

const CHARACTER_KINDS: ReadonlySet<string> = new Set(['character']);

const traitBindings = buildWodTraitBindings(starWarsWodProfile, {
    documentKinds: CHARACTER_KINDS,
    recordFor: ({ role }) => {
        switch (role) {
            case 'attribute':
                return 'attributes';
            case 'ability':
                return 'skills';
            case 'virtue':
                return 'virtues';
            default:
                return 'forceSkills';
        }
    },
    // Unset abilities start at 0; attributes, virtues, and Force skills at 1.
    defaultValueFor: ({ role }) => (role === 'ability' ? 0 : 1),
});

const resourceBindings = buildWodResourceBindings(starWarsWodProfile, {
    documentKinds: CHARACTER_KINDS,
    // Like the original sheet: raising current Willpower above its maximum raises the maximum.
    currentRaisesMax: new Set(['willpower']),
    dataKeys: {
        willpower: 'willpower',
        'force-points': 'forcePoints',
        'dark-side-resistance': 'darkSideResistance',
    },
});

const levelMessages = uiMessages.sheet.documents.fields;

const trackBindings = buildWodTrackBindings(starWarsWodProfile, {
    health: {
        dataKey: 'health',
        documentKinds: CHARACTER_KINDS,
        levelTranslations: levelMessages.healthLevels,
    },
    // Level set shared by the droid damage binding; vehicles bind their member tracks instead.
    'vehicle-damage': {
        dataKey: 'damage',
        documentKinds: new Set<string>(),
        levelTranslations: levelMessages.damageLevels,
    },
});

/**
 * Droids are character documents whose capability exposes their mechanical damage as `health`;
 * this binding reads the same data with the damage chart's level names and penalties.
 */
const droidDamageBinding: DocumentBindingDescriptor = {
    ...trackBindings.find(({ key }) => key === 'track:vehicle-damage')!,
    key: 'track:droid-damage',
    documentKinds: CHARACTER_KINDS,
    dataKey: 'health',
} as DocumentBindingDescriptor;

const listDeclarations: ReadonlyArray<{
    listId: string;
    label: string;
    dataKey?: string;
    entryShape: SystemListShape;
    catalog?: ListCatalogSupport;
}> = [
    { listId: 'customTalents', label: 'Custom talents', entryShape: 'trait' },
    { listId: 'customSkills', label: 'Custom skills', entryShape: 'trait' },
    { listId: 'customKnowledges', label: 'Custom knowledges', entryShape: 'trait' },
    {
        listId: 'forcePowers',
        label: 'Force Powers',
        // `forcePowerItems` is the single Force-power representation.
        dataKey: 'forcePowerItems',
        entryShape: 'named-trait',
        catalog: { catalogId: 'force-powers' },
    },
    {
        listId: 'merits',
        label: 'Merits',
        entryShape: 'merit-flaw',
        catalog: { catalogId: 'merits-flaws', catalogFilter: { key: 'type', value: 'Merit' } },
    },
    {
        listId: 'flaws',
        label: 'Flaws',
        entryShape: 'merit-flaw',
        catalog: { catalogId: 'merits-flaws', catalogFilter: { key: 'type', value: 'Flaw' } },
    },
    {
        listId: 'backgrounds',
        label: 'Backgrounds',
        entryShape: 'trait',
        catalog: { catalogId: 'backgrounds' },
    },
];

const listBindings: DocumentBindingDescriptor[] = listDeclarations.map(
    ({ listId, label, dataKey, entryShape, catalog }) => ({
        key: `list:${listId}`,
        kind: 'list',
        label,
        documentKinds: CHARACTER_KINDS,
        listId,
        dataKey: dataKey ?? listId,
        entryShape,
        ...(catalog ? { catalog } : {}),
    })
);

const equipmentBindings: DocumentBindingDescriptor[] = (
    [
        { sectionId: 'inventory', label: 'Inventory' },
        { sectionId: 'armor', label: 'Dressed — Armor' },
        { sectionId: 'weapons', label: 'Dressed — Weapons' },
        { sectionId: 'implants', label: 'Implants & Cyberware' },
    ] as ReadonlyArray<{ sectionId: EquipmentSectionId; label: string }>
).map(({ sectionId, label }) => ({
    key: `equipment:${sectionId}`,
    kind: 'equipment',
    label,
    documentKinds: CHARACTER_KINDS,
    sectionId,
}));

const METADATA_FIELDS: ReadonlyArray<[key: string, label: string]> = [
    ['name', 'Name'],
    ['concept', 'Concept'],
    ['player', 'Player'],
    ['nature', 'Nature'],
    ['adventure', 'Adventure'],
    ['demeanor', 'Demeanor'],
    ['species', 'Species'],
    ['homeWorld', 'Home World'],
    ['age', 'Age'],
    ['gender', 'Gender'],
    ['height', 'Height'],
    ['build', 'Build'],
    ['hair', 'Hair'],
    ['eyes', 'Eyes'],
    ['features', 'Features'],
    ['biography', 'Biography'],
];

const toNonNegativeInteger = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

/** Experience stays schema-valid: whole non-negative numbers, spent never above total. */
function constrainExperience(record: unknown): unknown {
    const experience = (record ?? {}) as { total?: unknown; spent?: unknown };
    const total = toNonNegativeInteger(experience.total);
    return { total, spent: Math.min(toNonNegativeInteger(experience.spent), total) };
}

/** The portrait lives in metadata as a device blob id or an HTTPS URL (never both). */
const portraitAdapter = {
    read: (data: unknown) => {
        const metadata = (data as { metadata?: { portraitId?: string; imageUrl?: string } })
            .metadata;
        if (metadata?.portraitId) return { source: 'device', blobId: metadata.portraitId };
        if (metadata?.imageUrl) return { source: 'url', url: metadata.imageUrl };
        return undefined;
    },
    update: (data: unknown, value: unknown) => {
        const metadata = { ...((data as { metadata?: Record<string, unknown> }).metadata ?? {}) };
        delete metadata.portraitId;
        delete metadata.imageUrl;
        const image = value as { source?: string; blobId?: string; url?: string } | undefined;
        if (image?.source === 'device' && image.blobId) metadata.portraitId = image.blobId;
        if (image?.source === 'url' && image.url) metadata.imageUrl = image.url;
        return { metadata };
    },
};

const fieldBindings: DocumentBindingDescriptor[] = [
    {
        key: 'field:portrait',
        kind: 'field',
        label: 'Portrait',
        documentKinds: CHARACTER_KINDS,
        path: ['metadata'],
        valueType: 'image',
        coordinate: 'portrait',
        adapter: portraitAdapter,
    },
    ...METADATA_FIELDS.map(
        ([fieldKey, label]): DocumentBindingDescriptor => ({
            key: `field:${fieldKey}`,
            kind: 'field',
            label,
            documentKinds: CHARACTER_KINDS,
            path: ['metadata', fieldKey],
            valueType: 'string',
            coordinate: toCoordinate(label),
        })
    ),
    {
        key: 'field:notes',
        kind: 'field',
        label: 'Notes',
        documentKinds: CHARACTER_KINDS,
        path: ['notes'],
        valueType: 'string',
        coordinate: 'notes',
    },
    {
        key: 'field:experience-total',
        kind: 'field',
        label: 'Total XP',
        documentKinds: CHARACTER_KINDS,
        path: ['experience', 'total'],
        valueType: 'number',
        coordinate: 'experience-total',
        constrain: constrainExperience,
    },
    {
        key: 'field:experience-spent',
        kind: 'field',
        label: 'Spent XP',
        documentKinds: CHARACTER_KINDS,
        path: ['experience', 'spent'],
        valueType: 'number',
        coordinate: 'experience-spent',
        constrain: constrainExperience,
    },
];

export const starWarsTemplateBindings: readonly DocumentBindingDescriptor[] = [
    ...traitBindings,
    ...resourceBindings,
    ...trackBindings,
    droidDamageBinding,
    ...listBindings,
    ...equipmentBindings,
    ...fieldBindings,
    ...starWarsEntityBindings,
];
