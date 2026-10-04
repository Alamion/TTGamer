import { validateDocsParity } from './i18n-docs-parity.ts';
import { validateTranslationSources } from './i18n-sources.ts';
import { verifierMain } from './i18n-verifier/cli.ts';

// The one translation and docs-parity check (spec 024): the docs pairs, the YAML sources, and the
// coverage verifier, in one process. Each part sets a failing exit code and prints its findings.
async function main() {
    await validateDocsParity();
    await validateTranslationSources();
    const code = await verifierMain(process.argv.slice(2));
    if (code !== 0) process.exitCode = code;
}

void main();
