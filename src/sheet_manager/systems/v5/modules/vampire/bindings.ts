import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type {
    DocumentBindingDescriptor,
    FieldBinding,
    ResourceBinding,
    RowsBinding,
} from '../../../templateBindings';
import { buildV5CoreBindings } from '../../ruleset/bindings';
import { VAMPIRE_CATALOG_IDS } from './catalogs';
import { VAMPIRE_LIMITS } from './schema';

const vampire = uiMessages.sheet.v5Vampire;

export const VAMPIRE_DOCUMENT_KINDS: ReadonlySet<string> = new Set(['vampire']);

const kinds = VAMPIRE_DOCUMENT_KINDS;

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

function rating(id: string, dataKey: string, label: string, maximum: number): ResourceBinding {
    return {
        key: `resource:${id}`,
        kind: 'resource',
        label,
        documentKinds: kinds,
        resourceId: id,
        dataKey,
        mode: 'rating',
        maximum,
        coordinate: id,
    };
}

const textColumn = (key: string, label: { id: string; message: string }) => ({
    key,
    label: label.message,
    translation: label,
    type: 'text' as const,
});

const disciplinesParent = {
    entryKey: 'discipline',
    catalogId: VAMPIRE_CATALOG_IDS.disciplines,
    column: 'discipline',
    namedBy: { dataKey: 'disciplines', column: 'name' },
};

const powersRows: RowsBinding = {
    key: 'rows:powers',
    kind: 'rows',
    label: vampire.sections.powers.message,
    documentKinds: kinds,
    dataKey: 'powers',
    coordinate: 'powers',
    maxRows: VAMPIRE_LIMITS.powers,
    columns: [
        textColumn('name', vampire.fields.power),
        textColumn('discipline', vampire.fields.discipline),
        textColumn('level', vampire.fields.level),
        textColumn('note', vampire.fields.note),
        { ...textColumn('entry', vampire.fields.power), hidden: true },
        { ...textColumn('rouse', vampire.catalogColumns.rouse), hidden: true },
    ],
    catalog: {
        catalogIds: [VAMPIRE_CATALOG_IDS.powers],
        column: 'name',
        fills: { level: 'level', rouse: 'rouse', id: 'entry' },
        parent: disciplinesParent,
    },
};

const ritualsRows: RowsBinding = {
    key: 'rows:rituals',
    kind: 'rows',
    label: vampire.sections.rituals.message,
    documentKinds: kinds,
    dataKey: 'rituals',
    coordinate: 'rituals',
    maxRows: VAMPIRE_LIMITS.rituals,
    columns: [
        textColumn('name', vampire.fields.ritual),
        textColumn('discipline', vampire.fields.discipline),
        textColumn('level', vampire.fields.level),
        textColumn('note', vampire.fields.note),
        { ...textColumn('entry', vampire.fields.ritual), hidden: true },
    ],
    catalog: {
        catalogIds: [VAMPIRE_CATALOG_IDS.rituals],
        column: 'name',
        fills: { level: 'level', id: 'entry' },
        parent: disciplinesParent,
    },
};

const vampireBindings: DocumentBindingDescriptor[] = [
    field('concept', 'concept', { label: vampire.fields.concept.message }),
    field('chronicle', 'chronicle', { label: vampire.fields.chronicle.message }),
    field('sire', 'sire', { label: vampire.fields.sire.message }),
    field('ambition', 'ambition', { label: vampire.fields.ambition.message }),
    field('desire', 'desire', { label: vampire.fields.desire.message }),
    field('clan', 'clan', {
        label: vampire.fields.clan.message,
        suggestions: { catalogId: VAMPIRE_CATALOG_IDS.clans },
    }),
    field('predator-type', 'predatorType', {
        label: vampire.fields.predatorType.message,
        suggestions: { catalogId: VAMPIRE_CATALOG_IDS.predatorTypes },
    }),
    field('generation', 'generation', {
        label: vampire.fields.generation.message,
        valueType: 'number',
        range: { min: VAMPIRE_LIMITS.generation.min, max: VAMPIRE_LIMITS.generation.max },
    }),
    field('bane-variant', 'baneVariant', {
        label: vampire.fields.baneVariant.message,
        valueType: 'enum',
        options: [
            {
                id: 'usual',
                label: vampire.baneVariants.usual.message,
                translation: vampire.baneVariants.usual,
            },
            {
                id: 'variant',
                label: vampire.baneVariants.variant.message,
                translation: vampire.baneVariants.variant,
            },
        ],
    }),
    field('bane', 'bane', { label: vampire.fields.bane.message }),
    field('compulsion', 'compulsion', { label: vampire.fields.compulsion.message }),
    rating('hunger', 'hunger', vampire.fields.hunger.message, VAMPIRE_LIMITS.hunger.max),
    rating(
        'blood-potency',
        'bloodPotency',
        vampire.fields.bloodPotency.message,
        VAMPIRE_LIMITS.bloodPotency.max
    ),
    rating('humanity', 'humanity', vampire.fields.humanity.message, VAMPIRE_LIMITS.humanity.max),
    field('stains', 'stains', {
        label: vampire.fields.stains.message,
        valueType: 'number',
        range: { min: 0, max: VAMPIRE_LIMITS.humanity.max },
    }),
    {
        key: 'list:disciplines',
        kind: 'list',
        label: vampire.sections.disciplineList.message,
        translation: vampire.sections.disciplineList,
        documentKinds: kinds,
        listId: 'disciplines',
        dataKey: 'disciplines',
        entryShape: 'named-trait',
        catalog: { catalogId: VAMPIRE_CATALOG_IDS.disciplines },
        flags: false,
        placeholder: vampire.fields.discipline,
    },
    powersRows,
    ritualsRows,
];

export const vampireTemplateBindings: readonly DocumentBindingDescriptor[] = [
    ...buildV5CoreBindings(kinds),
    ...vampireBindings,
];
