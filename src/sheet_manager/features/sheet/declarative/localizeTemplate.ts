import { translate } from '@docusaurus/Translate';
import { catalogTranslations } from '@site/src/i18n/generated/catalogTranslations';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { localizeCatalogEntry } from '../../../../data/localizeCatalogEntry';
import type { CustomTemplate, TemplateNode } from '../../../types/template';

const CATALOG_PREFIX = 'catalog:';

function collectMessageIds(value: unknown, ids: Set<string>): Set<string> {
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if (typeof record.id === 'string' && typeof record.message === 'string') {
            ids.add(record.id);
        } else {
            for (const child of Object.values(record)) collectMessageIds(child, ids);
        }
    }
    return ids;
}

let knownMessageIds: ReadonlySet<string> | undefined;

/** True when a `labelMessage` reference resolves to a generated UI message or catalog entry. */
export function isKnownLabelMessage(reference: string): boolean {
    if (reference.startsWith(CATALOG_PREFIX)) {
        const [catalogId, entryId] = reference.slice(CATALOG_PREFIX.length).split('/');
        const catalogs = catalogTranslations.en as Record<string, Record<string, unknown>>;
        return Boolean(catalogId && entryId && catalogs[catalogId]?.[entryId]);
    }
    knownMessageIds ??= collectMessageIds(uiMessages, new Set());
    return knownMessageIds.has(reference);
}

/** Resolves a label reference for the locale; the stored label is the fallback. */
export function resolveLabelMessage(reference: string, fallback: string, locale: string): string {
    if (reference.startsWith(CATALOG_PREFIX)) {
        const [catalogId = '', entryId = ''] = reference.slice(CATALOG_PREFIX.length).split('/');
        const localized = localizeCatalogEntry(catalogId, entryId, locale, { name: fallback });
        return typeof localized.name === 'string' ? localized.name : fallback;
    }
    return translate({ id: reference, message: fallback });
}

function localizeNode(node: TemplateNode, locale: string): TemplateNode {
    const reference = node.labelMessage;
    let next: TemplateNode = node;
    if (reference) {
        if ('title' in node && typeof node.title === 'string') {
            next = { ...node, title: resolveLabelMessage(reference, node.title, locale) };
        } else if ('label' in node && typeof node.label === 'string') {
            next = { ...node, label: resolveLabelMessage(reference, node.label, locale) };
        }
    }
    if (next.type === 'text' && next.placeholderMessage) {
        next = {
            ...next,
            placeholder: resolveLabelMessage(
                next.placeholderMessage,
                next.placeholder ?? '',
                locale
            ),
        };
    }
    if (next.type === 'section' || next.type === 'group') {
        return { ...next, children: next.children.map((child) => localizeNode(child, locale)) };
    }
    if (next.type === 'table') {
        return {
            ...next,
            columns: next.columns.map((column) => localizeNode(column, locale) as typeof column),
        };
    }
    return next;
}

/**
 * Display copy of a template with every `labelMessage` resolved for the locale. Identity, ids,
 * and storage coordinates are untouched, so values and bindings behave exactly as on the source.
 */
export function localizeTemplate(template: CustomTemplate, locale: string): CustomTemplate {
    return {
        ...template,
        children: template.children.map((node) => localizeNode(node, locale)),
    };
}
