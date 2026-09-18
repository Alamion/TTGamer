import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Writes `files` (relative path → content) under a fresh temporary directory. */
export async function writeFixture(files: Record<string, string>): Promise<string> {
    const root = await mkdtemp(path.join(tmpdir(), 'ttgamer-i18n-'));
    for (const [relative, content] of Object.entries(files)) {
        const file = path.join(root, relative);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, content);
    }
    return root;
}
