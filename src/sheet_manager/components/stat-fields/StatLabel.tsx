import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

import { TermLabel } from '../terms/TermLabel';
import type { TermLink } from '../terms/termLink';

interface StatLabelProps {
    label: string;
    tooltip?: string;
    className?: string;
    required?: boolean;
    /** Book term of the label (spec 009): enables the English-name hint. */
    term?: TermLink;
}

export function StatLabel({ label, tooltip, className, required = false, term }: StatLabelProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className={clsx('relative flex min-w-0 items-center gap-2', className)}>
            <TermLabel
                text={label}
                {...term}
                className="line-clamp-2 min-w-0 text-sm font-medium text-textPrimary"
            />
            {required && <span className="text-error">*</span>}
            {tooltip && (
                <div className="relative">
                    <button
                        type="button"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        onFocus={() => setShowTooltip(true)}
                        onBlur={() => setShowTooltip(false)}
                        className="text-textSecondary hover:text-textPrimary transition-colors"
                        aria-label={translate(uiMessages.sheet.controls.labelInformation, {
                            label,
                        })}
                    >
                        <HelpCircle className="w-4 h-4" />
                    </button>
                    {showTooltip && (
                        <div className="absolute z-50 left-full ml-2 top-0 w-48 p-2 bg-bgSurface border rounded text-xs text-textPrimary shadow-lg">
                            {tooltip}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
