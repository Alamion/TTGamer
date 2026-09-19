import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { FilterConfig } from '@site/src/shared/components/DataCatalog';
import { ScaleList, SpecialtiesList } from '@site/src/shared/components/DetailSections';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import type { AbilityEntry } from './abilities';
import { columnHeader, enumLabelMeta, localizedTextMeta, useCatalogText } from './catalogI18n';

const CATALOG_ID = 'abilities';
const messages = uiMessages.catalogs.abilities;

export const ABILITY_COLUMNS: ColumnDef<AbilityEntry>[] = [
    {
        id: 'name',
        header: columnHeader(messages.columns.name),
        accessorKey: 'name',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'name'),
    },
    {
        id: 'shortDescription',
        header: columnHeader(messages.columns.shortDescription),
        accessorKey: 'shortDescription',
        enableSorting: true,
        size: 300,
        meta: localizedTextMeta(CATALOG_ID, 'shortDescription'),
    },
    {
        id: 'category',
        header: columnHeader(messages.columns.category),
        accessorKey: 'category',
        enableSorting: true,
        meta: enumLabelMeta(CATALOG_ID, 'category'),
    },
];

export const ABILITY_FILTERS: FilterConfig[] = [
    { columnId: 'category', label: messages.columns.category },
];

function AbilityDetail({ ability }: { ability: AbilityEntry }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(ability, 'description')}
            </p>
            <SpecialtiesList specialties={t.list(ability, 'specialties')} />
            <ScaleList scale={t.list(ability, 'scale')} />
        </>
    );
}

export function renderAbilityDetail(ability: AbilityEntry): ReactNode {
    return <AbilityDetail ability={ability} />;
}
