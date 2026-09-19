import { clsx } from 'clsx';
import { useId } from 'react';

import { resolveTerm, type TermInput } from './resolveTerm';
import { useTermHintSettings } from './TermHintContext';

interface TermLabelProps extends TermInput {
    className?: string;
}

/**
 * A sheet label that may be a glossary book term (spec 009). Hint-bearing labels carry only
 * data attributes and a visually hidden description; the single popover lives in
 * TermHintProvider, so a label adds no state, listener, or portal.
 */
export function TermLabel({ className, ...input }: TermLabelProps) {
    const settings = useTermHintSettings();
    const descriptionId = useId();
    const resolved = settings ? resolveTerm(input, settings.locale, settings.mode) : null;
    if (!resolved) return <span className={className}>{input.text}</span>;
    const { hint, detail, short, display } = resolved;
    return (
        <span
            className={clsx('term-label', className)}
            {...(hint
                ? {
                      'data-term-ref': resolved.ref,
                      'data-term-hint': hint,
                      ...(detail ? { 'data-term-detail': detail } : {}),
                      tabIndex: 0,
                      'aria-describedby': descriptionId,
                  }
                : {})}
        >
            <span className="term-full">{display}</span>
            {short && (
                <span className="term-short" aria-hidden="true">
                    {short}
                </span>
            )}
            {hint && (
                <span id={descriptionId} className="sr-only">
                    {detail ? `${hint}, ${detail}` : hint}
                </span>
            )}
        </span>
    );
}
