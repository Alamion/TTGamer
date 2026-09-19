import { verifierMain } from './i18n-verifier/cli.ts';

void verifierMain(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
});
