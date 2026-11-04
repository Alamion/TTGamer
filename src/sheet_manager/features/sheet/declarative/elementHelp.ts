import type { DocumentBindingDescriptor } from '../../../systems/templateBindings';
import type {
    ListNode,
    PrimitiveNode,
    TableNode,
    TemplateField,
    TemplateFieldType,
} from '../../../types/template';

type ElementHelpType =
    | TemplateFieldType
    | 'table'
    | 'list'
    | 'pool-resource'
    | 'pool-tracker'
    | 'catalog-choice'
    | 'built-in-rows'
    | 'trait-list'
    | 'named-trait-list'
    | 'merit-flaw-list'
    | 'equipment'
    | 'trait-dots'
    | 'trait-dots-specialty'
    | 'trait-number'
    | 'equipment-weapons'
    | 'equipment-inventory';

export type HelpNode = TemplateField | PrimitiveNode | ListNode | TableNode;

/** Default help is about using a control; rules links belong to the node itself. */
export const ELEMENT_HELP: Partial<Record<ElementHelpType, string>> = {
    rating: '/docs/guide/template-editor/elements#rating',
    'pool-resource': '/docs/guide/sheet#resources',
    'pool-tracker': '/docs/guide/sheet#resources',
    tracker: '/docs/guide/template-editor/elements#trackers',
    formula: '/docs/guide/template-editor/values#formulas',
    reference: '/docs/guide/template-editor/elements#references',
    'catalog-choice': '/docs/guide/template-editor/values#catalogs',
    table: '/docs/guide/template-editor/elements#tables',
    'built-in-rows': '/docs/guide/template-editor/elements#tables',
    'trait-list': '/docs/guide/template-editor/elements#lists',
    'named-trait-list': '/docs/guide/template-editor/elements#lists',
    'merit-flaw-list': '/docs/guide/template-editor/elements#lists',
    equipment: '/docs/guide/sheet#equipment',
    'trait-dots': '/docs/guide/template-editor/elements#rating',
    'trait-dots-specialty': '/docs/guide/template-editor/elements#rating',
    'trait-number': '/docs/guide/template-editor/elements#rating',
    'equipment-weapons': '/docs/guide/sheet#equipment',
    'equipment-inventory': '/docs/guide/sheet#equipment',
    markdown: '/docs/guide/template-editor/elements#markdown',
    mentions: '/docs/guide/template-editor/elements#mentions',
    image: '/docs/guide/template-editor/elements#images',
    list: '/docs/guide/template-editor/elements#lists',
    resource: '/docs/guide/sheet#resources',
};

export function elementHelpFor(
    node: HelpNode,
    binding?: DocumentBindingDescriptor
): string | undefined {
    if (node.type !== 'primitive') {
        if (node.type === 'select' && node.binding) return ELEMENT_HELP['catalog-choice'];
        if (node.type === 'resource' && node.poolTracker) return ELEMENT_HELP['pool-tracker'];
        if (node.type === 'rating' && node.presentation === 'tracker') return ELEMENT_HELP.tracker;
        return ELEMENT_HELP[node.type];
    }
    if (binding?.kind === 'resource') {
        return ELEMENT_HELP[
            binding.mode === 'rating'
                ? node.poolTracker
                    ? 'tracker'
                    : 'rating'
                : node.poolTracker
                  ? 'pool-tracker'
                  : 'pool-resource'
        ];
    }
    if (binding?.kind === 'field') {
        return binding.valueType === 'image' ? ELEMENT_HELP.image : undefined;
    }
    if (binding?.kind === 'rows') return ELEMENT_HELP['built-in-rows'];
    if (binding?.kind === 'list') {
        const types = {
            trait: 'trait-list',
            'named-trait': 'named-trait-list',
            'merit-flaw': 'merit-flaw-list',
        } as const;
        return ELEMENT_HELP[types[binding.entryShape]];
    }
    if (binding?.kind === 'equipment') {
        return ELEMENT_HELP[
            binding.sectionId === 'weapons'
                ? 'equipment-weapons'
                : binding.sectionId === 'inventory'
                  ? 'equipment-inventory'
                  : 'equipment'
        ];
    }
    if (binding?.kind === 'trait') {
        return ELEMENT_HELP[
            binding.presentation === 'number'
                ? 'trait-number'
                : binding.row?.specialization === false
                  ? 'trait-dots'
                  : 'trait-dots-specialty'
        ];
    }
    if (binding?.kind === 'track' || node.bindingKey.startsWith('track:'))
        return ELEMENT_HELP.tracker;
    if (node.bindingKey.startsWith('trait:')) return ELEMENT_HELP.rating;
    if (node.bindingKey.startsWith('resource:')) return ELEMENT_HELP.resource;
    return undefined;
}
