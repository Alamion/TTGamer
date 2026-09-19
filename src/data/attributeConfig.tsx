import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { ScaleList, SpecialtiesList } from '@site/src/shared/components/DetailSections';
import { catalogEntryList, catalogEntryText } from '@site/src/sheet_manager/systems/catalogs';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import type { AttributeEntry } from './attributes';
import { columnHeader, enumLabelMeta, localizedTextMeta, useCatalogText } from './catalogI18n';

const CATALOG_ID = 'attributes';
const messages = uiMessages.catalogs.attributes;

export const ATTRIBUTE_COLUMNS: ColumnDef<AttributeEntry>[] = [
    {
        id: 'name',
        header: columnHeader(messages.columns.name),
        accessorKey: 'name',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'name'),
    },
    {
        id: 'category',
        header: columnHeader(messages.columns.category),
        accessorKey: 'category',
        enableSorting: true,
        meta: enumLabelMeta(CATALOG_ID, 'category'),
    },
];

/** `EntityGrid` getters: name, summary, and specialties in the reader's locale. */
export const ATTRIBUTE_GRID = {
    getName: (attr: AttributeEntry, locale: string) =>
        catalogEntryText(CATALOG_ID, attr, 'name', locale) ?? attr.name,
    getDescription: (attr: AttributeEntry, locale: string) =>
        catalogEntryText(CATALOG_ID, attr, 'shortDescription', locale) ?? attr.shortDescription,
    getTags: (attr: AttributeEntry, locale: string) =>
        catalogEntryList(CATALOG_ID, attr, 'specialties', locale) ?? attr.specialties,
    getKey: (attr: AttributeEntry) => attr.id,
};

function AttributeDetail({ attr }: { attr: AttributeEntry }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(attr, 'description')}
            </p>
            <SpecialtiesList specialties={t.list(attr, 'specialties')} />
            <ScaleList scale={t.list(attr, 'scale')} />
        </>
    );
}

export function renderAttributeDetail(attr: AttributeEntry): ReactNode {
    return <AttributeDetail attr={attr} />;
}
