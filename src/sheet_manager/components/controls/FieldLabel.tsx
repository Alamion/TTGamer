import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';

import { TermLabel } from '../terms/TermLabel';
import type { TermLink } from '../terms/termLink';

const labelStyles = {
    // Stacked above a control, like every template field's caption.
    top: 'text-xs font-medium text-textSecondary',
    // Beside the value, like a trait row's name (StatLabel).
    left: 'text-sm font-medium text-textPrimary',
} as const;

/** A template field's visible label in its chosen position (spec 014). */
export function FieldLabel({
    label,
    term,
    required = false,
    position,
    hidden = false,
    className,
}: {
    label: string;
    term?: TermLink;
    required?: boolean;
    position: 'top' | 'left';
    /** Kept for assistive technology only. */
    hidden?: boolean;
    className?: string;
}) {
    return (
        <span className={clsx(labelStyles[position], hidden && 'sr-only', className)}>
            <TermLabel text={label} {...term} />
            {required && (
                <span
                    aria-label={translate(uiMessages.sheet.templates.editor.fieldRequired)}
                    className="ml-0.5 text-error"
                >
                    *
                </span>
            )}
        </span>
    );
}
