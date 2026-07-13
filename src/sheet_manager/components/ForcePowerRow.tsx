import { X } from 'lucide-react';
import { StatDot } from './StatDot.tsx';

interface ForcePowerRowProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

export function ForcePowerRow({ label, checked, onChange, disabled = false }: ForcePowerRowProps) {
    return (
        <div className="flex items-center gap-2 py-1 px-1 rounded hover:bg-bgBase/30">
            <StatDot
                value={checked ? 1 : 0}
                maxValue={1}
                onChange={(val) => onChange(val === 1)}
                disabled={disabled}
                size="sm"
                showFlags={false}
            />
            <span className="text-sm text-textPrimary">{label}</span>
        </div>
    );
}

interface ForcePowerRowCustomProps {
    name: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    onNameChange: (name: string) => void;
    onRemove: () => void;
    disabled?: boolean;
}

export function ForcePowerRowCustom({
    name,
    checked,
    onCheckedChange,
    onNameChange,
    onRemove,
    disabled = false,
}: ForcePowerRowCustomProps) {
    return (
        <div className="flex items-center gap-2 py-1 px-1 rounded hover:bg-bgBase/30">
            <StatDot
                value={checked ? 1 : 0}
                maxValue={1}
                onChange={(val) => onCheckedChange(val === 1)}
                disabled={disabled}
                size="sm"
                showFlags={false}
            />
            <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                disabled={disabled}
                className="flex-1 bg-transparent border-b px-2 py-0.5 text-sm text-textPrimary"
                placeholder="Custom power name"
            />
            <button
                type="button"
                onClick={onRemove}
                className="p-0.5 rounded hover:bg-bgSurface text-textSecondary hover:text-textPrimary transition-colors"
                aria-label={`Remove ${name}`}
            >
                <X size={14} />
            </button>
        </div>
    );
}
