// @vitest-environment happy-dom
import {
    createChoices,
    listChoices,
} from '@site/src/sheet_manager/features/documents/createChoices';
import { documentLabeler } from '@site/src/sheet_manager/features/documents/labeler';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    NOTE_BODY_KEY,
    noteDefinition,
    noteEnvelope,
    noteTemplate,
} from '@site/src/sheet_manager/systems/general/note';
import type { UserSetting } from '@site/src/sheet_manager/systems/userTypes';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { currentTree, resetUserKinds } from '../../helpers/createDialog';
import { NOW } from '../../helpers/library';

/** The Note on the General system (spec 043, US1). */

vi.setConfig({ testTimeout: 20_000 });

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

afterEach(() => {
    cleanup();
    resetUserKinds();
});

function mountNote(name: string, body: string) {
    useDocumentStore.setState({
        documents: [noteEnvelope('note-1', name, body)],
        currentDocumentId: 'note-1',
    });
    return render(createElement(DeclarativeSheetView, { template: noteTemplate }));
}

const stored = () => useDocumentStore.getState().documents[0]!;

describe('the Note', () => {
    it('parses its data and keeps foreign front matter as text', () => {
        expect(noteDefinition.schema.parse({})).toEqual({ name: '' });
        expect(noteDefinition.schema.parse({ name: 'Plan', frontMatter: 'tags: [a]' })).toEqual({
            name: 'Plan',
            frontMatter: 'tags: [a]',
        });
        expect(noteDefinition.schema.safeParse({ name: 'x'.repeat(201) }).success).toBe(false);
    });

    it('renders its name and its text, and the name names the document', () => {
        mountNote('Session 12', '# Scene one\n- [ ] prepare');
        expect(screen.getByRole('heading', { name: 'Scene one' })).toBeTruthy();
        fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
            target: { value: 'Session 13' },
        });
        expect(stored().metadata.title).toBe('Session 13');
        expect(stored().templateValues[NOTE_BODY_KEY]).toEqual({
            text: '# Scene one\n- [ ] prepare',
        });
    });

    it('is offered in its own General group of the create dialog', () => {
        const groups = createChoices(currentTree(), systemRegistry);
        const general = groups.find(({ name }) => name === 'General')!;
        expect(listChoices([general]).map(({ key, name }) => ({ key, name }))).toEqual([
            { key: 'general/note', name: 'Note' },
        ]);
        expect(general.sections[0]!.choices[0]!.examples.map(({ id }) => id)).toEqual([
            'how-notes-work::example',
        ]);
    });

    it('is filtered as General in the documents window and named for any game in the library', () => {
        expect(documentLabeler.system('general')).toBe('General');
        const general = currentTree().find(({ key }) => key === 'r:general')!;
        expect(general.settings.map(({ name }) => name)).toEqual(['Any game']);
    });

    it('is offered in a user setting on General', () => {
        const id = 'user-setting-world001';
        useDocumentTypeStore.setState({
            settings: {
                [id]: {
                    id,
                    name: 'My world',
                    systemId: 'general' as UserSetting['systemId'],
                    pages: {},
                    createdAt: NOW,
                    updatedAt: NOW,
                } as UserSetting,
            },
        });
        const keys = listChoices(createChoices(currentTree(), systemRegistry)).map(
            ({ key }) => key
        );
        expect(keys).toContain(`general/note/${id}`);
    });

    it('opens its example with the syntax sample', () => {
        const example = noteDefinition.examples![0]!.create();
        expect(example.metadata.title).toBe('How notes work');
        expect(
            (example.templateValues[NOTE_BODY_KEY] as { text: string }).text.startsWith(
                '# How notes work'
            )
        ).toBe(true);
    });
});
