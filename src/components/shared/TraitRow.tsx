import { useState } from 'react';
import { clsx } from 'clsx';
import { StatLabel } from './StatLabel';
import { StatDot } from './StatDot';
import { Plus, X } from 'lucide-react';

interface TraitRowProps {
  label: string;
  value: number;
  maxValue?: number;
  onChange?: (value: number) => void;
  tooltip?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TraitRow({
  label,
  value,
  maxValue = 5,
  onChange,
  tooltip,
  disabled = false,
  size = 'md',
  className,
}: TraitRowProps) {
  return (
    <div className={clsx('flex items-center justify-between py-1', className)}>
      <StatLabel label={label} tooltip={tooltip} />
      <StatDot
        value={value}
        maxValue={maxValue}
        onChange={onChange}
        disabled={disabled}
        size={size}
      />
    </div>
  );
}

interface TraitRowWithInputProps {
  label: string;
  value: number;
  maxValue?: number;
  onChange?: (value: number) => void;
  onLabelChange?: (label: string) => void;
  tooltip?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TraitRowWithInput({
  label,
  value,
  maxValue = 5,
  onChange,
  onLabelChange,
  tooltip,
  disabled = false,
  size = 'md',
  className,
}: TraitRowWithInputProps) {
  const [inputValue, setInputValue] = useState(label);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onLabelChange?.(e.target.value);
  };

  const handleBlur = () => {
    if (!inputValue.trim()) {
      setInputValue(label);
    }
  };

  return (
    <div className={clsx('flex items-center gap-2 py-1', className)}>
      <StatLabel label={label} tooltip={tooltip} />
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        disabled={disabled}
        className={clsx(
          'flex-1 bg-transparent border-b border-slate-700 px-2 py-0.5 text-sm text-slate-300 focus:border-hologram-blue focus:outline-none transition-colors placeholder-slate-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        placeholder={label}
      />
      <StatDot
        value={value}
        maxValue={maxValue}
        onChange={onChange}
        disabled={disabled}
        size={size}
      />
    </div>
  );
}

interface CustomTraitListProps {
  items: Array<{ id: string; label: string; value: number }>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, value: number) => void;
  onLabelChange: (id: string, label: string) => void;
  maxValue?: number;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CustomTraitList({
  items,
  onAdd,
  onRemove,
  onChange,
  onLabelChange,
  maxValue = 5,
  placeholder = 'New skill',
  disabled = false,
  size = 'md',
}: CustomTraitListProps) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <input
            type="text"
            value={item.label}
            onChange={(e) => onLabelChange(item.id, e.target.value)}
            disabled={disabled}
            className="flex-1 bg-transparent border-b border-slate-700 px-2 py-0.5 text-sm text-slate-300 focus:border-hologram-blue focus:outline-none transition-colors placeholder-slate-600"
            placeholder={placeholder}
          />
          <StatDot
            value={item.value}
            maxValue={maxValue}
            onChange={(val) => onChange(item.id, val)}
            disabled={disabled}
            size={size}
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
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="flex items-center gap-1 text-sm text-hologram-blue hover:text-hologram-blue/80 transition-colors py-1"
      >
        <Plus className="w-4 h-4" />
        Add
      </button>
    </div>
  );
}
