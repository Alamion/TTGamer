import { existsSync } from 'node:fs';

// Browser tests run against the production build, never the dev server (spec 026, D2). Run
// before the web server, not in the config, because knip loads the config without a build.
if (!existsSync('build/index.html')) {
    console.error('No production build in build/: run `yarn build` first, or `yarn ci:e2e`.');
    process.exit(1);
}
