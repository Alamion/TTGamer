import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { columnHeader, localizedTextMeta, useCatalogText } from './catalogI18n';
import type { RangedWeaponEntry } from './rangedWeaponsData';

const CATALOG_ID = 'ranged-weapons';
const messages = uiMessages.catalogs.rangedWeapons;

export const RANGED_WEAPONS_COLUMNS: ColumnDef<RangedWeaponEntry>[] = [
    {
        id: 'name',
        header: columnHeader(messages.columns.name),
        accessorKey: 'name',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'name'),
    },
    {
        id: 'damage',
        header: columnHeader(messages.columns.damage),
        accessorKey: 'damage',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'damage'),
    },
    {
        id: 'range',
        header: columnHeader(messages.columns.range),
        accessorKey: 'range',
        enableSorting: true,
    },
    {
        id: 'ammo',
        header: columnHeader(messages.columns.ammo),
        accessorKey: 'ammo',
        enableSorting: true,
    },
    {
        id: 'difficulty',
        header: columnHeader(messages.columns.difficulty),
        accessorKey: 'difficulty',
        enableSorting: true,
    },
    {
        id: 'conceal',
        header: columnHeader(messages.columns.conceal),
        accessorKey: 'conceal',
        enableSorting: true,
    },
];

function RangedWeaponDetail({ weapon }: { weapon: RangedWeaponEntry }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(weapon, 'description')}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.damage)}
                    </span>
                    <p className="text-textSecondary">{t.text(weapon, 'damage')}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.range)}
                    </span>
                    <p className="text-textSecondary">
                        {translate(messages.detail.rangeValue, { range: weapon.range })}
                    </p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.ammo)}
                    </span>
                    <p className="text-textSecondary">{weapon.ammo}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.difficulty)}
                    </span>
                    <p className="text-textSecondary">{weapon.difficulty}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.conceal)}
                    </span>
                    <p className="text-textSecondary">{weapon.conceal}</p>
                </div>
            </div>
            <div className="mt-3">
                <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                    {translate(messages.detail.notes)}
                </span>
                <p className="text-sm text-textSecondary mt-1">{t.text(weapon, 'notes')}</p>
            </div>
        </>
    );
}

export function renderRangedWeaponDetail(weapon: RangedWeaponEntry): ReactNode {
    return <RangedWeaponDetail weapon={weapon} />;
}
