import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Plus, X } from 'lucide-react';
import { createElement } from 'react';

import { CollapsibleBlock } from '../../../components/sections/CollapsibleBlock';
import { SectionCard } from '../../../components/sections/SectionCard';
import type { CustomTemplate, TemplateBlock, TemplateField } from '../../../types/template';
import { fieldValueKey, tableValueKey } from '../../../types/template';
import { coerceStoredValue } from '../../../types/templateValues';
import { templateFieldControl } from '../registry/declarativeFieldRegistry';
import { useTemplatePage, type UseTemplatePageResult } from './hooks';

const editor = uiMessages.sheet.templates.editor;
const binding = uiMessages.sheet.templates.binding;

const columnClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
};

function FieldCell({
    field,
    pageApi,
    value,
}: {
    field: TemplateField;
    pageApi: UseTemplatePageResult;
    value: unknown;
}) {
    const control = templateFieldControl(field.type);
    const runtime =
        field.type === 'select' && field.binding ? pageApi.resolveCatalogField(field) : undefined;

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

function FieldsBlock({
    block,
    pageApi,
}: {
    block: Extract<TemplateBlock, { type: 'fields' }>;
    pageApi: UseTemplatePageResult;
}) {
    return (
        <div className={clsx('grid gap-4', columnClasses[block.columns] ?? columnClasses[1])}>
            {block.fields.map((field) => (
                <FieldCell
                    key={field.id}
                    field={field}
                    pageApi={pageApi}
                    value={coerceStoredValue(field, pageApi.values[fieldValueKey(field)])}
                />
            ))}
        </div>
    );
}

function TableBlock({
    block,
    pageApi,
}: {
    block: Extract<TemplateBlock, { type: 'table' }>;
    pageApi: UseTemplatePageResult;
}) {
    const stored = pageApi.values[tableValueKey(block)];
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
            <table className="w-full text-sm">
                <thead>
                    <tr>
                        {block.columns.map((column) => (
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
                            {block.columns.map((column) => {
                                const Control = templateFieldControl(column.type);
                                return (
                                    <td key={column.id} className="px-2 py-1.5 align-top">
                                        <Control
                                            field={column}
                                            value={coerceStoredValue(column, row[column.id])}
                                            onChange={(next) =>
                                                pageApi.setRowValue(
                                                    block.id,
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
                                    onClick={() => pageApi.removeRow(block.id, rowIndex)}
                                    disabled={
                                        pageApi.disabled || rowEntries.length <= block.minRows
                                    }
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
                onClick={() => pageApi.addRow(block.id)}
                disabled={pageApi.disabled || rowEntries.length >= block.maxRows}
                className="mt-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgBase disabled:opacity-40"
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {translate(editor.addRow)}
            </button>
        </div>
    );
}

function TemplateSectionView({
    pageApi,
    section,
}: {
    pageApi: UseTemplatePageResult;
    section: CustomTemplate['sections'][number];
}) {
    return (
        <div className="space-y-4">
            {section.blocks.map((block) =>
                block.type === 'fields' ? (
                    <FieldsBlock key={block.id} block={block} pageApi={pageApi} />
                ) : (
                    <TableBlock key={block.id} block={block} pageApi={pageApi} />
                )
            )}
        </div>
    );
}

/** Counts unfilled required fields for the FR-4a soft-advisory note. */
export function countUnfilledRequired(
    template: CustomTemplate,
    values: Record<string, unknown>
): number {
    let count = 0;
    for (const section of template.sections) {
        for (const block of section.blocks) {
            const items: readonly TemplateField[] =
                block.type === 'fields' ? block.fields : block.columns;
            for (const field of items) {
                if (!field.required) continue;
                const raw = values[fieldValueKey(field)];
                if (raw === undefined || raw === '' || (Array.isArray(raw) && raw.length === 0)) {
                    count += 1;
                }
            }
        }
    }
    return count;
}

export function DeclarativeSheetView({ template }: { template: CustomTemplate }) {
    const pageApi = useTemplatePage(template);

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
            {template.sections.map((section, sectionIndex) => (
                <CollapsibleBlock
                    key={section.id}
                    title={section.title}
                    storageKey={`template-${template.id}-${section.id}`}
                    accentColor={sectionIndex % 2 === 0 ? 'primary' : 'secondary'}
                >
                    <SectionCard>
                        <TemplateSectionView pageApi={pageApi} section={section} />
                    </SectionCard>
                </CollapsibleBlock>
            ))}
        </div>
    );
}
