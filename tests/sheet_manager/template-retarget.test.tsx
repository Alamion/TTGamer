// @vitest-environment jsdom

import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { listTemplateTargetGroups } from '@site/src/sheet_manager/features/sheet/data/documentLabels';
import { planTemplateRetarget } from '@site/src/sheet_manager/features/sheet/data/templateRetarget';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { UserDocumentType, UserSetting } from '@site/src/sheet_manager/systems/userTypes';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEditorStores } from './helpers/editor';

// Full editor renders are slow under a loaded test run.
vi.setConfig({ testTimeout: 20_000 });

const NOW = '2026-09-25T10:00:00.000Z';
const TYPE_ID = 'user-org00001';
const SETTING_ID = 'user-setting-ash00001';

function page(
    id: string,
    target: { systemId: string; documentKind: string; settingId?: string },
    children: unknown[] = [{ id: 'motto', type: 'text', label: 'Motto' }]
): CustomTemplate {
    return CustomTemplateSchema.parse({
        id,
        name: `Page ${id}`,
        schemaVersion: 3,
        ...target,
        children,
    });
}

const orgTarget = { systemId: 'star-wars-wod', documentKind: TYPE_ID };
const orgType: UserDocumentType = {
    id: TYPE_ID,
    name: 'Organization',
    owner: { systemId: 'star-wars-wod' } as UserDocumentType['owner'],
    defaultTemplateId: 'tpl-orgpage1',
    createdAt: NOW,
    updatedAt: NOW,
};
const ashen: UserSetting = {
    id: SETTING_ID,
    name: 'Ashen Realms',
    systemId: 'wod-v5' as UserSetting['systemId'],
    pages: {},
    createdAt: NOW,
    updatedAt: NOW,
};

function orgDocument(id: string, templateId?: string) {
    return {
        id,
        kind: TYPE_ID,
        systemId: 'star-wars-wod',
        definitionId: TYPE_ID,
        schemaVersion: 1,
        metadata: { title: id, tags: [], ...(templateId ? { templateId } : {}) },
        templateValues: {},
        data: {},
    };
}

function install(templates: CustomTemplate[], settings: Record<string, UserSetting> = {}) {
    useTemplateStore.setState({ templates, quarantine: [], defaultOverrides: {} });
    useDocumentTypeStore.setState({ types: { [TYPE_ID]: orgType }, settings });
}

describe('planning a template retarget (T-070)', () => {
    beforeEach(() => resetEditorStores());
    afterEach(() => useDocumentTypeStore.setState({ types: {}, settings: {} }));

    const state = (
        templates: CustomTemplate[],
        settings: Record<string, UserSetting> = {},
        documents: ReturnType<typeof orgDocument>[] = []
    ) => ({ documents, settings, types: { [TYPE_ID]: orgType }, templates });

    it('releases assignments the moved page can no longer render', () => {
        const moved = page('tpl-orgpage1', {
            systemId: 'star-wars-wod',
            documentKind: 'character',
        });
        const plan = planTemplateRetarget(
            moved,
            state([page('tpl-orgpage1', orgTarget)], {}, [
                orgDocument('doc-assigned', 'tpl-orgpage1'),
                orgDocument('doc-default'),
            ])
        );
        expect(plan.documentIds).toEqual(['doc-assigned']);
    });

    it('gives a type another of its pages when its default page leaves', () => {
        const moved = page('tpl-orgpage1', {
            systemId: 'star-wars-wod',
            documentKind: 'character',
        });
        const plan = planTemplateRetarget(
            moved,
            state([page('tpl-orgpage1', orgTarget), page('tpl-orgpage2', orgTarget)])
        );
        expect(plan.types).toMatchObject([{ id: TYPE_ID, defaultTemplateId: 'tpl-orgpage2' }]);
    });

    it('moves a setting page: the old setting forgets it, the new one adopts it', () => {
        const other: UserSetting = { ...ashen, id: 'user-setting-grim0001', name: 'Grim' };
        const before = { ...other, pages: { 'v5-character': 'tpl-mortal1' } };
        const moved = page('tpl-mortal1', {
            systemId: 'wod-v5',
            documentKind: 'mortal',
            settingId: SETTING_ID,
        });
        const plan = planTemplateRetarget(
            moved,
            state([moved], { [SETTING_ID]: ashen, [before.id]: before })
        );
        const pagesById = Object.fromEntries(plan.settings.map(({ id, pages }) => [id, pages]));
        expect(pagesById).toEqual({
            [SETTING_ID]: { 'v5-character': 'tpl-mortal1' },
            'user-setting-grim0001': {},
        });
    });

    it('keeps a setting page that already has one', () => {
        const withPage = { ...ashen, pages: { 'v5-character': 'tpl-other' } };
        const moved = page('tpl-mortal1', {
            systemId: 'wod-v5',
            documentKind: 'mortal',
            settingId: SETTING_ID,
        });
        expect(
            planTemplateRetarget(moved, state([moved], { [SETTING_ID]: withPage })).settings
        ).toEqual([]);
    });

    it('lists user settings with their core definitions and own types as targets', () => {
        install([page('tpl-orgpage1', orgTarget)], { [SETTING_ID]: ashen });
        const groups = listTemplateTargetGroups();
        const ashenGroup = groups.find(({ label }) => label === 'Ashen Realms');
        expect(ashenGroup?.options.map(({ value }) => value)).toEqual([
            `wod-v5/mortal/${SETTING_ID}`,
        ]);
        const starWars = groups.find(({ options }) =>
            options.some(({ value }) => value === `star-wars-wod/${TYPE_ID}`)
        );
        expect(starWars?.options.map(({ value }) => value)).toContain('star-wars-wod/character');
    });
});

