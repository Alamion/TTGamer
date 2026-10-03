import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { usePluralMessage } from '@site/src/shared/hooks/usePluralMessage';
import { type ReactNode, useEffect, useRef } from 'react';

import type { TemplateNode, VisibleWhen } from '../../../types/template';
import { isContainerNode, isTemplateField } from '../../../types/template';
import {
    type ElementActions,
    ElementActionsRow,
    nodeDisplayName,
    nodeKindLabel,
} from './ElementSettings';
import { VisibilityControl } from './LayoutControls';
import { SETTINGS_GROUP_ORDER, type SettingsGroupId } from './settings/groupedSettings';
import { inputClasses } from './settings/inputClasses';
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

/** The node with the setting set (or removed when `undefined`). */
export function writeShared(node: TemplateNode, key: string, value: SharedValue): TemplateNode {
    const next = { ...node } as Record<string, unknown>;
    if (value === undefined) delete next[key];
    else next[key] = value;
    return next as unknown as TemplateNode;
}

function MixedToggle({
    checked,
    label,
    onChange,
    setting,
}: {
    checked: boolean | typeof MIXED;
    label: string;
    onChange: (checked: boolean) => void;
    setting: string;
}) {
    const box = useRef<HTMLInputElement>(null);
    const mixed = checked === MIXED;
    useEffect(() => {
        if (box.current) box.current.indeterminate = mixed;
    }, [mixed]);
    return (
        <label className="flex items-center gap-2 text-xs text-textSecondary">
            <input
                ref={box}
                type="checkbox"
                checked={checked === true}
                aria-checked={mixed ? 'mixed' : checked}
                onChange={(event) => onChange(event.target.checked)}
                data-setting={setting}
                className="h-3.5 w-3.5"
            />
            {label}
        </label>
    );
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
            const stored = value === MIXED ? MIXED : Boolean(value);
            const shown = stored === MIXED ? MIXED : setting.inverted ? !stored : stored;
            return (
                <MixedToggle
                    checked={shown}
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

/**
 * The settings area with several elements selected (spec 023, contract "Settings area with several
 * elements"): the count, the selected names (each opens that element alone), the shared actions,
 * and the settings every selected element has.
 */
export function MultiSettings({
    actions,
    nodes,
    onOpen,
    onShared,
}: {
    actions: ElementActions;
    nodes: readonly TemplateNode[];
    onOpen: (nodeId: string) => void;
    onShared: (key: string, value: SharedValue) => void;
}) {
    const plural = usePluralMessage();
    const settings = sharedSettingsFor(nodes);
    const groups = new Map<SettingsGroupId, ReactNode[]>();
    for (const setting of settings) {
        const list = groups.get(setting.group) ?? [];
        list.push(
            <SharedControl key={setting.key} nodes={nodes} setting={setting} onChange={onShared} />
        );
        groups.set(setting.group, list);
    }
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
            <div>
                {SETTINGS_GROUP_ORDER.filter((id) => groups.has(id)).map((id) => (
                    <SettingsGroup key={id} id={id} nodeId="multiple">
                        {groups.get(id)}
                    </SettingsGroup>
                ))}
            </div>
        </div>
    );
}
