import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { portraitFieldBinding, showPortraitFieldBinding } from '../../portraitBinding';
import type {
    DocumentBindingDescriptor,
    FieldBinding,
    TrackBinding,
    TraitBinding,
} from '../../templateBindings';
import { HUNTER_EDGES_CATALOG } from '../modules/hunter/catalogs';
import { VAMPIRE_CATALOG_IDS } from '../modules/vampire/catalogs';
import { V5_SKILLS_CATALOG_ID } from '../ruleset/catalogs';
import { STORYTELLER_LIMITS, STORYTELLER_TYPES } from './storyteller';

export const STORYTELLER_KIND = 'storyteller';

const kinds: ReadonlySet<string> = new Set([STORYTELLER_KIND]);
const v5 = uiMessages.sheet.v5;
const storyteller = v5.storyteller;

function field(key: string, path: string, extra: Partial<FieldBinding> & { label: string }) {
    return {
        key: `field:${key}`,
        kind: 'field' as const,
        documentKinds: kinds,
        path: [path],
        valueType: 'string' as const,
        coordinate: key,
        ...extra,
    } satisfies FieldBinding;
}

const pool = (key: 'physical' | 'social' | 'mental'): TraitBinding => ({
    key: `trait:pools:${key}`,
    kind: 'trait',
    label: storyteller.fields[key].message,
    documentKinds: kinds,
    map: 'pools',
    traitKey: key,
    minimum: STORYTELLER_LIMITS.pool.min,
    maximum: STORYTELLER_LIMITS.pool.max,
    defaultValue: 2,
    coordinate: key,
    row: { specialization: false, flags: false },
    presentation: 'number',
});

/** Health and Willpower of the length the Storyteller sets with the track's +/− (spec 040 D4). */
const track = (id: 'health' | 'willpower', label: string): TrackBinding => ({
    key: `track:${id}`,
    kind: 'track',
    label,
    documentKinds: kinds,
    trackId: id,
    dataKey: id,
    marks: [
        {
            id: 'slash',
            label: v5.trackMarks.superficial.message,
            translation: v5.trackMarks.superficial,
        },
        {
            id: 'cross',
            label: v5.trackMarks.aggravated.message,
            translation: v5.trackMarks.aggravated,
        },
    ],
    levels: [],
    length: {
        from: String(STORYTELLER_LIMITS.track.base),
        adjustmentKey: 'bonus',
        adjustmentRange: {
            min: STORYTELLER_LIMITS.track.min - STORYTELLER_LIMITS.track.base,
            max: STORYTELLER_LIMITS.track.max - STORYTELLER_LIMITS.track.base,
        },
        maxLength: STORYTELLER_LIMITS.track.max,
    },
});

export const storytellerTemplateBindings: readonly DocumentBindingDescriptor[] = [
    field('name', 'name', { label: v5.fields.name.message, syncsTitle: true }),
    field('concept', 'concept', { label: storyteller.fields.concept.message }),
    field('storyteller-type', 'type', {
        label: storyteller.fields.kind.message,
        valueType: 'enum',
        options: STORYTELLER_TYPES.map((id) => ({
            id,
            label: storyteller.kinds[id].message,
            translation: storyteller.kinds[id],
        })),
    }),
    field('difficulty', 'difficulty', {
        label: storyteller.fields.difficulty.message,
        valueType: 'number',
        range: STORYTELLER_LIMITS.difficulty,
    }),
    pool('physical'),
    pool('social'),
    pool('mental'),
    track('health', v5.sections.health.message),
    track('willpower', v5.sections.willpower.message),
    {
        key: 'list:exceptional',
        kind: 'list',
        label: storyteller.sections.exceptional.message,
        translation: storyteller.sections.exceptional,
        documentKinds: kinds,
        listId: 'exceptional',
        dataKey: 'exceptional',
        entryShape: 'named-trait',
        catalog: { catalogId: V5_SKILLS_CATALOG_ID },
        flags: false,
        placeholder: storyteller.placeholders.exceptional,
        maximum: STORYTELLER_LIMITS.pool.max,
        presentation: 'number',
    },
    {
        key: 'list:powers',
        kind: 'list',
        label: storyteller.sections.powers.message,
        translation: storyteller.sections.powers,
        documentKinds: kinds,
        listId: 'powers',
        dataKey: 'powers',
        entryShape: 'named-trait',
        catalog: {
            catalogId: VAMPIRE_CATALOG_IDS.disciplines,
            catalogIds: [HUNTER_EDGES_CATALOG.catalogId],
        },
        flags: false,
        placeholder: storyteller.placeholders.power,
        maximum: STORYTELLER_LIMITS.powerDots.max,
    },
    field('notes', 'notes', { label: storyteller.sections.notes.message }),
    portraitFieldBinding(kinds),
    showPortraitFieldBinding(kinds),
];
