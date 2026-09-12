import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Plus, X } from 'lucide-react';
import { createElement } from 'react';

import { CollapsibleBlock } from '../../../components/sections/CollapsibleBlock';
import { SectionCard } from '../../../components/sections/SectionCard';
import { resolveDataBindingByCoordinate } from '../../../systems/templateBindings';
import type { CustomTemplate, TemplateField, TemplateNode } from '../../../types/template';
import { fieldValueKey, isContainerNode, tableValueKey } from '../../../types/template';
import { listValueKey } from '../../../types/template';
import { coerceStoredValue } from '../../../types/templateValues';
import { templateFieldControl } from '../registry/declarativeFieldRegistry';
import type { FormulaEvaluationError } from './formula';
import { useTemplatePage, type UseTemplatePageResult } from './hooks';
import { CustomListView, PrimitiveNodeView, SystemListView } from './primitives';

const editor = uiMessages.sheet.templates.editor;
const page = uiMessages.sheet.templates.page;
const binding = uiMessages.sheet.templates.binding;

const columnClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
};

function formulaErrorMessage(reason: FormulaEvaluationError | 'parse', coordinate = ''): string {
    switch (reason) {
        case 'circular':
            return translate(page.formulaReasonCircular);
        case 'division-by-zero':
            return translate(page.formulaReasonDivision);
        case 'non-numeric':
            return translate(page.formulaReasonNonNumeric);
        case 'unknown-coordinate':
        case 'parse':
        default:
            return translate(page.formulaReasonUnknown).replace('{coordinate}', coordinate);
    }
}

function FieldCell({
    field,
    pageApi,
    value,
}: {
    field: TemplateField;
    pageApi: UseTemplatePageResult;
    value: unknown;
}) {
    const template = pageApi.template!;
    // Feature 005 review: a field whose shared value key matches a document data address
    // operates on the document data — the interface is identical to custom (value-bag) fields.
    const bridged = resolveDataBindingByCoordinate(
        template.systemId,
        template.documentKind,
        fieldValueKey(field)
    );
    if (bridged) {
        return (
            <div className="grid gap-1">
                <PrimitiveNodeView
                    node={{
                        id: field.id,
                        type: 'primitive',
                        bindingKey: bridged.key,
                        label: field.label,
                        compact: field.compact,
                    }}
                    systemId={template.systemId}
                    documentKind={template.documentKind}
                />
                {field.description && (
                    <span className="text-xs text-textSecondary">{field.description}</span>
                )}
            </div>
        );
    }

    const control = templateFieldControl(field.type);
    const runtime =
        field.type === 'select' && field.binding ? pageApi.resolveCatalogField(field) : undefined;

    const maxState = pageApi.formulaState.maxima.get(field.id);
    const formulaResult =
        field.type === 'formula'
            ? (() => {
                  const result = pageApi.formulaState.results.get(fieldValueKey(field));
                  if (!result) return undefined;
                  return result.state === 'ok'
                      ? ({ state: 'ok', value: result.value } as const)
                      : ({
                            state: 'error',
                            message: formulaErrorMessage(result.reason, result.coordinate),
                        } as const);
              })()
            : undefined;

    const handleChange = (next: unknown) => {
        pageApi.setValue(fieldValueKey(field), next);
        // Copy-on-select (FR-17): selecting copies mapped details as character-owned values;
        // replacing re-copies, clearing the selection leaves copied values untouched.
        if (
            runtime &&
            !runtime.degraded &&
            field.type === 'select' &&
            field.binding &&
            typeof next === 'string' &&
            next.length > 0
        ) {
            const entry = runtime.getEntry(next);
            if (!entry) return;
            for (const [detailKey, rule] of Object.entries(field.binding.fills)) {
                if (rule.disabled) continue;
                if (!runtime.details.has(detailKey)) continue;
                pageApi.setValue(rule.targetFieldId, runtime.readDetail(entry, detailKey));
            }
        }
    };

    return (
        <div className="grid gap-1">
            <span className="text-xs font-medium text-textSecondary">
                {field.label}
                {field.required && (
                    <span
                        aria-label={translate(editor.fieldRequired)}
                        className="ml-0.5 text-error"
                    >
                        *
                    </span>
                )}
            </span>
            {createElement(control, {
                field,
                value,
                onChange: handleChange,
                disabled: pageApi.disabled,
                resolvedMax: maxState?.resolvedMax,
                maxDegraded: maxState?.degraded,
                formulaResult,
                catalogOptions: runtime?.options,
                documentOptions: pageApi.documentOptions,
            })}
            {runtime?.degraded && (
                <p role="alert" className="text-xs text-error">
                    {translate(binding.degraded, { catalog: runtime.catalogId })}
                </p>
            )}
            {field.description && (
                <span className="text-xs text-textSecondary">{field.description}</span>
            )}
        </div>
    );
}

