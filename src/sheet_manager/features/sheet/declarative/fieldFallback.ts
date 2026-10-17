import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import type { BoundMessage, FieldBinding } from '../../../systems/templateBindings';
import { readDataPath } from '../../../systems/templateBindings';
import type { TemplateField } from '../../../types/template';
import { CATALOG_LOOKUP, getCatalogBinding } from '../data/catalogBindings';
import { useCatalogText } from '../data/catalogText';
import { formulaTruthy } from './formula';
import type { UseTemplatePageResult } from './hooks';
import { entryIdsNamed } from './rowsCatalog';

/**
 * The catalog text a bridged field shows while it is empty (spec 037 D5): the `field` of the
 * catalog entry named at `namePath`, in the reader's language; `undefined` while the long texts
 * load, without a fallback, or when the name matches no entry (typed freely).
 */
export function useFieldFallback(binding: FieldBinding, data: unknown): string | undefined {
    const locale = useDocusaurusContext().i18n.currentLocale;
    const fallback = binding.fallback;
    const read = useCatalogText(fallback?.catalogId);
    if (!fallback || !read) return undefined;
    const name = readDataPath(data, fallback.namePath);
    if (typeof name !== 'string' || !name.trim()) return undefined;
    const [entryId] = entryIdsNamed(CATALOG_LOOKUP, fallback.catalogId, [name], locale);
    if (!entryId) return undefined;
    const field = typeof fallback.field === 'function' ? fallback.field(data) : fallback.field;
    return read(entryId, field);
}

/**
 * The catalog text a From catalog field shows (spec 038 D9): the entry named by the value at
 * `entryFrom`, its `text` (or the alternative's while that formula holds) in the reader's
 * language; `undefined` without a match, while a lazy text loads, or for other fields.
 */
export function useFromCatalogText(
    field: TemplateField,
    pageApi: UseTemplatePageResult
): string | undefined {
    const locale = useDocusaurusContext().i18n.currentLocale;
    const userCatalogs = useDocumentTypeStore((state) => state.catalogs);
    const from = field.type === 'text' ? field.fromCatalog : undefined;
    const catalog = from ? getCatalogBinding(from.catalogId, userCatalogs) : undefined;
    const alternative =
        from?.alternative &&
        (() => {
            const result = pageApi.formulaState.evaluate(from.alternative.when);
            return result.ok && formulaTruthy(result.value);
        })();
    const key = from ? (alternative ? from.alternative!.text : from.text) : undefined;
    const lazy = catalog?.texts?.find((text) => text.key === key)?.lazy === true;
    const read = useCatalogText(lazy ? from?.catalogId : undefined);
    if (!from || !catalog || !key) return undefined;
    const name = pageApi.formulaState.evaluate(from.entryFrom);
    if (!name.ok || typeof name.value !== 'string' || !name.value.trim()) return undefined;
    const lookup = { get: (id: string) => (id === catalog.catalogId ? catalog : undefined) };
    // A catalog choice stores the entry id; a typed name finds the entry by any of its names.
    const [entryId] = catalog.entries.some(({ id }) => id === name.value)
        ? [name.value]
        : entryIdsNamed(lookup, catalog.catalogId, [name.value], locale);
    const entry = catalog.entries.find(({ id }) => id === entryId);
    if (!entry) return undefined;
    return lazy ? read?.(entry.id, key) : catalog.entryText(entry, key, locale);
}

const isBoundMessage = (value: unknown): value is BoundMessage =>
    typeof value === 'object' &&
    value !== null &&
    'descriptor' in value &&
    typeof (value as BoundMessage).descriptor?.id === 'string';

/** Text of a read-only bound value (spec 037 D4): a message is translated, a number shown. */
export function boundValueText(value: unknown): string {
    if (Array.isArray(value)) return value.map(boundValueText).filter(Boolean).join('; ');
    if (isBoundMessage(value)) return translate(value.descriptor, value.values);
    if (typeof value === 'number' || typeof value === 'string') return String(value);
    return '';
}
