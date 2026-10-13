import { serializeDocumentExport } from '@site/src/sheet_manager/features/sheet/shell/documentFile';
import {
    type ConflictAnswer,
    type ImportFile,
    type ImportHost,
    runImportBatch,
} from '@site/src/sheet_manager/features/sheet/shell/importBatch';
import { characterDocumentFromBase } from '@site/src/sheet_manager/systems/star-wars-wod/characterDocument';
import { JAX_VORN_PRESET } from '@site/src/sheet_manager/systems/star-wars-wod/presets';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { describe, expect, it } from 'vitest';

import legacyFixture from './fixtures/legacy-export-first-version.json';

function envelope(id: string, name = 'Envelope Hero'): UnknownDocumentEnvelope {
    return characterDocumentFromBase({
        ...JAX_VORN_PRESET,
        id,
        metadata: { ...JAX_VORN_PRESET.metadata, name },
    });
}

const file = (name: string, content: unknown): ImportFile => ({
    name,
    text: typeof content === 'string' ? content : JSON.stringify(content),
});

const envelopeFile = (id: string, name?: string) =>
    ({
        name: `${id}.json`,
        text: serializeDocumentExport(envelope(id, name)),
    }) satisfies ImportFile;

function makeHost(stored: string[] = [], answers: ConflictAnswer[] = []) {
    const ids = new Set(stored);
    const imported: UnknownDocumentEnvelope[] = [];
    const retained: Array<{ content: unknown; reason: string }> = [];
    let asked = 0;
    const host: ImportHost = {
        hasDocument: (id) => ids.has(id),
        importDocument: (document) => {
            ids.add(document.id);
            imported.push(document);
        },
        retain: (content, reason) => retained.push({ content, reason }),
        askConflict: async () => answers[asked++] ?? { choice: 'cancel', applyToRest: false },
    };
    return { host, imported, retained, asked: () => asked };
}

describe('importing a batch of files', () => {
    it('imports every valid file, around the invalid ones, and ends with one summary', async () => {
        const { host, imported, retained } = makeHost();
        const summary = await runImportBatch(
            [
                envelopeFile('11111111-1111-4111-8111-111111111111'),
                file('first-version.json', legacyFixture),
                file('broken.json', '{ not json'),
                file('stranger.json', { hello: 'world' }),
            ],
            host
        );

        expect(imported.map(({ systemId }) => systemId)).toEqual([
            'star-wars-wod',
            'star-wars-wod',
        ]);
        expect(summary).toMatchObject({ imported: 2, skipped: 0, rejected: 2, repaired: 1 });
        expect(
            summary.outcomes
                .filter(({ status }) => status === 'rejected')
                .map((o) => [o.file, o.reason?.code])
        ).toEqual([
            ['broken.json', 'not-json'],
            ['stranger.json', 'unknown-shape'],
        ]);
        expect(retained.map(({ content }) => content)).toEqual(['{ not json', { hello: 'world' }]);
        expect(summary.outcomes[1]!.repairs.map(({ kind }) => kind)).toEqual([
            'armor-name',
            'resource-maximum',
        ]);
    });

    it('reads a tagged file as an envelope even when it also looks like an old export', async () => {
        const { host, imported } = makeHost();
        const tagged = { ...legacyFixture, ...envelope('22222222-2222-4222-8222-222222222222') };
        const summary = await runImportBatch([file('both.json', tagged)], host);

        expect(summary.imported).toBe(1);
        expect(imported[0]!.id).toBe('22222222-2222-4222-8222-222222222222');
        expect(summary.outcomes[0]!.repairs).toEqual([]);
    });

    it('rejects a tagged file whose data is invalid, and keeps it', async () => {
        const { host, retained } = makeHost();
        const broken = {
            ...envelope('33333333-3333-4333-8333-333333333333'),
            data: { nope: true },
        };
        const summary = await runImportBatch([file('bad-data.json', broken)], host);

        expect(summary.outcomes[0]).toMatchObject({
            status: 'rejected',
            reason: { code: 'invalid' },
        });
        expect(retained).toHaveLength(1);
    });

    it('rejects an old export after its end date, saying why', async () => {
        const { host, retained } = makeHost();
        host.now = () => new Date('2027-04-14T00:00:00Z');
        const summary = await runImportBatch([file('old.json', legacyFixture)], host);

        expect(summary.outcomes[0]).toMatchObject({
            status: 'rejected',
            reason: { code: 'legacy-ended' },
        });
        expect(retained).toHaveLength(1);
    });

    it('asks for every collision, and applies a choice to the rest only when told to', async () => {
        const ids = ['a', 'b', 'c'].map(
            (letter) => `${letter.repeat(8)}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
        );
        const files = ids.map((id) => envelopeFile(id));

        const each = makeHost(ids, [
            { choice: 'replace', applyToRest: false },
            { choice: 'duplicate', applyToRest: false },
            { choice: 'cancel', applyToRest: false },
        ]);
        const separate = await runImportBatch(files, each.host);
        expect(each.asked()).toBe(3);
        expect(separate).toMatchObject({ imported: 2, skipped: 1 });
        expect(each.imported[1]!.id).not.toBe(ids[1]);

        const all = makeHost(ids, [{ choice: 'replace', applyToRest: true }]);
        const together = await runImportBatch(files, all.host);
        expect(all.asked()).toBe(1);
        expect(together).toMatchObject({ imported: 3, skipped: 0 });
        expect(all.imported.map(({ id }) => id)).toEqual(ids);

        const next = await runImportBatch([files[0]!], all.host);
        expect(all.asked()).toBe(2);
        expect(next.skipped).toBe(1);
    });

    it('skips the rest of the batch when a cancel is applied to it', async () => {
        const ids = ['d', 'e'].map((letter) => `${letter.repeat(8)}-bbbb-4bbb-8bbb-bbbbbbbbbbbb`);
        const { host, imported } = makeHost(ids, [{ choice: 'cancel', applyToRest: true }]);
        const summary = await runImportBatch(
            ids.map((id) => envelopeFile(id)),
            host
        );

        expect(imported).toEqual([]);
        expect(summary).toMatchObject({ imported: 0, skipped: 2, rejected: 0 });
    });
});
