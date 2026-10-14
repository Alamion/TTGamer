// @vitest-environment happy-dom

import { DocumentCreateDialog } from '@site/src/sheet_manager/components/dialogs/DocumentCreateDialog';
import { DocumentsWindow } from '@site/src/sheet_manager/components/documents/DocumentsWindow';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import { createHunterDefault } from '@site/src/sheet_manager/systems/v5';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
    it('shows the kind and the setting of the selected document as separate fields', () => {
        useDocumentStore.setState({
            documents: [
                envelope('Jax', 'star-wars-wod', 'character', createDefaultStarWarsCharacterData()),
                envelope('Lena', 'wod-v5', 'hunter', createHunterDefault()),
            ],
            currentDocumentId: 'Jax',
        });
        render(createElement(DocumentsWindow, { open: true, onOpenChange: () => {} }));
        const fields = (name: string) => {
            fireEvent.click(screen.getByRole('treeitem', { name: new RegExp(`^${name}`) }));
            const details = screen.getByRole('region', { name });
            return Object.fromEntries(
                within(details)
                    .getAllByRole('term')
                    .map((term) => [term.textContent, term.nextElementSibling?.textContent])
            );
        };
        expect(fields('Jax')).toMatchObject({
            Kind: 'Character',
            Setting: 'Star Wars (World of Darkness 2e)',
        });
        expect(fields('Lena')).toMatchObject({
            Kind: 'Character',
            Setting: 'Hunter: the Reckoning 5e',
        });
    });

    it('groups creatable documents by setting', () => {
        render(createElement(DocumentCreateDialog, { open: true, onOpenChange: () => {} }));
        const hunter = screen.getByRole('group', { name: 'Hunter: the Reckoning 5e' });
        expect(within(hunter).getByRole('radio', { name: 'Character' })).toBeTruthy();
    });
});
