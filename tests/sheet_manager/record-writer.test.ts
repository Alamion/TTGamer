import { createRecordWriter } from '@site/src/sheet_manager/store/documentContent';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** The record writer keeps up with fast changes (spec 043, found by typing a note quickly). */

const version = (text: string) =>
    ({ id: 'doc-1', metadata: { title: text } }) as unknown as UnknownDocumentEnvelope;
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('record writer', () => {
    it('writes the latest version once a slow write ends, not every version in between', async () => {
        const written: string[] = [];
        let release: () => void = () => {};
        const writer = createRecordWriter({
            write: async (_id, document) => {
                written.push(document.metadata.title);
                if (written.length === 1) await new Promise<void>((resolve) => (release = resolve));
            },
        });
        writer.schedule(version('a'));
        await nextTask();
        expect(written).toEqual(['a']);
        // Typed while the first write is still running.
        for (const text of ['ab', 'abc', 'abcd']) {
            writer.schedule(version(text));
            await nextTask();
        }
        expect(writer.isPending('doc-1')).toBe(true);
        release();
        await writer.flush();
        expect(written).toEqual(['a', 'abcd']);
        expect(writer.isPending('doc-1')).toBe(false);
    });

    it('keeps a failed version queued unless a newer one replaced it', async () => {
        let fail = true;
        const written: string[] = [];
        const writer = createRecordWriter({
            write: async (_id, document) => {
                if (fail) throw new Error('quota');
                written.push(document.metadata.title);
            },
        });
        writer.schedule(version('a'));
        await writer.flush();
        expect(writer.isPending('doc-1')).toBe(true);
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['document-write-failed']);
        fail = false;
        await writer.flush();
        expect(written).toEqual(['a']);
    });
});
