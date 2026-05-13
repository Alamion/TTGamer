import { clsx } from 'clsx';

export type ConditionMark = 'empty' | 'slash' | 'cross' | 'filled';

interface ConditionSquareProps {
  mark: ConditionMark;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function ConditionSquare({
  mark,
  onClick,
  disabled = false,
  size = 'md',
  label,
}: ConditionSquareProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const markContent = {
    empty: '',
    slash: '/',
    cross: 'X',
    filled: '●',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label || `Condition: ${mark}`}
      className={clsx(
        'flex items-center justify-center border-2 rounded font-mono font-bold transition-all duration-200',
        sizeClasses[size],
        mark === 'filled'
          ? 'bg-rebel-red border-rebel-red text-white'
          : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-400',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {markContent[mark]}
    </button>
  );
}

interface ConditionTrackProps {
  states: ConditionMark[];
  onChange?: (index: number, mark: ConditionMark) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  labels?: string[];
}

export function ConditionTrack({
  states,
  onChange,
  disabled = false,
  size = 'md',
  labels,
}: ConditionTrackProps) {
  const handleClick = (index: number) => {
    if (disabled) return;
    const marks: ConditionMark[] = ['empty', 'slash', 'cross', 'filled'];
    const currentIndex = marks.indexOf(states[index]);
    const nextMark = marks[(currentIndex + 1) % marks.length];
    onChange?.(index, nextMark);
  };

  return (
    <div className="flex gap-1" role="group" aria-label="Health track">
      {states.map((mark, index) => (
        <ConditionSquare
          key={index}
          mark={mark}
          onClick={() => handleClick(index)}
          disabled={disabled}
          size={size}
          label={labels?.[index]}
        />
      ))}
    </div>
  );
}
