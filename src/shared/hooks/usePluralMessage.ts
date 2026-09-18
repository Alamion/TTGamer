import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useCallback } from 'react';

/** CLDR categories in the order plural forms are written in messages (Docusaurus convention). */
const ORDERED_CATEGORIES: readonly Intl.LDMLPluralRule[] = [
    'zero',
    'one',
    'two',
    'few',
    'many',
    'other',
];

interface PluralDescriptor {
    id: string;
    message: string;
}

/**
 * Picks the plural form of a `|`-separated message for `count`: forms follow the locale's CLDR
 * categories in the order zero, one, two, few, many, other (en: one|other, ru: one|few|many).
 * Missing trailing forms fall back to the last one.
 */
export function selectPluralForm(message: string, count: number, locale: string): string {
    const forms = message.split('|');
    if (forms.length === 1) return message;
    const rules = new Intl.PluralRules(locale);
    const supported = rules.resolvedOptions().pluralCategories;
    const categories = ORDERED_CATEGORIES.filter((category) => supported.includes(category));
    const index = categories.indexOf(rules.select(count));
    return forms[Math.min(Math.max(index, 0), forms.length - 1)].trim();
}

/** Translates a plural message (`plural: true` in YAML) and selects the form for `count`. */
export function usePluralMessage() {
    const {
        i18n: { currentLocale },
    } = useDocusaurusContext();
    return useCallback(
        (
            descriptor: PluralDescriptor,
            count: number,
            values: Record<string, string | number> = {}
        ) => selectPluralForm(translate(descriptor, { count, ...values }), count, currentLocale),
        [currentLocale]
    );
}
