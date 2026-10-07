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

const lockHash = createHash('sha256').update(readFileSync('yarn.lock')).digest('hex');
let stamped: string | undefined;
try {
    stamped = readFileSync(STAMP, 'utf8').trim();
} catch {
    stamped = undefined;
}
const force = stamped !== lockHash;
if (force) console.log('Dependencies changed since the last type check: checking every file.');

const result = spawnSync('tsc', ['-b', ...(force ? ['--force'] : [])], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});
if (result.status === 0) {
    mkdirSync(dirname(STAMP), { recursive: true });
    writeFileSync(STAMP, `${lockHash}\n`);
}
process.exit(result.status ?? 1);
