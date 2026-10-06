import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { TemplateNode } from '../../../types/template';
import { isContainerNode, isTemplateField } from '../../../types/template';
import type { SettingsGroupId } from './groupedSettings';

const editor = uiMessages.sheet.templates.editor;
const primitives = uiMessages.sheet.templates.primitives;
const bindings = uiMessages.sheet.templates.binding;

type Message = { message: string };

/**
 * One editor setting, described once (spec 025, FR-003). The panels render the controls; the
 * multi-selection panel, issue locations, and element switches read these descriptions.
 */
export interface SettingDescription {
    /** The settings group the control sits in; issues open it. */
    group: SettingsGroupId | ((node: TemplateNode) => SettingsGroupId);
    /** The control's label; issue messages and switch announcements name the setting by it. */
    label?: Message;
    /** The elements that have the setting (needed by shared and carried settings). */
    appliesTo?: (node: TemplateNode) => boolean;
    /** Several selected elements can change it together (spec 023, research R6). */
    shared?: {
        control: 'toggle' | 'number' | 'text' | 'condition';
        /** A toggle that shows the opposite of the stored flag ("Show label" for `hideLabel`). */
        inverted?: boolean;
    };
    /** The field's own panel already shows it, so the multi-selection panel leaves it out. */
    fieldPanel?: true;
    /** Names or stores one element: never written to several, never "Mixed". */
    identity?: true;
    /** Survives a source or kind switch when the new element has it (spec 025, FR-001). */
    carry?: true;
    /** The stored value that means "not set" (a switch drops it silently). */
    unset?: boolean;
}

const field = (node: TemplateNode) => isTemplateField(node);
/** Fields and the game's own values placed on the page share their label and brief settings. */
const valueElement = (node: TemplateNode) => field(node) || node.type === 'primitive';
const card = (node: TemplateNode) => node.type === 'group';
const container = (node: TemplateNode) => isContainerNode(node);
const numberField = (node: TemplateNode) => node.type === 'number';
const list = (node: TemplateNode) => node.type === 'list';
const any = () => true;

