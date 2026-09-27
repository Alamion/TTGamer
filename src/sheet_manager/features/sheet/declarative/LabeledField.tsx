import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import { FieldLabel } from '../../../components/controls/FieldLabel';
import type { TermLink } from '../../../components/terms/termLink';
import { fieldLabelPosition, type TemplateField } from '../../../types/template';

/**
 * A field's label and control in the field's label position (spec 014): stacked above, or
 * beside the control like a trait row; the description stays under both. Inside a custom list
 * (spec 016) a typed entry name takes the label's place, and the entry's remove control sits at
 * the end of the label row.
 */
export function LabeledField({
    field,
    term,
    nameSlot,
    trailing,
    children,
}: {
    field: TemplateField;
    term?: TermLink;
    /** Replaces the label at the same position (a list entry's name input). */
    nameSlot?: ReactNode;
    /** End of the label row, or a row of its own when the label is hidden. */
    trailing?: ReactNode;
    children: ReactNode;
}) {
    const position = fieldLabelPosition(field);
    const labelClass = clsx(position === 'left' && 'min-w-0 max-w-[50%] shrink-0 pt-1.5');
    const label = nameSlot ? (
        <div className={clsx('min-w-0', position === 'left' ? labelClass : 'w-full')}>
            {nameSlot}
        </div>
    ) : (
        <FieldLabel
            label={field.label}
            term={term}
            required={field.required}
            position={position}
            hidden={field.hideLabel}
            className={labelClass}
        />
    );
    const description = field.description && (
        <span className="text-xs text-textSecondary">{field.description}</span>
    );
    if (position === 'top' || (field.hideLabel && !nameSlot)) {
        return (
            <div className="grid grid-cols-1 gap-1">
                {trailing ? (
                    <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">{label}</div>
                        {trailing}
                    </div>
                ) : (
                    label
                )}
                {children}
                {description}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 gap-1">
            <div className="flex items-start gap-3">
                {label}
                <div className="grid min-w-0 flex-1 gap-1">{children}</div>
                {trailing}
            </div>
            {description}
        </div>
    );
}
