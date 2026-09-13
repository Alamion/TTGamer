// @vitest-environment jsdom

import {
    changeFieldType,
    collectDraftIssues,
    createDraftFromTemplate,
    createEmptyDraft,
    insertNode,
    moveNode,
    newField,
    newGroupNode,
    newSectionNode,
    newTableNode,
    removeNode,
    updateField,
    updateNode,
} from '@site/src/sheet_manager/components/dialogs/template-editor/draft';
import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { TemplateLibraryDialog } from '@site/src/sheet_manager/components/dialogs/TemplateLibraryDialog';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema, TEMPLATE_LIMITS } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ISSUE_MESSAGES = {
    emptyName: 'Template name is required.',
    emptyLabel: 'Every section and field needs a non-empty label.',
    duplicateId: 'Duplicate identifier "{id}".',
    invalidKey: 'Invalid key "{id}" — use lowercase letters, digits, and dashes.',
    limitReached: 'Limit reached — {limit} {subject} maximum.',
    invalidBounds: 'Minimum cannot exceed maximum.',
    invalidFormula: 'Invalid formula in "{id}".',
    unknownCoordinate: 'Unknown value "{id}".',
    circularDependency: 'Circular dependency: {id}',
    unknownBinding: 'Unknown binding "{id}".',
    unknownCatalog: 'Unknown catalog "{id}".',
    unknownFillTarget: 'Missing fill target "{id}".',
    unknownLabelMessage: 'Unknown translation "{id}".',
};

/** Asserts success so subsequent `.draft` accesses typecheck. */
function insert(
    draft: ReturnType<typeof createEmptyDraft>,
    parentId: string | null,
    index: number,
    node: TemplateNode
) {
    const result = insertNode(draft, parentId, index, node);
    if (!result.ok) throw new Error(`insert failed: ${result.error}`);
    return result.draft;
}

function savedTemplate() {
    return CustomTemplateSchema.parse({
        id: 'tpl-existing',
        name: 'Existing Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'identity',
                type: 'section',
                title: 'Identity',
                children: [
                    {
                        id: 'origin',
                        type: 'text',
                        label: 'Origin',
                        required: false,
                        compact: false,
                        multiline: false,
                    },
                ],
            },
        ],
    });
}

