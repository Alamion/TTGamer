import { useState } from 'react';
import { clsx } from 'clsx';
import { StatLabel } from './StatLabel';
import { StatDot } from './StatDot';
import { Plus, X } from 'lucide-react';

interface TraitRowProps {
    label: string;
    value: number;
    maxValue?: number;
    onChange?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => void;
    tooltip?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    minimal?: number;
    showFlags?: boolean;
    specialization?: boolean | null;
    experienced?: boolean | null;
    practiced?: boolean | null;
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
    minimal,
    showFlags = false,
    specialization = null,
    experienced = null,
    practiced = null,
}: TraitRowProps) {
    return (
        <div className={clsx('flex items-end justify-between py-1', className)}>
            <StatLabel label={label} tooltip={tooltip} />
            <StatDot
                value={value}
                maxValue={maxValue}
                onChange={onChange}
                disabled={disabled}
                size={size}
                minimal={minimal}
                showFlags={showFlags}
                specialization={specialization}
                experienced={experienced}
                practiced={practiced}
            />
        </div>
    );
}

interface TraitRowWithInputProps {
    name: string;
    specializationText?: string;
    value: number;
    maxValue?: number;
    onChange?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => void;
    onSpecializationTextChange?: (specializationText: string) => void;
    tooltip?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    minimal?: number;
    showFlags?: boolean;
    specialization?: boolean | null;
    experienced?: boolean | null;
    practiced?: boolean | null;
}

export function TraitRowWithInput({
    name,
    specializationText = '',
    value,
    maxValue = 5,
    onChange,
    onSpecializationTextChange,
    tooltip,
    disabled = false,
    size = 'md',
    className,
    minimal,
    showFlags = false,
    specialization = null,
    experienced = null,
    practiced = null,
}: TraitRowWithInputProps) {
    const [inputValue, setInputValue] = useState(specializationText);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onSpecializationTextChange?.(newValue);
    };

    const handleBlur = () => {
        if (!inputValue.trim()) {
            setInputValue(specializationText);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    return (
        <div className={clsx('flex items-end gap-2 py-1', className)}>
            <StatLabel label={name} tooltip={tooltip} />
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={clsx(
                    'flex-1 bg-transparent border-b px-2 py-0.5 text-sm text-textPrimary transition-colors min-w-5',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
                // placeholder="Specialization"
            />
            <StatDot
                value={value}
                maxValue={maxValue}
                onChange={onChange}
                disabled={disabled}
                size={size}
                minimal={minimal}
                showFlags={showFlags}
                specialization={specialization}
                experienced={experienced}
                practiced={practiced}
            />
        </div>
    );
}

interface CustomTraitListProps {
    items: Array<{
        id: string;
        label: string;
        value: number;
        specialization?: boolean;
        experienced?: boolean;
        practiced?: boolean;
    }>;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onChange: (
        id: string,
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => void;
    onLabelChange: (id: string, label: string) => void;
    maxValue?: number;
    placeholder?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showFlags?: boolean;
}

export function CustomTraitList({
    items,
    onAdd,
    onRemove,
    onChange,
    onLabelChange,
    maxValue = 5,
    placeholder = 'Custom skill',
    disabled = false,
    size = 'md',
    showFlags = false,
}: CustomTraitListProps) {
    const sizeClasses = {
        sm: { button: 'bottom-4 right-0', label: 'w-3.5 h-3.5' },
        md: { button: 'bottom-5 right-0', label: 'w-4 h-4' },
        lg: { button: 'bottom-6 right-0', label: 'w-5 h-5' },
    };

    return (
        <div className="space-y-1">
            {items.map((item) => (
                <div key={item.id} className="flex items-end gap-2 relative py-1">
                    <input
                        type="text"
                        value={item.label}
                        onChange={(e) => onLabelChange(item.id, e.target.value)}
                        disabled={disabled}
                        className="flex-1 bg-transparent border-b px-2 py-0.5 text-sm text-textPrimary transition-colors"
                        placeholder={placeholder}
                    />
                    <StatDot
                        value={item.value}
                        maxValue={maxValue}
                        onChange={(val, spec, exp, prc) => onChange(item.id, val, spec, exp, prc)}
                        disabled={disabled}
                        size={size}
                        showFlags={showFlags}
                        specialization={item.specialization}
                        experienced={item.experienced}
                        practiced={item.practiced}
                    />
                    <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        disabled={disabled}
                        className={clsx(
                            'text-textSecondary hover:text-error transition-colors absolute',
                            sizeClasses[size].button
                        )}
                    >
                        <X className={clsx(sizeClasses[size].label)} />
                    </button>
                </div>
            ))}
            <button
                type="button"
                onClick={onAdd}
                disabled={disabled}
                className="flex items-center gap-1 text-sm text-textPrimary hover:text-textPrimary/80 transition-colors py-1"
            >
                <Plus className="w-4 h-4" />
                Add
            </button>
        </div>
    );
}
