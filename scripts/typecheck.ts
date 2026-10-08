import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * `tsc -b` with a forced rebuild after a dependency change. Its up-to-date check looks at the
 * project's own files only, so new type definitions in node_modules (an upgrade) would otherwise
 * be checked against old build info and their errors missed (found in spec 026).
 */
const STAMP = 'node_modules/.tmp/typecheck-yarn-lock.sha256';

/**
 * The type check runs TypeScript 7's native `tsc` (spec 029), installed as `typescript-native` beside
 * `typescript` 6, which typescript-eslint and the editor still need. When typescript-eslint supports 7,
 * move `typescript` to 7, remove `typescript-native`, and call `tsc` here again.
 */
const TSC = 'node_modules/typescript-native/bin/tsc';
const tscVersion = (
    JSON.parse(readFileSync('node_modules/typescript-native/package.json', 'utf8')) as {
        version: string;
    }
).version;

const lockHash = createHash('sha256')
    .update(readFileSync('yarn.lock'))
    .update(tscVersion)
    .digest('hex');
let stamped: string | undefined;
try {
    stamped = readFileSync(STAMP, 'utf8').trim();
} catch {
    stamped = undefined;
}
const force = stamped !== lockHash;
if (force) console.log('Dependencies changed since the last type check: checking every file.');

const result = spawnSync(process.execPath, [TSC, '-b', ...(force ? ['--force'] : [])], {
    stdio: 'inherit',
});
if (result.status === 0) {
    mkdirSync(dirname(STAMP), { recursive: true });
    writeFileSync(STAMP, `${lockHash}\n`);
}
process.exit(result.status ?? 1);
