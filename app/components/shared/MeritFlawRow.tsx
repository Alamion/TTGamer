import { Plus, X } from 'lucide-react';
import { SectionCard } from './SectionCard';

interface MeritFlawItem {
    id: string;
    points: number;
    label: string;
}

interface MeritFlawListProps {
    title: string;
    items: MeritFlawItem[];
    onAdd: () => void;
    onRemove: (id: string) => void;
    onChange: (id: string, points: number, label: string) => void;
    isMerit?: boolean;
    disabled?: boolean;
}

export function MeritFlawList({
    title,
    items,
    onAdd,
    onRemove,
    onChange,
    isMerit = true,
    disabled = false,
}: MeritFlawListProps) {
    return (
        <SectionCard title={title}>
            <div className="space-y-2">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                        <span className="font-mono font-bold text-md text-textPrimary">
                            {isMerit ? '+' : '-'}
                        </span>
                        <input
                            type="number"
                            value={item.points}
                            onChange={(e) =>
                                onChange(item.id, parseInt(e.target.value) || 0, item.label)
                            }
                            disabled={disabled}
                            className="w-8 bg-bgSurface border rounded px-2 py-0.5 text-center text-sm font-mono text-textPrimary"
                            min={1}
                            max={5}
                        />
                        <input
                            type="text"
                            value={item.label}
                            onChange={(e) => onChange(item.id, item.points, e.target.value)}
                            disabled={disabled}
                            className="flex-1 bg-bgSurface border rounded px-3 py-1 text-sm text-textPrimary"
                            placeholder={isMerit ? 'Merit name...' : 'Flaw name...'}
                        />
                        <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            disabled={disabled}
                            className="text-textSecondary hover:text-error transition-colors p-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={onAdd}
                disabled={disabled}
                className="flex items-center gap-1 text-sm mt-3 py-1 transition-colors text-textPrimary hover:opacity-80"
            >
                <Plus className="w-4 h-4" />
                Add {title.slice(0, -1)}
            </button>
        </SectionCard>
    );
}
