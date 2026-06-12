import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { AttributeEntry } from './attributes';

export const ATTRIBUTE_COLUMNS: ColumnDef<AttributeEntry>[] = [
    {
        id: 'name',
        header: 'Attribute',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        enableSorting: true,
    },
];

export function renderAttributeDetail(attr: AttributeEntry): ReactNode {
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">{attr.description}</p>
            {attr.specialties.length > 0 && (
                <div className="mb-4">
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                        Specialties
                    </h5>
                    <div className="flex flex-wrap gap-1">
                        {attr.specialties.map((s) => (
                            <span
                                key={s}
                                className="px-2 py-0.5 text-xs rounded-full bg-bgBase text-textSecondary border border-border"
                            >
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {attr.scale.length > 0 && (
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                        Rating Scale
                    </h5>
                    <ul className="space-y-1">
                        {attr.scale.map((s, i) => (
                            <li key={i} className="text-xs text-textSecondary">
                                {'\u2022'.repeat(i + 1)} {s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
}
