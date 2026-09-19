import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type {
    DocumentBindingDescriptor,
    FieldBinding,
    ResourceBinding,
} from '../../../templateBindings';
import { buildV5CoreBindings } from '../../ruleset/bindings';
import { HUNTER_LIMITS } from './schema';

const hunter = uiMessages.sheet.v5Hunter;

export const HUNTER_DOCUMENT_KINDS: ReadonlySet<string> = new Set(['character']);

const kinds = HUNTER_DOCUMENT_KINDS;

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

/** Desperation and Danger: 0–5 dot ratings, the same resource row as other WoD pools. */
function cellRating(id: 'desperation' | 'danger', label: string): ResourceBinding {
    return {
        key: `resource:${id}`,
        kind: 'resource',
        label,
        documentKinds: kinds,
        resourceId: id,
        dataKey: id,
        mode: 'rating',
        maximum: HUNTER_LIMITS.cellRating.max,
        coordinate: id,
    };
}

const hunterBindings: DocumentBindingDescriptor[] = [
    field('concept', 'concept', { label: hunter.fields.concept.message }),
    field('creed', 'creed', {
        label: hunter.fields.creed.message,
        suggestions: { catalogId: 'v5-hunter-creeds' },
    }),
    field('drive', 'drive', {
        label: hunter.fields.drive.message,
        suggestions: { catalogId: 'v5-hunter-drives' },
    }),
    field('ambition', 'ambition', { label: hunter.fields.ambition.message }),
    field('desire', 'desire', { label: hunter.fields.desire.message }),
    field('redemption', 'redemption', { label: hunter.fields.redemption.message }),
    field('creed-fields', 'creedFields', { label: hunter.fields.creedFields.message }),
    field('despair', 'despair', { label: hunter.fields.despair.message, valueType: 'boolean' }),
    cellRating('desperation', hunter.fields.desperation.message),
    cellRating('danger', hunter.fields.danger.message),
    {
        key: 'rows:edges',
        kind: 'rows',
        label: hunter.sections.edges.message,
        documentKinds: kinds,
        dataKey: 'edges',
        coordinate: 'edges',
        maxRows: HUNTER_LIMITS.edges,
        columns: [
            {
                key: 'name',
                label: hunter.fields.edge.message,
                translation: hunter.fields.edge,
                type: 'text',
            },
            {
                key: 'note',
                label: hunter.fields.note.message,
                translation: hunter.fields.note,
                type: 'text',
            },
        ],
        catalog: { catalogIds: ['v5-hunter-edges'], column: 'name', fills: { name: 'name' } },
    },
    {
        key: 'rows:perks',
        kind: 'rows',
        label: hunter.fields.perks.message,
        documentKinds: kinds,
        dataKey: 'perks',
        coordinate: 'perks',
        maxRows: HUNTER_LIMITS.perks,
        columns: [
            {
                key: 'name',
                label: hunter.fields.perk.message,
                translation: hunter.fields.perk,
                type: 'text',
            },
            {
                key: 'edge',
                label: hunter.fields.edge.message,
                translation: hunter.fields.edge,
                type: 'text',
            },
            {
                key: 'note',
                label: hunter.fields.note.message,
                translation: hunter.fields.note,
                type: 'text',
            },
        ],
        // Perk suggestions follow the hunter's Edges; picking one also names its Edge.
        catalog: {
            catalogIds: ['v5-hunter-perks'],
            column: 'name',
            fills: { name: 'name' },
            parent: {
                entryKey: 'edge',
                catalogId: 'v5-hunter-edges',
                column: 'edge',
                namedBy: { dataKey: 'edges', column: 'name' },
            },
        },
    },
];

/** Hunter catalogs on the shared V5 lists and equipment (the ruleset stays catalog-free). */
function withHunterCatalogs(binding: DocumentBindingDescriptor): DocumentBindingDescriptor {
    if (
        binding.kind === 'list' &&
        (binding.listId === 'advantages' || binding.listId === 'flaws')
    ) {
        const polarity = binding.listId === 'advantages' ? 'positive' : 'negative';
        return {
            ...binding,
            catalog: {
                catalogId: 'v5-hunter-advantages',
                catalogFilter: { key: 'polarity', value: polarity },
            },
        };
    }
    if (binding.kind === 'equipment' && binding.sectionId === 'weapons') {
        return {
            ...binding,
            catalog: {
                catalogIds: ['v5-hunter-weapons'],
                fills: { name: 'name', damage: 'damage' },
            },
        };
    }
    if (binding.kind === 'equipment' && binding.sectionId === 'inventory') {
        return {
            ...binding,
            catalog: {
                catalogIds: ['v5-hunter-gear', 'v5-hunter-armor'],
                fills: { name: 'text', effect: 'effects' },
            },
        };
    }
    return binding;
}

export const hunterTemplateBindings: readonly DocumentBindingDescriptor[] = [
    ...buildV5CoreBindings(kinds).map(withHunterCatalogs),
    ...hunterBindings,
];