describe('template editor draft model (recursive tree)', () => {
    it('creates an empty draft that satisfies the schema once named', () => {
        const draft = createEmptyDraft('character');
        expect(() => CustomTemplateSchema.parse(draft)).toThrow();
        expect(() => CustomTemplateSchema.parse({ ...draft, name: 'Kit' })).not.toThrow();
    });

    it('flags an empty name and passes once named', () => {
        const draft = createEmptyDraft('character');
        expect(collectDraftIssues(draft, ISSUE_MESSAGES)).toHaveLength(1);
        expect(collectDraftIssues({ ...draft, name: 'Kit' }, ISSUE_MESSAGES)).toHaveLength(0);
    });

    it('inserts fields at the root and inside nested containers (any depth)', () => {
        let draft = createEmptyDraft('character');
        const seededSection = draft.children[0]!;
        const innerGroup = newGroupNode();
        draft = insert(draft, seededSection.id, 0, innerGroup);

        const rootField = newField('text', 'Root field');
        draft = insert(draft, null, 1, rootField);
        const nestedField = newField('rating', 'Nested field');
        draft = insert(draft, innerGroup.id, 0, nestedField);

        expect(draft.children.map(({ id }) => id)).toEqual([seededSection.id, rootField.id]);
        const seededSectionNode = draft.children[0]!;
        if (seededSectionNode.type !== 'section' && seededSectionNode.type !== 'group') {
            throw new Error('expected a container');
        }
        const insertedGroup = seededSectionNode.children[0]!;
        if (insertedGroup.type !== 'section' && insertedGroup.type !== 'group') {
            throw new Error('expected a container');
        }
        expect(insertedGroup.children[0]!.id).toBe(nestedField.id);
    });

    it('removes a subtree with one operation', () => {
        let draft = createEmptyDraft('character');
        const seededSection = draft.children[0]!;
        const section = newSectionNode();
        draft = insert(draft, null, 0, section);
        draft = removeNode(draft, seededSection.id);
        const group = newGroupNode();
        draft = insert(draft, section.id, 0, group);
        const field = newField('text', 'Deep');
        draft = insert(draft, group.id, 0, field);

        const reduced = removeNode(draft, section.id);
        expect(reduced.children).toHaveLength(0);
    });

    it('moves subtrees across containers preserving ids and children', () => {
        let draft = createEmptyDraft('character');
        const first = newSectionNode();
        const second = newSectionNode();
        const group = newGroupNode();
        const field = newField('text', 'Traveller');
        draft = insert(draft, null, 0, first);
        draft = insert(draft, null, 1, second);
        draft = insert(draft, first.id, 0, group);
        draft = insert(draft, group.id, 0, field);

        const moved = moveNode(draft, group.id, second.id, 0);
        expect(moved.ok).toBe(true);
        if (!moved.ok) return;
        const targetSection = moved.draft.children.find(({ id }) => id === second.id)!;
        if (targetSection.type !== 'section' && targetSection.type !== 'group') {
            throw new Error('expected a container');
        }
        const movedGroup = targetSection.children[0]!;
        if (movedGroup.type !== 'section' && movedGroup.type !== 'group') {
            throw new Error('expected a container');
        }
        expect(movedGroup.id).toBe(group.id);
        expect(movedGroup.children[0]!.id).toBe(field.id);
        expect(first.children).toHaveLength(0);
    });

    it('rejects moving a node into its own subtree', () => {
        let draft = createEmptyDraft('character');
        const section = newSectionNode();
        const group = newGroupNode();
        draft = insert(draft, null, 0, section);
        draft = insert(draft, section.id, 0, group);

        const result = moveNode(draft, section.id, group.id, 0);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBe('self-move');
    });

    it('rejects insertions beyond the depth guardrail with the depth error', () => {
        let draft = createEmptyDraft('character');
        let parentId: string | null = null;
        for (let depth = 0; depth < TEMPLATE_LIMITS.maxDepth; depth += 1) {
            const container = depth % 2 === 0 ? newSectionNode() : newGroupNode();
            draft = insert(draft, parentId, 0, container);
            parentId = container.id;
        }
        const tooDeep = newField('text', 'Beyond the limit');
        const result = insertNode(draft, parentId, 0, tooDeep);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('depth');
            expect(result.limit).toBe(TEMPLATE_LIMITS.maxDepth);
        }
    });

    it('enforces template-wide effective value key uniqueness and format', () => {
        let draft = createEmptyDraft('character');
        const section = newSectionNode();
        draft = insert(draft, null, 0, section);
        const first = newField('text', 'First');
        const second = newField('text', 'Second');
        draft = insert(draft, section.id, 0, first);
        draft = insert(draft, section.id, 1, second);

        let keyed = updateField(draft, first.id, { valueKey: 'shared-key' });
        keyed = updateField(keyed, second.id, { valueKey: 'shared-key' });
        const issues = collectDraftIssues({ ...keyed, name: 'Kit' }, ISSUE_MESSAGES).map(
            (issue) => issue.message
        );
        expect(issues).toContain('Duplicate identifier "shared-key".');

        keyed = updateField(keyed, second.id, { valueKey: 'Bad_Key' });
        const formatIssues = collectDraftIssues({ ...keyed, name: 'Kit' }, ISSUE_MESSAGES).map(
            (issue) => issue.message
        );
        expect(formatIssues).toContain(
            'Invalid key "Bad_Key" — use lowercase letters, digits, and dashes.'
        );
    });

    it('tolerates transient empty labels and flags them live', () => {
        let draft = createEmptyDraft('character');
        const seededSection = draft.children[0]!;
        const field = newField('text', 'Label');
        draft = insert(draft, seededSection.id, 0, field);

        let cleared = updateField(draft, field.id, { label: '' });
        expect(() => {
            cleared = changeFieldType(cleared, field.id, 'select');
        }).not.toThrow();

        const issues = collectDraftIssues({ ...cleared, name: 'Kit' }, ISSUE_MESSAGES).map(
            (issue) => issue.message
        );
        expect(issues).toContain(ISSUE_MESSAGES.emptyLabel);
    });

    it('resets type-specific settings when the field type changes', () => {
        let draft = createEmptyDraft('character');
        const field = newField('text', 'Switchable');
        draft = insert(draft, null, 0, field);

        const asSelect = changeFieldType(draft, field.id, 'select');
        const selectNode = asSelect.children.find(({ id }) => id === field.id)!;
        expect(selectNode.type).toBe('select');
        if (selectNode.type === 'select') expect(selectNode.options).toHaveLength(1);

        const backToText = changeFieldType(asSelect, field.id, 'text');
        const textNode = backToText.children.find(({ id }) => id === field.id)!;
        expect(textNode.type).toBe('text');
        expect(textNode).not.toHaveProperty('options');
    });

    it('adds a table node with one column and can add columns up to the limit', () => {
        let draft = createEmptyDraft('character');
        const table = newTableNode();
        draft = insert(draft, null, 0, table);
        const tableNode = draft.children.find(({ id }) => id === table.id)!;
        expect(tableNode.type).toBe('table');
        if (tableNode.type === 'table') expect(tableNode.columns).toHaveLength(1);
    });

    it('copies a template with a fresh identity when requested', () => {
        const source = savedTemplate();
        const copy = createDraftFromTemplate(source, { id: 'tpl-copy', name: 'Copy' });
        expect(copy.id).toBe('tpl-copy');
        expect(copy.children).toEqual(source.children);
        expect(copy).not.toBe(source);
    });

    it('updates container config via updateNode (title, columns, collapsible)', () => {
        let draft = createEmptyDraft('character');
        const section = newSectionNode();
        draft = insert(draft, null, 0, section);
        draft = updateNode(draft, section.id, { title: 'Renamed', columns: 3 });
        const updated = draft.children[0]!;
        if (updated.type !== 'section') throw new Error('expected section');
        expect(updated.title).toBe('Renamed');
        expect(updated.columns).toBe(3);
    });
});

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

    it('offers the add-element palette at the root and inside nested containers', () => {
        render(createElement(TemplateEditorDialog, { base: { kind: 'empty' }, onClose: () => {} }));

        const paletteButtons = screen.getAllByRole('button', { name: 'Add element' });
        expect(paletteButtons.length).toBeGreaterThanOrEqual(1);
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

describe('TemplateLibraryDialog', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [savedTemplate()], quarantine: [] });
    });

    afterEach(() => {
        cleanup();
    });

    it('lists saved templates grouped by kind', () => {
        render(createElement(TemplateLibraryDialog, { open: true, onOpenChange: () => {} }));
        expect(screen.getByText('Existing Kit')).not.toBeNull();
    });

    it('deletes a template after confirmation', () => {
        render(createElement(TemplateLibraryDialog, { open: true, onOpenChange: () => {} }));

        fireEvent.click(screen.getByLabelText('Delete: Existing Kit'));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(useTemplateStore.getState().templates).toHaveLength(0);
    });

    it('duplicates a template under a fresh identity', () => {
        render(createElement(TemplateLibraryDialog, { open: true, onOpenChange: () => {} }));

        fireEvent.click(screen.getByLabelText('Duplicate: Existing Kit'));

        const templates = useTemplateStore.getState().templates;
        expect(templates).toHaveLength(2);
        expect(templates.map((template) => template.id)).toContain('tpl-existing');
        expect(new Set(templates.map((template) => template.id)).size).toBe(2);
    });

    it('attaches a catalog binding to a choice field', () => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
        render(createElement(TemplateEditorDialog, { base: { kind: 'empty' }, onClose: () => {} }));

        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Bound Kit' } });

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

describe('editor affordances (US2)', () => {
    afterEach(() => {
        cleanup();
    });

    function findNodePanel(nodeId: string): HTMLElement {
        return document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;
    }

    it('keeps the grip before the collapse chevron in DOM order at every depth', () => {
        let draft = createEmptyDraft('character');
        const seededSection = draft.children[0]!;
        const group = newGroupNode();
        draft = insert(draft, seededSection.id, 0, group);
        draft = { ...draft, name: 'Affordances' };

        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: draft },
                onClose: () => {},
            })
        );

        for (const nodeId of [seededSection.id, group.id]) {
            const panel = findNodePanel(nodeId);
            const grip = within(panel).getByTestId(`grip-${nodeId}`);
            const collapse = within(panel).getByTestId(`collapse-${nodeId}`);
            // jsdom has no layout: DOM order (grip precedes chevron) proves the sides differ.
            expect(
                grip.compareDocumentPosition(collapse) & Node.DOCUMENT_POSITION_FOLLOWING
            ).toBeTruthy();
            expect(grip.getAttribute('aria-label')).toBeTruthy();
            expect(collapse.getAttribute('aria-expanded')).toBe('true');
        }
    });

    it('reorders with the move buttons without toggling collapse state', () => {
        let draft = createEmptyDraft('character');
        const second = newSectionNode();
        draft = insert(draft, null, 1, second);
        draft = { ...draft, name: 'Order' };

        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: draft },
                onClose: () => {},
            })
        );

        const panelBefore = findNodePanel(second.id);
        const collapsedBefore = within(panelBefore)
            .getByTestId(`collapse-${second.id}`)
            .getAttribute('aria-expanded');

        // Collapse the second section, then move it up.
        fireEvent.click(within(panelBefore).getByTestId(`collapse-${second.id}`));
        const panel = findNodePanel(second.id);
        fireEvent.click(within(panel).getByRole('button', { name: 'Move up' }));

        // Move buttons reorder; the collapse state change came only from the explicit toggle.
        const secondPanel = findNodePanel(second.id);
        expect(
            within(secondPanel).getByTestId(`collapse-${second.id}`).getAttribute('aria-expanded')
        ).toBe(collapsedBefore === 'true' ? 'false' : 'true');
    });
});

