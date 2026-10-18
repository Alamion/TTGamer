import type { TemplateField } from '../../types/template';

/** Kebab storage coordinate of a WoD trait name ('Self Control' → 'self-control'). */
export const traitCoordinate = (key: string) => key.toLowerCase().replace(/\s+/g, '-');

/**
 * A 0–5 dots rating whose coordinate matches the trait bindings of WoD-family systems, so the
 * field is bridged to document data wherever the document kind declares that trait.
 */
export function dotsTrait(
    key: string,
    options: {
        compact?: boolean;
        labelMessage?: string;
        column?: number;
        /** Brief look: a short label beside the value (spec 033). */
        shortForm?: boolean;
    } = {}
): TemplateField {
    return {
        id: `trait-${traitCoordinate(key)}`,
        type: 'rating',
        label: key,
        valueKey: traitCoordinate(key),
        min: 0,
        max: 5,
        presentation: 'dots',
        required: false,
        ...(options.labelMessage ? { labelMessage: options.labelMessage } : {}),
        ...(options.column ? { column: options.column } : {}),
        // On a brief a rating shows its short label; one written compact without it keeps its name.
        ...(options.compact && !options.shortForm ? { fullLabel: true as const } : {}),
    };
}
