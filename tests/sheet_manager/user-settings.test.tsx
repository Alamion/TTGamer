// @vitest-environment jsdom

import { DocumentCreateDialog } from '@site/src/sheet_manager/components/dialogs/DocumentCreateDialog';
import { TemplateLibraryDialog } from '@site/src/sheet_manager/components/dialogs/TemplateLibraryDialog';
import { CharacterSheet } from '@site/src/sheet_manager/features/sheet/CharacterSheet';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { resolveDocumentPolicies, systemRegistry } from '@site/src/sheet_manager/systems';
import { SystemRegistry } from '@site/src/sheet_manager/systems/registry';
import { listDocumentBindings } from '@site/src/sheet_manager/systems/templateBindings';
import type { SystemPlugin } from '@site/src/sheet_manager/systems/types';
import type { UserSetting } from '@site/src/sheet_manager/systems/userTypes';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEditorStores } from './helpers/editor';

// Full sheets and the editor render slowly under a loaded test run.
vi.setConfig({ testTimeout: 30_000 });

const NOW = '2026-09-25T10:00:00.000Z';

function setting(id: string, name: string, systemId: string): UserSetting {
    return {
        id,
        name,
        systemId: systemId as UserSetting['systemId'],
        pages: {},
        createdAt: NOW,
        updatedAt: NOW,
    };
}

function settingsSection() {
    return screen.getByTestId('user-settings-section');
}