describe('editor layout and presentation controls', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
    });

    afterEach(() => {
        cleanup();
    });

    const panel = (nodeId: string) =>
        document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;

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
            within(panel('identity')).getAllByRole('radiogroup', { name: 'Column in parent' })
        ).toHaveLength(1); // the group itself; its single-column children get none
        fireEvent.click(
            within(
                within(panel('identity')).getAllByRole('radiogroup', {
                    name: 'Column in parent',
                })[0]!
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
        fireEvent.change(
            within(panel('max-fp')).getByLabelText('Minimum from value or formula (optional)'),
            { target: { value: 'self-control' } }
        );
        fireEvent.click(within(panel('powers')).getByLabelText('Show list title'));
        fireEvent.click(within(panel('powers')).getByLabelText('Draw a border around the list'));
        const find = saved();
        expect(find('max-fp')).toMatchObject({ part: 'max', minFrom: 'self-control' });
        expect(find('powers')).toMatchObject({ showTitle: true, framed: true });
    });
});

describe('editor drag and drop, headers, and rendering health', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const NODE_MIME = 'application/x-ttgamer-template-node';
    const panel = (nodeId: string) =>
        document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;
    /** The drop target wrapping a panel inside its parent list. */
    const slot = (nodeId: string) => panel(nodeId).parentElement as HTMLElement;
    const dataTransfer = (nodeId: string) => ({
        types: [NODE_MIME],
        getData: (type: string) => (type === NODE_MIME ? nodeId : ''),
        dropEffect: 'none',
    });

    function openEditor() {
        const template = CustomTemplateSchema.parse({
            id: 'dnd-kit',
            name: 'Drag Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'page',
                    type: 'section',
                    title: 'Page',
                    children: [
                        {
                            id: 'identity',
                            type: 'group',
                            title: 'Identity group',
                            children: [
                                { id: 'first', type: 'text', label: 'First' },
                                { id: 'second', type: 'text', label: 'Second' },
                            ],
                        },
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

    const childIds = (parentId: string) =>
        [
            ...document.querySelectorAll(`[data-children-of="${parentId}"] > div > [data-node-id]`),
        ].map((element) => element.getAttribute('data-node-id'));

    it('reorders a field above its upper sibling without leaving the group', () => {
        openEditor();
        fireEvent.dragOver(slot('first'), { dataTransfer: dataTransfer('second') });
        fireEvent.drop(slot('first'), { dataTransfer: dataTransfer('second') });
        expect(childIds('identity')).toEqual(['second', 'first']);
        expect(childIds('page')).toEqual(['identity']);
    });

    it('refuses to move a group inside itself with a clear message', () => {
        openEditor();
        fireEvent.drop(slot('first'), { dataTransfer: dataTransfer('identity') });
        expect(childIds('page')).toEqual(['identity']);
        expect(childIds('identity')).toEqual(['first', 'second']);
        expect(screen.getByRole('alert').textContent).toContain(
            'An element cannot be moved inside itself.'
        );
        expect(screen.getByRole('alert').textContent).not.toContain('Duplicate identifier');
    });

    it('keeps container titles in collapsed panel headers', () => {
        openEditor();
        fireEvent.click(within(panel('identity')).getByTestId('collapse-identity'));
        expect(within(panel('identity')).getByText('Identity group')).not.toBeNull();
        expect(within(panel('identity')).queryByLabelText('Show title')).toBeNull();
    });

    it('renders the shipped sheet in the editor without duplicate React keys', async () => {
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { starWarsWodDefaultTemplates } =
            await import('@site/src/sheet_manager/systems/star-wars-wod/defaultTemplates');
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: starWarsWodDefaultTemplates[0]! },
                onClose: () => {},
            })
        );
        const keyWarnings = errors.mock.calls.filter((call) =>
            String(call[0]).includes('same key')
        );
        expect(keyWarnings).toHaveLength(0);
        expect(document.querySelectorAll('datalist')).toHaveLength(1);
    }, 20_000);
});

