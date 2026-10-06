import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type {
    DocumentBindingDescriptor,
    EquipmentBinding,
    FieldBinding,
    ListBinding,
    ResourceBinding,
    TrackBinding,
    TraitBinding,
} from '../../systems/templateBindings';
import type {
    ListNode,
    PrimitiveNode,
    TemplateField,
    TemplateNode,
    TrackerField,
} from '../../types/template';
import { fieldValueKey } from '../../types/template';
import { defaultTrackerSettings } from '../sheet/data/trackerDefaults';
import { keepSettings } from './settings/keepSettings';

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

/** The element's id; its carried settings are added by `keepSettings` (spec 025). */
function carried(node: TemplateNode) {
    return { id: node.id };
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
    return keepSettings(node, buildField(node, source));
}

function buildField(node: FieldLike, source: ValueSourceBinding | undefined): TemplateNode {
    const base = carried(node);
    const label =
        source?.label ??
        ('label' in node && node.label
            ? node.label
            : translate(uiMessages.sheet.templates.editor.newField));
    if (!source) {
        return node.type === 'primitive'
            ? { ...base, type: 'number', label, required: false, compact: false }
            : {
                  ...node,
                  ...base,
                  valueKey: undefined,
                  labelMessage: undefined,
                  termRef: undefined,
                  termHint: undefined,
              };
    }
    switch (source.kind) {
        case 'trait':
            return {
                ...base,
                type: 'rating',
                label,
                required: false,
                compact: false,
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
                compact: false,
                // A resource drawn as a tracker keeps its look on the game's pool (spec 020).
                ...(node.type === 'resource' && node.poolTracker
                    ? { poolTracker: node.poolTracker }
                    : {}),
            };
        case 'field': {
            const shared = {
                ...base,
                label,
                required: false,
                compact: false,
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
    // Equipment sections decide their own look.
    return keepSettings(
        node,
        buildList(node, source),
        source?.kind === 'equipment' ? ['compact'] : []
    );
}

function buildList(node: ListLike, source: ListSourceBinding | undefined): TemplateNode {
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
              // The entry template stays with the custom list (system lists have none).
              ...(node.type === 'list' && node.item ? { item: node.item } : {}),
              ...(node.type === 'list' && node.named === false ? { named: false } : {}),
          };
}

type TrackerLike = TrackerField | PrimitiveNode;

/** The track binding a tracker reads from, or `custom` for its own values. */
export function currentTrackerSource(node: TrackerLike): string {
    return node.type === 'primitive' ? node.bindingKey : CUSTOM_SOURCE;
}

/**
 * Switches a tracker between its own values and a game's built-in track (spec 018, R8): the
 * display, value column, extra columns, and total carry over; levels and marks become the
 * game's, or start from the default health track.
 */
export function trackerFromSource(
    node: TrackerLike,
    source: TrackBinding | undefined
): TemplateNode {
    // A tracker's look is its display setting; `compact` stays off.
    return keepSettings(node, buildTracker(node, source), ['compact']);
}

function buildTracker(node: TrackerLike, source: TrackBinding | undefined): TemplateNode {
    const base = carried(node);
    if (source) {
        const own = node.type === 'tracker' ? node : undefined;
        const kept = node.type === 'primitive' ? node.tracker : undefined;
        // An own tracker's first marks column becomes the game's; the others stay as extras.
        const firstMarks = own?.columns.findIndex(({ kind }) => kind === 'marks') ?? -1;
        const extras = own ? own.columns.filter((_, index) => index !== firstMarks) : kept?.columns;
        return {
            ...base,
            type: 'primitive',
            bindingKey: source.key,
            label: node.label ?? source.label,
            compact: false,
            tracker: {
                display: own?.display ?? kept?.display ?? 'table',
                ...(own
                    ? { valueColumn: own.valueColumn, total: own.total, legend: own.legend }
                    : {}),
                ...(kept?.valueColumn ? { valueColumn: kept.valueColumn } : {}),
                ...(kept?.total !== undefined ? { total: kept.total } : {}),
                ...(kept?.legend !== undefined ? { legend: kept.legend } : {}),
                ...(extras && extras.length > 0 ? { columns: extras } : {}),
            },
        };
    }
    if (node.type === 'tracker') return node;
    const defaults = defaultTrackerSettings();
    const settings = node.tracker;
    return {
        ...base,
        type: 'tracker',
        label: node.label ?? translate(uiMessages.sheet.templates.tracker.defaultLabel),
        required: false,
        compact: false,
        ...defaults,
        ...(settings?.display ? { display: settings.display } : {}),
        ...(settings?.valueColumn ? { valueColumn: settings.valueColumn } : {}),
        ...(settings?.total !== undefined ? { total: settings.total } : {}),
        ...(settings?.legend !== undefined ? { legend: settings.legend } : {}),
        columns: [...defaults.columns, ...(settings?.columns ?? [])],
    };
}
