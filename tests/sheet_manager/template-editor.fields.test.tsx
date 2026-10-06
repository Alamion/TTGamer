// @vitest-environment jsdom

import { collectDraftIssues } from '@site/src/sheet_manager/features/template-editor/issues/draftIssues';
import { duplicateNode } from '@site/src/sheet_manager/features/template-editor/model/clone';
import { createDraftFromTemplate } from '@site/src/sheet_manager/features/template-editor/model/factories';
import { updateField } from '@site/src/sheet_manager/features/template-editor/model/fields';
import { TemplateEditorDialog } from '@site/src/sheet_manager/features/template-editor/TemplateEditorDialog';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import type { ListNode } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema, TEMPLATE_LIMITS } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderEditor } from './helpers/editor';
import { ASHEN_ID, RELICS_ID, resetLibraryStores, seedLibrary } from './helpers/library';
import { ISSUE_MESSAGES, pageFrame, selectInOutline, settings } from './helpers/templateEditor';

// Full editor renders are slow under a loaded test run.
vi.setConfig({ testTimeout: 20_000 });

describe('duplicating elements and locating issues', () => {
    const source = () =>
        CustomTemplateSchema.parse({
            id: 'dup-kit',
            name: 'Dup Kit',
            systemId: 'star-wars-wod',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'stats',
                    type: 'group',
                    title: 'Stats',
                    children: [
                        { id: 'strength', type: 'rating', label: 'Strength', min: 0, max: 5 },
                        { id: 'mood', type: 'text', label: 'Mood', valueKey: 'mood-key' },
                        {
                            id: 'pick',
                            type: 'select',
                            label: 'Pick',
                            options: [{ id: 'one', label: 'One' }],
                        },
                        {
                            id: 'gear',
                            type: 'table',
                            columns: [{ id: 'item', type: 'text', label: 'Item' }],
                        },
                    ],
                },
            ],
        });

    it('copies a subtree with fresh ids and no shared custom values', () => {
        const draft = source();
        const result = duplicateNode(draft, 'stats');
        if (!result.ok) throw new Error(result.error);
        expect(result.draft.children).toHaveLength(2);
        const copy = result.draft.children[1]!;
        expect(copy.id).toBe(result.copyId);
        expect((copy as { title: string }).title).toBe('Stats (copy)');

        const originalIds = new Set<string>();
        const collect = (node: unknown, into: Set<string>) => {
            const record = node as {
                id: string;
                children?: unknown[];
                options?: Array<{ id: string }>;
                columns?: Array<{ id: string }>;
            };
            into.add(record.id);
            record.options?.forEach(({ id }) => into.add(id));
            record.columns?.forEach(({ id }) => into.add(id));
            record.children?.forEach((child) => collect(child, into));
        };
        collect(draft.children[0], originalIds);
        const copyIds = new Set<string>();
        collect(copy, copyIds);
        expect([...copyIds].filter((id) => originalIds.has(id))).toEqual([]);

        const children = (copy as { children: Array<{ label?: string; valueKey?: string }> })
            .children;
        // The bridged trait keeps its coordinate; the custom key is dropped.
        expect(children[0]!.valueKey).toBe('strength');
        expect(children[1]!.valueKey).toBeUndefined();
        expect(
            collectDraftIssues(result.draft, ISSUE_MESSAGES).map(({ message }) => message)
        ).toEqual([]);
    });

    it('refuses a copy past the element limit', () => {
        const draft = source();
        const fields = Array.from({ length: TEMPLATE_LIMITS.nodesPerTemplate - 7 }, (_, index) => ({
            id: `pad-${index}`,
            type: 'text' as const,
            label: `Pad ${index}`,
            required: false,
            compact: false,
            multiline: false,
        }));
        const padded = { ...draft, children: [...draft.children, ...fields] };
        const result = duplicateNode(padded, 'stats');
        expect(result.ok).toBe(false);
    });

    it('attaches the node id to element issues', () => {
        const draft = updateField(source(), 'mood', { label: '' });
        const issues = collectDraftIssues(draft, ISSUE_MESSAGES);
        expect(issues).toContainEqual({
            message: ISSUE_MESSAGES.emptyLabel,
            nodeId: 'mood',
            setting: { group: 'content', key: 'label' },
        });
        const unnamed = collectDraftIssues({ ...draft, name: '' }, ISSUE_MESSAGES);
        expect(unnamed[0]).toEqual({ message: ISSUE_MESSAGES.emptyName });
    });
});

describe('rating settings (spec 014)', () => {
    afterEach(() => {
        cleanup();
        useTemplateStore.setState({ templates: [], quarantine: [] });
    });

    const boxesTemplate = () =>
        CustomTemplateSchema.parse({
            id: 'luck-kit',
            name: 'Luck Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                { id: 'luck', type: 'rating', label: 'Luck', max: 5, presentation: 'boxes' },
            ],
        });

    it('opens a template saved with boxes as dots, without issues', () => {
        const template = boxesTemplate();
        expect(template.children[0]).toMatchObject({ presentation: 'dots' });
        expect(collectDraftIssues(createDraftFromTemplate(template), ISSUE_MESSAGES)).toEqual([]);
    });

    it('toggles every rating switch and shows S/P/E only for dots', () => {
        useTemplateStore.setState({ templates: [boxesTemplate()], quarantine: [] });
        renderEditor(boxesTemplate());
        selectInOutline('luck');
        const panel = settings('luck');
        const style = within(panel).getByLabelText('Presentation') as HTMLSelectElement;
        expect([...style.options].map(({ value }) => value)).toEqual(['dots', 'number']);

        fireEvent.click(within(panel).getByLabelText('Text input (for example a specialization)'));
        fireEvent.click(within(panel).getByLabelText('Show current / maximum'));
        fireEvent.click(within(panel).getByLabelText('Die symbol (roll the rating)'));
        fireEvent.click(within(panel).getByRole('button', { name: 'Specialization' }));
        fireEvent.click(within(panel).getByRole('button', { name: 'Experienced' }));

        const frame = pageFrame('luck');
        expect(within(frame).getByRole('textbox', { name: 'Luck: text' })).toBeTruthy();
        expect(within(frame).getByText('— / 5')).toBeTruthy();
        expect(within(frame).getAllByTitle(/Specialization|Experienced/)).toHaveLength(2);

        fireEvent.change(style, { target: { value: 'number' } });
        expect(
            within(settings('luck')).queryByRole('button', { name: 'Specialization' })
        ).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(useTemplateStore.getState().templates[0]!.children[0]).toMatchObject({
            presentation: 'number',
            textInput: true,
            showNumbers: true,
            dice: true,
            flags: ['specialization', 'experienced'],
        });
    });
});

