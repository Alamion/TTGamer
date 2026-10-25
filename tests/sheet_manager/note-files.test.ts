import { readFileSync } from 'node:fs';

import { runImportBatch } from '@site/src/sheet_manager/features/sheet/shell/importBatch';
import {
    documentFileFormat,
    importAccept,
    readImportFiles,
} from '@site/src/sheet_manager/features/sheet/shell/kindFiles';
import { noteEnvelope } from '@site/src/sheet_manager/systems/general/note';
import {
    noteFileFormat,
    splitFrontMatter,
} from '@site/src/sheet_manager/systems/general/noteFiles';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** A note as a `.md` file or a `.zip` with its pictures (spec 043, US6). */

const blobs = vi.hoisted(() => new Map<string, Uint8Array>());

vi.mock('@site/src/sheet_manager/persistence/portraitStorage', async (original) => ({
    ...(await original<object>()),
    savePortrait: vi.fn(async (file: File) => {
        if (file.name.startsWith('broken')) throw new Error('not an image');
        const id = `blob-${String(blobs.size + 1)}`;
        blobs.set(id, new Uint8Array(await file.arrayBuffer()));
        return id;
    }),
    loadPortrait: vi.fn(async (id: string) => {
        const bytes = blobs.get(id);
        return bytes ? new Blob([bytes.slice().buffer]) : null;
    }),
}));

const SYNTAX = [
    '# How notes work',
    'Every line is its own paragraph.',
    '**Bold**, *italic*, ~~struck~~, ==marked==, `code`, [link](https://example.org).',
    '- [x] done',
    '  - nested',
    '| NPC | Wants |',
    '|:---|---:|',
    '| Ines | money |',
    '> [!spoiler]- Folded',
    '> body',
    'Ambush: `dice: 6d10>=6`',
    '[[Ines Ruiz]] and ![[map.png]]',
    '',
].join('\n');

const bodyOf = (document: UnknownDocumentEnvelope) =>
    document.templateValues.body as { text: string; images?: Record<string, unknown> };

async function roundTrip(document: UnknownDocumentEnvelope) {
    const file = await noteFileFormat.write(document);
    const bytes = new Uint8Array(await file.blob.arrayBuffer());
    return { file, back: await noteFileFormat.read({ name: file.name, bytes }), bytes };
}

beforeEach(() => blobs.clear());

