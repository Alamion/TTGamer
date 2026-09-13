import { clsx } from 'clsx';
import { useCallback } from 'react';

interface CheckboxProps {
    checked: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    label: string;
    id?: string;
    activeColor?: { bg?: string; border?: string };
}

const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
};

const labelSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
};

export function Checkbox({
    checked,
    onChange,
    disabled = false,
    size = 'md',
    label,
    id,
    activeColor,
}: CheckboxProps) {
    const handleToggle = useCallback(() => {
        if (disabled) return;
        onChange?.(!checked);
    }, [disabled, onChange, checked]);

    return (
        <div
            className={clsx(
                'flex items-center gap-2 cursor-pointer select-none',
                disabled && 'opacity-50 cursor-not-allowed w-fit'
            )}
        >
            <button
                key={id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                onClick={() => handleToggle()}
                className={clsx(
                    'rounded-full transition-all duration-200 border-2',
                    sizeClasses[size],
                    checked
                        ? activeColor
                            ? `${activeColor.bg} ${activeColor.border}`
                            : 'bg-primary border-primary'
                        : 'bg-transparent hover:border-primary/80',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            />
            <span className={clsx('text-textPrimary', labelSizeClasses[size])}>{label}</span>
        </div>
    );
}
