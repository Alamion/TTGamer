// @vitest-environment jsdom

import { DocumentCreateDialog } from '@site/src/sheet_manager/components/dialogs/DocumentCreateDialog';
import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { TemplateLibraryDialog } from '@site/src/sheet_manager/components/dialogs/TemplateLibraryDialog';
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import {
    migrateDocumentStoreState,
    useDocumentStore,
} from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import type { UserDocumentType } from '@site/src/sheet_manager/systems/userTypes';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { resetEditorStores } from './helpers/editor';

// Full editor renders (outline, live page, settings) are slow under a loaded test run.
vi.setConfig({ testTimeout: 20_000 });

const RENDER_TIMEOUT = 20_000;
const TYPE_ID = 'user-org00001';
const NOW = '2026-09-25T10:00:00.000Z';

function orgPage(id = 'tpl-orgpage1', withMotto = true): CustomTemplate {
    return CustomTemplateSchema.parse({
        id,
        name: id === 'tpl-orgpage1' ? 'Organization sheet' : 'Organization card',
        systemId: 'star-wars-wod',
        documentKind: TYPE_ID,
        schemaVersion: 3,
        children: [
            {
                id: 'main',
                type: 'group',
                title: 'Organization',
                children: [
                    { id: 'name', type: 'text', label: 'Name' },
                    ...(withMotto ? [{ id: 'motto', type: 'text', label: 'Motto' }] : []),
                ],
            },
        ],
    });
}

function installType(templates: CustomTemplate[] = [orgPage()]) {
    const type: UserDocumentType = {
        id: TYPE_ID,
        name: 'Organization',
        owner: { systemId: 'star-wars-wod' } as UserDocumentType['owner'],
        defaultTemplateId: 'tpl-orgpage1',
        createdAt: NOW,
        updatedAt: NOW,
    };
    useTemplateStore.setState({ templates, quarantine: [], defaultOverrides: {} });
    useDocumentTypeStore.setState({ types: { [TYPE_ID]: type }, settings: {} });
}

const settingsOf = (nodeId: string) =>
    document.querySelector(`[data-settings-for="${nodeId}"]`) as HTMLElement;
const selectInOutline = (nodeId: string) =>
    fireEvent.click(
        [
            ...document.querySelector(`[data-outline-row="${nodeId}"]`)!.querySelectorAll('button'),
        ].find((button) => !button.draggable)!
    );

