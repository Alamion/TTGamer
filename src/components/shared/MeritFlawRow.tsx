import { clsx } from 'clsx';
import { Plus, X } from 'lucide-react';

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
  const accentColor = isMerit ? 'text-hologram-blue' : 'text-rebel-red';
  const borderColor = isMerit ? 'border-hologram-blue' : 'border-rebel-red';

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
      <h3
        className={clsx(
          'text-sm font-semibold uppercase tracking-wider mb-3 border-b border-slate-700 pb-2',
          accentColor
        )}
      >
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className={clsx('font-mono font-bold text-sm w-4', accentColor)}>
              {isMerit ? '+' : '-'}
            </span>
            <input
              type="number"
              value={item.points}
              onChange={(e) => onChange(item.id, parseInt(e.target.value) || 0, item.label)}
              disabled={disabled}
              className={clsx(
                'w-12 bg-slate-900 border rounded px-2 py-0.5 text-center text-sm font-mono',
                borderColor,
                'text-slate-200 focus:outline-none'
              )}
              min={1}
              max={5}
            />
            <input
              type="text"
              value={item.label}
              onChange={(e) => onChange(item.id, item.points, e.target.value)}
              disabled={disabled}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm text-slate-300 focus:border-slate-500 focus:outline-none"
              placeholder={isMerit ? 'Merit name...' : 'Flaw name...'}
            />
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={disabled}
              className="text-slate-500 hover:text-rebel-red transition-colors p-1"
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
        className={clsx(
          'flex items-center gap-1 text-sm mt-3 py-1 transition-colors',
          accentColor,
          'hover:opacity-80'
        )}
      >
        <Plus className="w-4 h-4" />
        Add {title.slice(0, -1)}
      </button>
    </div>
  );
}
