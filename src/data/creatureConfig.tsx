import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { columnHeader, enumLabelMeta, localizedTextMeta, useCatalogText } from './catalogI18n';
import type { CreatureEntry } from './creatureData';

const CATALOG_ID = 'creatures';
const messages = uiMessages.catalogs.creatures;
const detail = messages.detail;

const SCALE_CLASSES: Record<string, string> = {
    Vermin: 'text-xs',
    Character: 'text-xs',
    Speeder: 'text-xs',
    Walker: 'text-xs',
};

function ScaleLabel({ scale }: { scale: string }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <span className={`font-medium ${SCALE_CLASSES[scale] ?? ''}`}>
            {t.label('scale', scale)}
        </span>
    );
}

export const CREATURE_COLUMNS: ColumnDef<CreatureEntry>[] = [
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
        id: 'scale',
        header: columnHeader(messages.columns.scale),
        accessorKey: 'scale',
        enableSorting: true,
        meta: enumLabelMeta(CATALOG_ID, 'scale'),
        cell: ({ getValue }) => <ScaleLabel scale={getValue<string>()} />,
    },
    {
        id: 'attacks',
        header: columnHeader(messages.columns.attacks),
        accessorKey: 'attacks',
        enableSorting: false,
        cell: ({ getValue }) => {
            const attacks = getValue<CreatureEntry['attacks']>();
            return (
                <div className="flex flex-col gap-0.5">
                    {attacks.map((a) => (
                        <span key={a.name} className="text-xs text-textSecondary whitespace-nowrap">
                            {a.name} ({a.type}) {a.damage}
                        </span>
                    ))}
                </div>
            );
        },
    },
];

function StatRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-4 py-0.5">
            <span className="text-xs font-medium text-textSecondary uppercase tracking-wider min-w-[60px]">
                {label}
            </span>
            <span className="text-sm text-textPrimary font-mono">{value}</span>
        </div>
    );
}

function AbilityList({
    abilities,
    label,
}: {
    abilities: { name: string; dice: string }[];
    label: string;
}) {
    if (abilities.length === 0) return null;
    return (
        <div className="mb-3">
            <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                {label}
            </h5>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {abilities.map((a) => (
                    <span key={a.name} className="text-sm text-textPrimary font-mono">
                        {a.name} {a.dice}
                    </span>
                ))}
            </div>
        </div>
    );
}

function TraitList({
    traits,
    label,
    color,
}: {
    traits: { name: string; description: string }[];
    label: string;
    color: string;
}) {
    if (traits.length === 0) return null;
    return (
        <div className="mb-3">
            <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                {label}
            </h5>
            <ul className="space-y-1">
                {traits.map((t) => (
                    <li key={t.name} className="text-sm">
                        <span
                            className={
                                color === 'green'
                                    ? 'text-green-400 font-medium'
                                    : 'text-red-400 font-medium'
                            }
                        >
                            {t.name}
                        </span>
                        <span className="text-textSecondary"> — {t.description}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function CreatureDetail({ creature }: { creature: CreatureEntry }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(creature, 'description')}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        {translate(detail.physical)}
                    </h5>
                    <StatRow label={translate(detail.strength)} value={creature.strength} />
                    <StatRow label={translate(detail.dexterity)} value={creature.dexterity} />
                    <StatRow label={translate(detail.stamina)} value={creature.stamina} />
                </div>
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        {translate(detail.mental)}
                    </h5>
                    <StatRow label={translate(detail.perception)} value={creature.perception} />
                    <StatRow label={translate(detail.intelligence)} value={creature.intelligence} />
                    <StatRow label={translate(detail.wits)} value={creature.wits} />
                </div>
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        {translate(detail.other)}
                    </h5>
                    <StatRow label={translate(detail.willpower)} value={creature.willpower} />
                    <StatRow
                        label={translate(detail.movement)}
                        value={t.text(creature, 'movement')}
                    />
                    <StatRow
                        label={translate(detail.scale)}
                        value={t.label('scale', creature.scale)}
                    />
                    <StatRow label={translate(detail.size)} value={t.text(creature, 'size')} />
                </div>
            </div>

            {creature.armor && (
                <div className="mb-3">
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        {translate(detail.armor)}
                    </h5>
                    <p className="text-sm text-textPrimary font-mono">
                        {t.text(creature, 'armor')}
                    </p>
                </div>
            )}

            <AbilityList abilities={creature.abilities} label={translate(detail.abilities)} />

            <div className="mb-3">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                    {translate(detail.attacks)}
                </h5>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                    {creature.attacks.map((a) => (
                        <span key={a.name} className="text-sm font-mono">
                            <span className="text-textPrimary">{a.name}</span>{' '}
                            <span className={a.type === 'L' ? 'text-red-400' : 'text-yellow-400'}>
                                ({a.type})
                            </span>{' '}
                            <span className="text-textSecondary">{a.damage}</span>
                        </span>
                    ))}
                </div>
            </div>

            <TraitList traits={creature.merits} label={translate(detail.merits)} color="green" />
            <TraitList traits={creature.flaws} label={translate(detail.flaws)} color="red" />
        </>
    );
}

export function renderCreatureDetail(creature: CreatureEntry): ReactNode {
    return <CreatureDetail creature={creature} />;
}
