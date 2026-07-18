import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { AbilityEntry } from './abilities';
import { SpecialtiesList, ScaleList } from '@site/src/shared/components/DetailSections';

export const ABILITY_COLUMNS: ColumnDef<AbilityEntry>[] = [
    {
        id: 'name',
        header: 'Ability',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'shortDescription',
        header: 'Short Description',
        accessorKey: 'shortDescription',
        enableSorting: true,
        size: 300,
    },
    {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        enableSorting: true,
    },
];

export function renderAbilityDetail(ability: AbilityEntry): ReactNode {
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">{ability.description}</p>
            <SpecialtiesList specialties={ability.specialties} />
            <ScaleList scale={ability.scale} />
        </>
    );
}
