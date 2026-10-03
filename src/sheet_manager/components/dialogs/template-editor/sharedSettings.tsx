import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { Fragment, type ReactNode, useMemo } from 'react';

import type { TemplateField, TemplateNode, VisibleWhen } from '../../../types/template';
import { isContainerNode, isTemplateField } from '../../../types/template';
import { useEditorModel } from './EditorModel';
import {
    type ElementActions,
    ElementActionsRow,
    nodeDisplayName,
    nodeKindLabel,
} from './ElementSettings';
import { type FieldEditorCallbacks, fieldSettings, type SeveralFields } from './FieldEditor';
import { ToggleRow, VisibilityControl } from './LayoutControls';
import {
    type GroupedSettings,
    mergeGroups,
    SETTINGS_GROUP_ORDER,
    type SettingsGroupId,
} from './settings/groupedSettings';
import { inputClasses } from './settings/inputClasses';
import { MixedSettingsContext } from './settings/mixedSettings';
import { SettingField } from './settings/SettingField';
import { SettingsGroup } from './settings/SettingsGroup';

const editor = uiMessages.sheet.templates.editor;
const primitives = uiMessages.sheet.templates.primitives;

type SharedValue = boolean | number | string | VisibleWhen | undefined;

/**
 * A setting several selected elements can change together (spec 023, research R6). Only
 * settings whose meaning is the same for every kind they apply to have a descriptor; settings
 * that identify one element (value key, options, columns, entry field, type, kind) never do.
 */
export interface SharedSetting {
    key: string;
    group: SettingsGroupId;
    label: { message: string };
    control: 'toggle' | 'number' | 'text' | 'condition';
    /** A toggle that shows the opposite of the stored flag ("Show label" for `hideLabel`). */
    inverted?: boolean;
    appliesTo(node: TemplateNode): boolean;
}

const field = (node: TemplateNode) => isTemplateField(node);
/** Fields and the game's own values placed on the page share their label and brief settings. */
const valueElement = (node: TemplateNode) => field(node) || node.type === 'primitive';
const card = (node: TemplateNode) => node.type === 'group';
const container = (node: TemplateNode) => isContainerNode(node);
const numberField = (node: TemplateNode) => node.type === 'number';

export const SHARED_SETTINGS: readonly SharedSetting[] = [
    {
        key: 'hideLabel',
        group: 'content',
        label: editor.showLabel,
        control: 'toggle',
        inverted: true,
        appliesTo: valueElement,
    },
    {
        key: 'min',
        group: 'limits',
        label: editor.numberMin,
        control: 'number',
        appliesTo: numberField,
    },
    {
        key: 'max',
        group: 'limits',
        label: editor.numberMax,
        control: 'number',
        appliesTo: numberField,
    },
    {
        key: 'compact',
        group: 'look',
        label: primitives.compact,
        control: 'toggle',
        appliesTo: valueElement,
    },
    {
        key: 'hideTitle',
        group: 'look',
        label: editor.showTitle,
        control: 'toggle',
        inverted: true,
        appliesTo: card,
    },
    {
        key: 'span',
        group: 'look',
        label: editor.columnSpan,
        control: 'number',
        appliesTo: () => true,
    },
    {
        key: 'required',
        group: 'visibility',
        label: editor.fieldRequired,
        control: 'toggle',
        appliesTo: field,
    },
    {
        key: 'defaultCollapsed',
        group: 'visibility',
        label: editor.startsCollapsed,
        control: 'toggle',
        appliesTo: container,
    },
    {
        key: 'docsPath',
        group: 'visibility',
        label: editor.docsLink,
        control: 'text',
        appliesTo: container,
    },
    {
        key: 'visibleWhen',
        group: 'visibility',
        label: editor.visibleWhen,
        control: 'condition',
        appliesTo: () => true,
    },
];

export const MIXED = Symbol('mixed');

function read(node: TemplateNode, key: string): SharedValue {
    return (node as unknown as Record<string, SharedValue>)[key];
}

