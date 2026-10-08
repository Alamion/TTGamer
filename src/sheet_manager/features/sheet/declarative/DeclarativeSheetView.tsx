import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { parseDocsLink } from '@site/src/shared/utils/docsLink';
import { clsx } from 'clsx';
import { Plus, X } from 'lucide-react';
import {
    createElement,
    type CSSProperties,
    Fragment,
    memo,
    type ReactNode,
    useContext,
    useEffect,
    useMemo,
} from 'react';

import { CatalogSuggest } from '../../../components/controls/CatalogSuggest';
import {
    fallbackRowName,
    RowMoveControls,
    rowMoveKeys,
} from '../../../components/controls/RowMoveControls';
import { CollapsibleBlock } from '../../../components/sections/CollapsibleBlock';
import { SectionCard } from '../../../components/sections/SectionCard';
import { TermHintProvider } from '../../../components/terms/TermHintProvider';
import { termLinkOf } from '../../../components/terms/termLink';
import { reportSheetIssue } from '../../../diagnostics';
import type { FieldBinding } from '../../../systems/templateBindings';
import {
    clampFieldNumber,
    fieldBindingUpdate,
    readDataPath,
    resolveDataBindingByCoordinate,
} from '../../../systems/templateBindings';
import { isUserCatalogId } from '../../../systems/userCatalogs';
import type { CustomTemplate, TemplateField, TemplateNode } from '../../../types/template';
import { fieldValueKey, isTemplateField, tableValueKey } from '../../../types/template';
import {
    coerceStoredValue,
    pickLabelKey,
    type RatingDetail,
    ratingDetailKey,
    readRatingDetail,
} from '../../../types/templateValues';
import { readCatalogDetails } from '../data/catalogBindings';
import { templateFieldControl } from '../registry/declarativeFieldRegistry';
import { useBoundDocument } from './boundDocument';
import { useCatalogSuggestions } from './catalogSuggestions';
import {
    OverlayVersionContext,
    type TemplateEditorOverlay,
    useTemplateEditorOverlay,
} from './editorOverlay';
import type { FormulaEvaluationError } from './formula';
import { type CatalogFieldRuntime, useTemplatePage, type UseTemplatePageResult } from './hooks';
import { LabeledField } from './LabeledField';
import { CustomListView } from './listEntries';
import { localizeTemplate } from './localizeTemplate';
import { PrimitiveNodeView, SystemListView } from './primitives';

const editor = uiMessages.sheet.templates.editor;
const rowMessages = uiMessages.sheet.documents.rows;
const page = uiMessages.sheet.templates.page;
const binding = uiMessages.sheet.templates.binding;

const columnClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
};

/**
 * Column span classes per breakpoint, matching `columnClasses`: 3- and 4-column grids have two
 * columns at `md`, so a wide span there covers the whole row; proportional grids have every
 * column from `md`.
 */
function spanClass(span: number, columns: number, proportional: boolean): string | undefined {
    const size = Math.min(span, columns);
    if (size < 2) return undefined;
    if (proportional) return ['', '', 'md:col-span-2', 'md:col-span-3', 'md:col-span-4'][size];
    if (columns === 2) return 'md:col-span-2';
    return size === 2
        ? 'md:col-span-2'
        : `md:col-span-2 ${size === 3 ? 'xl:col-span-3' : 'xl:col-span-4'}`;
}

