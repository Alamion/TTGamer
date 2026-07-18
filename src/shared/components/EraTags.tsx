import { clsx } from 'clsx';

interface EraTagsProps {
    eras: string[];
    className?: string;
}

export function EraTags({ eras, className }: EraTagsProps) {
    return (
        <div className={clsx('flex flex-wrap gap-1', className)}>
            {eras.map((era) => (
                <span
                    key={era}
                    className="px-1.5 py-0.5 text-[10px] rounded-full bg-bgBase text-textSecondary border border-border whitespace-nowrap"
                >
                    {era}
                </span>
            ))}
        </div>
    );
}