/** The common value of a setting, or `MIXED` when the elements differ. */
export function sharedValue(
    nodes: readonly TemplateNode[],
    key: string
): SharedValue | typeof MIXED {
    const values = nodes.map((node) => JSON.stringify(read(node, key) ?? null));
    return values.every((value) => value === values[0]) ? read(nodes[0]!, key) : MIXED;
}

export function sharedSettingsFor(nodes: readonly TemplateNode[]): SharedSetting[] {
    return SHARED_SETTINGS.filter((setting) => nodes.every((node) => setting.appliesTo(node)));
}

/** Settings that name or store one element: never written to several, never "Mixed". */
const OWN_KEYS = new Set([
    'id',
    'type',
    'label',
    'labelMessage',
    'title',
    'titleMessage',
    'valueKey',
    'bindingKey',
    'binding',
    'options',
    'termHint',
    'column',
    'children',
]);

/** The keys whose value differs across the elements, which the panel marks "Mixed". */
export function mixedSettingKeys(nodes: readonly TemplateNode[]): Set<string> {
    const keys = new Set(nodes.flatMap((node) => Object.keys(node)));
    return new Set(
        [...keys].filter((key) => !OWN_KEYS.has(key) && sharedValue(nodes, key) === MIXED)
    );
}

/** The selection when every element is a field of one type, which then shows all its settings. */
export function sameTypeFields(nodes: readonly TemplateNode[]): TemplateField[] | null {
    const [first] = nodes;
    if (!first || !isTemplateField(first)) return null;
    return nodes.every((node) => node.type === first.type) ? (nodes as TemplateField[]) : null;
}

/** Shared settings the field's own settings already show. */
const FIELD_PANEL_KEYS = new Set(['hideLabel', 'required', 'min', 'max']);

/** The node with the setting set (or removed when `undefined`). */
export function writeShared(node: TemplateNode, key: string, value: SharedValue): TemplateNode {
    const next = { ...node } as Record<string, unknown>;
    if (value === undefined) delete next[key];
    else next[key] = value;
    return next as unknown as TemplateNode;
}

function SharedControl({
    nodes,
    onChange,
    setting,
}: {
    nodes: readonly TemplateNode[];
    onChange: (key: string, value: SharedValue) => void;
    setting: SharedSetting;
}) {
    const value = sharedValue(nodes, setting.key);
    const label = translate(setting.label);
    const mixedText = translate(editor.mixed);
    switch (setting.control) {
        case 'toggle': {
            const stored = Boolean(value === MIXED ? false : value);
            return (
                <ToggleRow
                    checked={setting.inverted ? !stored : stored}
                    label={label}
                    setting={setting.key}
                    onChange={(checked) => {
                        const flag = setting.inverted ? !checked : checked;
                        // Optional flags are stored only when on, as the single panels do.
                        onChange(
                            setting.key,
                            setting.key === 'required' ? flag : flag || undefined
                        );
                    }}
                />
            );
        }
        case 'number':
        case 'text':
            return (
                <SettingField label={label} setting={setting.key}>
                    {(control) => (
                        <input
                            {...control}
                            type={setting.control === 'number' ? 'number' : 'text'}
                            value={value === MIXED || value === undefined ? '' : String(value)}
                            placeholder={value === MIXED ? mixedText : undefined}
                            onChange={(event) => {
                                const raw = event.target.value.trim();
                                onChange(
                                    setting.key,
                                    raw === ''
                                        ? undefined
                                        : setting.control === 'number'
                                          ? Number(raw)
                                          : raw
                                );
                            }}
                            className={`${inputClasses} w-full`}
                        />
                    )}
                </SettingField>
            );
        case 'condition':
            return (
                <div className="grid gap-1" data-setting-mixed={value === MIXED ? '' : undefined}>
                    {value === MIXED && (
                        <p className="text-[11px] text-textSecondary">
                            {label}: {mixedText}
                        </p>
                    )}
                    <VisibilityControl
                        value={value === MIXED ? undefined : (value as VisibleWhen | undefined)}
                        onChange={(next) => onChange(setting.key, next)}
                    />
                </div>
            );
    }
}