describe('moving a template in the editor (T-070)', () => {
    beforeEach(() => resetEditorStores());
    afterEach(() => {
        cleanup();
        useDocumentTypeStore.setState({ types: {}, settings: {} });
    });

    const targetSelect = () => screen.getByLabelText('Type and setting') as HTMLSelectElement;

    it('confirms before releasing documents, then moves the page and its assignments', () => {
        const pages = [page('tpl-orgpage1', orgTarget), page('tpl-orgpage2', orgTarget)];
        install(pages);
        useDocumentStore.setState({
            documents: [orgDocument('doc-assigned', 'tpl-orgpage1') as never],
            currentDocumentId: 'doc-assigned',
        });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: pages[0]! },
                onClose: () => {},
            })
        );
        fireEvent.change(targetSelect(), { target: { value: 'star-wars-wod/character' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        const confirm = screen.getAllByRole('dialog').at(-1)!;
        expect(confirm.textContent).toContain('1 document opens on this page');
        fireEvent.click(within(confirm).getByRole('button', { name: 'Move' }));

        const saved = useTemplateStore.getState().templates.find(({ id }) => id === 'tpl-orgpage1');
        expect(saved?.documentKind).toBe('character');
        expect(useDocumentStore.getState().documents[0]!.metadata.templateId).toBeUndefined();
        expect(useDocumentTypeStore.getState().types[TYPE_ID]?.defaultTemplateId).toBe(
            'tpl-orgpage2'
        );
    });

    it('reports bindings the new target lacks and blocks the save', () => {
        const bound = page('tpl-bound', { systemId: 'star-wars-wod', documentKind: 'character' }, [
            { id: 'name', type: 'primitive', bindingKey: 'field:name', compact: false },
        ]);
        install([bound]);
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: bound },
                onClose: () => {},
            })
        );
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', false);
        fireEvent.change(targetSelect(), { target: { value: `star-wars-wod/${TYPE_ID}` } });
        expect(screen.getByText(/Unknown data binding "field:name"/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
    });

    it('keeps shipped pages and caller-owned pages where they are', () => {
        const shipped = systemRegistry.getSystem('star-wars-wod')!.defaultTemplates![0]!;
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: shipped },
                onClose: () => {},
            })
        );
        expect(targetSelect().disabled).toBe(true);
        cleanup();

        install([page('tpl-orgpage1', orgTarget)]);
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: page('tpl-orgpage1', orgTarget) },
                lockTarget: true,
                onClose: () => {},
            })
        );
        expect(targetSelect().disabled).toBe(true);
    });
});
