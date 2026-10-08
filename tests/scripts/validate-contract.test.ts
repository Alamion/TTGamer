import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CONTRACT_PATH, validateContract } from '../../scripts/validate-contract';
import { writeFixture } from './fixtureFiles';

async function contractWith(change: (text: string) => string) {
    const text = change(await readFile(CONTRACT_PATH, 'utf8'));
    const root = await writeFixture({ 'openapi.yaml': text });
    return path.join(root, 'openapi.yaml');
}

describe('validate:contract (spec 030)', () => {
    it('accepts the shipped contract', async () => {
        expect(await validateContract()).toEqual([]);
    });

    it('reports a reference to a schema that does not exist', async () => {
        const file = await contractWith((text) =>
            text.replace(
                "$ref: '#/components/schemas/Version'",
                "$ref: '#/components/schemas/Gone'"
            )
        );
        expect((await validateContract(file)).join('\n')).toMatch(/Gone/);
    });

    it('reports a field that is not snake_case', async () => {
        const file = await contractWith((text) =>
            text.replace('contract_version:\n', 'contractVersion:\n')
        );
        expect(await validateContract(file)).toContainEqual(
            expect.stringContaining('"contractVersion" is not snake_case')
        );
    });

    it('reports a version that is not semantic', async () => {
        const file = await contractWith((text) => text.replace('version: 0.1.0', 'version: draft'));
        expect(await validateContract(file)).toContain('info.version must be x.y.z');
    });
});
