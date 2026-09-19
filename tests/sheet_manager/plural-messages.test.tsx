// @vitest-environment jsdom

import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { DocumentManagerDialog } from '@site/src/sheet_manager/components/dialogs/DocumentManagerDialog';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { createDefaultStarWarsCharacterData } from '@site/src/sheet_manager/systems/star-wars-wod/schema';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { setTestLocale } from '../stubs/testLocale';

afterEach(() => {
    cleanup();
    setTestLocale('en');
});

const envelope = (id: string) =>
    ({
        id,
        kind: 'character',
        systemId: 'star-wars-wod',
        definitionId: 'character',
        schemaVersion: 1,
        metadata: { title: id, tags: [] },
        templateValues: {},
        data: createDefaultStarWarsCharacterData(),
    }) as never;

/** Opens the delete confirmation for `count` selected documents and returns its text. */
function deleteDescription(count: number): string {
    useDocumentStore.setState({
        documents: Array.from({ length: count }, (_, index) => envelope('doc-' + index)),
        currentDocumentId: 'doc-0',
    });
    render(createElement(DocumentManagerDialog, { open: true, onOpenChange: () => {} }));
    fireEvent.click(
        screen.getByRole('checkbox', {
            name: translate(uiMessages.sheet.documents.manager.selectAll),
        })
    );
    // The delete button shows the selection size; its id-only label is empty in the en stub.
    const deleteButton = screen
        .getAllByRole('button')
        .find((button) => button.textContent?.endsWith('(' + count + ')'));
    fireEvent.click(deleteButton!);
    return document.body.textContent ?? '';
}

describe('plural messages', () => {
    it.each([
        [1, 'Удалить 1 документ?'],
        [3, 'Удалить 3 документа?'],
        [5, 'Удалить 5 документов?'],
    ])('ru: delete description for %i documents', (count, expected) => {
        setTestLocale('ru');
        expect(deleteDescription(count)).toContain(expected);
    });

    it.each([
        [1, 'delete 1 document?'],
        [5, 'delete 5 documents?'],
    ])('en: delete description for %i documents', (count, expected) => {
        expect(deleteDescription(count)).toContain(expected);
    });
});
