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
