import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { DocumentViewLabel } from '../../types';

/**
 * V5 trait vocabulary shared by every V5 line: nine attributes in three groups and 27 skills in
 * three columns. Keys are the persisted record keys and the formula coordinates.
 */

export interface V5TraitDefinition {
    key: string;
    label: DocumentViewLabel;
}

export interface V5TraitGroup {
    id: 'physical' | 'social' | 'mental';
    label: DocumentViewLabel;
    traits: readonly V5TraitDefinition[];
}

const attributes = uiMessages.sheet.v5.attributes;
const skills = uiMessages.sheet.v5.skills;

const trait = (key: string, label: DocumentViewLabel): V5TraitDefinition => ({ key, label });

export const V5_ATTRIBUTE_GROUPS: readonly V5TraitGroup[] = [
    {
        id: 'physical',
        label: attributes.physical,
        traits: [
            trait('strength', attributes.strength),
            trait('dexterity', attributes.dexterity),
            trait('stamina', attributes.stamina),
        ],
    },
    {
        id: 'social',
        label: attributes.social,
        traits: [
            trait('charisma', attributes.charisma),
            trait('manipulation', attributes.manipulation),
            trait('composure', attributes.composure),
        ],
    },
    {
        id: 'mental',
        label: attributes.mental,
        traits: [
            trait('intelligence', attributes.intelligence),
            trait('wits', attributes.wits),
            trait('resolve', attributes.resolve),
        ],
    },
];

/** Skills in the three printed columns (physical, social, mental). */
export const V5_SKILL_GROUPS: readonly V5TraitGroup[] = [
    {
        id: 'physical',
        label: attributes.physical,
        traits: [
            trait('athletics', skills.athletics),
            trait('brawl', skills.brawl),
            trait('craft', skills.craft),
            trait('driving', skills.driving),
            trait('firearms', skills.firearms),
            trait('larceny', skills.larceny),
            trait('melee', skills.melee),
            trait('stealth', skills.stealth),
            trait('survival', skills.survival),
        ],
    },
    {
        id: 'social',
        label: attributes.social,
        traits: [
            trait('animal-ken', skills.animalKen),
            trait('etiquette', skills.etiquette),
            trait('insight', skills.insight),
            trait('intimidation', skills.intimidation),
            trait('leadership', skills.leadership),
            trait('performance', skills.performance),
            trait('persuasion', skills.persuasion),
            trait('streetwise', skills.streetwise),
            trait('subterfuge', skills.subterfuge),
        ],
    },
    {
        id: 'mental',
        label: attributes.mental,
        traits: [
            trait('academics', skills.academics),
            trait('awareness', skills.awareness),
            trait('finance', skills.finance),
            trait('investigation', skills.investigation),
            trait('medicine', skills.medicine),
            trait('occult', skills.occult),
            trait('politics', skills.politics),
            trait('science', skills.science),
            trait('technology', skills.technology),
        ],
    },
];

export const V5_ATTRIBUTE_KEYS: readonly string[] = V5_ATTRIBUTE_GROUPS.flatMap((group) =>
    group.traits.map(({ key }) => key)
);

export const V5_SKILL_KEYS: readonly string[] = V5_SKILL_GROUPS.flatMap((group) =>
    group.traits.map(({ key }) => key)
);
