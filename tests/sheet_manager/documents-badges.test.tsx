// @vitest-environment happy-dom
import { initialsOf } from '@site/src/sheet_manager/features/documents/labeler';
import {
    createSetting,
    renameItem,
} from '@site/src/sheet_manager/features/sheet/data/libraryActions';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { noteEnvelope } from '@site/src/sheet_manager/systems/general/note';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { openWindow, resetDocuments } from './helpers/documentsWindow';
import {
    ASHEN_ID,
    CULT_ID,
    libraryDocument,
    resetLibraryStores,
    userSetting,
    userType,
} from './helpers/library';

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
    resetLibraryStores();
});

function seed(documents: ReturnType<typeof libraryDocument>[]) {
    useDocumentStore.setState({ documents, currentDocumentId: null, folders: [] });
}

const badgeOf = (name: string) =>
    screen.getByRole('treeitem', { name: new RegExp(`^${name}`) }).querySelector('[title]');

const lettersOf = (name: string) => badgeOf(name)?.querySelector('[aria-hidden]')?.textContent;

describe('system badges', () => {
    it("show a shipped setting's letters, named after the setting", () => {
        seed([
            libraryDocument('Kyla', { systemId: 'star-wars-wod', definitionId: 'character' }),
            libraryDocument('Cell', { systemId: 'wod-v5', definitionId: 'hunter' }),
            libraryDocument('Mirela', { systemId: 'wod-v5', definitionId: 'vampire' }),
        ]);
        openWindow();
        expect(lettersOf('Kyla')).toBe('SW');
        expect(lettersOf('Cell')).toBe('HtR');
        expect(lettersOf('Mirela')).toBe('VtM');
        expect(badgeOf('Kyla')?.getAttribute('title')).toBe('Star Wars (World of Darkness 2e)');
        expect(badgeOf('Cell')?.getAttribute('title')).toBe('Hunter: the Reckoning 5e');
        expect(badgeOf('Mirela')?.getAttribute('title')).toBe('Vampire: the Masquerade 5e');
    });

    it("show letters for a ruleset's own documents and notes", () => {
        seed([
            libraryDocument('Elder', { systemId: 'wod-v5', definitionId: 'v5-storyteller' }),
            libraryDocument('Old', { systemId: 'wod-2e', definitionId: 'wod2e-character' }),
            noteEnvelope('plan', 'Plan', ''),
        ]);
        openWindow();
        expect(lettersOf('Elder')).toBe('V5');
        expect(lettersOf('Old')).toBe('WoD 2e');
        expect(lettersOf('Plan')).toBe('General');
    });

    it('tell a hunter from a vampire, though both play by V5', () => {
        seed([
            libraryDocument('Cell', { systemId: 'wod-v5', definitionId: 'hunter' }),
            libraryDocument('Mirela', { systemId: 'wod-v5', definitionId: 'vampire' }),
        ]);
        openWindow();
        expect(lettersOf('Cell')).toBe('HtR');
        expect(lettersOf('Mirela')).toBe('VtM');
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

describe('user setting badges', () => {
    function seedSetting(badge?: string) {
        const setting = userSetting(badge ? { badge } : {});
        useDocumentTypeStore.setState({
            settings: { [setting.id]: setting },
            types: { [CULT_ID]: userType() },
        });
        seed([
            libraryDocument('Coven', { systemId: 'wod-v5', definitionId: 'hunter', kind: CULT_ID }),
            // A ruleset character created in the setting: marked by the document, not its kind.
            libraryDocument(
                'Mara',
                { systemId: 'wod-v5', definitionId: 'hunter' },
                { settingId: ASHEN_ID }
            ),
            libraryDocument('Cell', { systemId: 'wod-v5', definitionId: 'hunter' }),
        ]);
        openWindow();
    }

    it("show a setting's own badge, named after the setting and its system", () => {
        seedSetting('ASH');
        const system = 'World of Darkness 5th Edition';
        expect(badgeOf('Coven')?.querySelector('[aria-hidden]')?.textContent).toBe('ASH');
        expect(badgeOf('Coven')?.getAttribute('title')).toBe(`Ashen Realms · ${system}`);
        expect(badgeOf('Mara')?.querySelector('[aria-hidden]')?.textContent).toBe('ASH');
        expect(badgeOf('Mara')?.getAttribute('title')).toBe(`Ashen Realms · ${system}`);
        expect(lettersOf('Cell')).toBe('HtR');
    });

    it("fall back to the setting name's initials", () => {
        seedSetting();
        expect(badgeOf('Coven')?.querySelector('[aria-hidden]')?.textContent).toBe('AR');
        expect(badgeOf('Mara')?.querySelector('[aria-hidden]')?.textContent).toBe('AR');
    });

    it('take initials from up to three words, or the first three letters of one', () => {
        expect(initialsOf('Night City Blues Again')).toBe('NCB');
        expect(initialsOf('Super testing Setting')).toBe('StS');
        expect(initialsOf('мой Сеттинг')).toBe('мС');
        expect(initialsOf('Ashen')).toBe('Ash');
    });

    it('are kept by creating and editing a setting, and cleared when emptied', () => {
        const created = createSetting('wod-v5', 'Ashen Realms', '', ' AR ');
        expect(created.badge).toBe('AR');
        useDocumentTypeStore.setState({ settings: { [created.id]: created } });
        const node = {
            level: 'setting',
            ownership: 'user',
            ref: { kind: 'user', settingId: created.id },
        } as never;
        const state = { settings: { [created.id]: created } } as never;
        expect(renameItem(node, 'Ashen', '', state, 'ASH').saveSettings?.[0]?.badge).toBe('ASH');
        expect(renameItem(node, 'Ashen', '', state, '').saveSettings?.[0]).not.toHaveProperty(
            'badge'
        );
    });
});
