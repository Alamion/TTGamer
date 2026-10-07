// @vitest-environment happy-dom

import {
    createEmptyDraft,
    newGroupNode,
    newSectionNode,
} from '@site/src/sheet_manager/features/template-editor/model/factories';
import { TemplateEditorDialog } from '@site/src/sheet_manager/features/template-editor/TemplateEditorDialog';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderEditor } from './helpers/editor';
import {
    insert,
    outlineChildIds,
    outlineRow,
    pageFrame,
    selectInOutline,
    settings,
} from './helpers/templateEditor';

// Full editor renders are slow under a loaded test run.
vi.setConfig({ testTimeout: 20_000 });

describe('TemplateEditorDialog', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
    });

    afterEach(() => {
        cleanup();
    });

    it('rejects saving while the name is empty and shows the integrity message', () => {
        const onClose = vi.fn();
        render(createElement(TemplateEditorDialog, { base: { kind: 'empty' }, onClose }));

        const save = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
        expect(save.disabled).toBe(true);
        expect(screen.getByRole('alert').textContent).toContain('Template name is required.');
        expect(useTemplateStore.getState().templates).toHaveLength(0);
    });

    it('saves a named draft into the template library', () => {
        const onClose = vi.fn();
        render(createElement(TemplateEditorDialog, { base: { kind: 'empty' }, onClose }));

        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'My Kit' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(onClose).toHaveBeenCalled();
        const templates = useTemplateStore.getState().templates;
        expect(templates).toHaveLength(1);
        expect(templates[0]?.name).toBe('My Kit');
    });

    it('offers insertion points at the root and inside nested containers', () => {
        render(createElement(TemplateEditorDialog, { base: { kind: 'empty' }, onClose: () => {} }));

        const slots = screen.getAllByRole('button', { name: 'Insert an element here' });
        expect(slots.length).toBeGreaterThanOrEqual(2);
        expect(document.querySelector('[data-insert-slot^="root:"]')).not.toBeNull();
    });

    it('asks for confirmation before discarding unsaved edits', () => {
        const onClose = vi.fn();
        render(createElement(TemplateEditorDialog, { base: { kind: 'empty' }, onClose }));

        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Unsaved' } });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByText('Discard changes?')).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
        expect(onClose).toHaveBeenCalled();
        expect(useTemplateStore.getState().templates).toHaveLength(0);
    });

    it('closes without confirmation when nothing changed', () => {
        const onClose = vi.fn();
        render(createElement(TemplateEditorDialog, { base: { kind: 'empty' }, onClose }));

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalled();
        expect(screen.queryByText('Discard changes?')).toBeNull();
    });
});

describe('template editor catalog bindings', () => {
    afterEach(() => {
        cleanup();
    });

    it('attaches a catalog binding to a choice field', () => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
        render(createElement(TemplateEditorDialog, { base: { kind: 'empty' }, onClose: () => {} }));

        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Bound Kit' } });
        // The seeded draft is a section holding one field: select the field in the outline.
        selectInOutline(
            document.querySelectorAll('[data-outline-row]')[1]!.getAttribute('data-outline-row')!
        );

        const typeSelect = screen.getByLabelText('Field type') as HTMLSelectElement;
        fireEvent.change(typeSelect, { target: { value: 'select' } });

        const attach = screen.getByLabelText('Attach catalog') as HTMLSelectElement;
        fireEvent.change(attach, { target: { value: 'melee-weapons' } });

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        const saved = useTemplateStore.getState().templates[0]!;
        const section = saved.children[0]!;
        if (section.type !== 'section' && section.type !== 'group') {
            throw new Error('expected a container');
        }
        const field = section.children[0]!;
        expect(field.type).toBe('select');
        if (field.type === 'select') {
            expect(field.binding?.catalogId).toBe('melee-weapons');
            expect(field.multiple).toBe(false);
        }
    });
});

