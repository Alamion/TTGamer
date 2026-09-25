import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { DocumentBindingDescriptor } from '../templateBindings';
import {
    buildWodResourceBindings,
    buildWodTrackBindings,
    buildWodTraitBindings,
} from '../wod-like/templateBindings';
import {
    wod2eEquipmentBindings,
    wod2eFieldBindings,
    wod2eListBindings,
} from '../wod2e/ruleset/bindings';
import { starWarsEntityBindings } from './entityBindings';
import { starWarsWodProfile } from './profile';

/**
 * Star Wars WoD template bindings: the declaration of which document data a template may bind
 * to. Traits, resources, and tracks derive from the system profile (single owner of names and
 * limits); lists, equipment, and identity fields come from the WoD 2e ruleset with the
 * setting's additions (Force powers, implants, species and home world, its catalogs).
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

const listBindings = wod2eListBindings(CHARACTER_KINDS, {
    settingLists: [
        {
            listId: 'forcePowers',
            label: 'Force Powers',
            // `forcePowerItems` is the single Force-power representation.
            dataKey: 'forcePowerItems',
            entryShape: 'named-trait',
            catalog: { catalogId: 'force-powers' },
        },
    ],
    catalogs: { meritsFlaws: 'merits-flaws', backgrounds: 'backgrounds' },
});

const equipmentBindings = wod2eEquipmentBindings(CHARACTER_KINDS, [
    { sectionId: 'implants', label: 'Implants & Cyberware' },
]);

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

const fieldBindings = wod2eFieldBindings(CHARACTER_KINDS, METADATA_FIELDS);

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
