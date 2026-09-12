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
    'vehicle-damage': {
        dataKey: 'damage',
        documentKinds: new Set(['vehicle']),
        levelTranslations: levelMessages.damageLevels,
    },
});

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

const fieldBindings: DocumentBindingDescriptor[] = [
    'name',
    'concept',
    'player',
    'nature',
    'adventure',
    'demeanor',
    'species',
    'age',
    'appearance',
    'biography',
].map((fieldKey) => ({
    key: `field:${fieldKey}`,
    kind: 'field',
    label: fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1),
    documentKinds: CHARACTER_KINDS,
    fieldKey,
    coordinate: toCoordinate(fieldKey),
}));

export const starWarsTemplateBindings: readonly DocumentBindingDescriptor[] = [
    ...traitBindings,
    ...resourceBindings,
    ...trackBindings,
    ...listBindings,
    ...equipmentBindings,
    ...fieldBindings,
];
