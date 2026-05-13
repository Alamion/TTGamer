import { useCallback } from 'react';
import { clsx } from 'clsx';

interface StatDotProps {
  value: number;
  maxValue?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatDot({
  value,
  maxValue = 5,
  onChange,
  disabled = false,
  size = 'md',
}: StatDotProps) {
  const handleClick = useCallback(
    (index: number) => {
      if (disabled) return;
      const newValue = index + 1 === value ? 0 : index + 1;
      onChange?.(newValue);
    },
    [disabled, onChange, value]
  );

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Stat value">
      {Array.from({ length: maxValue }, (_, i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={i + 1 === value}
          disabled={disabled}
          onClick={() => handleClick(i)}
          className={clsx(
            'rounded-full transition-all duration-200 border-2',
            sizeClasses[size],
            i + 1 <= value
              ? 'bg-hologram-blue border-hologram-blue'
              : 'bg-transparent border-slate-600 hover:border-slate-400',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      ))}
    </div>
  );
}
