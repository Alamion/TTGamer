import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface SecretFieldProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    'aria-label'?: string;
    label?: string;
    validationMessage?: string;
    isValid?: boolean;
}

export function SecretField({
    value,
    onChange,
    placeholder,
    className = '',
    inputClassName = '',
    'aria-label': ariaLabel,
    label,
    validationMessage,
    isValid,
}: SecretFieldProps) {
    const [visible, setVisible] = useState(false);
    const inputId = useId();

    return (
        <div className={`space-y-1 ${className}`}>
            {label && (
                <label htmlFor={inputId} className="text-xs text-textSecondary">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    id={inputId}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    aria-label={ariaLabel}
                    className={`w-full h-8 px-2 pr-8 text-xs rounded border border-border
                        bg-bgBase text-textPrimary placeholder:text-textSecondary/40
                        focus:outline-none focus:ring-1 focus:ring-primary ${inputClassName}`}
                />
                <button
                    type="button"
                    aria-label={visible ? 'Hide secret field' : 'Show secret field'}
                    onClick={() => setVisible((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2
                        w-6 h-6 flex items-center justify-center
                        text-textSecondary hover:text-textPrimary transition-colors"
                >
                    {visible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            </div>
            {validationMessage && (
                <span className={`text-xs ${isValid ? 'text-green-500' : 'text-red-500'}`}>
                    {validationMessage}
                </span>
            )}
        </div>
    );
}
