// @vitest-environment happy-dom
import { DocumentPreviewContent } from '@site/src/sheet_manager/features/documents/DocumentPreviewCard';
import { writeRecord } from '@site/src/sheet_manager/store/documentContent';
import { entryOf } from '@site/src/sheet_manager/store/documentIndex';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { noteEnvelope } from '@site/src/sheet_manager/systems/general/note';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

/** A card of a document not loaded yet shows within 300 ms of opening (spec 044, SC-002). */

const LONG_NOTE = Array.from(
    { length: 2000 },
    (_, index) => `Line ${String(index)} of the docks.`
).join('\n');

async function openMs(id: string): Promise<number> {
    const note = noteEnvelope(id, `Docks ${id}`, LONG_NOTE);
    await writeRecord(id, note);
    useDocumentStore.setState({
        documents: [],
        entries: [{ ...entryOf(note, undefined, {}, 0), rank: 1 }],
    });
    const started = performance.now();
    render(createElement(DocumentPreviewContent, { documentId: id }));
    await screen.findByText(`Docks ${id}`);
    const ms = performance.now() - started;
    cleanup();
    return ms;
}

describe('the preview card of a document not loaded yet', () => {
    it('shows within 300 ms', async () => {
        await openMs('warm');
        let best = Number.POSITIVE_INFINITY;
        for (const id of ['a', 'b', 'c']) best = Math.min(best, await openMs(id));
        expect(best).toBeLessThan(300);
    });
});
