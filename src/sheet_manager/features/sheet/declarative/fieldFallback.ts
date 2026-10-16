import { translate } from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import type { BoundMessage, FieldBinding } from '../../../systems/templateBindings';
import { readDataPath } from '../../../systems/templateBindings';
import { CATALOG_LOOKUP } from '../data/catalogBindings';
import { useCatalogText } from '../data/catalogText';
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
