import { loadTranslationSources } from './translation-source.ts';

async function main() {
    const sources = await loadTranslationSources();
    console.table(
        sources.locales.map((locale) => ({
            locale,
            'UI messages': sources.counts[locale].ui,
            'Catalog fields': sources.counts[locale].data,
        }))
    );
}

void main();
