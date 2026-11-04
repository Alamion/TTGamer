import type { DocumentBindingDescriptor } from '../../../systems/templateBindings';
import type { PrimitiveNode, TemplateField, TemplateFieldType } from '../../../types/template';

/** Default help is about using a control; rules links belong to the node itself. */
export const ELEMENT_HELP: Partial<Record<TemplateFieldType, string>> = {
    markdown: '/docs/guide/notes#syntax',
};

export function elementHelpFor(
    node: TemplateField | PrimitiveNode,
    binding?: DocumentBindingDescriptor
): string | undefined {
    if (node.type !== 'primitive') {
        const type =
            (node.type === 'rating' && node.presentation === 'tracker') ||
            (node.type === 'resource' && node.poolTracker)
                ? 'tracker'
                : node.type;
        return ELEMENT_HELP[type];
    }
    if (binding?.kind === 'resource' && !node.poolTracker) {
        return ELEMENT_HELP[binding.mode === 'rating' ? 'rating' : 'resource'];
    }
    if (binding?.kind === 'field') {
        const types = {
            string: 'text',
            number: 'number',
            boolean: 'toggle',
            image: 'image',
            enum: 'select',
        } as const;
        return ELEMENT_HELP[types[binding.valueType]];
    }
    if (binding?.kind === 'track' || node.bindingKey.startsWith('track:') || node.poolTracker)
        return ELEMENT_HELP.tracker;
    if (node.bindingKey.startsWith('trait:')) return ELEMENT_HELP.rating;
    if (node.bindingKey.startsWith('resource:')) return ELEMENT_HELP.resource;
    return undefined;
}