describe('note files', () => {
    it('writes the title in front matter and the body verbatim, and reads them back', async () => {
        const { file, back, bytes } = await roundTrip(noteEnvelope('n1', 'Session 12', SYNTAX));
        expect(file.name).toBe('Session 12.md');
        expect(new TextDecoder().decode(bytes)).toBe(`---\ntitle: Session 12\n---\n${SYNTAX}`);
        expect(back.metadata.title).toBe('Session 12');
        expect(bodyOf(back).text).toBe(SYNTAX);
        expect(back.id).not.toBe('n1');
        expect(back.definitionId).toBe('note');
    });

    it('keeps front matter keys it does not own, comments included, byte for byte', async () => {
        const foreign = 'tags: [npc, docks]\naliases:\n  - Ines\n# a comment\ndate: 2026-10-25';
        const file = `---\n${foreign}\ntitle: "Ines: the fixer"\n---\nBody line\n`;
        const note = await noteFileFormat.read({ name: 'ines.md', bytes: strToU8(file) });
        expect(note.metadata.title).toBe('Ines: the fixer');
        expect(bodyOf(note).text).toBe('Body line\n');
        const written = await noteFileFormat.write(note);
        const text = new TextDecoder().decode(new Uint8Array(await written.blob.arrayBuffer()));
        expect(splitFrontMatter(text).frontMatter).toBe(`title: "Ines: the fixer"\n${foreign}`);
    });

    it('names a note after its file when the front matter has no title', async () => {
        const note = await noteFileFormat.read({
            name: 'Docks plan.md',
            bytes: strToU8('---\ntags: [a]\n---\ntext'),
        });
        expect(note.metadata.title).toBe('Docks plan');
        expect(bodyOf(note).text).toBe('text');
        const plain = await noteFileFormat.read({ name: 'raw.markdown', bytes: strToU8('# Hi') });
        expect(plain.metadata.title).toBe('raw');
    });

    it('writes a note with stored pictures as a zip a vault opens, and reads it back', async () => {
        blobs.set('blob-a', new Uint8Array([1, 2, 3]));
        const note = noteEnvelope('n2', 'Docks', 'Map: ![[map.png]]');
        note.templateValues.body = {
            text: 'Map: ![[map.png]] and ![[logo.png]]',
            images: {
                'map.png': { source: 'device', blobId: 'blob-a' },
                'logo.png': { source: 'url', url: 'https://example.org/logo.png' },
            },
        };
        const { file, bytes, back } = await roundTrip(note);
        expect(file.name).toBe('Docks.zip');
        const entries = unzipSync(bytes);
        expect(Object.keys(entries).sort()).toEqual(['Docks.md', 'images/map.png']);
        expect([...entries['images/map.png']!]).toEqual([1, 2, 3]);
        // A web picture leaves as an ordinary markdown image.
        expect(new TextDecoder().decode(entries['Docks.md'])).toContain(
            '![logo.png](https://example.org/logo.png)'
        );
        expect(bodyOf(back).images).toEqual({
            'map.png': { source: 'device', blobId: expect.stringMatching(/^blob-/) },
        });
    });

    it('takes the shallowest markdown file of an archive and the pictures it names', async () => {
        const zip = zipSync({
            'vault/sub/other.md': strToU8('deep'),
            'vault/Note.md': strToU8('![[a.png]] ![[missing.png]]'),
            'vault/attachments/a.png': new Uint8Array([9]),
            '__MACOSX/vault/._Note.md': strToU8('junk'),
        });
        const note = await noteFileFormat.read({ name: 'export.zip', bytes: zip });
        expect(note.metadata.title).toBe('Note');
        expect(Object.keys(bodyOf(note).images ?? {})).toEqual(['a.png']);
    });

    it('keeps the reference of a picture it could not store, and reports it', async () => {
        const zip = zipSync({
            'n.md': strToU8('![[broken.png]]'),
            'broken.png': new Uint8Array([1]),
        });
        const note = await noteFileFormat.read({ name: 'n.zip', bytes: zip });
        expect(bodyOf(note)).toEqual({ text: '![[broken.png]]' });
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['markdown-image-rejected']);
    });

    it('refuses a file that is not text, a broken or empty archive, and an oversized text', async () => {
        const reason = (name: string, bytes: Uint8Array) =>
            noteFileFormat.read({ name, bytes }).then(
                () => 'read',
                (error: Error) => error.message
            );
        expect(await reason('bin.md', new Uint8Array([0xff, 0xfe, 0x00]))).toBe(
            'The file is not text.'
        );
        expect(await reason('bad.zip', strToU8('not a zip'))).toBe('The archive cannot be opened.');
        expect(await reason('empty.zip', zipSync({ 'a.png': new Uint8Array([1]) }))).toBe(
            'The archive holds no markdown file.'
        );
        expect(await reason('long.md', strToU8('a'.repeat(300_001)))).toMatch(/longer than/);
    });
});

describe('note files in the toolbar import and export', () => {
    it('offers markdown and zip files and exports a note through its own format', () => {
        expect(importAccept().split(',')).toEqual(
            expect.arrayContaining(['.json', '.md', '.markdown', '.zip'])
        );
        expect(documentFileFormat(noteEnvelope('n', 'N', ''))).toBe(noteFileFormat);
        expect(
            documentFileFormat({ systemId: 'wod-v5', definitionId: 'hunter' } as never)
        ).toBeUndefined();
    });

    it('imports a markdown file as a note and rejects a broken archive with its reason', async () => {
        const files = await readImportFiles([
            new File(['---\ntitle: Plan\n---\n# Hi'], 'plan.md'),
            new File(['not a zip'], 'bad.zip'),
            new File(['{"a":1}'], 'other.json'),
        ]);
        expect(files[2]).toEqual({ name: 'other.json', text: '{"a":1}' });
        const imported: string[] = [];
        const summary = await runImportBatch(files.slice(0, 2), {
            hasDocument: () => false,
            importDocument: (document) => imported.push(document.metadata.title),
            retain: () => true,
            askConflict: async () => ({ choice: 'cancel', applyToRest: false }),
        });
        expect(imported).toEqual(['Plan']);
        expect(summary.outcomes[1]).toMatchObject({
            file: 'bad.zip',
            status: 'rejected',
            reason: { code: 'invalid', detail: 'The archive cannot be opened.' },
            kept: false,
        });
    });
});

describe('syntax examples of the guide (spec 043, SC-003)', () => {
    const examples = [
        'docs/guide/notes.mdx',
        'i18n/ru/docusaurus-plugin-content-docs/current/guide/notes.mdx',
    ].flatMap((path) =>
        [...readFileSync(path, 'utf8').matchAll(/```markdown\n([\s\S]*?)```/g)].map(
            ([, body]) => [path, body!] as const
        )
    );

    it('finds the examples', () => {
        expect(examples.length).toBeGreaterThanOrEqual(14);
    });

    it.each(examples)(
        'round-trips an example of %s with its text unchanged',
        async (_path, body) => {
            const { back } = await roundTrip(noteEnvelope('n', 'Example', body));
            expect(bodyOf(back).text).toBe(body);
        }
    );
});
