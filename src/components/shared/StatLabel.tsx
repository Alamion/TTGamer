import { useState } from 'react';
import { clsx } from 'clsx';
import { HelpCircle } from 'lucide-react';

interface StatLabelProps {
    label: string;
    tooltip?: string;
    className?: string;
    required?: boolean;
}

export function StatLabel({ label, tooltip, className, required = false }: StatLabelProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className={clsx('relative flex items-center gap-2', className)}>
            <span className="text-sm font-medium text-slate-300">{label}</span>
            {required && <span className="text-rebel-red">*</span>}
            {tooltip && (
                <div className="relative">
                    <button
                        type="button"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        onFocus={() => setShowTooltip(true)}
                        onBlur={() => setShowTooltip(false)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                        aria-label={`${label} information`}
                    >
                        <HelpCircle className="w-4 h-4" />
                    </button>
                    {showTooltip && (
                        <div className="absolute z-50 left-full ml-2 top-0 w-48 p-2 bg-slate-800 border border-slate-600 rounded text-xs text-slate-300 shadow-lg">
                            {tooltip}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