describe('editor outline and settings (spec 012)', () => {
    afterEach(() => {
        cleanup();
    });

    it('gives every outline row a labelled grip and selects its element', () => {
        let draft = createEmptyDraft('character');
        const seededSection = draft.children[0]!;
        const group = newGroupNode();
        draft = insert(draft, seededSection.id, 0, group);
        draft = { ...draft, name: 'Affordances' };

        renderEditor(draft);

        for (const nodeId of [seededSection.id, group.id]) {
            expect(screen.getByTestId(`grip-${nodeId}`).getAttribute('aria-label')).toBeTruthy();
        }
        selectInOutline(group.id);
        expect(outlineRow(group.id).getAttribute('aria-current')).toBe('true');
        expect(settings(group.id)).not.toBeNull();
        expect(pageFrame(group.id).hasAttribute('data-selected')).toBe(true);
    });

    it('reorders with the move buttons of the selected element', () => {
        let draft = createEmptyDraft('character');
        const second = newSectionNode();
        draft = insert(draft, null, 1, second);
        draft = { ...draft, name: 'Order' };

        renderEditor(draft);

        selectInOutline(second.id);
        fireEvent.click(within(settings(second.id)).getByRole('button', { name: 'Move up' }));
        expect(outlineChildIds('root')).toEqual([second.id, draft.children[0]!.id]);
        expect(outlineRow(second.id).getAttribute('aria-current')).toBe('true');
    });
});

