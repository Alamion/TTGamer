import type { ReactNode } from 'react';

export function SpecialtiesList({ specialties }: { specialties: string[] }): ReactNode {
    if (specialties.length === 0) return null;
    return (
        <div className="mb-4">
            <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                Specialties
            </h5>
            <div className="flex flex-wrap gap-1">
                {specialties.map((s) => (
                    <span
                        key={s}
                        className="px-2 py-0.5 text-xs rounded-full bg-bgBase text-textSecondary border border-border"
                    >
                        {s}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function ScaleList({
    scale,
    title = 'Rating Scale',
}: {
    scale: string[];
    title?: string;
}): ReactNode {
    if (scale.length === 0) return null;
    return (
        <div>
            <h5 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                {title}
            </h5>
            <ul className="space-y-1">
                {scale.map((s, i) => (
                    <li key={i} className="text-xs text-textSecondary">
                        {'\u2022'.repeat(i + 1)} {s}
                    </li>
                ))}
            </ul>
        </div>
    );
}
