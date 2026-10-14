import { DocumentsWindow } from '@site/src/sheet_manager/components/documents/DocumentsWindow';
import type { Folder } from '@site/src/sheet_manager/store/documentIndex';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { render } from '@testing-library/react';
import { createElement } from 'react';

import { libraryDocument } from './library';

const STAMP = '2026-10-14T10:00:00.000Z';

export function folder(id: string, name: string, parentId: string | null = null, rank = 1): Folder {
    return { id, name, parentId, rank, createdAt: STAMP, changedAt: STAMP, updatedAt: 1 };
}

/** Hunter documents named by id; `placed` puts documents into folders (id → folder id). */
export function seedDocuments(
    ids: readonly string[],
    {
        folders = [],
        placed = {},
        current = null,
    }: { folders?: Folder[]; placed?: Record<string, string>; current?: string | null } = {}
) {
    const documents = ids.map((id) => ({
        ...libraryDocument(id, { systemId: 'wod-v5', definitionId: 'hunter' }),
    }));
    useDocumentStore.setState({ documents, currentDocumentId: current, folders });
    useDocumentStore.setState((state) => ({
        entries: state.entries.map((entry, index) => ({
            ...entry,
            rank: index + 1,
            parentId: placed[entry.id] ?? null,
        })),
    }));
}

export const openWindow = (onOpenChange: (open: boolean) => void = () => undefined) =>
    render(createElement(DocumentsWindow, { open: true, onOpenChange }));

export const resetDocuments = () =>
    useDocumentStore.setState({
        documents: [],
        entries: [],
        folders: [],
        currentDocumentId: null,
        pendingPurge: [],
    });
