import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { columnHeader, localizedTextMeta, useCatalogText } from './catalogI18n';
import type { MeleeWeaponEntry } from './meleeWeaponsData';

const CATALOG_ID = 'melee-weapons';
const messages = uiMessages.catalogs.meleeWeapons;

export const MELEE_WEAPONS_COLUMNS: ColumnDef<MeleeWeaponEntry>[] = [
    {
        id: 'name',
        header: columnHeader(messages.columns.name),
        accessorKey: 'name',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'name'),
    },
    {
        id: 'difficulty',
        header: columnHeader(messages.columns.difficulty),
        accessorKey: 'difficulty',
        enableSorting: true,
    },
    {
        id: 'damage',
        header: columnHeader(messages.columns.damage),
        accessorKey: 'damage',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'damage'),
    },
    {
        id: 'conceal',
        header: columnHeader(messages.columns.conceal),
        accessorKey: 'conceal',
        enableSorting: true,
    },
];

function MeleeWeaponDetail({ weapon }: { weapon: MeleeWeaponEntry }) {
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

export function renderMeleeWeaponDetail(weapon: MeleeWeaponEntry): ReactNode {
    return <MeleeWeaponDetail weapon={weapon} />;
}
