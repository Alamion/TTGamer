import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { Fragment, type ReactNode, useMemo } from 'react';

import type { TemplateField, TemplateNode, VisibleWhen } from '../../../types/template';
import { isTemplateField } from '../../../types/template';
import { elementName, elementTypeLabel } from '../elements/registry';
import { useEditorModel } from '../session/EditorModel';
import { useSelectionActions, useSelectionEdits } from '../session/useNodeEdits';
import {
    type GroupedSettings,
    mergeGroups,
    SETTINGS_GROUP_ORDER,
    type SettingsGroupId,
} from '../settings/groupedSettings';
import { inputClasses } from '../settings/inputClasses';
import { MixedSettingsContext } from '../settings/mixedSettings';
import { SETTING_ENTRIES, settingDescription, settingGroup } from '../settings/registry';
import { SettingField } from '../settings/SettingField';
import { SettingsGroup } from '../settings/SettingsGroup';
import { ElementActionsRow } from './ElementSettings';
import { type FieldEditorCallbacks, fieldSettings, type SeveralFields } from './FieldEditor';
import { ToggleRow, VisibilityControl } from './LayoutControls';

const editor = uiMessages.sheet.templates.editor;

export type SharedValue = boolean | number | string | VisibleWhen | undefined;

/**
 * A setting several selected elements can change together (spec 023, research R6): the shared
 * entries of the setting registry. Settings that identify one element never are.
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

function sharedSetting(key: string, nodes: readonly TemplateNode[]): SharedSetting | undefined {
    const description = settingDescription(key);
    const { shared, appliesTo, label } = description ?? {};
    if (!shared || !appliesTo || !label) return undefined;
    return { key, group: settingGroup(key, nodes[0]), label, appliesTo, ...shared };
}

export const SHARED_SETTINGS: readonly SharedSetting[] = SETTING_ENTRIES.flatMap(([key]) => {
    const setting = sharedSetting(key, []);
    return setting ? [setting] : [];
});

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
    return SHARED_SETTINGS.filter((setting) => nodes.every((node) => setting.appliesTo(node))).map(
        (setting) => ({ ...setting, group: settingGroup(setting.key, nodes[0]) })
    );
}

/** Settings that name or store one element: never written to several, never "Mixed". */
const OWN_KEYS = new Set<string>(
    SETTING_ENTRIES.filter(([, setting]) => setting.identity).map(([key]) => key)
);

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
const FIELD_PANEL_KEYS = new Set<string>(
    SETTING_ENTRIES.filter(([, setting]) => setting.fieldPanel).map(([key]) => key)
);

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
    nodes,
    onOpen,
}: {
    nodes: readonly TemplateNode[];
    onOpen: (nodeId: string) => void;
}) {
    const { fields: fieldCallbacks, onShared } = useSelectionEdits();
    const actions = useSelectionActions(null);
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
                                name: elementName(node),
                            })}
                            className="flex w-full items-baseline gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-secondary/15"
                        >
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-textSecondary">
                                {elementTypeLabel(node)}
                            </span>
                            <span className="min-w-0 truncate text-textPrimary">
                                {elementName(node)}
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
