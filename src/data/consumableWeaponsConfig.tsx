import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { FilterConfig } from '@site/src/shared/components/DataCatalog';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { columnHeader, enumLabelMeta, localizedTextMeta, useCatalogText } from './catalogI18n';
import type { ConsumableWeaponEntry } from './consumableWeaponsData';

const CATALOG_ID = 'consumable-weapons';
const messages = uiMessages.catalogs.consumableWeapons;

const DAMAGE_TYPE_COLORS: Record<string, string> = {
    L: 'text-red-400',
    B: 'text-yellow-400',
    Special: 'text-blue-400',
};

function DamageTypeLabel({ damageType }: { damageType: string }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <span className={`font-medium ${DAMAGE_TYPE_COLORS[damageType] ?? ''}`}>
            {t.label('damageType', damageType)}
        </span>
    );
}

export const CONSUMABLE_WEAPONS_COLUMNS: ColumnDef<ConsumableWeaponEntry>[] = [
    {
        id: 'name',
        header: columnHeader(messages.columns.name),
        accessorKey: 'name',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'name'),
    },
    {
        id: 'type',
        header: columnHeader(messages.columns.type),
        accessorKey: 'type',
        enableSorting: true,
        meta: enumLabelMeta(CATALOG_ID, 'type'),
    },
    {
        id: 'damage',
        header: columnHeader(messages.columns.damage),
        accessorKey: 'damage',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'damage'),
    },
    {
        id: 'damageType',
        header: columnHeader(messages.columns.damageType),
        accessorKey: 'damageType',
        enableSorting: true,
        meta: enumLabelMeta(CATALOG_ID, 'damageType'),
        cell: ({ getValue }) => <DamageTypeLabel damageType={getValue<string>()} />,
    },
    {
        id: 'falloff',
        header: columnHeader(messages.columns.falloff),
        accessorKey: 'falloff',
        enableSorting: false,
        meta: localizedTextMeta(CATALOG_ID, 'falloff'),
    },
    {
        id: 'cost',
        header: columnHeader(messages.columns.cost),
        accessorKey: 'cost',
        enableSorting: true,
    },
];

export const CONSUMABLE_WEAPONS_FILTERS: FilterConfig[] = [
    { columnId: 'type', label: messages.columns.type },
];

function ConsumableWeaponDetail({ weapon }: { weapon: ConsumableWeaponEntry }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(weapon, 'description')}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.type)}
                    </span>
                    <p className="text-textSecondary">{t.label('type', weapon.type)}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.damage)}
                    </span>
                    <p className="text-textSecondary">
                        {t.text(weapon, 'damage')}{' '}
                        <span
                            className={
                                weapon.damageType === 'L'
                                    ? 'text-red-400'
                                    : weapon.damageType === 'B'
                                      ? 'text-yellow-400'
                                      : 'text-blue-400'
                            }
                        >
                            ({t.label('damageType', weapon.damageType)})
                        </span>
                    </p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.falloff)}
                    </span>
                    <p className="text-textSecondary">{t.text(weapon, 'falloff')}</p>
                </div>
                <div>
                    <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
                        {translate(messages.detail.cost)}
                    </span>
                    <p className="text-textSecondary">{weapon.cost}</p>
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

export function renderConsumableWeaponDetail(weapon: ConsumableWeaponEntry): ReactNode {
    return <ConsumableWeaponDetail weapon={weapon} />;
}
