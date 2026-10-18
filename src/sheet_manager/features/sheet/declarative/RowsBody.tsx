import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Plus, X } from 'lucide-react';
import { useMemo } from 'react';

import { CatalogSuggest } from '../../../components/controls/CatalogSuggest';
import {
    fallbackRowName,
    RowMoveControls,
    rowMoveKeys,
} from '../../../components/controls/RowMoveControls';
import type { BindingOption, RowsBinding, RowsColumn } from '../../../systems/templateBindings';
import { createRowId } from '../../../systems/templateBindings';
import type { PrimitiveNode } from '../../../types/template';
import { CATALOG_LOOKUP, readCatalogDetails } from '../data/catalogBindings';
import { useBoundDocument } from './boundDocument';
import { BRIEF } from './briefRhythm';
import { moveItem } from './rowOrder';
import {
    parentName,
    rowAboveLimit,
    type RowSuggestion,
    rowSuggestions,
    suggestionsForRow,
} from './rowsCatalog';
import { SheetButton } from './SheetButton';

const fields = uiMessages.sheet.documents.fields;
const rowMessages = uiMessages.sheet.documents.rows;

const inputClasses =
    'w-full rounded-sm border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-60';

function optionLabel(option: BindingOption): string {
    return option.translation ? translate(option.translation) : option.label;
}

/** Closed-set select for a bound value; a stored value outside the set is shown as-is. */
function EnumSelect({
    ariaLabel,
    className = inputClasses,
    disabled,
    onChange,
    options,
    value,
}: {
    ariaLabel: string;
    className?: string;
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
            className={className}
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
    // The brief look matches its text fields: a caption over an underlined value.
    return (
        <label
            className={
                compact
                    ? 'grid min-w-24 flex-1 basis-24 gap-0'
                    : 'grid gap-1 text-xs font-medium text-textSecondary'
            }
        >
            <span className={hideLabel ? 'sr-only' : compact ? BRIEF.caption : undefined}>
                {label}
            </span>
            <EnumSelect
                ariaLabel={label}
                disabled={disabled}
                onChange={onChange}
                options={options}
                value={value}
                {...(compact
                    ? {
                          className:
                              'min-w-0 border-0 border-b border-border bg-transparent px-0 py-0 text-sm font-semibold text-textPrimary outline-hidden focus:border-primary disabled:opacity-70',
                      }
                    : {})}
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
    const locale = useDocusaurusContext().i18n.currentLocale;
    const catalog = descriptor.catalog;
    // Rows above their parent's rating (spec 038): the page decides, the binding names the parent.
    const limit = catalog?.parent ? node.limitByParent : undefined;
    const suggestions = useMemo(
        () => (catalog ? rowSuggestions(CATALOG_LOOKUP, catalog, locale, limit) : []),
        [catalog, locale, limit]
    );
    if (!bound) return null;
    const rows = (
        Array.isArray(bound.data[descriptor.dataKey]) ? bound.data[descriptor.dataKey] : []
    ) as Array<Record<string, unknown>>;
    const disabled = bound.readOnly;
    const label = node.label ?? descriptor.label;
    const rowButtons = node.rowButtons ?? [];
    const write = (next: Array<Record<string, unknown>>) =>
        bound.update({ [descriptor.dataKey]: next });
    const visibleColumns = descriptor.columns.filter((column) => !column.hidden);
    const movable = !disabled && rows.length > 1;
    const moveTo = (from: number) => (to: number) => write(moveItem(rows, from, to));
    const setCell = (index: number, key: string, value: string) =>
        write(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
    const fillFromCatalog = (index: number, suggestion: RowSuggestion) => {
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
        // The picked name as offered (localized with the book name), not the raw English detail.
        updates[catalog.column] = suggestion.name;
        if (catalog.parent && suggestion.parentId) {
            updates[catalog.parent.column] = parentName(
                CATALOG_LOOKUP,
                catalog.parent,
                suggestion.parentId,
                locale
            );
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
                            {movable && (
                                <th
                                    scope="col"
                                    aria-label={translate(rowMessages.reorder)}
                                    className="w-6 border-b border-border"
                                />
                            )}
                            {visibleColumns.map((column) => (
                                <th
                                    key={column.key}
                                    scope="col"
                                    className="border-b border-border px-2 py-1.5 text-left text-xs font-semibold text-textSecondary"
                                >
                                    {columnLabel(column)}
                                </th>
                            ))}
                            {rowButtons.length > 0 && (
                                <th
                                    scope="col"
                                    aria-label={rowButtons.map(({ label }) => label).join(', ')}
                                    className="w-8 border-b border-border"
                                />
                            )}
                            {!disabled && (
                                <th
                                    scope="col"
                                    aria-label={translate(fields.removeRow)}
                                    className="w-8 border-b border-border"
                                />
                            )}
                        </tr>
                    </thead>
                    <tbody data-reorder-list="">
                        {rows.map((row, index) => (
                            <tr
                                key={String(row.id ?? index)}
                                data-reorder-row=""
                                onKeyDown={
                                    movable
                                        ? rowMoveKeys(index, rows.length, moveTo(index))
                                        : undefined
                                }
                                className="[&[data-reorder-target]]:shadow-[inset_0_2px_0_0_rgb(var(--primary))]"
                            >
                                {movable && (
                                    <td className="px-0 py-1 align-top">
                                        <RowMoveControls
                                            count={rows.length}
                                            index={index}
                                            name={fallbackRowName(index)}
                                            onMove={moveTo(index)}
                                        />
                                    </td>
                                )}
                                {visibleColumns.map((column) => {
                                    const above =
                                        catalog && column.key === catalog.column
                                            ? rowAboveLimit(
                                                  CATALOG_LOOKUP,
                                                  catalog,
                                                  limit,
                                                  row,
                                                  bound.data,
                                                  locale
                                              )
                                            : null;
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
                                                    catalog={[
                                                        ...suggestionsForRow(
                                                            CATALOG_LOOKUP,
                                                            catalog,
                                                            limit,
                                                            suggestions,
                                                            row,
                                                            bound.data,
                                                            locale
                                                        ),
                                                    ]}
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
                                            {above && (
                                                <p
                                                    data-row-above=""
                                                    className="mt-0.5 text-xs text-warning"
                                                >
                                                    {translate(rowMessages.aboveParent, {
                                                        parent: above.parent,
                                                        dots: above.dots,
                                                    })}
                                                </p>
                                            )}
                                        </td>
                                    );
                                })}
                                {rowButtons.length > 0 && (
                                    <td className="whitespace-nowrap px-1 py-1 align-top">
                                        {rowButtons.map((button) => (
                                            <SheetButton
                                                key={button.id}
                                                button={button}
                                                row={row}
                                                rowName={
                                                    typeof row.name === 'string' ? row.name : ''
                                                }
                                            />
                                        ))}
                                    </td>
                                )}
                                {!disabled && (
                                    <td className="whitespace-nowrap px-1 py-1 align-top">
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            onClick={() =>
                                                write(
                                                    rows.filter((_, rowIndex) => rowIndex !== index)
                                                )
                                            }
                                            aria-label={translate(fields.removeRow)}
                                            className="rounded-sm p-1 text-textSecondary hover:bg-bgBase hover:text-error disabled:opacity-40"
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
                    className="flex w-fit items-center gap-1 rounded-sm px-2 py-1 text-xs text-primary hover:bg-bgBase disabled:opacity-40"
                >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {translate(fields.addRow)}
                </button>
            )}
        </div>
    );
}
