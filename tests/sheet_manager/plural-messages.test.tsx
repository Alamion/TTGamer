// @vitest-environment happy-dom

import { DocumentsWindow } from '@site/src/sheet_manager/components/documents/DocumentsWindow';
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
    render(createElement(DocumentsWindow, { open: true, onOpenChange: () => {} }));
    const rows = screen.getAllByRole('treeitem');
    fireEvent.click(rows[0]!);
    fireEvent.click(rows.at(-1)!, { shiftKey: true });
    const deleteButton = screen
        .getAllByRole('button')
        .find((button) => /^(Delete|Удалить)$/.test(button.textContent ?? ''));
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
        [1, 'Delete 1 document?'],
        [5, 'Delete 5 documents?'],
    ])('en: delete description for %i documents', (count, expected) => {
        expect(deleteDescription(count)).toContain(expected);
    });
});
