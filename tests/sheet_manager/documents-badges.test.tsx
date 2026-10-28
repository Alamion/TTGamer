// @vitest-environment happy-dom
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { noteEnvelope } from '@site/src/sheet_manager/systems/general/note';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { openWindow, resetDocuments } from './helpers/documentsWindow';
import { libraryDocument } from './helpers/library';

/** Each document row says which game it belongs to (spec 045, US2). */

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

afterEach(() => {
    cleanup();
    resetDocuments();
});

function seed(documents: ReturnType<typeof libraryDocument>[]) {
    useDocumentStore.setState({ documents, currentDocumentId: null, folders: [] });
}

const badgeOf = (name: string) =>
    screen.getByRole('treeitem', { name: new RegExp(`^${name}`) }).querySelector('[title]');

describe('system badges', () => {
    it('show each document row its system, the full name as tooltip and spoken name', () => {
        seed([
            libraryDocument('Kyla', { systemId: 'star-wars-wod', definitionId: 'character' }),
            libraryDocument('Cell', { systemId: 'wod-v5', definitionId: 'hunter' }),
            noteEnvelope('plan', 'Plan', ''),
        ]);
        openWindow();
        expect(badgeOf('Kyla')?.textContent).toBe('SWStar Wars (World of Darkness 2e)');
        expect(badgeOf('Kyla')?.getAttribute('title')).toBe('Star Wars (World of Darkness 2e)');
        expect(badgeOf('Cell')?.textContent).toContain('V5');
        expect(badgeOf('Plan')?.textContent).toContain('General');
    });

    it("show an own type's documents the system its type belongs to", () => {
        seed([
            libraryDocument('Kyla', { systemId: 'star-wars-wod', definitionId: 'character' }),
            libraryDocument('Faction', { systemId: 'wod-v5', definitionId: 'hunter' }),
        ]);
        useDocumentStore.setState((state) => ({
            entries: state.entries.map((entry) =>
                entry.id === 'Faction' ? { ...entry, kind: 'user-faction' as never } : entry
            ),
        }));
        openWindow();
        expect(badgeOf('Faction')?.textContent).toContain('V5');
    });

    it('are left out when every shown document has the same system', () => {
        seed([
            libraryDocument('Cell', { systemId: 'wod-v5', definitionId: 'hunter' }),
            libraryDocument('Ghoul', { systemId: 'wod-v5', definitionId: 'hunter' }),
        ]);
        openWindow();
        expect(badgeOf('Cell')).toBeNull();
    });
});
