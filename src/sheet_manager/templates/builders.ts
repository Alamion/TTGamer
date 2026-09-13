import type {
    CatalogBinding,
    GroupNode,
    ListNode,
    PrimitiveNode,
    SectionNode,
    TableNode,
    TemplateField,
    TemplateNode,
    VisibleWhen,
} from '../types/template';

/**
 * Setting-neutral builders for shipped template trees. They only assemble declarative nodes —
 * no system knowledge — so every setting authors its pages with the same vocabulary. Optional
 * properties are emitted only when given, keeping shipped trees minimal and stable.
 */

/** A translation descriptor as generated in `uiMessages` (only the id is stored). */
export interface MessageRef {
    id: string;
}

interface CommonOptions {
    labelMessage?: MessageRef;
    visibleWhen?: VisibleWhen;
    column?: number;
}

function common(options: CommonOptions) {
    return {
        ...(options.labelMessage ? { labelMessage: options.labelMessage.id } : {}),
        ...(options.visibleWhen ? { visibleWhen: options.visibleWhen } : {}),
        ...(options.column ? { column: options.column } : {}),
    };
}

interface FieldOptions extends CommonOptions {
    compact?: boolean;
    hideLabel?: boolean;
    description?: string;
}

function fieldCommon(options: FieldOptions) {
    return {
        compact: options.compact ?? false,
        required: false,
        ...common(options),
        ...(options.hideLabel ? { hideLabel: true } : {}),
        ...(options.description ? { description: options.description } : {}),
    };
}

export function text(
    id: string,
    label: string,
    valueKey: string,
    options: FieldOptions & { multiline?: boolean; placeholder?: string } = {}
): TemplateField {
    return {
        id,
        type: 'text',
        label,
        valueKey,
        multiline: options.multiline ?? false,
        ...fieldCommon(options),
        ...(options.placeholder ? { placeholder: options.placeholder } : {}),
    };
}

export function number(
    id: string,
    label: string,
    valueKey: string,
    options: FieldOptions & { min?: number; max?: number } = {}
): TemplateField {
    return {
        id,
        type: 'number',
        label,
        valueKey,
        min: options.min ?? 0,
        ...(options.max !== undefined ? { max: options.max } : {}),
        ...fieldCommon(options),
    };
}

export function toggle(
    id: string,
    label: string,
    valueKey: string,
    options: FieldOptions = {}
): TemplateField {
    return { id, type: 'toggle', label, valueKey, ...fieldCommon(options) };
}

export function formula(
    id: string,
    label: string,
    source: string,
    options: FieldOptions & { prefix?: string; suffix?: string } = {}
): TemplateField {
    return {
        id,
        type: 'formula',
        label,
        formula: source,
        ...fieldCommon(options),
        ...(options.prefix ? { prefix: options.prefix } : {}),
        ...(options.suffix ? { suffix: options.suffix } : {}),
    };
}

export function select(
    id: string,
    label: string,
    valueKey: string,
    choices: ReadonlyArray<{ id: string; label: string; labelMessage?: MessageRef }>,
    options: FieldOptions & { binding?: CatalogBinding } = {}
): TemplateField {
    return {
        id,
        type: 'select',
        label,
        valueKey,
        multiple: false,
        options: choices.map(({ labelMessage, ...choice }) => ({
            ...choice,
            ...(labelMessage ? { labelMessage: labelMessage.id } : {}),
        })),
        ...fieldCommon(options),
        ...(options.binding ? { binding: options.binding } : {}),
    };
}

export function reference(
    id: string,
    label: string,
    valueKey: string,
    targetKinds: readonly string[],
    options: FieldOptions & { multiple?: boolean } = {}
): TemplateField {
    return {
        id,
        type: 'reference',
        label,
        valueKey,
        targetKinds: [...targetKinds] as Extract<
            TemplateField,
            { type: 'reference' }
        >['targetKinds'],
        multiple: options.multiple ?? false,
        ...fieldCommon(options),
    };
}

export function primitive(
    id: string,
    bindingKey: string,
    options: CommonOptions & {
        compact?: boolean;
        hideLabel?: boolean;
        label?: string;
        maxFrom?: string;
        minFrom?: string;
        part?: 'current' | 'max';
        maxMembers?: number;
    } = {}
): PrimitiveNode {
    return {
        id,
        type: 'primitive',
        bindingKey,
        compact: options.compact ?? false,
        ...common(options),
        ...(options.hideLabel ? { hideLabel: true } : {}),
        ...(options.label ? { label: options.label } : {}),
        ...(options.maxFrom ? { maxFrom: options.maxFrom } : {}),
        ...(options.minFrom ? { minFrom: options.minFrom } : {}),
        ...(options.part ? { part: options.part } : {}),
        ...(options.maxMembers ? { cohort: { maxMembers: options.maxMembers } } : {}),
    };
}

export function list(
    id: string,
    storage: { bindingKey: string } | { valueKey: string },
    title: string,
    options: CommonOptions & { columns?: number; showTitle?: boolean } = {}
): ListNode {
    return {
        id,
        type: 'list',
        ...storage,
        title,
        columns: options.columns ?? 1,
        ...common(options),
        ...(options.showTitle ? { showTitle: true } : {}),
    };
}

export function table(
    id: string,
    title: string | undefined,
    valueKey: string,
    columns: TemplateField[],
    options: CommonOptions & { minRows?: number; maxRows?: number } = {}
): TableNode {
    return {
        id,
        type: 'table',
        ...(title ? { title } : {}),
        valueKey,
        minRows: options.minRows ?? 0,
        maxRows: options.maxRows ?? 100,
        columns,
        ...common(options),
    };
}

export interface GroupOptions extends CommonOptions {
    defaultCollapsed?: boolean;
    columns?: number;
    columnWidths?: number[];
    collapsible?: boolean;
    hideTitle?: boolean;
    docsPath?: string;
}

export function group(
    id: string,
    title: string,
    children: TemplateNode[],
    options: GroupOptions = {}
): GroupNode {
    return {
        id,
        type: 'group',
        title,
        collapsible: options.collapsible ?? false,
        children,
        ...common(options),
        ...(options.columns ? { columns: options.columns } : {}),
        ...(options.columnWidths ? { columnWidths: options.columnWidths } : {}),
        ...(options.hideTitle ? { hideTitle: true } : {}),
        ...(options.docsPath ? { docsPath: options.docsPath } : {}),
        ...(options.defaultCollapsed ? { collapsible: true, defaultCollapsed: true } : {}),
    };
}

export function section(
    id: string,
    title: string,
    docsPath: string | undefined,
    children: TemplateNode[],
    options: CommonOptions & {
        columns?: number;
        columnWidths?: number[];
        defaultCollapsed?: boolean;
    } = {}
): SectionNode {
    return {
        id,
        type: 'section',
        title,
        children,
        ...common(options),
        ...(docsPath ? { docsPath } : {}),
        ...(options.columns ? { columns: options.columns } : {}),
        ...(options.columnWidths ? { columnWidths: options.columnWidths } : {}),
        ...(options.defaultCollapsed ? { defaultCollapsed: true } : {}),
    };
}