describe('catalog picker scope (spec 015)', () => {
    beforeEach(seedLibrary);
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    it('groups the setting, ruleset, and shipped catalogs and maps user columns', () => {
        const template = CustomTemplateSchema.parse({
            id: 'tpl-ashenpg1',
            name: 'Ashen page',
            systemId: 'wod-v5',
            documentKind: 'mortal',
            settingId: ASHEN_ID,
            schemaVersion: 3,
            children: [
                {
                    id: 'relic',
                    type: 'select',
                    label: 'Relic',
                    options: [{ id: 'none', label: 'None' }],
                },
                { id: 'relic-power', type: 'number', label: 'Relic power' },
            ],
        });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
        selectInOutline('relic');
        const attach = within(settings('relic')).getByLabelText(
            'Attach catalog'
        ) as HTMLSelectElement;
        const groups = [...attach.querySelectorAll('optgroup')].map((group) => [
            group.label,
            [...group.querySelectorAll('option')].map(({ text }) => text),
        ]);
        expect(groups[0]).toEqual(['This setting', ['Relics']]);
        expect(groups[1]).toEqual(['World of Darkness 5th Edition', ['Common firearms']]);
        expect(groups[2]![0]).toBe('World of Darkness 5th Edition catalogs');
        expect(groups[2]![1]).toContain('Edges');

        fireEvent.change(attach, { target: { value: RELICS_ID } });
        const panel = settings('relic');
        expect(within(panel).getByText('Power')).toBeTruthy();
        expect(within(panel).getByText('Cursed')).toBeTruthy();
    });
});

describe('list entry settings (spec 016)', () => {
    afterEach(() => {
        cleanup();
        useTemplateStore.setState({ templates: [], quarantine: [] });
    });

    const listTemplate = () =>
        CustomTemplateSchema.parse({
            id: 'list-kit',
            name: 'List Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [{ id: 'skills', type: 'list', valueKey: 'skills', title: 'Skills' }],
        });

    function open() {
        useTemplateStore.setState({ templates: [listTemplate()], quarantine: [] });
        renderEditor(listTemplate());
        selectInOutline('skills');
        return settings('skills');
    }

    const saved = () => useTemplateStore.getState().templates[0]!.children[0] as ListNode;

    it('offers eight entry types and hides settings that cannot repeat', () => {
        const panel = open();
        const type = within(panel).getByLabelText('Field type') as HTMLSelectElement;
        expect(type.value).toBe('rating');
        expect([...type.options].map(({ value }) => value)).toEqual([
            'text',
            'number',
            'toggle',
            'select',
            'rating',
            'resource',
            'reference',
            'image',
        ]);
        expect(within(panel).queryByLabelText('Value key')).toBeNull();
        expect(within(panel).queryByText('Required (advisory marker)')).toBeNull();
    });

    it('materializes the legacy entry on the first edit and saves the new type', () => {
        const panel = open();
        fireEvent.change(within(panel).getByLabelText('Field type'), {
            target: { value: 'resource' },
        });
        fireEvent.click(within(settings('skills')).getByLabelText('Entries are named'));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(saved()).toMatchObject({
            named: false,
            item: { id: 'skills-item', type: 'resource' },
        });
    });

    it('asks before saving an entry type that hides stored values', () => {
        useDocumentStore.setState({
            documents: [
                {
                    id: 'doc-skills',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'sentient',
                    schemaVersion: 1,
                    metadata: { title: 'Kira', tags: [] },
                    templateValues: { skills: [{ id: 'e1', label: 'Brawl', value: 2 }] },
                    data: {},
                } as never,
            ],
        });
        const panel = open();
        fireEvent.change(within(panel).getByLabelText('Field type'), {
            target: { value: 'image' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const dialog = screen.getByRole('dialog', { name: 'Change list entries?' });
        expect(dialog.textContent).toContain(
            'Skills: 1 stored value in 1 sheet will no longer be shown.'
        );
        fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cancel' })[0]!);
        expect(saved().item).toBeUndefined();

        fireEvent.change(within(settings('skills')).getByLabelText('Field type'), {
            target: { value: 'number' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(screen.queryByRole('dialog', { name: 'Change list entries?' })).toBeNull();
        expect(saved().item).toMatchObject({ type: 'number' });
        useDocumentStore.setState({ documents: [] });
    });

    it('hides presets and disables the catalog on unnamed lists', () => {
        const panel = open();
        expect(within(panel).queryByText('Preset entries')).not.toBeNull();
        fireEvent.click(within(panel).getByLabelText('Entries are named'));
        const after = settings('skills');
        expect(within(after).queryByText('Preset entries')).toBeNull();
        expect(within(after).getByText('Suggestions need entry names.')).toBeTruthy();
    });
});
