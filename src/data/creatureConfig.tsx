import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { CreatureEntry } from './creatureData';

export const CREATURE_COLUMNS: ColumnDef<CreatureEntry>[] = [
    {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        enableSorting: true,
    },
    {
        id: 'type',
        header: 'Type',
        accessorKey: 'type',
        enableSorting: true,
    },
    {
        id: 'scale',
        header: 'Scale',
        accessorKey: 'scale',
        enableSorting: true,
        cell: ({ getValue }) => {
            const scale = getValue<string>();
            const colors: Record<string, string> = {
                Vermin: 'text-xs',
                Character: 'text-xs',
                Speeder: 'text-xs',
                Walker: 'text-xs',
            };
            return <span className={`font-medium ${colors[scale] ?? ''}`}>{scale}</span>;
        },
    },
    {
        id: 'attacks',
        header: 'Attacks',
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

export function renderCreatureDetail(creature: CreatureEntry): ReactNode {
    return (
        <>
            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {creature.description}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        Physical
                    </h5>
                    <StatRow label="STR" value={creature.strength} />
                    <StatRow label="DEX" value={creature.dexterity} />
                    <StatRow label="STA" value={creature.stamina} />
                </div>
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        Mental
                    </h5>
                    <StatRow label="PER" value={creature.perception} />
                    <StatRow label="INT" value={creature.intelligence} />
                    <StatRow label="WITS" value={creature.wits} />
                </div>
                <div>
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        Other
                    </h5>
                    <StatRow label="WIL" value={creature.willpower} />
                    <StatRow label="MVMT" value={creature.movement} />
                    <StatRow label="Scale" value={creature.scale} />
                    <StatRow label="Size" value={creature.size} />
                </div>
            </div>

            {creature.armor && (
                <div className="mb-3">
                    <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                        Armor
                    </h5>
                    <p className="text-sm text-textPrimary font-mono">{creature.armor}</p>
                </div>
            )}

            <AbilityList abilities={creature.abilities} label="Abilities" />

            <div className="mb-3">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                    Attacks
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

            <TraitList traits={creature.merits} label="Merits" color="green" />
            <TraitList traits={creature.flaws} label="Flaws" color="red" />
        </>
    );
}
