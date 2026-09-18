import { runVerifier } from './i18n-verifier/run.ts';
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
    const run = await runVerifier();
    console.table(
        run.summary.map((row) => ({
            area: row.area,
            covered: row.covered,
            missing: row.missing,
            excepted: row.excepted,
        }))
    );
}

void main();
