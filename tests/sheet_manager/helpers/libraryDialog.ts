import { LibraryDialog } from '@site/src/sheet_manager/components/dialogs/LibraryDialog';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import type { UserSetting } from '@site/src/sheet_manager/systems/userTypes';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';

import { userSetting } from './library';

export const MIST_ID = 'user-setting-mist0001';

export function openLibrary() {
    return render(createElement(LibraryDialog, { open: true, onOpenChange: () => undefined }));
}

export const row = (key: string) =>
    document.querySelector<HTMLElement>(`[data-library-row="${key}"]`) ?? null;

export const mustRow = (key: string) => {
    const found = row(key);
    if (!found) throw new Error(`No row ${key}`);
    return found;
};

export const select = (key: string) => fireEvent.click(mustRow(key));

export const details = () => screen.getByRole('region', { name: /./ });

export const action = (id: string) =>
    document.querySelector<HTMLButtonElement>(`[data-library-action="${id}"]`);

export const press = (key: string, options: Partial<KeyboardEventInit> = {}) =>
    fireEvent.keyDown(document.activeElement!, { key, ...options });

export const lastDialog = () => screen.getAllByRole('dialog').at(-1)!;

export function transfer() {
    const data = new Map<string, string>();
    return {
        types: [] as string[],
        getData: (type: string) => data.get(type) ?? '',
        setData: (type: string, value: string) => void data.set(type, value),
        dropEffect: 'none',
        effectAllowed: 'move',
    };
}

export function drag(fromKey: string, toKey: string) {
    const dataTransfer = transfer();
    fireEvent.dragStart(mustRow(fromKey), { dataTransfer });
    fireEvent.dragOver(mustRow(toKey), { dataTransfer });
    fireEvent.drop(mustRow(toKey), { dataTransfer });
}

export function addMistySetting() {
    useDocumentTypeStore.setState((state) => ({
        settings: {
            ...state.settings,
            [MIST_ID]: userSetting({
                id: MIST_ID,
                name: 'Misty Archipelago',
                systemId: 'wod-2e' as UserSetting['systemId'],
                pages: {},
            }),
        },
    }));
}

export function jsonFile(content: string, name = 'library.json') {
    // jsdom's File has no text(); the import reads files through it.
    return Object.assign(new File([content], name, { type: 'application/json' }), {
        text: async () => content,
    });
}

export const tick = (key: string) =>
    within(mustRow(key)).getByRole('checkbox') as HTMLButtonElement;

export function libraryPageLike(id: string, name: string) {
    return {
        id,
        name,
        systemId: 'star-wars-wod',
        documentKind: 'character',
        schemaVersion: 3,
        children: [{ id: 'notes', type: 'text', label: 'Notes' }],
    };
}