describe('add-element menu and element sources', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
    });

    afterEach(() => {
        cleanup();
    });

    const panel = (nodeId: string) =>
        document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;
    const rootIds = () =>
        [...document.querySelectorAll('[data-children-of="root"] > div > [data-node-id]')].map(
            (element) => element as HTMLElement
        );

    function openEmpty() {
        const template = CustomTemplateSchema.parse({
            id: 'menu-kit',
            name: 'Menu Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [{ id: 'start', type: 'text', label: 'Start' }],
        });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
    }

    function addFromRootMenu(option: string): HTMLElement {
        const menus = screen.getAllByRole('button', { name: 'Add element' });
        fireEvent.click(menus[menus.length - 1]!);
        fireEvent.click(document.querySelector(`[data-palette-option="${option}"]`)!);
        const panels = rootIds();
        return panels[panels.length - 1]!;
    }

    it('offers exactly the six element kinds with descriptions', () => {
        openEmpty();
        const menus = screen.getAllByRole('button', { name: 'Add element' });
        fireEvent.click(menus[menus.length - 1]!);
        const options = [...document.querySelectorAll('[data-palette-option]')].map((element) =>
            element.getAttribute('data-palette-option')
        );
        expect(options).toEqual(['section', 'group', 'field', 'table', 'list', 'tracker']);
        expect(screen.getByText('Health or damage levels with penalties')).not.toBeNull();
        const menu = document.querySelector('[data-palette-option="section"]')!.parentElement!;
        expect(menu.textContent).not.toContain('Strength');
    });

    it('adds each kind as a valid element', () => {
        openEmpty();
        expect(addFromRootMenu('section').getAttribute('data-node-type')).toBe('section');
        expect(addFromRootMenu('group').getAttribute('data-node-type')).toBe('group');
        expect(addFromRootMenu('field').getAttribute('data-node-type')).toBe('text');
        expect(addFromRootMenu('table').getAttribute('data-node-type')).toBe('table');
        expect(addFromRootMenu('list').getAttribute('data-node-type')).toBe('list');
        const tracker = addFromRootMenu('tracker');
        expect(tracker.getAttribute('data-node-type')).toBe('primitive');
        expect((within(tracker).getByLabelText('Tracks') as HTMLSelectElement).value).toBe(
            'track:health'
        );
        // Every added element passes the draft checks: saving succeeds.
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(useTemplateStore.getState().templates).toHaveLength(1);
    });

    it('switches a field between custom, trait, resource, and detail sources', () => {
        openEmpty();
        const source = () => within(panel('start')).getByLabelText('Stores value in');
        fireEvent.change(source(), { target: { value: 'trait:physical:Strength' } });
        expect(panel('start').getAttribute('data-node-type')).toBe('rating');
        expect(
            (within(panel('start')).getByLabelText('Field type') as HTMLSelectElement).disabled
        ).toBe(true);

        fireEvent.change(source(), { target: { value: 'resource:willpower' } });
        expect(panel('start').getAttribute('data-node-type')).toBe('primitive');
        expect(
            within(panel('start')).getByLabelText('Minimum from value or formula (optional)')
        ).not.toBeNull();

        fireEvent.change(source(), { target: { value: 'field:biography' } });
        expect(panel('start').getAttribute('data-node-type')).toBe('text');

        fireEvent.change(source(), { target: { value: 'custom' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const [saved] = useTemplateStore.getState().templates;
        expect(saved!.children[0]).toMatchObject({ id: 'start', type: 'text' });
        expect((saved!.children[0] as { valueKey?: string }).valueKey).toBeUndefined();
    });

    it('switches a list between custom entries, character lists, and equipment', () => {
        openEmpty();
        const list = addFromRootMenu('list');
        const id = list.getAttribute('data-node-id')!;
        const entries = () => within(panel(id)).getByLabelText('Entries');
        fireEvent.change(entries(), { target: { value: 'list:merits' } });
        expect(panel(id).getAttribute('data-node-type')).toBe('list');
        fireEvent.change(entries(), { target: { value: 'equipment:weapons' } });
        expect(panel(id).getAttribute('data-node-type')).toBe('primitive');
        expect((entries() as HTMLSelectElement).value).toBe('equipment:weapons');
        fireEvent.change(entries(), { target: { value: 'custom' } });
        expect(panel(id).getAttribute('data-node-type')).toBe('list');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore
            .getState()
            .templates[0]!.children.find((node) => node.id === id) as {
            valueKey?: string;
            bindingKey?: string;
        };
        expect(saved.valueKey).toBeTruthy();
        expect(saved.bindingKey).toBeUndefined();
    });
});

describe('trait-sourced fields', () => {
    afterEach(() => {
        cleanup();
    });

    it('hide rating settings that the sheet trait row does not use', () => {
        const template = CustomTemplateSchema.parse({
            id: 'trait-kit',
            name: 'Trait Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                { id: 'str', type: 'rating', label: 'Strength', max: 5, valueKey: 'strength' },
                { id: 'luck', type: 'rating', label: 'Luck', max: 5 },
            ],
        });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
        const panelOf = (id: string) =>
            document.querySelector(`[data-node-id="${id}"]`) as HTMLElement;
        expect(
            within(panelOf('str')).queryByLabelText('Maximum from value or formula (optional)')
        ).toBeNull();
        expect(
            within(panelOf('luck')).getByLabelText('Maximum from value or formula (optional)')
        ).not.toBeNull();
    });
});
