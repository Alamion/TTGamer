import { useState } from 'react';
import { clsx } from 'clsx';
import { CatalogSuggest } from './CatalogSuggest.tsx';
import type { CatalogEntry } from './CatalogSuggest.tsx';
import { StatLabel } from './StatLabel.tsx';
import { StatDot } from './StatDot.tsx';
import { Plus } from 'lucide-react';

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
    onDiceRoll?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => string | undefined;
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
    onDiceRoll,
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
                onDiceRoll={onDiceRoll}
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
    onDiceRoll?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => string | undefined;
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
    onDiceRoll,
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
        <div className={clsx('flex items-end gap-2 py-1.5', className)}>
            <StatLabel label={name} tooltip={tooltip} />
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={clsx(
                    'flex-1 bg-transparent border-b px-2 text-sm text-textPrimary transition-colors min-w-5',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
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
                onDiceRoll={onDiceRoll}
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
    onDiceRoll?: (
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => string | undefined;
    catalog?: CatalogEntry[];
    onCatalogSelect?: (id: string, entry: CatalogEntry) => void;
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
    onDiceRoll,
    catalog,
    onCatalogSelect,
}: CustomTraitListProps) {
    return (
        <div className="space-y-1">
            {items.map((item) => (
                <div key={item.id} className="flex items-end gap-2 py-1">
                    {catalog && onCatalogSelect ? (
                        <CatalogSuggest
                            catalog={catalog}
                            value={item.label}
                            onChange={(label) => onLabelChange(item.id, label)}
                            onSelect={(entry) => onCatalogSelect(item.id, entry)}
                            placeholder={placeholder}
                            disabled={disabled}
                            className="flex-1 bg-transparent border-b px-2 py-0.5 text-sm text-textPrimary transition-colors"
                        />
                    ) : (
                        <input
                            type="text"
                            value={item.label}
                            onChange={(e) => onLabelChange(item.id, e.target.value)}
                            disabled={disabled}
                            className="flex-1 bg-transparent border-b px-2 py-0.5 text-sm text-textPrimary transition-colors"
                            placeholder={placeholder}
                        />
                    )}
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
                        onRemove={() => onRemove(item.id)}
                        onDiceRoll={
                            onDiceRoll
                                ? (val, spec, exp, prc) => onDiceRoll(val, spec, exp, prc)
                                : undefined
                        }
                    />
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
