import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { AttributeEntry } from './attributes';
import { SpecialtiesList, ScaleList } from '@site/src/shared/components/DetailSections';

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
            <SpecialtiesList specialties={attr.specialties} />
            <ScaleList scale={attr.scale} />
        </>
    );
}