/** The edits a panel of several fields of one type makes (spec 023, US3). */
export interface SeveralFieldCallbacks {
    onUpdate: FieldEditorCallbacks['onUpdate'];
    onChangeType: FieldEditorCallbacks['onChangeType'];
    onUpdateEach: SeveralFields['onUpdateEach'];
}

// Settings that belong to one field (options, catalog, source) are not shown for several.
const ignore = () => {};

/**
 * The settings area with several elements selected (spec 023, contract "Settings area with several
 * elements"): the count, the selected names (each opens that element alone), the shared actions,
 * and the settings every selected element has. Fields of one type show all the settings of their
 * type, except those that name or store one field.
 */
export function MultiSettings({
    actions,
    fieldCallbacks,
    nodes,
    onOpen,
    onShared,
}: {
    actions: ElementActions;
    fieldCallbacks: SeveralFieldCallbacks;
    nodes: readonly TemplateNode[];
    onOpen: (nodeId: string) => void;
    onShared: (key: string, value: SharedValue) => void;
}) {
    const plural = usePluralMessage();
    const { bindings } = useEditorModel();
    const fields = sameTypeFields(nodes);
    const mixed = useMemo(() => mixedSettingKeys(nodes), [nodes]);
    const shared: Partial<Record<SettingsGroupId, ReactNode[]>> = {};
    for (const setting of sharedSettingsFor(nodes)) {
        if (fields && FIELD_PANEL_KEYS.has(setting.key)) continue;
        (shared[setting.group] ??= []).push(
            <SharedControl key={setting.key} nodes={nodes} setting={setting} onChange={onShared} />
        );
    }
    const parts: GroupedSettings[] = [];
    if (fields) {
        parts.push(
            fieldSettings({
                bindings,
                field: fields[0]!,
                several: { fields, onUpdateEach: fieldCallbacks.onUpdateEach },
                callbacks: {
                    onUpdate: fieldCallbacks.onUpdate,
                    onChangeType: fieldCallbacks.onChangeType,
                    onAddOption: ignore,
                    onUpdateOption: ignore,
                    onRemoveOption: ignore,
                    onAttachCatalog: ignore,
                    onDetachCatalog: ignore,
                    onUpdateFill: ignore,
                    onReplace: ignore,
                },
            })
        );
    }
    parts.push(
        Object.fromEntries(
            SETTINGS_GROUP_ORDER.filter((id) => shared[id]).map((id) => [id, <>{shared[id]}</>])
        )
    );
    return (
        <div data-settings-for="multiple" className="grid gap-3">
            <div className="grid gap-1.5">
                <ElementActionsRow actions={actions} />
                <h4 className="text-sm font-semibold text-textPrimary">
                    {plural(editor.selectedCount, nodes.length, { count: nodes.length })}
                </h4>
            </div>
            <ul aria-label={translate(editor.selectedElements)} className="grid gap-0.5">
                {nodes.map((node) => (
                    <li key={node.id}>
                        <button
                            type="button"
                            onClick={() => onOpen(node.id)}
                            aria-label={translate(editor.openSelected, {
                                name: nodeDisplayName(node),
                            })}
                            className="flex w-full items-baseline gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-secondary/15"
                        >
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-textSecondary">
                                {nodeKindLabel(node)}
                            </span>
                            <span className="min-w-0 truncate text-textPrimary">
                                {nodeDisplayName(node)}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
            <MixedSettingsContext.Provider value={mixed}>
                <div>
                    {mergeGroups(parts).map(({ id, nodes: settings }) => (
                        <SettingsGroup key={id} id={id} nodeId="multiple">
                            {settings.map((setting, index) => (
                                <Fragment key={index}>{setting}</Fragment>
                            ))}
                        </SettingsGroup>
                    ))}
                </div>
            </MixedSettingsContext.Provider>
        </div>
    );
}
