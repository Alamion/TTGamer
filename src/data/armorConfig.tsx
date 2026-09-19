import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import type { ArmorEntry } from './armorData';
import { columnHeader, localizedTextMeta, useCatalogText } from './catalogI18n';

const CATALOG_ID = 'armor';
const messages = uiMessages.catalogs.armor;

export const ARMOR_COLUMNS: ColumnDef<ArmorEntry>[] = [
    {
        id: 'name',
        header: columnHeader(messages.columns.name),
        accessorKey: 'name',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'name'),
    },
    {
        id: 'classVal',
        header: columnHeader(messages.columns.classVal),
        accessorKey: 'classVal',
        enableSorting: true,
    },
    {
        id: 'ar',
        header: columnHeader(messages.columns.ar),
        accessorKey: 'ar',
        enableSorting: true,
    },
    {
        id: 'dexPenalty',
        header: columnHeader(messages.columns.dexPenalty),
        accessorKey: 'dexPenalty',
        enableSorting: true,
    },
    {
        id: 'cost',
        header: columnHeader(messages.columns.cost),
        accessorKey: 'cost',
        enableSorting: true,
    },
];

function ArmorDetail({ armor }: { armor: ArmorEntry }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(armor, 'description')}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.classVal)}
                    </span>
                    <p className="text-textSecondary">{armor.classVal}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.ar)}
                    </span>
                    <p className="text-textSecondary">{armor.ar}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.dexPenalty)}
                    </span>
                    <p className="text-textSecondary">{armor.dexPenalty}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.cost)}
                    </span>
                    <p className="text-textSecondary">{armor.cost}</p>
                </div>
            </div>
            <div className="mt-3">
                <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                    {translate(messages.detail.notes)}
                </span>
                <p className="text-sm text-textSecondary mt-1">{t.text(armor, 'notes')}</p>
            </div>
        </>
    );
}

export function renderArmorDetail(armor: ArmorEntry): ReactNode {
    return <ArmorDetail armor={armor} />;
}
