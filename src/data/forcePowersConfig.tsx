import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import type { FilterConfig } from '@site/src/shared/components/DataCatalog';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { columnHeader, enumLabelMeta, localizedTextMeta, useCatalogText } from './catalogI18n';
import { arrayIncludesAnyFilterFn, booleanFilterFn } from './dataFilters';
import type { ForcePowerEntry } from './forcePowersData';

const CATALOG_ID = 'force-powers';
const messages = uiMessages.catalogs.forcePowers;

const ALL_SKILLS = ['Control', 'Dynamism', 'Rapport', 'Sense', 'Telekinesis'];

const SkillDots = ({ skills }: { skills: string[] }) => {
    const t = useCatalogText(CATALOG_ID);
    return (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
            {ALL_SKILLS.map((skill) => (
                <span
                    key={skill}
                    className={
                        skills.includes(skill)
                            ? 'text-primary font-semibold'
                            : 'text-textSecondary/40'
                    }
                >
                    {t.label('skills', skill)}
                    {skills.includes(skill) ? ' ●' : ' ○'}
                </span>
            ))}
        </div>
    );
};

export const FORCE_POWER_COLUMNS: ColumnDef<ForcePowerEntry>[] = [
    {
        id: 'name',
        header: columnHeader(messages.columns.name),
        accessorKey: 'name',
        enableSorting: true,
        meta: localizedTextMeta(CATALOG_ID, 'name'),
        cell: ({ getValue }) => {
            const name = getValue<string>();
            return <span className="font-semibold text-textPrimary">{name}</span>;
        },
    },
    {
        id: 'shortDescription',
        header: columnHeader(messages.columns.shortDescription),
        accessorKey: 'shortDescription',
        enableSorting: false,
        size: 280,
        meta: localizedTextMeta(CATALOG_ID, 'shortDescription'),
    },
    {
        id: 'skills',
        header: columnHeader(messages.columns.skills),
        accessorKey: 'skills',
        enableSorting: false,
        filterFn: arrayIncludesAnyFilterFn,
        size: 300,
        meta: enumLabelMeta(CATALOG_ID, 'skills'),
        cell: ({ getValue }) => {
            const skills = getValue<string[]>();
            return <SkillDots skills={skills} />;
        },
    },
    {
        id: 'forcePointCost',
        header: columnHeader(messages.columns.forcePointCost),
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

export const FORCE_POWER_FILTERS: FilterConfig[] = [
    {
        columnId: 'forcePointCost',
        label: messages.detail.forcePointCost,
        optionsMap: { true: messages.filters.costsFp, false: messages.filters.free },
    },
    { columnId: 'skills', label: messages.columns.skills, mode: 'multi' },
];

function ForcePowerDetail({ power }: { power: ForcePowerEntry }) {
    const t = useCatalogText(CATALOG_ID);
    return (
        <>
            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    {translate(messages.detail.requiredSkills)}
                </h5>
                <SkillDots skills={power.skills} />
            </div>

            <div className="mb-4">
                <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    {translate(messages.detail.forcePointCost)}
                </h5>
                <p className="text-sm text-textSecondary">
                    {power.forcePointCost ? (
                        <span className="text-amber-400 font-medium">
                            {translate(messages.detail.spendOne)}
                        </span>
                    ) : (
                        <span className="text-textSecondary/60">
                            {translate(messages.detail.noCost)}
                        </span>
                    )}
                </p>
            </div>

            <p className="text-sm text-textSecondary leading-relaxed mb-4">
                {t.text(power, 'description')}
            </p>
        </>
    );
}

export function renderForcePowerDetail(power: ForcePowerEntry): ReactNode {
    return <ForcePowerDetail power={power} />;
}
