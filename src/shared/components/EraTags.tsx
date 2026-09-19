import { clsx } from 'clsx';

interface EraTagsProps {
    eras: string[];
    className?: string;
    /** Display label of an era value (e.g. a localized catalog label); defaults to the value. */
    getLabel?: (era: string) => string;
}

export function EraTags({ eras, className, getLabel }: EraTagsProps) {
    return (
        <div className={clsx('flex flex-wrap gap-1', className)}>
            {eras.map((era) => (
                <span
                    key={era}
                    className="px-1.5 py-0.5 text-[10px] rounded-full bg-bgBase text-textSecondary border border-border whitespace-nowrap"
                >
                    {getLabel ? getLabel(era) : era}
                </span>
            ))}
        </div>
    );
}
