import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildContractReport, formatContractReport } from '../../scripts/contract-report';
import { CONTRACT_PATH } from '../../scripts/validate-contract';
import { writeFixture } from './fixtureFiles';

async function contractWith(change: (text: string) => string) {
    const text = change(await readFile(CONTRACT_PATH, 'utf8'));
    const root = await writeFixture({ 'openapi.yaml': text });
    return path.join(root, 'openapi.yaml');
}

describe('contract:report (spec 030, US2)', () => {
    it('reports the shipped envelope fields as matching, apart from the id format', async () => {
        const report = await buildContractReport();
        const envelope = report.models.find(({ model }) => model.endsWith('DocumentEnvelope'));
        expect(envelope?.matching).toEqual(
            expect.arrayContaining([
                'kind',
                'system_id',
                'schema_version',
                'template_values',
                'data',
            ])
        );
        expect(envelope?.differing.map(({ field }) => field)).toEqual(['id']);
        expect(report.implementedVersion).toBe(report.contractVersion);
    });

    it('names a field whose type was changed in the contract (SC-004)', async () => {
        const file = await contractWith((text) =>
            text.replace(
                /(schema_version:\n\s+)type: integer/,
                (_, prefix: string) => `${prefix}type: string`
            )
        );
        const report = await buildContractReport(file);
        const envelope = report.models.find(({ model }) => model === 'DocumentEnvelope');
        const difference = envelope?.differing.find(({ field }) => field === 'schema_version');
        expect(difference?.contract.type).toBe('string');
        expect(difference?.frontend.type).toBe('integer');
        expect(formatContractReport(report)).toContain('differs: schema_version');
    });

    it('lists a field only one side has', async () => {
        const file = await contractWith((text) =>
            text.replace('                setting_id:\n', '                setting_ref:\n')
        );
        const metadata = (await buildContractReport(file)).models.find(
            ({ model }) => model === 'DocumentMetadata'
        );
        expect(metadata?.contractOnly).toEqual(['setting_ref']);
        expect(metadata?.frontendOnly).toEqual(['setting_id']);
    });

    it('lists contract models without a frontend schema as not implemented', async () => {
        const report = await buildContractReport();
        expect(report.notImplemented).toEqual(expect.arrayContaining(['SharedRoll', 'Usage']));
        expect(report.notImplemented).not.toContain('DocumentEnvelope');
    });
});
