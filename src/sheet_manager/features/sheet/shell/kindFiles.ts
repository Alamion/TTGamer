import { systemRegistry } from '../../../systems';
import type { DocumentFileFormat } from '../../../systems/types';
import type { UnknownDocumentEnvelope } from '../../../types/document';
import type { ImportFile } from './importBatch';

/**
 * Files of a kind's own format beside the JSON export (spec 043, D9): the toolbar exports a
 * document through its kind's format and turns such files into documents before the import batch
 * reads them, so they are checked, kept, and reported like any JSON file.
 */

/** The file format of a document's kind, if it has one. */
export function documentFileFormat(
    document: Pick<UnknownDocumentEnvelope, 'systemId' | 'definitionId'>
): DocumentFileFormat | undefined {
    return systemRegistry.getDocumentDefinition(document.systemId, document.definitionId)?.files;
}

function formats(): DocumentFileFormat[] {
    return systemRegistry
        .getSystems()
        .flatMap(({ documents }) => documents.map(({ files }) => files))
        .filter((files): files is DocumentFileFormat => files !== undefined);
}

/** What the import's file picker offers: JSON and every kind's own format. */
export function importAccept(): string {
    const own = formats().flatMap(({ extensions, mediaTypes }) => [...extensions, ...mediaTypes]);
    return [...new Set(['.json', 'application/json', ...own])].join(',');
}

/** The files as the import batch reads them; a file of a kind's format becomes its document. */
export async function readImportFiles(files: readonly File[]): Promise<ImportFile[]> {
    const all = formats();
    return Promise.all(
        files.map(async (file): Promise<ImportFile> => {
            const name = file.name.toLowerCase();
            const format = all.find(({ extensions }) =>
                extensions.some((end) => name.endsWith(end))
            );
            if (!format) return { name: file.name, text: await file.text() };
            try {
                const document = await format.read({
                    name: file.name,
                    bytes: new Uint8Array(await file.arrayBuffer()),
                });
                return { name: file.name, text: JSON.stringify(document) };
            } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                return { name: file.name, text: '', rejected: reason };
            }
        })
    );
}
