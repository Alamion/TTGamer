// @vitest-environment jsdom

import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    ASHEN_ID,
    CULT_ID,
    ORG_ID,
    ORG_PAGE_ID,
    resetLibraryStores,
    seedLibrary,
    userSetting,
} from './helpers/library';
import { addMistySetting, drag, MIST_ID, mustRow, openLibrary } from './helpers/libraryDialog';

// The editor opens from the library; full renders are slow under a loaded run.
vi.setConfig({ testTimeout: 30_000 });

describe('library dialog — moving (spec 013, US3)', () => {
    beforeEach(() => {
        seedLibrary();
        addMistySetting();
    });
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    it('moves a type by dropping it on a setting of the same system', () => {
        useDocumentTypeStore.setState((state) => ({
            settings: {
                ...state.settings,
                'user-setting-dusk0001': userSetting({
                    id: 'user-setting-dusk0001',
                    name: 'Dusk',
                    pages: {},
                }),
            },
        }));
        openLibrary();
        fireEvent.click(within(mustRow(`s:user:${ASHEN_ID}`)).getByLabelText(/Expand/));
        drag(`t:user:${CULT_ID}`, 's:user:user-setting-dusk0001');
        expect(useDocumentTypeStore.getState().types[CULT_ID]!.owner).toEqual({
            settingId: 'user-setting-dusk0001',
        });
    });

    it('refuses invalid drops and never picks up shipped rows', () => {
        openLibrary();
        expect(mustRow('s:system:star-wars-wod').getAttribute('draggable')).toBe('false');
        fireEvent.click(within(mustRow(`s:user:${ASHEN_ID}`)).getByLabelText(/Expand/));
        expect(mustRow(`t:core:${ASHEN_ID}:v5-character`).getAttribute('draggable')).toBe('false');
        drag(`t:user:${CULT_ID}`, 's:rules:wod-v5');
        expect(useDocumentTypeStore.getState().types[CULT_ID]!.owner).toEqual({
            settingId: ASHEN_ID,
        });
    });

    it('confirms a drop that changes the system before anything moves', () => {
        openLibrary();
        drag(`s:user:${ASHEN_ID}`, 'r:wod-2e');
        expect(useDocumentTypeStore.getState().settings[ASHEN_ID]!.systemId).toBe('wod-v5');
        const panel = screen.getByTestId('library-move-panel');
        expect(panel.textContent).toContain('Other rules');
        expect(panel.textContent).toContain('3 documents of the rules character stay');
        expect(panel.textContent).toContain('1 page of the rules character stays');
        fireEvent.click(within(panel).getByRole('button', { name: 'Move' }));
        expect(useDocumentTypeStore.getState().settings[ASHEN_ID]!.systemId).toBe('wod-2e');
    });

    it('moves through the context menu and the destination picker', () => {
        openLibrary();
        fireEvent.contextMenu(mustRow(`s:system:star-wars-wod`));
        console.log(
            'MENU',
            document.querySelectorAll('[role="menu"]').length,
            document.body.innerHTML.includes('menuitem')
        );
        expect(screen.queryByRole('menuitem', { name: 'Move…' })).toBeNull();
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

        fireEvent.click(within(mustRow('s:system:star-wars-wod')).getByLabelText(/Expand/));
        fireEvent.contextMenu(mustRow(`t:user:${ORG_ID}`));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Move…' }));
        const panel = screen.getByTestId('library-move-panel');
        expect(within(panel).getByRole('button', { name: 'Move' })).toHaveProperty(
            'disabled',
            true
        );
        fireEvent.click(within(panel).getByRole('button', { name: /Misty Archipelago/ }));
        expect(panel.textContent).toContain('Other rules');
        act(() => {
            fireEvent.click(within(panel).getByRole('button', { name: 'Move' }));
        });
        expect(useDocumentTypeStore.getState().types[ORG_ID]!.owner).toEqual({
            settingId: MIST_ID,
        });
        expect(
            useTemplateStore.getState().templates.find(({ id }) => id === ORG_PAGE_ID)
        ).toMatchObject({ systemId: 'wod-2e' });
    });
});