describe('user document types (spec 012, US4)', () => {
    beforeEach(() => {
        resetEditorStores();
        useDocumentTypeStore.setState({ types: {}, settings: {} });
    });
    afterEach(() => {
        cleanup();
        useDocumentTypeStore.setState({ types: {}, settings: {} });
    });

    it('creates a type with its first page from the library', () => {
        render(createElement(TemplateLibraryDialog, { open: true, onOpenChange: () => {} }));
        fireEvent.change(screen.getByLabelText('Type name'), {
            target: { value: 'Organization' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Create type/ }));
        expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Organization');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        const types = Object.values(useDocumentTypeStore.getState().types);
        expect(types).toHaveLength(1);
        const [type] = types;
        expect(type!.name).toBe('Organization');
        expect(type!.owner).toEqual({ systemId: 'star-wars-wod' });
        const [template] = useTemplateStore.getState().templates;
        expect(template!.documentKind).toBe(type!.id);
        expect(type!.defaultTemplateId).toBe(template!.id);
        expect(screen.getByRole('region', { name: /· Organization$/ })).not.toBeNull();
    });

    it('lists the type in the create dialog under its setting with its description', () => {
        installType();
        render(createElement(DocumentCreateDialog, { open: true, onOpenChange: () => {} }));
        const radio = screen.getByRole('radio', { name: /Organization/ });
        expect(radio).not.toBeNull();
        expect(screen.getByText('No description')).not.toBeNull();
    });

    it(
        'keeps entered values through page edits and a store reload',
        () => {
            installType();
            const created = useDocumentStore.getState().createDocument('star-wars-wod', TYPE_ID);
            expect(created.data).toEqual({});
            render(createElement(CharacterSheet));
            fireEvent.change(screen.getByLabelText('Motto'), { target: { value: 'Hope' } });
            expect(useDocumentStore.getState().documents[0]!.templateValues.motto).toBe('Hope');

            // The page loses the field; the value stays and returns with the field.
            act(() => installType([orgPage('tpl-orgpage1', false)]));
            expect(screen.queryByLabelText('Motto')).toBeNull();
            expect(useDocumentStore.getState().documents[0]!.templateValues.motto).toBe('Hope');
            act(() => installType([orgPage()]));
            expect((screen.getByLabelText('Motto') as HTMLInputElement).value).toBe('Hope');

            const reloaded = migrateDocumentStoreState(
                JSON.parse(JSON.stringify(useDocumentStore.getState())),
                4
            );
            expect(reloaded.documents[0]!.templateValues.motto).toBe('Hope');
        },
        RENDER_TIMEOUT
    );

    it(
        'offers every page of the type in the view selector',
        () => {
            installType([orgPage(), orgPage('tpl-orgpage2')]);
            useDocumentStore.getState().createDocument('star-wars-wod', TYPE_ID);
            render(createElement(CharacterSheet));
            const select = screen.getByLabelText('View mode') as HTMLSelectElement;
            expect([...select.options].map(({ textContent }) => textContent)).toEqual([
                'Organization sheet',
                'Organization card',
            ]);
        },
        RENDER_TIMEOUT
    );

    it(
        'deletes a type after confirming its document count and keeps the document',
        () => {
            installType();
            useDocumentStore.getState().createDocument('star-wars-wod', TYPE_ID);
            const id = useDocumentStore.getState().documents[0]!.id;
            useDocumentStore.getState().updateTemplateValues(id, orgPage(), (values) => ({
                ...values,
                motto: 'Hope',
            }));

            render(createElement(TemplateLibraryDialog, { open: true, onOpenChange: () => {} }));
            fireEvent.click(screen.getByRole('button', { name: /Delete type/ }));
            const confirm = screen.getAllByRole('dialog').at(-1)!;
            expect(confirm.textContent).toContain('1 document uses it');
            fireEvent.click(within(confirm).getByRole('button', { name: 'Delete type' }));
            expect(useDocumentTypeStore.getState().types).toEqual({});
            expect(useTemplateStore.getState().templates).toEqual([]);
            cleanup();

            render(createElement(CharacterSheet));
            expect(screen.getByText('Document type not installed')).not.toBeNull();
            expect((screen.getByLabelText('motto') as HTMLInputElement).value).toBe('Hope');
            expect(takeSheetIssues()).toContainEqual(
                expect.objectContaining({
                    code: 'template-fallback',
                    details: expect.objectContaining({ reason: 'type-missing' }),
                })
            );
        },
        RENDER_TIMEOUT
    );

    it('limits a type page to custom values, its system catalogs, and a kind picker', () => {
        installType();
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: orgPage() },
                onClose: () => {},
            })
        );
        selectInOutline('motto');
        const source = within(settingsOf('motto')).getByLabelText(
            'Stores value in'
        ) as HTMLSelectElement;
        expect([...source.options].map(({ value }) => value)).toEqual(['custom']);

        fireEvent.change(within(settingsOf('motto')).getByLabelText('Field type'), {
            target: { value: 'select' },
        });
        const attach = within(settingsOf('motto')).getByLabelText(
            'Attach catalog'
        ) as HTMLSelectElement;
        const catalogs = [...attach.options].map(({ value }) => value).filter(Boolean);
        expect(catalogs).toContain('melee-weapons');
        expect(catalogs.some((id) => id.startsWith('v5-'))).toBe(false);

        fireEvent.change(within(settingsOf('motto')).getByLabelText('Field type'), {
            target: { value: 'reference' },
        });
        const kinds = within(settingsOf('motto')).getByRole('group', {
            name: 'Allowed document kinds',
        });
        const own = within(kinds).getByLabelText('Organization') as HTMLInputElement;
        expect(own.checked).toBe(true);
        expect(within(kinds).getByLabelText('Character')).not.toBeNull();
    });
});
