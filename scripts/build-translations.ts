import path from 'node:path';

import { buildTranslationOutputs, staleOutputs, writeOutputs } from './translation-build.ts';

async function main() {
    const check = process.argv.includes('--check');
    const { sources, glossary, outputs } = await buildTranslationOutputs();
    if (check) {
        const stale = await staleOutputs(outputs);
        if (stale.length > 0) {
            console.error(
                'Generated translation files are out of date; run yarn build:translations:\n' +
                    stale.map((file) => '  ' + path.relative(process.cwd(), file)).join('\n')
            );
            process.exitCode = 1;
            return;
        }
        console.log('Generated translation files are up to date.');
        return;
    }
    await writeOutputs(outputs);
    console.log(
        'Built YAML translations for ' +
            sources.locales.join(', ') +
            ': ' +
            sources.counts.en.ui +
            ' UI and ' +
            sources.counts.en.data +
            ' catalog fields; ' +
            glossary.length +
            ' glossary terms.'
    );
}

void main();
