import {
    type ImportHost,
    runImportBatch,
} from '@site/src/sheet_manager/features/sheet/shell/importBatch';
import {
    readRecoveryFile,
    serializeRecoveryFile,
} from '@site/src/sheet_manager/features/sheet/shell/recoveryFile';
import {
    migrateDocumentStoreState,
    useDocumentStore,
} from '@site/src/sheet_manager/store/documentStore';
import { asRecoveryRecord } from '@site/src/sheet_manager/store/recoveryRecord';
import { characterDocumentFromBase } from '@site/src/sheet_manager/systems/star-wars-wod/characterDocument';
import { JAX_VORN_PRESET } from '@site/src/sheet_manager/systems/star-wars-wod/presets';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import legacyFixture from './fixtures/legacy-export-first-version.json';

const NOW = new Date('2026-10-13T12:00:00Z');

function storeHost(): ImportHost {
    const { importDocument, retainImportForRecovery, forgetRecoveryEntry } =
        useDocumentStore.getState();
    return {
        hasDocument: (id) => useDocumentStore.getState().documents.some((d) => d.id === id),
        importDocument,
        retain: (content, reason, id) => retainImportForRecovery(content, reason, id),
        forget: forgetRecoveryEntry,
        askConflict: async () => ({ choice: 'cancel', applyToRest: false }),
    };
}

const recoveryEntries = () => useDocumentStore.getState().recoveryEntries;
const files = (...texts: string[]) => texts.map((text, i) => ({ name: `f${i}.json`, text }));

beforeEach(() => useDocumentStore.setState({ documents: [], recoveryEntries: [] }));
afterEach(() => takeSheetIssues());

describe('the recovery file', () => {
    it('keeps a rejected file as a record with its reason and time', async () => {
        await runImportBatch(files('{ broken'), storeHost());

        const [record] = recoveryEntries().map(asRecoveryRecord);
        expect(record).toMatchObject({ ttgRecovery: 1, content: '{ broken' });
        expect(record!.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(record!.reason).not.toBe('');
        expect(Number.isNaN(Date.parse(record!.at))).toBe(false);
    });

    it('reads entries kept before records existed', () => {
        const record = asRecoveryRecord({ some: 'old entry' });
        expect(record).toMatchObject({
            ttgRecovery: 1,
            content: { some: 'old entry' },
            reason: '',
        });
    });

    it('exports every record with its original content and no device-only data', () => {
        useDocumentStore
            .getState()
            .retainImportForRecovery(
                { id: 'x', metadata: { portraitId: 'device-key', name: 'N' } },
                'because'
            );
        const text = serializeRecoveryFile(recoveryEntries(), NOW);

        expect(text).not.toContain('device-key');
        const file = JSON.parse(text);
        expect(file.ttgRecovery).toBe(1);
        expect(file.records).toHaveLength(1);
        expect(file.records[0].content).toEqual({ id: 'x', metadata: { name: 'N' } });
        expect(file.records[0].reason).toBe('because');
        expect(readRecoveryFile(file)).toHaveLength(1);
        expect(readRecoveryFile({ hello: 1 })).toBeUndefined();
        expect(() => readRecoveryFile({ ttgRecovery: 1, records: 'no' })).toThrow();
    });

    it('imports a fixed record, forgets it, and never stores the file as a document', async () => {
        const fixed = JSON.stringify(
            characterDocumentFromBase({
                ...JAX_VORN_PRESET,
                id: '44444444-4444-4444-8444-444444444444',
            })
        );
        useDocumentStore.getState().retainImportForRecovery(fixed.slice(0, 20), 'cut off');
        const text = serializeRecoveryFile(recoveryEntries(), NOW);
        expect(recoveryEntries()).toHaveLength(1);

        const file = JSON.parse(text);
        file.records[0].content = fixed;
        const summary = await runImportBatch(files(JSON.stringify(file)), storeHost());

        expect(summary).toMatchObject({ imported: 1, rejected: 0 });
        expect(useDocumentStore.getState().documents).toHaveLength(1);
        expect(recoveryEntries()).toEqual([]);
    });

    it('keeps a record that still fails, once, with its new reason', async () => {
        await runImportBatch(files('{ broken'), storeHost());
        const first = asRecoveryRecord(recoveryEntries()[0]);
        const text = serializeRecoveryFile(recoveryEntries(), NOW);

        const summary = await runImportBatch(files(text), storeHost());

        expect(summary).toMatchObject({ imported: 0, rejected: 1 });
        expect(recoveryEntries()).toHaveLength(1);
        expect(asRecoveryRecord(recoveryEntries()[0]).id).toBe(first.id);
    });

    it('retries an old export kept before, with its repairs', async () => {
        useDocumentStore
            .getState()
            .retainImportForRecovery(JSON.stringify(legacyFixture), 'was rejected earlier');
        const summary = await runImportBatch(
            files(serializeRecoveryFile(recoveryEntries(), NOW)),
            storeHost()
        );

        expect(summary).toMatchObject({ imported: 1, repaired: 1 });
        expect(recoveryEntries()).toEqual([]);
    });

    it('does not accept a recovery file inside a recovery file', async () => {
        const inner = { ttgRecovery: 1, records: [] };
        const outer = {
            ttgRecovery: 1,
            records: [
                { ttgRecovery: 1, id: 'r1', content: inner, reason: '', at: NOW.toISOString() },
            ],
        };
        const summary = await runImportBatch(files(JSON.stringify(outer)), storeHost());
        expect(summary.rejected).toBe(1);
    });

    it('says so when the collection is full', async () => {
        useDocumentStore.setState({
            recoveryEntries: Array.from({ length: 100 }, (_, i) => ({ filler: i })),
        });
        const summary = await runImportBatch(files('{ broken'), storeHost());

        expect(summary.outcomes[0]).toMatchObject({ status: 'rejected', kept: false });
        expect(recoveryEntries()).toHaveLength(100);
        takeSheetIssues();
    });

    it('clears the collection', () => {
        useDocumentStore.getState().retainImportForRecovery('x', 'r');
        useDocumentStore.getState().clearRecoveryEntries();
        expect(recoveryEntries()).toEqual([]);
    });

    it('still reads old persisted entries', () => {
        const state = migrateDocumentStoreState({ documents: [], recoveryEntries: [{ raw: 1 }] });
        expect(state.recoveryEntries).toEqual([{ raw: 1 }]);
    });
});
