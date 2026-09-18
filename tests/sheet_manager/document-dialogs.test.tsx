// @vitest-environment jsdom

import { DocumentCreateDialog } from '@site/src/sheet_manager/components/dialogs/DocumentCreateDialog';
import { DocumentManagerDialog } from '@site/src/sheet_manager/components/dialogs/DocumentManagerDialog';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import { createHunterDefault } from '@site/src/sheet_manager/systems/v5';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(cleanup);

const envelope = (id: string, systemId: string, definitionId: string, data: unknown) =>
    ({
        id,
        kind: 'character',
        systemId,
        definitionId,
        schemaVersion: 1,
        metadata: { title: id, tags: [] },
        templateValues: {},
        data,
    }) as never;

describe('document dialogs', () => {
    it('lists the type and the setting as separate columns', () => {
        useDocumentStore.setState({
            documents: [
                envelope('Jax', 'star-wars-wod', 'character', createDefaultStarWarsCharacterData()),
                envelope('Lena', 'wod-v5', 'hunter', createHunterDefault()),
            ],
            currentDocumentId: 'Jax',
        });
        render(createElement(DocumentManagerDialog, { open: true, onOpenChange: () => {} }));
        // Select-all, Name, Type, Setting.
        expect(screen.getAllByRole('columnheader')).toHaveLength(4);
        const cells = (name: string) =>
            within(screen.getByRole('button', { name: new RegExp(`^${name}`) }).closest('tr')!)
                .getAllByRole('cell')
                .slice(2)
                .map(({ textContent }) => textContent);
        expect(cells('Jax')).toEqual(['Character', 'Star Wars (World of Darkness 2e)']);
        expect(cells('Lena')).toEqual(['Character', 'Hunter: the Reckoning 5e']);
    });

    it('groups creatable documents by setting', () => {
        render(createElement(DocumentCreateDialog, { open: true, onOpenChange: () => {} }));
        const hunter = screen.getByRole('group', { name: 'Hunter: the Reckoning 5e' });
        expect(within(hunter).getByRole('radio', { name: 'Character' })).toBeTruthy();
    });
});