export const SETTINGS = {
    // Content
    label: { group: 'content', label: editor.label, identity: true },
    labelMessage: { group: 'content', identity: true },
    title: { group: 'content', label: editor.title, identity: true },
    titleMessage: { group: 'content', identity: true },
    description: { group: 'content', label: editor.helpText, appliesTo: field, carry: true },
    placeholder: { group: 'content', label: editor.placeholderText },
    options: { group: 'content', label: editor.options, identity: true },
    option: { group: 'content', label: editor.optionLabel },
    preset: { group: 'content', label: primitives.presetLabel },
    type: { group: 'content', label: editor.fieldType, identity: true },
    kind: { group: 'content', label: editor.kind },
    named: { group: 'content', label: editor.listNamed, appliesTo: list, carry: true, unset: true },
    item: { group: 'content' },
    name: { group: 'content', label: editor.name },
    hideLabel: {
        // The game's own values show it with their look settings.
        group: (node) => (node.type === 'primitive' ? 'look' : 'content'),
        label: editor.showLabel,
        appliesTo: valueElement,
        shared: { control: 'toggle', inverted: true },
        fieldPanel: true,
        carry: true,
        unset: false,
    },
    labelPosition: { group: 'content', label: editor.labelPosition, appliesTo: field, carry: true },
    multiline: { group: 'look', label: editor.multiline },
    // Value
    valueKey: { group: 'value', label: editor.valueKey, identity: true },
    bindingKey: { group: 'value', identity: true },
    source: { group: 'value', label: editor.valueSource },
    binding: { group: 'value', identity: true },
    catalog: { group: 'value', label: bindings.attach },
    targetKinds: { group: 'value' },
    multiple: { group: 'value', label: editor.multiple },
    part: { group: 'value', label: editor.primitivePart },
    // Limits
    min: {
        group: 'limits',
        label: editor.numberMin,
        appliesTo: numberField,
        shared: { control: 'number' },
        fieldPanel: true,
    },
    max: {
        group: 'limits',
        label: editor.numberMax,
        appliesTo: numberField,
        shared: { control: 'number' },
        fieldPanel: true,
    },
    step: { group: 'limits', label: editor.numberStep },
    minRows: { group: 'limits', label: editor.minRows },
    maxRows: { group: 'limits', label: editor.maxRows },
    formula: { group: 'limits', label: editor.formula },
    maxFrom: { group: 'limits', label: editor.maxFromShort },
    minFrom: { group: 'limits', label: editor.minFromShort },
    maxMinFrom: { group: 'limits', label: editor.maxAtLeast },
    // Look
    compact: {
        group: 'look',
        label: primitives.compact,
        appliesTo: valueElement,
        shared: { control: 'toggle' },
        carry: true,
        unset: false,
    },
    hideTitle: {
        group: 'look',
        label: editor.showTitle,
        appliesTo: card,
        shared: { control: 'toggle', inverted: true },
        carry: true,
        unset: false,
    },
    span: {
        group: 'look',
        label: editor.columnSpan,
        appliesTo: any,
        shared: { control: 'number' },
        carry: true,
    },
    column: { group: 'look', appliesTo: any, identity: true, carry: true },
    columns: { group: 'look', label: editor.columns },
    columnWidths: { group: 'look', label: editor.columns },
    presets: { group: 'look', label: primitives.presets, appliesTo: list, carry: true },
    showTitle: {
        group: 'look',
        label: editor.listShowTitle,
        appliesTo: list,
        carry: true,
        unset: false,
    },
    framed: { group: 'look', label: editor.listFramed, appliesTo: list, carry: true, unset: false },
    presentation: { group: 'look', label: editor.presentation },
    prefix: { group: 'look', label: editor.formulaPrefix },
    suffix: { group: 'look', label: editor.formulaSuffix },
    hideUnselected: { group: 'look', label: editor.hideUnselected },
    textInput: { group: 'look', label: editor.ratingTextInput },
    showNumbers: { group: 'look', label: editor.ratingShowNumbers },
    dice: { group: 'look', label: editor.ratingDice },
    tracker: { group: 'look' },
    // Visibility
    required: {
        group: 'visibility',
        label: editor.fieldRequired,
        appliesTo: field,
        shared: { control: 'toggle' },
        fieldPanel: true,
    },
    termHint: { group: 'visibility', identity: true },
    termRef: { group: 'visibility', identity: true },
    visibleWhen: {
        group: 'visibility',
        label: editor.visibleWhen,
        appliesTo: any,
        shared: { control: 'condition' },
        carry: true,
    },
    docsPath: {
        group: 'visibility',
        label: editor.docsLink,
        appliesTo: container,
        shared: { control: 'text' },
        carry: true,
    },
    collapsible: { group: 'visibility', label: editor.groupCollapsible },
    defaultCollapsed: {
        group: 'visibility',
        label: editor.startsCollapsed,
        appliesTo: container,
        shared: { control: 'toggle' },
        carry: true,
        unset: false,
    },
    // Structure: never a control, but they name or hold one element.
    id: { group: 'content', identity: true },
    children: { group: 'content', identity: true },
} satisfies Record<string, SettingDescription>;

export type SettingKey = keyof typeof SETTINGS;

export function settingDescription(key: string): SettingDescription | undefined {
    return (SETTINGS as Record<string, SettingDescription>)[key];
}

/** The group a setting sits in for this element; unknown keys are in Look. */
export function settingGroup(key: string, node?: TemplateNode): SettingsGroupId {
    const group = settingDescription(key)?.group;
    if (!group) return 'look';
    return typeof group === 'function' ? (node ? group(node) : 'look') : group;
}

/** Whether the element has the setting (settings without `appliesTo` belong to no switch). */
export function settingApplies(key: string, node: TemplateNode): boolean {
    return settingDescription(key)?.appliesTo?.(node) ?? false;
}

export const SETTING_ENTRIES = Object.entries(SETTINGS) as Array<[SettingKey, SettingDescription]>;

/** The translated label of a setting, as its control shows it. */
export function settingLabel(key: SettingKey): string {
    const label = settingDescription(key)?.label;
    return label ? translate(label) : key;
}
