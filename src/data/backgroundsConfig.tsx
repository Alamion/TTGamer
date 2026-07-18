import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { BackgroundEntry } from './backgroundsData';
import { ScaleList } from '@site/src/shared/components/DetailSections';

export const BACKGROUND_COLUMNS: ColumnDef<BackgroundEntry>[] = [
    {
        id: 'name',
        header: 'Background',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'shortDescription',
        header: 'Description',
        accessorKey: 'shortDescription',
        enableSorting: true,
        size: 350,
    },
    {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        enableSorting: true,
    },
];

export function renderBackgroundDetail(background: BackgroundEntry): ReactNode {
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {background.description}
            </p>
            <ScaleList scale={background.scale} title="Dot Rank" />
        </>
    );
}