function TableBlock({
    node,
    pageApi,
}: {
    node: Extract<TemplateNode, { type: 'table' }>;
    pageApi: UseTemplatePageResult;
}) {
    const stored = pageApi.values[tableValueKey(node)];
    const rows =
        typeof stored === 'object' &&
        stored !== null &&
        !('current' in stored) &&
        !Array.isArray(stored)
            ? (stored as Record<string, Record<string, unknown>>)
            : {};
    const rowEntries = Object.entries(rows).sort(([left], [right]) => Number(left) - Number(right));

    return (
        <div className="overflow-x-auto">
            {node.title && (
                <h3 className="mb-2 text-sm font-semibold text-textPrimary">{node.title}</h3>
            )}
            <table className="w-full text-sm">
                <thead>
                    <tr>
                        {node.columns.map((column) => (
                            <th
                                key={column.id}
                                scope="col"
                                className="border-b border-border px-2 py-2 text-left text-xs font-semibold text-textSecondary"
                            >
                                {column.label}
                            </th>
                        ))}
                        <th
                            scope="col"
                            aria-label={translate(editor.remove)}
                            className="w-8 border-b border-border px-1 py-2"
                        />
                    </tr>
                </thead>
                <tbody>
                    {rowEntries.map(([rowIndex, row]) => (
                        <tr key={rowIndex} data-row={rowIndex}>
                            {node.columns.map((column) => {
                                const Control = templateFieldControl(column.type);
                                return (
                                    <td key={column.id} className="px-2 py-1.5 align-top">
                                        <Control
                                            field={column}
                                            value={coerceStoredValue(column, row[column.id])}
                                            onChange={(next) =>
                                                pageApi.setRowValue(
                                                    tableValueKey(node),
                                                    rowIndex,
                                                    column.id,
                                                    next
                                                )
                                            }
                                            disabled={pageApi.disabled}
                                            documentOptions={pageApi.documentOptions}
                                        />
                                    </td>
                                );
                            })}
                            <td className="px-1 py-1.5 align-top">
                                <button
                                    type="button"
                                    onClick={() => pageApi.removeRow(tableValueKey(node), rowIndex)}
                                    disabled={pageApi.disabled || rowEntries.length <= node.minRows}
                                    aria-label={translate(editor.remove)}
                                    className="rounded p-1 text-textSecondary hover:bg-bgBase hover:text-error disabled:opacity-40"
                                >
                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button
                type="button"
                onClick={() => pageApi.addRow(tableValueKey(node))}
                disabled={pageApi.disabled || rowEntries.length >= node.maxRows}
                className="mt-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgBase disabled:opacity-40"
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {translate(editor.addRow)}
            </button>
        </div>
    );
}

function ListView({
    node,
    pageApi,
}: {
    node: Extract<TemplateNode, { type: 'list' }>;
    pageApi: UseTemplatePageResult;
}) {
    if (node.bindingKey) {
        return (
            <SystemListView
                list={node}
                systemId={pageApi.template!.systemId}
                documentKind={pageApi.template!.documentKind}
                disabled={pageApi.disabled}
            />
        );
    }
    const stored: unknown = pageApi.values[listValueKey(node)];
    const entries = Array.isArray(stored)
        ? (stored as Array<{ id: string; label: string; value?: number }>).map((entry) => ({
              id: entry.id,
              label: entry.label,
              value: typeof entry.value === 'number' ? entry.value : 0,
          }))
        : [];
    return (
        <div className="grid gap-1" data-list-columns={node.columns}>
            {node.title && <h3 className="text-sm font-semibold text-textPrimary">{node.title}</h3>}
            <CustomListView
                list={node}
                entries={entries}
                disabled={pageApi.disabled}
                onChange={(next) => pageApi.setValue(listValueKey(node), next)}
            />
        </div>
    );
}

function NodeView({
    node,
    pageApi,
    accentColor,
}: {
    node: TemplateNode;
    pageApi: UseTemplatePageResult;
    accentColor: 'primary' | 'secondary';
}) {
    const template = pageApi.template!;

    if (node.type === 'section') {
        // Presentation (US3): a section is a collapsible block without a background box;
        // docs link and column layout ride on the block header.
        return (
            <CollapsibleBlock
                title={node.title}
                storageKey={`template-${template.id}-${node.id}`}
                docsPath={node.docsPath}
                accentColor={accentColor}
            >
                <ChildrenGrid nodes={node.children} pageApi={pageApi} columns={node.columns} />
            </CollapsibleBlock>
        );
    }

    if (node.type === 'group') {
        // Presentation (US3): a group is a titled surface card; collapsibility is opt-in and
        // remembered per node (storageKey `template-<templateId>-<nodeId>`).
        return (
            <SectionCard
                title={node.title}
                storageKey={node.collapsible ? `template-${template.id}-${node.id}` : undefined}
            >
                <ChildrenGrid nodes={node.children} pageApi={pageApi} columns={node.columns} />
            </SectionCard>
        );
    }

    if (node.type === 'table') return <TableBlock node={node} pageApi={pageApi} />;
    if (node.type === 'list') return <ListView node={node} pageApi={pageApi} />;

    if (node.type === 'primitive') {
        const maxState = pageApi.formulaState.maxima.get(node.id);
        return (
            <PrimitiveNodeView
                node={node}
                systemId={template.systemId}
                documentKind={template.documentKind}
                maxState={maxState}
            />
        );
    }

    // Leaf fields (text/number/toggle/image/formula/select/rating/resource/reference).
    return (
        <FieldCell
            field={node}
            pageApi={pageApi}
            value={coerceStoredValue(node, pageApi.values[fieldValueKey(node)])}
        />
    );
}

function ChildrenGrid({
    nodes,
    pageApi,
    columns,
}: {
    nodes: readonly TemplateNode[];
    pageApi: UseTemplatePageResult;
    columns?: number;
}) {
    if (nodes.length === 0) return null;
    const children = nodes.map((node, index) => (
        <NodeView
            key={node.id}
            node={node}
            pageApi={pageApi}
            // Accent alternation is automatic (by sibling parity), never stored (FR-11).
            accentColor={index % 2 === 0 ? 'primary' : 'secondary'}
        />
    ));
    if (columns && columns > 1) {
        return (
            <div className={clsx('grid gap-4', columnClasses[columns] ?? columnClasses[1])}>
                {children}
            </div>
        );
    }
    return <div className="grid gap-4">{children}</div>;
}

/** Counts unfilled required fields for the FR-4a soft-advisory note (walks the whole tree). */
export function countUnfilledRequired(
    template: CustomTemplate,
    values: Record<string, unknown>
): number {
    let count = 0;
    const isField = (node: TemplateNode): node is TemplateField =>
        !isContainerNode(node) &&
        node.type !== 'table' &&
        node.type !== 'list' &&
        node.type !== 'primitive';
    walkChildren(template.children);
    function walkChildren(children: readonly TemplateNode[]): void {
        for (const node of children) {
            if (node.type === 'section' || node.type === 'group') {
                walkChildren(node.children);
                continue;
            }
            if (node.type === 'table') {
                for (const column of node.columns) countRequired(column);
                continue;
            }
            if (isField(node)) countRequired(node);
        }
    }
    function countRequired(field: TemplateField): void {
        if (!field.required) return;
        const raw = values[fieldValueKey(field)];
        if (raw === undefined || raw === '' || (Array.isArray(raw) && raw.length === 0)) {
            count += 1;
        }
    }
    return count;
}

export function DeclarativeSheetView({ template }: { template: CustomTemplate }) {
    const pageApi = useTemplatePage(template);

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
            <ChildrenGrid nodes={template.children} pageApi={pageApi} />
        </div>
    );
}
