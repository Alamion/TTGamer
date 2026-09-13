import type {
    DocumentBindingDescriptor,
    EquipmentBinding,
    FieldBinding,
    ListBinding,
    ResourceBinding,
    TraitBinding,
} from '../../../systems/templateBindings';
import type { ListNode, PrimitiveNode, TemplateField, TemplateNode } from '../../../types/template';
import { fieldValueKey } from '../../../types/template';

/**
 * Where an element's value lives, as the editor presents it: a custom value in the template, or
 * a character-sheet value. Switching the source rebuilds the node in the shape that source
 * needs (traits and details are bridged fields; resources and equipment are primitives), keeping
 * the element's id and layout settings.
 */
export const CUSTOM_SOURCE = 'custom';

export type ValueSourceBinding = TraitBinding | ResourceBinding | FieldBinding;
export type ListSourceBinding = ListBinding | EquipmentBinding;

type FieldLike = TemplateField | PrimitiveNode;
type ListLike = ListNode | PrimitiveNode;

function carried(node: TemplateNode) {
    return {
        id: node.id,
        ...('compact' in node && node.compact ? { compact: true } : {}),
        ...(node.column !== undefined ? { column: node.column } : {}),
        ...('hideLabel' in node && node.hideLabel ? { hideLabel: true } : {}),
    };
}

export function isValueSource(binding: DocumentBindingDescriptor): binding is ValueSourceBinding {
    return binding.kind === 'trait' || binding.kind === 'resource' || binding.kind === 'field';
}

export function isListSource(binding: DocumentBindingDescriptor): binding is ListSourceBinding {
    return binding.kind === 'list' || binding.kind === 'equipment';
}

/** The binding key a field-like element reads from, or `custom`. */
export function currentValueSource(
    node: FieldLike,
    bindings: readonly DocumentBindingDescriptor[]
): string {
    if (node.type === 'primitive') return node.bindingKey;
    const coordinate = fieldValueKey(node);
    const bridged = bindings.find(
        (binding) =>
            (binding.kind === 'trait' || binding.kind === 'resource' || binding.kind === 'field') &&
            binding.coordinate === coordinate
    );
    return bridged?.key ?? CUSTOM_SOURCE;
}

export function fieldFromSource(
    node: FieldLike,
    source: ValueSourceBinding | undefined
): TemplateNode {
    const base = carried(node);
    const label = source?.label ?? ('label' in node && node.label ? node.label : 'New field');
    if (!source) {
        return node.type === 'primitive'
            ? { ...base, type: 'number', label, required: false, compact: base.compact ?? false }
            : { ...node, ...base, valueKey: undefined, labelMessage: undefined };
    }
    switch (source.kind) {
        case 'trait':
            return {
                ...base,
                type: 'rating',
                label,
                required: false,
                compact: base.compact ?? false,
                min: 0,
                max: source.maximum,
                presentation: 'dots',
                valueKey: source.coordinate,
            };
        case 'resource':
            return {
                ...base,
                type: 'primitive',
                bindingKey: source.key,
                label,
                compact: base.compact ?? false,
            };
        case 'field': {
            const shared = {
                ...base,
                label,
                required: false,
                compact: base.compact ?? false,
                valueKey: source.coordinate,
            };
            if (source.valueType === 'number') return { ...shared, type: 'number', min: 0 };
            if (source.valueType === 'image') return { ...shared, type: 'image' };
            return { ...shared, type: 'text', multiline: source.path.at(-1) === 'biography' };
        }
    }
}

/** The binding key a list-like element reads from, or `custom`. */
export function currentListSource(node: ListLike): string {
    if (node.type === 'primitive') return node.bindingKey;
    return node.bindingKey ?? CUSTOM_SOURCE;
}

export function listFromSource(
    node: ListLike,
    source: ListSourceBinding | undefined
): TemplateNode {
    const base = carried(node);
    const title = node.type === 'list' ? node.title : node.label;
    if (source?.kind === 'equipment') {
        return {
            ...base,
            type: 'primitive',
            bindingKey: source.key,
            label: source.label,
            compact: false,
        };
    }
    const shared: ListNode = {
        ...base,
        type: 'list',
        columns: node.type === 'list' ? node.columns : 1,
        ...(node.type === 'list' && node.showTitle ? { showTitle: true } : {}),
        ...(node.type === 'list' && node.framed ? { framed: true } : {}),
        ...(node.type === 'list' && node.presets ? { presets: node.presets } : {}),
        ...(source || title ? { title: source?.label ?? title } : {}),
    };
    return source
        ? { ...shared, bindingKey: source.key }
        : {
              ...shared,
              valueKey:
                  node.type === 'list' && node.valueKey ? node.valueKey : `${node.id}-entries`,
          };
}