describe('user settings (spec 012, US6)', () => {
    beforeEach(() => {
        resetEditorStores();
        useDocumentTypeStore.setState({ types: {}, settings: {} });
    });
    afterEach(() => {
        cleanup();
        useDocumentTypeStore.setState({ types: {}, settings: {} });
    });

    it('builds settings only on rulesets with core definitions', () => {
        render(createElement(TemplateLibraryDialog, { open: true, onOpenChange: () => {} }));
        const ruleset = within(settingsSection()).getByLabelText('Ruleset') as HTMLSelectElement;
        expect([...ruleset.options].map(({ value }) => value).sort()).toEqual(['wod-2e', 'wod-v5']);
        fireEvent.change(ruleset, { target: { value: 'wod-v5' } });
        fireEvent.change(within(settingsSection()).getByLabelText('Setting name'), {
            target: { value: 'Ashen Realms' },
        });
        fireEvent.click(within(settingsSection()).getByRole('button', { name: /Create setting/ }));
        const [created] = Object.values(useDocumentTypeStore.getState().settings);
        expect(created).toMatchObject({ name: 'Ashen Realms', systemId: 'wod-v5' });
    });

    it('designs the setting page from the engine page and records it', () => {
        useDocumentTypeStore.setState({
            settings: {
                'user-setting-ash00001': setting('user-setting-ash00001', 'Ashen Realms', 'wod-2e'),
            },
        });
        render(createElement(TemplateLibraryDialog, { open: true, onOpenChange: () => {} }));
        fireEvent.click(within(settingsSection()).getByRole('button', { name: /Page: Character/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const page =
            useDocumentTypeStore.getState().settings['user-setting-ash00001']!.pages[
                'wod2e-character'
            ];
        const template = useTemplateStore.getState().templates.find(({ id }) => id === page);
        expect(template).toMatchObject({
            systemId: 'wod-2e',
            documentKind: 'character',
            settingId: 'user-setting-ash00001',
        });
    });

    it('creates a character in the setting on its page with the ruleset rules', () => {
        const page = {
            ...systemRegistry
                .getSystem('wod-v5')!
                .defaultTemplates!.find(({ id }) => id === 'v5-core-sheet')!,
            id: 'tpl-ashpage1',
            name: 'Ashen character',
            settingId: 'user-setting-ash00001',
        };
        useTemplateStore.setState({ templates: [page], quarantine: [], defaultOverrides: {} });
        useDocumentTypeStore.setState({
            settings: {
                'user-setting-ash00001': {
                    ...setting('user-setting-ash00001', 'Ashen Realms', 'wod-v5'),
                    pages: { 'v5-character': 'tpl-ashpage1' },
                },
            },
        });
        render(createElement(DocumentCreateDialog, { open: true, onOpenChange: () => {} }));
        const group = screen.getByRole('group', { name: 'Ashen Realms' });
        fireEvent.click(within(group).getByRole('radio', { name: /Mortal/ }));
        // The confirm button is the dialog's last action.
        fireEvent.click(screen.getAllByRole('button').at(-1)!);
        cleanup();

        const [created] = useDocumentStore.getState().documents;
        expect(created!.metadata).toMatchObject({
            settingId: 'user-setting-ash00001',
            templateId: 'tpl-ashpage1',
        });
        const traitPool = systemRegistry.getSystem(created!.systemId)!.dice!.traitPool!;
        expect(traitPool(3, { specialization: false, experienced: false, practiced: false })).toBe(
            '3d10>=6'
        );
        expect(resolveDocumentPolicies(systemRegistry, created!).map(({ id }) => id)).toEqual([
            'dark-pack',
        ]);

        render(createElement(CharacterSheet));
        const views = screen.getByLabelText('View mode') as HTMLSelectElement;
        expect([...views.options].map(({ textContent }) => textContent)).toContain(
            'Ashen character'
        );
        expect(screen.getByRole('complementary', { name: 'Publisher notice' })).toBeTruthy();
    });

    it('shows a WoD 2e setting character without Force content or notices', () => {
        useDocumentTypeStore.setState({
            settings: {
                'user-setting-ash00002': setting('user-setting-ash00002', 'Grim City', 'wod-2e'),
            },
        });
        render(createElement(DocumentCreateDialog, { open: true, onOpenChange: () => {} }));
        const group = screen.getByRole('group', { name: 'Grim City' });
        fireEvent.click(within(group).getByRole('radio', { name: /Character/ }));
        // The confirm button is the dialog's last action.
        fireEvent.click(screen.getAllByRole('button').at(-1)!);
        cleanup();
        const [created] = useDocumentStore.getState().documents;
        expect(created!.metadata.settingId).toBe('user-setting-ash00002');
        expect(resolveDocumentPolicies(systemRegistry, created!)).toEqual([]);
        render(createElement(CharacterSheet));
        expect(screen.queryByText(/Force/)).toBeNull();
        expect(screen.queryByRole('complementary', { name: 'Publisher notice' })).toBeNull();
    });

    it('deletes a setting after confirming its documents and keeps them', () => {
        useDocumentTypeStore.setState({
            settings: {
                'user-setting-ash00001': setting('user-setting-ash00001', 'Ashen Realms', 'wod-2e'),
            },
        });
        useDocumentStore
            .getState()
            .createDocument('wod-2e', 'wod2e-character', { settingId: 'user-setting-ash00001' });
        render(createElement(TemplateLibraryDialog, { open: true, onOpenChange: () => {} }));
        fireEvent.click(within(settingsSection()).getByRole('button', { name: /Delete setting/ }));
        const confirm = screen.getAllByRole('dialog').at(-1)!;
        expect(confirm.textContent).toContain('1 document belongs to it');
        fireEvent.click(within(confirm).getByRole('button', { name: 'Delete setting' }));
        expect(useDocumentTypeStore.getState().settings).toEqual({});
        expect(useDocumentStore.getState().documents).toHaveLength(1);
    });

    it('keeps Hunter pages and bindings away from the V5 mortal', () => {
        const mortalKeys = listDocumentBindings('wod-v5', 'mortal').map(({ key }) => key);
        expect(mortalKeys).toContain('trait:attributes:strength');
        expect(mortalKeys).not.toContain('resource:desperation');
        const hunterKeys = listDocumentBindings('wod-v5', 'character').map(({ key }) => key);
        expect(hunterKeys).toContain('resource:desperation');
    });

    it('rejects core definitions that are missing or belong to a module', () => {
        const hunter = systemRegistry.getDocumentDefinition('wod-v5', 'hunter')!;
        const plugin = {
            ...systemRegistry.getSystem('wod-v5')!,
            id: 'fake-v5',
            documents: [hunter],
            defaultTemplates: [],
            coreDefinitions: ['hunter'],
        } as unknown as SystemPlugin;
        expect(() => new SystemRegistry([plugin])).toThrow(/without a module/);
    });
});
