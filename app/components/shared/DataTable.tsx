import { Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
    header: string;
    render: (item: T) => ReactNode;
    width?: string;
}

export interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    items: T[];
    idKey: keyof T;
    onAdd: () => void;
    onRemove: (id: string) => void;
    addLabel: string;
    emptyMessage?: string;
    className?: string;
}

export function DataTable<T extends { id: string }>({
    columns,
    items,
    idKey,
    onAdd,
    onRemove,
    addLabel,
    emptyMessage = 'No items yet...',
    className,
}: DataTableProps<T>) {
    return (
        <div className={clsx('px-4 pb-4', className)}>
            {items.length === 0 ? (
                <p className="text-sm text-textSecondary italic py-2">{emptyMessage}</p>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-textSecondary text-xs">
                            {columns.map((col, i) => (
                                <th
                                    key={i}
                                    scope="col"
                                    className={clsx('text-left py-2', col.width)}
                                >
                                    {col.header}
                                </th>
                            ))}
                            <th scope="col" className="w-8" />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={String(item[idKey])}>
                                {columns.map((col, i) => (
                                    <td key={i} className={clsx('py-1')}>
                                        {col.render(item)}
                                    </td>
                                ))}
                                <td>
                                    <button
                                        onClick={() => onRemove(String(item[idKey]))}
                                        className="text-textSecondary hover:text-error transition-colors"
                                        aria-label="Remove item"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <button
                onClick={onAdd}
                className="flex items-center gap-1 text-sm text-textSecondary hover:text-textSecondary/80 transition-colors mt-2"
                aria-label={addLabel}
            >
                <Plus className="w-4 h-4" />
                {addLabel}
            </button>
        </div>
    );
}
