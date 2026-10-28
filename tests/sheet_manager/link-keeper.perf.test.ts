// @vitest-environment happy-dom
import { runTreeChange } from '@site/src/sheet_manager/features/documents/treeActions';
import {
    readRecord,
    recordWriter,
    writeRecord,
} from '@site/src/sheet_manager/store/documentContent';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { saveDocumentLinks, useLinkIndex } from '@site/src/sheet_manager/store/linkIndexStore';
import { noteEnvelope } from '@site/src/sheet_manager/systems/general/note';
import { describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** Renaming a document linked from 100 notes rewrites them within 2 s (spec 044, SC-004). */

const NOTES = 100;
const BODY = Array.from({ length: 200 }, (_, line) =>
    line % 20 === 0 ? `Line ${String(line)} meets [[Ines]] again.` : `Line ${String(line)}.`
).join('\n');

async function renameMs(round: number): Promise<number> {
    const target = noteEnvelope(`ines-${String(round)}`, 'Ines', '');
    const notes = Array.from({ length: NOTES }, (_, index) =>
        noteEnvelope(`n${String(round)}-${String(index)}`, `Note ${String(index)}`, BODY)
    );
    // Only the target is loaded: the notes are read from their records, as on a real device.
    useDocumentStore.setState({ documents: [target, ...notes] });
    const { entries } = useDocumentStore.getState();
    useDocumentStore.setState({ documents: [target], entries });
    for (const note of notes) {
        await writeRecord(note.id, note);
        await saveDocumentLinks(note);
    }
    useLinkIndex.setState({ ready: true });
    const started = performance.now();
    runTreeChange('Rename', [{ op: 'rename', id: target.id, name: `Ines Ruiz ${String(round)}` }]);
    // Rewritten notes leave the loaded cache once saved: read what was written.
    const done = async () => {
        await recordWriter.flush();
        const texts = await Promise.all(
            notes.map(async (note) => {
                const loaded = useDocumentStore
                    .getState()
                    .documents.find(({ id }) => id === note.id);
                const stored = (loaded ?? (await readRecord(note.id))) as {
                    templateValues: { body: { text: string } };
                } | null;
                return stored?.templateValues.body.text ?? '';
            })
        );
        return texts.every((text) => text.includes(`[[Ines Ruiz ${String(round)}]]`));
    };
    while (!(await done())) {
        if (performance.now() - started > 10_000) throw new Error('links were not kept');
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const ms = performance.now() - started;
    await new Promise((resolve) => setTimeout(resolve, 0));
    takeSheetIssues();
    return ms;
}

describe('keeping links of a document linked from 100 notes', () => {
    it('rewrites them within 2 s', async () => {
        await renameMs(0);
        const best = Math.min(await renameMs(1), await renameMs(2));
        expect(best).toBeLessThan(2000);
    }, 60_000);
});
