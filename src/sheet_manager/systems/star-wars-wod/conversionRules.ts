import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { TrackMark } from '../templateBindings';

/** The conversion deliberately uses steeper wound penalties than classic WoD 2e. */
export const CONVERSION_HEALTH_TRACK = {
    id: 'health',
    label: 'Health',
    levels: [
        { id: 'bruised', label: 'Bruised', penalty: null },
        { id: 'hurt', label: 'Hurt', penalty: -1 },
        { id: 'injured', label: 'Injured', penalty: -2 },
        { id: 'wounded', label: 'Wounded', penalty: -3 },
        { id: 'mauled', label: 'Mauled', penalty: -4 },
        { id: 'crippled', label: 'Crippled', penalty: -5 },
        { id: 'incapacitated', label: 'Incapacitated', penalty: null },
    ],
};

const marks = uiMessages.sheet.documents.fields.damageMarks;

export const CONVERSION_HEALTH_MARKS: readonly TrackMark[] = [
    { id: 'slash', label: marks.bashing.message, translation: marks.bashing },
    { id: 'cross', label: marks.lethal.message, translation: marks.lethal },
];
