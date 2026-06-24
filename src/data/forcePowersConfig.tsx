import { type ColumnDef, type Row } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { ForcePowerEntry } from './forcePowersData';

const ALL_SKILLS = ['Control', 'Dynamism', 'Rapport', 'Sense', 'Telekinesis'];

function arrayIncludesAnyFilterFn<T>(row: Row<T>, columnId: string, filterValue: string): boolean {
    if (!filterValue) return true;
    const value = row.getValue<unknown>(columnId);
    if (!Array.isArray(value)) return false;
    const selected = filterValue.split(',').filter(Boolean);
    if (selected.length === 0) return true;
    return selected.some((s) => value.includes(s));
}

function booleanFilterFn<T>(row: Row<T>, columnId: string, filterValue: string): boolean {
    if (!filterValue) return true;
    const value = row.getValue<boolean>(columnId);
    return filterValue === 'true' ? value === true : value === false;
}

const SkillDots = ({ skills }: { skills: string[] }) => (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
        {ALL_SKILLS.map((skill) => (
            <span
                key={skill}
                className={
                    skills.includes(skill) ? 'text-primary font-semibold' : 'text-textSecondary/40'
                }
            >
                {skill}
                {skills.includes(skill) ? ' ●' : ' ○'}
            </span>
        ))}
    </div>
);

export const FORCE_POWER_COLUMNS: ColumnDef<ForcePowerEntry>[] = [
    {
        id: 'name',
        header: 'Power',
        accessorKey: 'name',
        enableSorting: true,
        cell: ({ getValue }) => {
            const name = getValue<string>();
            return <span className="font-semibold text-textPrimary">{name}</span>;
        },
    },
    {
        id: 'shortDescription',
        header: 'Effect',
        accessorKey: 'shortDescription',
        enableSorting: false,
        size: 280,
    },
    {
        id: 'skills',
        header: 'Skills',
        accessorKey: 'skills',
        enableSorting: false,
        filterFn: arrayIncludesAnyFilterFn,
        size: 300,
        cell: ({ getValue }) => {
            const skills = getValue<string[]>();
            return <SkillDots skills={skills} />;
        },
    },
    {
        id: 'forcePointCost',
        header: 'FP Cost',
        accessorKey: 'forcePointCost',
        enableSorting: true,
        filterFn: booleanFilterFn,
        size: 50,
        cell: ({ getValue }) => {
            const cost = getValue<boolean>();
            return cost ? (
                <span className="text-amber-400 font-bold">●</span>
            ) : (
                <span className="text-textSecondary/40">—</span>
            );
        },
    },
];

export function renderForcePowerDetail(power: ForcePowerEntry): ReactNode {
    return (
        <>
            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    Required Skills
                </h5>
                <SkillDots skills={power.skills} />
            </div>

            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    Force Point Cost
                </h5>
                <p className="text-sm text-textSecondary">
                    {power.forcePointCost ? (
                        <span className="text-amber-400 font-medium">Spend 1 Force Point</span>
                    ) : (
                        <span className="text-textSecondary/60">No Force Point cost</span>
                    )}
                </p>
            </div>

            <p className="text-sm text-textSecondary leading-relaxed mb-4">{power.description}</p>
        </>
    );
}