function formulaErrorMessage(reason: FormulaEvaluationError | 'parse', coordinate = ''): string {
    switch (reason) {
        case 'circular':
            return translate(page.formulaReasonCircular);
        case 'division-by-zero':
            return translate(page.formulaReasonDivision);
        case 'non-numeric':
            return translate(page.formulaReasonNonNumeric);
        case 'parse':
            return translate(page.formulaReasonInvalid);
        case 'unknown-coordinate':
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
    if (bridged?.kind === 'field') {
        return <BoundFieldCell field={field} binding={bridged} />;
    }
    if (bridged) {
        return (
            <div className="grid grid-cols-1 gap-1">
                <PrimitiveNodeView
                    node={{
                        id: field.id,
                        type: 'primitive',
                        bindingKey: bridged.key,
                        label: field.label,
                        ...(field.labelMessage ? { labelMessage: field.labelMessage } : {}),
                        ...(field.termRef ? { termRef: field.termRef } : {}),
                        ...(field.termHint === false ? { termHint: false } : {}),
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
        // Copy-on-select (feature 007 contract): picking an entry overwrites every mapped target
        // with the entry's value (bag or document data) in one change; a detail the entry lacks
        // leaves its target untouched, an empty one clears it; clearing the selection copies nothing.
        if (
            runtime &&
            !runtime.degraded &&
            field.type === 'select' &&
            field.binding &&
            typeof next === 'string' &&
            next.length > 0
        ) {
            const details = readCatalogDetails(runtime.catalogId, next);
            const fills = details
                ? Object.entries(field.binding.fills)
                      .filter(
                          ([detailKey, rule]) => !rule.disabled && runtime.details.has(detailKey)
                      )
                      .map(([detailKey, rule]) => ({
                          target: rule.targetFieldId,
                          value: details[detailKey],
                      }))
                : [];
            // A user catalog pick also keeps the entry's name, shown if the entry is later deleted.
            const picked = isUserCatalogId(runtime.catalogId)
                ? runtime.options.find((option) => option.value === next)?.label
                : undefined;
            pageApi.applyWrites([
                { target: fieldValueKey(field), value: next },
                ...(picked ? [{ target: pickLabelKey(fieldValueKey(field)), value: picked }] : []),
                ...fills,
            ]);
            return;
        }
        pageApi.setValue(fieldValueKey(field), next);
    };

    const detailKey = field.type === 'rating' ? ratingDetailKey(fieldValueKey(field)) : undefined;
    const pickedLabel = runtime ? pageApi.values[pickLabelKey(fieldValueKey(field))] : undefined;
    const controlElement = createElement(control, {
        field,
        value,
        ...(typeof pickedLabel === 'string' ? { pickedLabel } : {}),
        ...(runtime && !runtime.degraded && runtime.options.length === 0
            ? { catalogEmpty: true }
            : {}),
        ...(detailKey
            ? {
                  ratingDetail: readRatingDetail(pageApi.values[detailKey]),
                  onDetailChange: (next: RatingDetail) => pageApi.setValue(detailKey, next),
              }
            : {}),
        onChange: handleChange,
        disabled: pageApi.disabled,
        resolvedMax: maxState?.resolvedMax,
        maxDegraded: maxState?.degraded,
        formulaResult,
        catalogOptions: runtime?.options,
        documentOptions: pageApi.documentOptions,
        onOpenDocument: pageApi.openDocument,
        previewSource: pageApi.previewSource,
        ...(field.type === 'tracker' ? { rawValue: pageApi.values[fieldValueKey(field)] } : {}),
    });
    // Computed values read as "label … value" rows; the control renders both.
    if (field.type === 'formula') return controlElement;
    // Ratings are trait rows (spec 014); trackers draw their own label beside their controls.
    if (field.type === 'rating' || field.type === 'tracker') {
        return (
            <div className="grid grid-cols-1 gap-1">
                {controlElement}
                {field.description && (
                    <span className="text-xs text-textSecondary">{field.description}</span>
                )}
            </div>
        );
    }

    return (
        <LabeledField field={field} term={termLinkOf(field)}>
            {controlElement}
            {runtime?.degraded && (
                <p role="alert" className="text-xs text-error">
                    {translate(binding.degraded, { catalog: runtime.catalogId })}
                </p>
            )}
        </LabeledField>
    );
}

/**
 * A field bridged to document data (identity, biography, notes, experience): the field keeps
 * its own control and presentation (multiline, placeholder, hidden label); only the storage is
 * the document instead of the template value bag.
 */
function BoundFieldCell({ field, binding }: { field: TemplateField; binding: FieldBinding }) {
    const bound = useBoundDocument();
    const suggestions = useCatalogSuggestions(binding.suggestions?.catalogId);
    if (!bound) return null;
    const { readOnly } = bound;
    const stored = binding.adapter
        ? binding.adapter.read(bound.data)
        : readDataPath(bound.data, binding.path);
    // Document-owned images follow the portrait rules (site-relative paths allowed; the image
    // control still checks safety), not the stricter HTTPS-only template value rules.
    const value = binding.valueType === 'image' ? stored : coerceStoredValue(field, stored);
    const onChange = (next: unknown) => {
        if (binding.adapter) {
            bound.update(binding.adapter.update(bound.data, next));
            return;
        }
        const typed =
            binding.valueType === 'number'
                ? clampFieldNumber(binding, typeof next === 'number' ? next : 0)
                : binding.valueType === 'boolean'
                  ? next === true
                  : typeof next === 'string'
                    ? next
                    : '';
        bound.update(fieldBindingUpdate(binding, bound.data, typed));
        if (binding.syncsTitle && typeof typed === 'string') bound.setTitle(typed);
    };
    return (
        <LabeledField field={field}>
            {binding.suggestions && field.type === 'text' ? (
                <CatalogSuggest
                    catalog={suggestions}
                    value={typeof value === 'string' ? value : ''}
                    onChange={onChange}
                    onSelect={(entry) => onChange(entry.name)}
                    disabled={readOnly}
                    ariaLabel={field.label}
                    placeholder={field.placeholder}
                    className="w-full rounded-sm border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-60"
                    showAllWhenEmpty
                />
            ) : (
                createElement(templateFieldControl(field.type), {
                    field,
                    value,
                    onChange,
                    disabled: readOnly,
                })
            )}
        </LabeledField>
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
    const blockKey = tableValueKey(node);
    const movable = !pageApi.disabled && rowEntries.length > 1;
    /** A row is called by its first column when that holds text, else by its position. */
    const rowName = (row: Record<string, unknown>, position: number) => {
        const first = node.columns[0] ? row[node.columns[0].id] : undefined;
        return typeof first === 'string' && first.trim() ? first : fallbackRowName(position);
    };
    const catalogs = new Map(
        node.columns.flatMap((column) => {
            const runtime = pageApi.resolveCatalogField(column);
            return runtime ? [[column.id, runtime] as const] : [];
        })
    );
    /**
     * A catalog pick in a choice column fills that row's mapped sibling columns in one write
     * (spec 015, R10); other rows never change.
     */
    const writeCell = (
        column: TemplateField,
        catalog: CatalogFieldRuntime | undefined,
        rowIndex: string,
        next: unknown
    ) => {
        if (
            !catalog ||
            catalog.degraded ||
            column.type !== 'select' ||
            !column.binding ||
            typeof next !== 'string' ||
            next === ''
        ) {
            pageApi.setRowValue(blockKey, rowIndex, column.id, next);
            return;
        }
        const details = readCatalogDetails(catalog.catalogId, next) ?? {};
        const siblings = new Set(node.columns.map(({ id }) => id));
        const cells: Record<string, unknown> = { [column.id]: next };
        if (isUserCatalogId(catalog.catalogId)) {
            cells[pickLabelKey(column.id)] = catalog.options.find(
                (option) => option.value === next
            )?.label;
        }
        for (const [detailKey, rule] of Object.entries(column.binding.fills)) {
            if (rule.disabled || !siblings.has(rule.targetFieldId)) continue;
            const value = details[detailKey];
            if (value === undefined || Array.isArray(value)) continue;
            cells[rule.targetFieldId] = value === '' ? null : value;
        }
        pageApi.setRowValues(blockKey, rowIndex, cells);
    };

    return (
        <div className="overflow-x-auto">
            {node.title && (
                <h3 className="mb-2 text-sm font-semibold text-textPrimary">{node.title}</h3>
            )}
            <table className="w-full text-sm">
                <thead>
                    <tr>
                        {movable && (
                            <th
                                scope="col"
                                aria-label={translate(rowMessages.reorder)}
                                className="w-6 border-b border-border px-0 py-2"
                            />
                        )}
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
                <tbody data-reorder-list="">
                    {rowEntries.map(([rowIndex, row], position) => (
                        <tr
                            key={rowIndex}
                            data-row={rowIndex}
                            data-reorder-row=""
                            onKeyDown={
                                movable
                                    ? rowMoveKeys(position, rowEntries.length, (to) =>
                                          pageApi.moveRow(blockKey, position, to)
                                      )
                                    : undefined
                            }
                            className="[&[data-reorder-target]]:shadow-[inset_0_2px_0_0_rgb(var(--primary))]"
                        >
                            {movable && (
                                <td className="px-0 py-1.5 align-top">
                                    <RowMoveControls
                                        count={rowEntries.length}
                                        index={position}
                                        name={rowName(row, position)}
                                        onMove={(to) => pageApi.moveRow(blockKey, position, to)}
                                    />
                                </td>
                            )}
                            {node.columns.map((column) => {
                                const Control = templateFieldControl(column.type);
                                const catalog = catalogs.get(column.id);
                                const picked = row[pickLabelKey(column.id)];
                                return (
                                    <td key={column.id} className="px-2 py-1.5 align-top">
                                        <Control
                                            // The column header already names a rating cell.
                                            field={
                                                column.type === 'rating'
                                                    ? { ...column, hideLabel: true }
                                                    : column
                                            }
                                            value={coerceStoredValue(column, row[column.id])}
                                            onChange={(next) =>
                                                writeCell(column, catalog, rowIndex, next)
                                            }
                                            disabled={pageApi.disabled}
                                            {...(catalog
                                                ? {
                                                      catalogOptions: catalog.options,
                                                      ...(typeof picked === 'string'
                                                          ? { pickedLabel: picked }
                                                          : {}),
                                                      ...(!catalog.degraded &&
                                                      catalog.options.length === 0
                                                          ? { catalogEmpty: true }
                                                          : {}),
                                                  }
                                                : {})}
                                            documentOptions={pageApi.documentOptions}
                                            onOpenDocument={pageApi.openDocument}
                                            previewSource={pageApi.previewSource}
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
                                    className="rounded-sm p-1 text-textSecondary hover:bg-bgBase hover:text-error disabled:opacity-40"
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
                className="mt-2 flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-primary hover:bg-bgBase disabled:opacity-40"
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
    return <CustomListView list={node} pageApi={pageApi} />;
}

const NodeView = memo(function NodeView({
    node,
    pageApi,
    accentColor,
    showHidden = false,
}: {
    node: TemplateNode;
    pageApi: UseTemplatePageResult;
    accentColor: 'primary' | 'secondary';
    /** The template editor renders condition-hidden nodes (marked by its frame). */
    showHidden?: boolean;
}) {
    const template = pageApi.template!;
    const docsPath = node.type === 'section' || node.type === 'group' ? node.docsPath : undefined;
    useEffect(() => {
        // The editor lists a broken link among the draft's issues instead.
        if (showHidden || !docsPath || parseDocsLink(docsPath)) return;
        reportSheetIssue({
            code: 'template-reference-invalid',
            message: 'Documentation link is neither a site docs path nor an https:// address',
            details: { templateId: template.id, nodeId: node.id, docsPath },
        });
    }, [docsPath, node.id, showHidden, template.id]);
    // The editor keeps its own collapse state so editing never folds the real page.
    const collapseKey = `${showHidden ? 'editor-' : ''}template-${template.id}-${node.id}`;
    if (!showHidden && node.visibleWhen && !pageApi.isVisible(node.visibleWhen, node.id)) {
        return null;
    }

    if (node.type === 'section') {
        // Presentation (US3): a section is a collapsible block without a background box;
        // docs link and column layout ride on the block header.
        return (
            <CollapsibleBlock
                title={node.title}
                storageKey={collapseKey}
                docsPath={node.docsPath}
                accentColor={accentColor}
                defaultExpanded={!node.defaultCollapsed}
            >
                <ChildrenGrid
                    parentId={node.id}
                    nodes={node.children}
                    pageApi={pageApi}
                    columns={node.columns}
                    columnWidths={node.columnWidths}
                />
            </CollapsibleBlock>
        );
    }

    if (node.type === 'group') {
        // Presentation (US3): a group is a titled surface card; collapsibility is opt-in and
        // remembered per node (storageKey `template-<templateId>-<nodeId>`).
        return (
            <SectionCard
                title={node.hideTitle ? undefined : node.title}
                docsPath={node.hideTitle ? undefined : node.docsPath}
                storageKey={node.collapsible && !node.hideTitle ? collapseKey : undefined}
                defaultExpanded={!(node.collapsible && node.defaultCollapsed)}
            >
                <ChildrenGrid
                    parentId={node.id}
                    nodes={node.children}
                    pageApi={pageApi}
                    columns={node.columns}
                    columnWidths={node.columnWidths}
                />
            </SectionCard>
        );
    }

    if (node.type === 'table') return <TableBlock node={node} pageApi={pageApi} />;
    if (node.type === 'list') return <ListView node={node} pageApi={pageApi} />;

    if (node.type === 'primitive') {
        const maxState = {
            ...pageApi.formulaState.maxima.get(node.id),
            resolvedMin: pageApi.formulaState.minima.get(node.id),
            resolvedMaxMin: pageApi.formulaState.maxMinima.get(node.id),
        };
        return (
            <PrimitiveNodeView
                node={node}
                systemId={template.systemId}
                documentKind={template.documentKind}
                maxState={maxState}
                page={{
                    values: pageApi.values,
                    setValue: pageApi.setValue,
                    previewSource: pageApi.previewSource ?? false,
                }}
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
});

function framedNode(
    overlay: TemplateEditorOverlay,
    pageApi: UseTemplatePageResult,
    version: unknown,
    node: TemplateNode,
    parentId: string | null,
    index: number,
    column: number | null,
    content: ReactNode
): ReactNode {
    const conditionHidden =
        node.visibleWhen !== undefined && !pageApi.isVisible(node.visibleWhen, node.id);
    return (
        <div key={node.id} className="min-w-0">
            {overlay.renderFrame({
                node,
                parentId,
                index,
                column,
                conditionHidden,
                content,
                version,
            })}
        </div>
    );
}

function ChildrenGrid({
    parentId = null,
    nodes,
    pageApi,
    columns,
    columnWidths,
}: {
    parentId?: string | null;
    nodes: readonly TemplateNode[];
    pageApi: UseTemplatePageResult;
    columns?: number;
    columnWidths?: readonly number[];
}) {
    const overlay = useTemplateEditorOverlay();
    const version = useContext(OverlayVersionContext);
    if (nodes.length === 0 && !overlay) return null;
    const renderNode = (node: TemplateNode, index: number, column: number | null = null) => {
        const content = (
            <NodeView
                key={node.id}
                node={node}
                pageApi={pageApi}
                // Accent alternation is automatic (by sibling parity), never stored (FR-11).
                accentColor={index % 2 === 0 ? 'primary' : 'secondary'}
                showHidden={overlay !== null}
            />
        );
        return overlay
            ? framedNode(overlay, pageApi, version, node, parentId, index, column, content)
            : content;
    };
    const endSlot = overlay?.renderEndSlot({ parentId, index: nodes.length, column: null });
    const isProportional = columns !== undefined && columns > 1 && columnWidths?.length === columns;
    const children = [
        ...nodes.map((node, index) => {
            const rendered = renderNode(node, index);
            const span =
                columns && columns > 1 && node.span
                    ? spanClass(node.span, columns, isProportional)
                    : undefined;
            return span ? (
                <div key={node.id} className={span}>
                    {rendered}
                </div>
            ) : (
                rendered
            );
        }),
        endSlot && <Fragment key="end-slot">{endSlot}</Fragment>,
    ];
    // Proportional widths (e.g. 2:1) apply from the md breakpoint; narrow screens stack.
    const proportional =
        columns && columns > 1 && columnWidths?.length === columns
            ? {
                  className:
                      'grid grid-cols-1 gap-4 md:[grid-template-columns:var(--template-columns)]',
                  style: {
                      '--template-columns': columnWidths
                          .map((width) => `minmax(0, ${width}fr)`)
                          .join(' '),
                  } as CSSProperties,
              }
            : undefined;
    // Explicit placement: children stack inside their assigned column (unplaced → column 1).
    // An empty container in the editor stacks too, so each column offers a drop zone.
    const stacked =
        nodes.some((node) => node.column !== undefined) || (overlay !== null && nodes.length === 0);
    if (columns && columns > 1 && stacked) {
        const stacks = Array.from({ length: columns }, (_, columnIndex) =>
            nodes
                .map((node, index) => ({ node, index }))
                .filter(({ node }) => Math.min(node.column ?? 1, columns) === columnIndex + 1)
        );
        return (
            <div
                className={
                    proportional?.className ??
                    clsx('grid gap-4', columnClasses[columns] ?? columnClasses[1])
                }
                style={proportional?.style}
            >
                {stacks.map((stack, columnIndex) => {
                    const column = columnIndex + 1;
                    const last = stack[stack.length - 1];
                    const placement = {
                        parentId,
                        index: last ? last.index + 1 : nodes.length,
                        column,
                    };
                    return (
                        <div
                            key={columnIndex}
                            className="grid grid-cols-1 content-start gap-4"
                            data-column={column}
                        >
                            {stack.map(({ node, index }) => renderNode(node, index, column))}
                            {overlay &&
                                (stack.length === 0
                                    ? overlay.renderEmptyColumn(placement)
                                    : overlay.renderEndSlot(placement))}
                        </div>
                    );
                })}
            </div>
        );
    }
    if (columns && columns > 1) {
        return (
            <div
                className={
                    proportional?.className ??
                    clsx('grid gap-4', columnClasses[columns] ?? columnClasses[1])
                }
                style={proportional?.style}
            >
                {children}
            </div>
        );
    }
    return <div className="grid grid-cols-1 gap-4">{children}</div>;
}

/** Counts unfilled required fields for the FR-4a soft-advisory note (walks the whole tree). */
export function countUnfilledRequired(
    template: CustomTemplate,
    values: Record<string, unknown>
): number {
    let count = 0;
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
            if (isTemplateField(node)) countRequired(node);
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

export function DeclarativeSheetView({
    template,
    embedded = false,
}: {
    template: CustomTemplate;
    /** Embedded in another page (docs): no page chrome, no preset seeding. */
    embedded?: boolean;
}) {
    const locale = useDocusaurusContext().i18n.currentLocale;
    // Translated display copy; ids and storage coordinates are identical to the source.
    const localized = useMemo(() => localizeTemplate(template, locale), [template, locale]);
    const pageApi = useTemplatePage(localized, { seedPresets: !embedded });
    // Editor only: a version that ignores template-only changes (see OverlayFrameArgs.version).
    const formulaSignature = useMemo(
        () =>
            JSON.stringify([
                [...pageApi.formulaState.results],
                [...pageApi.formulaState.maxima],
                [...pageApi.formulaState.minima],
                [...pageApi.formulaState.maxMinima],
            ]),
        [pageApi.formulaState]
    );
    const values = pageApi.values;
    const version = useMemo(() => ({ values, formulaSignature }), [values, formulaSignature]);

    return (
        <div
            className={
                embedded ? 'min-w-0 space-y-6' : 'mx-auto min-w-0 max-w-7xl space-y-6 p-4 lg:p-6'
            }
        >
            <TermHintProvider>
                <OverlayVersionContext.Provider value={version}>
                    <ChildrenGrid nodes={localized.children} pageApi={pageApi} />
                </OverlayVersionContext.Provider>
            </TermHintProvider>
        </div>
    );
}
