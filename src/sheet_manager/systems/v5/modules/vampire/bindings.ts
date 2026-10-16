import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type {
    DocumentBindingDescriptor,
    FieldBinding,
    ResourceBinding,
    RowsBinding,
} from '../../../templateBindings';
import { buildV5CoreBindings } from '../../ruleset/bindings';
import { bloodPotencyEffects, type FeedingPenalty, potencyRange } from './bloodPotency';
import { VAMPIRE_CATALOG_IDS } from './catalogs';
import { disciplineDots } from './disciplineDots';
import { rouseAction, rousePowerAction } from './rouse';
import { VAMPIRE_LIMITS } from './schema';

const vampire = uiMessages.sheet.v5Vampire;

const RITUAL_DISCIPLINES = ['blood-sorcery', 'oblivion', 'thin-blood-alchemy'] as const;

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

/** Read-only dots of a discipline the sheet shows or hides parts by (design D4, T017). */
function dots(key: string, disciplineId: string, label: string) {
    return field(key, 'disciplines', {
        label,
        valueType: 'number',
        readOnly: true,
        adapter: { read: (data) => disciplineDots(data, disciplineId), update: () => ({}) },
    });
}

const potencyMessages = vampire.potency;

const potencyOf = (data: unknown) => {
    const value = (data as { bloodPotency?: unknown } | null)?.bloodPotency;
    return bloodPotencyEffects(typeof value === 'number' ? value : 0);
};

/** A read-only Blood Potency effect (design D4); numeric ones are formula coordinates. */
function effect(key: string, label: string, read: (data: unknown) => unknown, numeric = false) {
    return field(key, 'bloodPotency', {
        label,
        valueType: numeric ? 'number' : 'string',
        readOnly: true,
        adapter: { read, update: () => ({}) },
    });
}

const dice = (count: number) =>
    count > 0
        ? { descriptor: potencyMessages.dice, values: { count } }
        : { descriptor: potencyMessages.noDice };

function feedingMessage(penalty: FeedingPenalty) {
    switch (penalty.id) {
        case 'animalHalf':
            return { descriptor: potencyMessages.feeding.animalHalf };
        case 'animalNone':
            return { descriptor: potencyMessages.feeding.animalNone };
        case 'humanLess':
            return {
                descriptor: potencyMessages.feeding.humanLess,
                values: { count: penalty.count },
            };
        case 'mustKill':
            return {
                descriptor: potencyMessages.feeding.mustKill,
                values: { limit: penalty.limit },
            };
    }
}

const potencyBindings: DocumentBindingDescriptor[] = [
    effect('blood-surge', vampire.fields.bloodSurge.message, (data) => dice(potencyOf(data).surge)),
    effect('mend', vampire.fields.mend.message, (data) => ({
        descriptor: potencyMessages.superficial,
        values: { count: potencyOf(data).mend },
    })),
    effect('power-bonus', vampire.fields.powerBonus.message, (data) => dice(potencyOf(data).bonus)),
    effect('rouse-reroll', vampire.fields.rouseReroll.message, (data) => {
        const level = potencyOf(data).reroll;
        return level > 0
            ? { descriptor: potencyMessages.rerollLevel, values: { level } }
            : { descriptor: potencyMessages.noReroll };
    }),
    effect(
        'bane-severity',
        vampire.fields.baneSeverity.message,
        (data) => potencyOf(data).severity,
        true
    ),
    effect('feeding-penalty', vampire.fields.feedingPenalty.message, (data) => {
        const penalties = potencyOf(data).feeding;
        return penalties.length > 0
            ? penalties.map(feedingMessage)
            : { descriptor: potencyMessages.feeding.none };
    }),
    // The generation's range, or a mark when Blood Potency is outside it (FR-009, D8).
    effect('potency-range', vampire.fields.potencyRange.message, (data) => {
        const record = (data ?? {}) as { generation?: unknown; bloodPotency?: unknown };
        const generation = typeof record.generation === 'number' ? record.generation : 13;
        const value = typeof record.bloodPotency === 'number' ? record.bloodPotency : 0;
        const { min, max } = potencyRange(generation);
        return value < min || value > max
            ? { descriptor: potencyMessages.outOfRange, values: { value, min, max, generation } }
            : { descriptor: potencyMessages.range, values: { min, max } };
    }),
];

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
    limit: { entryKey: 'level', column: 'level', parentValue: 'value' },
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
    actions: [rousePowerAction.key],
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
    field('predator-grants', 'predatorType', {
        label: vampire.fields.predatorGrants.message,
        readOnly: true,
        adapter: { read: () => '', update: () => ({}) },
        fallback: {
            catalogId: VAMPIRE_CATALOG_IDS.predatorTypes,
            namePath: ['predatorType'],
            field: 'grants',
        },
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
    field('bane', 'bane', {
        label: vampire.fields.bane.message,
        fallback: {
            catalogId: VAMPIRE_CATALOG_IDS.clans,
            namePath: ['clan'],
            field: (data) =>
                (data as { baneVariant?: string } | null)?.baneVariant === 'variant'
                    ? 'variantBane'
                    : 'bane',
        },
    }),
    field('compulsion', 'compulsion', {
        label: vampire.fields.compulsion.message,
        fallback: {
            catalogId: VAMPIRE_CATALOG_IDS.clans,
            namePath: ['clan'],
            field: 'compulsion',
        },
    }),
    rating('hunger', 'hunger', vampire.fields.hunger.message, VAMPIRE_LIMITS.hunger.max),
    rating(
        'blood-potency',
        'bloodPotency',
        vampire.fields.bloodPotency.message,
        VAMPIRE_LIMITS.bloodPotency.max
    ),
    {
        ...rating(
            'humanity',
            'humanity',
            vampire.fields.humanity.message,
            VAMPIRE_LIMITS.humanity.max
        ),
        mode: 'score',
        score: {
            marksKey: 'stains',
            valueName: vampire.marks.humanity,
            markName: vampire.marks.stain,
            refused: vampire.marks.stainRefused,
        },
    },
    field('stains', 'stains', {
        label: vampire.fields.stains.message,
        valueType: 'number',
        range: { min: 0, max: VAMPIRE_LIMITS.humanity.max },
    }),
    dots('blood-sorcery-dots', 'blood-sorcery', vampire.fields.bloodSorceryDots.message),
    dots('oblivion-dots', 'oblivion', vampire.fields.oblivionDots.message),
    dots('thin-blood-alchemy-dots', 'thin-blood-alchemy', vampire.fields.alchemyDots.message),
    // Rituals, ceremonies, and formulas show while any of their disciplines has dots.
    field('ritual-dots', 'disciplines', {
        label: vampire.sections.rituals.message,
        valueType: 'number',
        readOnly: true,
        adapter: {
            read: (data) =>
                RITUAL_DISCIPLINES.reduce((sum, id) => sum + disciplineDots(data, id), 0),
            update: () => ({}),
        },
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
    },
    powersRows,
    ritualsRows,
];

export const vampireTemplateBindings: readonly DocumentBindingDescriptor[] = [
    ...buildV5CoreBindings(kinds),
    ...vampireBindings,
    ...potencyBindings,
    rouseAction,
    rousePowerAction,
];
