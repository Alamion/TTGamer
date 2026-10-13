import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../src');

function sourceFiles(directory: string): string[] {
    return readdirSync(directory).flatMap((name) => {
        const path = join(directory, name);
        if (statSync(path).isDirectory()) return sourceFiles(path);
        return /\.(ts|tsx)$/.test(name) ? [path] : [];
    });
}

const IMPORT_SPECIFIER = /from\s+'([^']+)'/g;

function importsOf(file: string): string[] {
    return [...readFileSync(file, 'utf8').matchAll(IMPORT_SPECIFIER)].map(([, from]) => from!);
}

const files = sourceFiles(SRC).map((path) => ({
    path: relative(SRC, path).split(sep).join('/'),
    imports: importsOf(path),
}));

/** The documented importers of concrete systems outside `systems/` (src/sheet_manager/AGENTS.md). */
const SYSTEM_IMPORTERS = new Set([
    'sheet_manager/docsEmbeds.tsx',
    'sheet_manager/store/documentStore.ts',
]);
const CONCRETE_SYSTEM = /(^|\/)systems\/(star-wars-wod|wod2e|v5)(\/|$)/;

describe('module boundaries of the sheet manager', () => {
    it('keeps concrete systems out of generic code', () => {
        const offenders = files
            .filter(({ path }) => !path.startsWith('sheet_manager/systems/'))
            .filter(({ path }) => !SYSTEM_IMPORTERS.has(path))
            .filter(({ imports }) => imports.some((from) => CONCRETE_SYSTEM.test(from)))
            .map(({ path }) => path);
        expect(offenders).toEqual([]);
    });

    it('has no generic character shape that names a game', () => {
        const offenders = files
            .filter(({ imports }) => imports.some((from) => /(^|\/)types\/character$/.test(from)))
            .map(({ path }) => path);
        expect(offenders).toEqual([]);
    });
});
