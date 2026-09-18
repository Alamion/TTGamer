import { codeCatalogs } from './catalogSources.ts';
import {
    CATALOG_LABELS_KEY,
    flattenStringLeaves,
    flattenUiMessages,
    interpolationNames,
    loadTranslationSources,
} from './translation-source.ts';

function difference(left: string[], right: string[]): string[] {
    const rightSet = new Set(right);
    return left.filter((item) => !rightSet.has(item));
}

function validateMirror(
    domain: 'ui' | 'data',
    reference: Record<string, string>,
    locale: string,
    localized: Record<string, string>,
    errors: string[]
): void {
    for (const key of difference(Object.keys(reference), Object.keys(localized))) {
        errors.push(domain + ': ' + locale + ' is missing "' + key + '"');
    }
    for (const key of difference(Object.keys(localized), Object.keys(reference))) {
        errors.push(domain + ': ' + locale + ' has no English source for "' + key + '"');
    }
}

async function main() {
    const sources = await loadTranslationSources();
    const errors: string[] = [];
    const englishUi = flattenUiMessages(sources.ui.en);
    const englishData = flattenStringLeaves(sources.data.en);
    const englishMessages = Object.fromEntries(
        Object.entries(englishUi).map(([key, entry]) => [key, entry.message])
    );

    for (const locale of sources.locales) {
        const ui = flattenUiMessages(sources.ui[locale]);
        const data = flattenStringLeaves(sources.data[locale]);
        const messages = Object.fromEntries(
            Object.entries(ui).map(([key, entry]) => [key, entry.message])
        );
        validateMirror('ui', englishMessages, locale, messages, errors);
        validateMirror('data', englishData, locale, data, errors);

        for (const key of Object.keys(englishMessages).filter((item) => item in messages)) {
            if (
                JSON.stringify(interpolationNames(englishMessages[key])) !==
                JSON.stringify(interpolationNames(messages[key]))
            ) {
                errors.push('ui: ' + locale + ' has different placeholders for "' + key + '"');
            }
        }
    }

    // Every English catalog source mirrors the code-owned entries it localizes.
    const catalogs = codeCatalogs();
    for (const [catalogId, source] of Object.entries(sources.data.en)) {
        const entries = catalogs.get(catalogId);
        if (!entries) {
            errors.push('data: ' + catalogId + ' is not a known catalog');
            continue;
        }
        const codeIds = new Set(entries.map((entry) => entry.id));
        const sourceIds = Object.keys(source as object).filter((id) => id !== CATALOG_LABELS_KEY);
        for (const id of codeIds) {
            if (!sourceIds.includes(id)) {
                errors.push('data: ' + catalogId + ' is missing catalog id "' + id + '"');
            }
        }
        for (const id of sourceIds) {
            if (!codeIds.has(id)) {
                errors.push('data: ' + catalogId + ' contains unknown catalog id "' + id + '"');
            }
        }
    }

    if (errors.length > 0) {
        console.error(errors.join('\n'));
        process.exitCode = 1;
        return;
    }
    console.log(
        'Validated YAML translations for ' +
            sources.locales.join(', ') +
            ': ' +
            sources.counts.en.ui +
            ' UI and ' +
            sources.counts.en.data +
            ' catalog fields per locale.'
    );
}

void main();