describe('editor layout and presentation controls', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
    });

    afterEach(() => {
        cleanup();
    });

    /** Selects the element and returns its settings pane. */
    const panel = (nodeId: string) => {
        selectInOutline(nodeId);
        return settings(nodeId);
    };

    function openEditor() {
        const template = CustomTemplateSchema.parse({
            id: 'layout-editor-kit',
            name: 'Layout Editor Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'page',
                    type: 'section',
                    title: 'Page',
                    columns: 2,
                    children: [
                        {
                            id: 'identity',
                            type: 'group',
                            title: 'Identity',
                            collapsible: true,
                            children: [
                                { id: 'bio', type: 'text', label: 'Biography', multiline: true },
                                { id: 'total', type: 'formula', label: 'Total', formula: '1 + 1' },
                            ],
                        },
                        {
                            id: 'max-fp',
                            type: 'primitive',
                            bindingKey: 'resource:force-points',
                            label: 'Max Force Points',
                        },
                        { id: 'powers', type: 'list', bindingKey: 'list:forcePowers' },
                    ],
                },
            ],
        });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
    }

    function saved() {
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const [template] = useTemplateStore.getState().templates;
        const find = (id: string): Record<string, unknown> | undefined => {
            let found: Record<string, unknown> | undefined;
            const walk = (nodes: readonly TemplateNode[]) => {
                for (const node of nodes) {
                    if (node.id === id) found = node as unknown as Record<string, unknown>;
                    if (node.type === 'section' || node.type === 'group') walk(node.children);
                }
            };
            walk(template!.children);
            return found;
        };
        return find;
    }

    it('offers column placement only inside multi-column containers', () => {
        openEditor();
        expect(
            within(panel('bio')).queryByRole('radiogroup', { name: 'Column in parent' })
        ).toBeNull();
        const identity = panel('identity');
        fireEvent.click(
            within(
                within(identity).getByRole('radiogroup', { name: 'Column in parent' })
            ).getByRole('radio', { name: '2' })
        );
        expect(saved()('identity')?.column).toBe(2);
    });

    it('sets proportional column widths with a live preview', () => {
        openEditor();
        const section = panel('page');
        fireEvent.click(within(section).getAllByLabelText('Equal column widths')[0]!);
        fireEvent.change(within(section).getAllByLabelText('Column 1 width')[0]!, {
            target: { value: '2' },
        });
        const preview = within(section).getAllByTestId('column-preview')[0]!;
        expect((preview.children[0] as HTMLElement).style.flexGrow).toBe('2');
        expect(saved()('page')?.columnWidths).toEqual([2, 1]);
    });

    it('hides a group title and explains why it can no longer collapse', () => {
        openEditor();
        const group = panel('identity');
        fireEvent.click(within(group).getAllByLabelText('Show title')[0]!);
        const collapsible = within(group).getAllByLabelText(
            'Collapsible (expanded state is remembered)'
        )[0] as HTMLInputElement;
        expect(collapsible.disabled).toBe(true);
        expect(
            within(group).getByText('A group without a visible title cannot be collapsed.')
        ).not.toBeNull();
        expect(saved()('identity')?.hideTitle).toBe(true);
    });

    it('edits field label visibility, placeholder, and formula decoration', () => {
        openEditor();
        fireEvent.click(within(panel('bio')).getByLabelText('Show label'));
        fireEvent.change(within(panel('bio')).getByLabelText('Placeholder text (optional)'), {
            target: { value: 'Character biography...' },
        });
        fireEvent.change(within(panel('total')).getByLabelText('Before value (e.g. ×)'), {
            target: { value: '×' },
        });
        const find = saved();
        expect(find('bio')).toMatchObject({
            hideLabel: true,
            placeholder: 'Character biography...',
        });
        expect(find('total')?.prefix).toBe('×');
    });

    it('edits pool part and minimum on resources, and list title and border', () => {
        openEditor();
        fireEvent.change(within(panel('max-fp')).getByLabelText('Edits'), {
            target: { value: 'max' },
        });
        fireEvent.change(within(panel('max-fp')).getByLabelText('Minimum from'), {
            target: { value: 'self-control' },
        });
        fireEvent.click(within(panel('powers')).getByLabelText('Show list title'));
        fireEvent.click(within(panel('powers')).getByLabelText('Draw a border around the list'));
        const find = saved();
        expect(find('max-fp')).toMatchObject({ part: 'max', minFrom: 'self-control' });
        expect(find('powers')).toMatchObject({ showTitle: true, framed: true });
    });

    it('draws a pool as a tracker and keeps a maximum minimum on the maximum (spec 020)', () => {
        openEditor();
        fireEvent.change(within(panel('max-fp')).getByLabelText('Edits'), {
            target: { value: 'max' },
        });
        fireEvent.change(within(panel('max-fp')).getByLabelText('Minimum from'), {
            target: { value: 'self-control' },
        });
        const display = () => within(settings('max-fp')).getByRole('group', { name: 'Display' });
        fireEvent.click(within(display()).getByRole('button', { name: 'Tracker' }));
        const pane = settings('max-fp');
        expect(within(pane).queryByLabelText('Edits')).toBeNull();
        expect(within(pane).queryByLabelText(/Compact/)).toBeNull();
        expect((within(pane).getByLabelText(/^Maximum at least/) as HTMLInputElement).value).toBe(
            'self-control'
        );
        expect((within(pane).getByLabelText(/^Current at least/) as HTMLInputElement).value).toBe(
            ''
        );
        const look = within(pane).getByRole('group', { name: 'Look' });
        fireEvent.click(within(look).getByRole('button', { name: 'Strip' }));
        fireEvent.change(within(pane).getByLabelText('Current: Mark 1 name'), {
            target: { value: 'Force' },
        });
        let find = saved();
        expect(find('max-fp')).toMatchObject({
            poolTracker: { display: 'strip', marks: { current: { name: 'Force' } } },
            maxMinFrom: 'self-control',
        });
        expect(find('max-fp')?.part).toBeUndefined();
        expect(find('max-fp')?.minFrom).toBeUndefined();

        fireEvent.click(within(display()).getByRole('button', { name: 'Dots' }));
        find = saved();
        expect(find('max-fp')).toMatchObject({ part: 'max', minFrom: 'self-control' });
        expect(find('max-fp')?.poolTracker).toBeUndefined();
        expect(find('max-fp')?.maxMinFrom).toBeUndefined();
    });

    it('offers the tracker display only on pool resources', () => {
        render(
            createElement(TemplateEditorDialog, {
                base: {
                    kind: 'edit',
                    template: CustomTemplateSchema.parse({
                        id: 'rating-kit',
                        name: 'Rating Kit',
                        documentKind: 'character',
                        schemaVersion: 3,
                        children: [
                            {
                                id: 'dark',
                                type: 'primitive',
                                bindingKey: 'resource:dark-side-resistance',
                                label: 'Dark Side',
                            },
                        ],
                    }),
                },
                onClose: () => {},
            })
        );
        expect(within(panel('dark')).queryByRole('group', { name: 'Display' })).toBeNull();
    });
});
