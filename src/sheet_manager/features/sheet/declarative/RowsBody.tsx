import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Plus, X } from 'lucide-react';
import { useMemo } from 'react';

import type { CatalogEntry } from '../../../components';
import { CatalogSuggest } from '../../../components/controls/CatalogSuggest';
import type { BindingOption, RowsBinding, RowsColumn } from '../../../systems/templateBindings';
import { createRowId } from '../../../systems/templateBindings';
import type { PrimitiveNode } from '../../../types/template';
import { CATALOG_BINDINGS, readCatalogDetails } from '../data/catalogBindings';
import { useBoundDocument } from './boundDocument';

const fields = uiMessages.sheet.documents.fields;

const inputClasses =
    'w-full rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60';

function optionLabel(option: BindingOption): string {
    return option.translation ? translate(option.translation) : option.label;
}

/** Closed-set select for a bound value; a stored value outside the set is shown as-is. */
function EnumSelect({
    ariaLabel,
    disabled,
    onChange,
    options,
    value,
}: {
    ariaLabel: string;
    disabled: boolean;
    onChange: (next: string) => void;
    options: readonly BindingOption[];
    value: string;
}) {
    const known = value === '' || options.some((option) => option.id === value);
    return (
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            aria-label={ariaLabel}
            className={inputClasses}
        >
            {!known && <option value={value}>{value}</option>}
            {value === '' && <option value="">—</option>}
            {options.map((option) => (
                <option key={option.id} value={option.id}>
                    {optionLabel(option)}
                </option>
            ))}
        </select>
    );
}

export function EnumField({
    compact,
    disabled,
    hideLabel,
    label,
    onChange,
    options,
    value,
}: {
    compact?: boolean;
    disabled: boolean;
    hideLabel?: boolean;
    label: string;
    onChange: (next: string) => void;
    options: readonly BindingOption[];
    value: string;
}) {
    return (
        <label
            className={
                compact
                    ? 'flex items-center justify-between gap-2 text-xs font-medium text-textSecondary'
                    : 'grid gap-1 text-xs font-medium text-textSecondary'
            }
        >
            <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
            <EnumSelect
                ariaLabel={label}
                disabled={disabled}
                onChange={onChange}
                options={options}
                value={value}
            />
        </label>
    );
}

function columnLabel(column: RowsColumn): string {
    return column.translation ? translate(column.translation) : column.label;
}

/** A bound array of records edited as a table; the name column may suggest catalog entries. */
export function RowsBody({ node, descriptor }: { node: PrimitiveNode; descriptor: RowsBinding }) {
    const bound = useBoundDocument();
    const catalog = descriptor.catalog;
    const suggestions = useMemo<CatalogEntry[]>(
        () =>
            (catalog?.catalogIds ?? []).flatMap((catalogId) =>
                (CATALOG_BINDINGS.get(catalogId)?.entries ?? []).map((entry) => ({
                    id: `${catalogId}/${entry.id}`,
                    name: entry.name,
                    subtitle: catalogId,
                }))
            ),
        [catalog]
    );
    if (!bound) return null;
    const rows = (
        Array.isArray(bound.data[descriptor.dataKey]) ? bound.data[descriptor.dataKey] : []
    ) as Array<Record<string, unknown>>;
    const disabled = bound.readOnly;
    const label = node.label ?? descriptor.label;
    const write = (next: Array<Record<string, unknown>>) =>
        bound.update({ [descriptor.dataKey]: next });
    const setCell = (index: number, key: string, value: string) =>
        write(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
    const fillFromCatalog = (index: number, suggestion: CatalogEntry) => {
        if (!catalog) return;
        const [catalogId, entryId] = suggestion.id.split('/') as [string, string];
        const details = readCatalogDetails(catalogId, entryId);
        if (!details) return;
        const updates: Record<string, string> = {};
        for (const [detailKey, columnKey] of Object.entries(catalog.fills)) {
            const detail = details[detailKey];
            if (detail === undefined) continue;
            updates[columnKey] = detail === null ? '' : String(detail);
        }
        write(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...updates } : row)));
    };

    return (
        <div className="grid gap-2 overflow-x-auto">
            {!node.hideLabel && !node.compact && (
                <span className="text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    {label}
                </span>
            )}
            {rows.length === 0 ? (
                <p className="text-sm text-textSecondary">{translate(fields.none)}</p>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            {descriptor.columns.map((column) => (
                                <th
                                    key={column.key}
                                    scope="col"
                                    className="border-b border-border px-2 py-1.5 text-left text-xs font-semibold text-textSecondary"
                                >
                                    {columnLabel(column)}
                                </th>
                            ))}
                            {!disabled && (
                                <th
                                    scope="col"
                                    aria-label={translate(fields.removeRow)}
                                    className="w-8 border-b border-border"
                                />
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={String(row.id ?? index)}>
                                {descriptor.columns.map((column) => {
                                    const cell =
                                        typeof row[column.key] === 'string'
                                            ? (row[column.key] as string)
                                            : '';
                                    const cellLabel = `${columnLabel(column)} ${index + 1}`;
                                    return (
                                        <td
                                            key={column.key}
                                            className={
                                                column.type === 'enum'
                                                    ? 'min-w-[7rem] px-2 py-1 align-top'
                                                    : 'min-w-[5rem] px-2 py-1 align-top'
                                            }
                                        >
                                            {column.type === 'enum' && column.options ? (
                                                <EnumSelect
                                                    ariaLabel={cellLabel}
                                                    disabled={disabled}
                                                    options={column.options}
                                                    value={cell}
                                                    onChange={(next) =>
                                                        setCell(index, column.key, next)
                                                    }
                                                />
                                            ) : catalog && column.key === catalog.column ? (
                                                <CatalogSuggest
                                                    catalog={suggestions}
                                                    value={cell}
                                                    disabled={disabled}
                                                    ariaLabel={cellLabel}
                                                    className={inputClasses}
                                                    onChange={(next) =>
                                                        setCell(index, column.key, next)
                                                    }
                                                    onSelect={(entry) =>
                                                        fillFromCatalog(index, entry)
                                                    }
                                                />
                                            ) : (
                                                <input
                                                    value={cell}
                                                    disabled={disabled}
                                                    aria-label={cellLabel}
                                                    className={inputClasses}
                                                    onChange={(event) =>
                                                        setCell(
                                                            index,
                                                            column.key,
                                                            event.target.value
                                                        )
                                                    }
                                                />
                                            )}
                                        </td>
                                    );
                                })}
                                {!disabled && (
                                    <td className="px-1 py-1 align-top">
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            onClick={() =>
                                                write(
                                                    rows.filter((_, rowIndex) => rowIndex !== index)
                                                )
                                            }
                                            aria-label={translate(fields.removeRow)}
                                            className="rounded p-1 text-textSecondary hover:bg-bgBase hover:text-error disabled:opacity-40"
                                        >
                                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {!disabled && (
                <button
                    type="button"
                    disabled={disabled || rows.length >= descriptor.maxRows}
                    onClick={() =>
                        write([
                            ...rows,
                            Object.fromEntries([
                                ['id', createRowId()],
                                ...descriptor.columns.map((column) => [column.key, '']),
                            ]),
                        ])
                    }
                    className="flex w-fit items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-bgBase disabled:opacity-40"
                >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {translate(fields.addRow)}
                </button>
            )}
        </div>
    );
}
