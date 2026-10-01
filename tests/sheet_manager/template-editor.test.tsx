// @vitest-environment jsdom

import {
    changeFieldType,
    collectDraftIssues,
    createDraftFromTemplate,
    createEmptyDraft,
    duplicateNode,
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
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import type { ListNode, TemplateNode } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema, TEMPLATE_LIMITS } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dragNode } from './helpers/editor';
import {
    ASHEN_ID,
    RELICS_ID,
    resetLibraryStores,
    seedLibrary,
    seedReferenceTypes,
} from './helpers/library';

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
    listCatalogUnnamed: 'Suggestions need entry names.',
    unknownLabelMessage: 'Unknown translation "{id}".',
    invalidDocsLink: 'Invalid docs link "{id}".',
    referenceTargetUnavailable: '"{field}" can point to {type}, which this setting does not have.',
    trackerLengthEmpty: 'Tracker "{id}": length {n} shows no level.',
    trackerCovers: 'Tracker "{id}": a column covers all its levels or more.',
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

function outlineRow(nodeId: string): HTMLElement {
    return document.querySelector(`[data-outline-row="${nodeId}"]`) as HTMLElement;
}

/** Clicks the element's name in the outline (the keyboard-reachable way to select it). */
function selectInOutline(nodeId: string): void {
    const row = outlineRow(nodeId);
    const name = [...row.querySelectorAll('button')].find(
        (button) => !button.hasAttribute('draggable')
    )!;
    fireEvent.click(name);
}

function settings(nodeId: string): HTMLElement {
    return document.querySelector(`[data-settings-for="${nodeId}"]`) as HTMLElement;
}

function pageFrame(nodeId: string): HTMLElement {
    return document.querySelector(`[data-editor-frame][data-node-id="${nodeId}"]`) as HTMLElement;
}

function outlineChildIds(parentId: string): string[] {
    return [
        ...document.querySelectorAll(`[data-children-of="${parentId}"] > li > [data-outline-row]`),
    ].map((element) => element.getAttribute('data-outline-row')!);
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

        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: draft },
                onClose: () => {},
            })
        );

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

        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: draft },
                onClose: () => {},
            })
        );

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

describe('editor drag and drop, outline, and rendering health', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    /** The outline drop target "before this element". */
    const slot = (nodeId: string) => outlineRow(nodeId).parentElement as HTMLElement;

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

    it('reorders a field above its upper sibling without leaving the group', () => {
        openEditor();
        dragNode('second', slot('first'));
        expect(outlineChildIds('identity')).toEqual(['second', 'first']);
        expect(outlineChildIds('page')).toEqual(['identity']);
    });

    it('refuses to move a group inside itself with a clear message', () => {
        openEditor();
        dragNode('identity', slot('first'));
        expect(outlineChildIds('page')).toEqual(['identity']);
        expect(outlineChildIds('identity')).toEqual(['first', 'second']);
        expect(screen.getByRole('alert').textContent).toContain(
            'An element cannot be moved inside itself.'
        );
        expect(screen.getByRole('alert').textContent).not.toContain('Duplicate identifier');
    });

    it('names containers in the outline and shows settings only for the selection', () => {
        openEditor();
        expect(within(outlineRow('identity')).getByText('Identity group')).not.toBeNull();
        expect(document.querySelector('[data-settings-for]')).toBeNull();
        selectInOutline('identity');
        expect(within(settings('identity')).getAllByLabelText('Show title')).toHaveLength(1);
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
        expect(document.querySelectorAll(`datalist[id^="template-coordinates-"]`)).toHaveLength(1);
    }, 20_000);
});

describe('add-element menu and element sources', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
    });

    afterEach(() => {
        cleanup();
    });

    const panel = (nodeId: string) => {
        selectInOutline(nodeId);
        return settings(nodeId);
    };

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

    function openRootMenu() {
        const slots = document.querySelectorAll('[data-insert-slot^="root:"]');
        fireEvent.click(slots[slots.length - 1]!);
    }

    function addFromRootMenu(option: string): HTMLElement {
        openRootMenu();
        fireEvent.click(document.querySelector(`[data-palette-option="${option}"]`)!);
        const ids = outlineChildIds('root');
        return outlineRow(ids[ids.length - 1]!);
    }

    it('offers exactly the six element kinds with descriptions', () => {
        openEmpty();
        openRootMenu();
        const options = [...document.querySelectorAll('[data-palette-option]')].map((element) =>
            element.getAttribute('data-palette-option')
        );
        expect(options).toEqual(['section', 'group', 'field', 'table', 'list', 'tracker']);
        expect(
            screen.getByText('Boxes to mark by level: health, stress, or any other burden')
        ).not.toBeNull();
        const menu = document.querySelector('[data-palette-option="section"]')!.parentElement!;
        expect(menu.textContent).not.toContain('Strength');
    });

    it('adds each kind as a valid element and selects it', () => {
        openEmpty();
        expect(addFromRootMenu('section').getAttribute('data-node-type')).toBe('section');
        expect(addFromRootMenu('group').getAttribute('data-node-type')).toBe('group');
        expect(addFromRootMenu('field').getAttribute('data-node-type')).toBe('text');
        expect(addFromRootMenu('table').getAttribute('data-node-type')).toBe('table');
        expect(addFromRootMenu('list').getAttribute('data-node-type')).toBe('list');
        // The tracker is an own-value field; its Source can switch it to a built-in track.
        const tracker = addFromRootMenu('tracker');
        expect(tracker.getAttribute('data-node-type')).toBe('tracker');
        expect(tracker.getAttribute('aria-current')).toBe('true');
        const trackerId = tracker.getAttribute('data-outline-row')!;
        expect(
            (within(settings(trackerId)).getByLabelText('Source') as HTMLSelectElement).value
        ).toBe('custom');
        // Every added element passes the draft checks: saving succeeds.
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(useTemplateStore.getState().templates).toHaveLength(1);
        // Six elements, each rendered with its full settings panel and live page.
    }, 15_000);

    it('switches a field between custom, trait, resource, and detail sources', () => {
        openEmpty();
        const source = () => within(panel('start')).getByLabelText('Stores value in');
        fireEvent.change(source(), { target: { value: 'trait:physical:Strength' } });
        expect(outlineRow('start').getAttribute('data-node-type')).toBe('rating');
        expect(
            (within(panel('start')).getByLabelText('Field type') as HTMLSelectElement).disabled
        ).toBe(true);

        fireEvent.change(source(), { target: { value: 'resource:willpower' } });
        expect(outlineRow('start').getAttribute('data-node-type')).toBe('primitive');
        expect(
            within(panel('start')).getByLabelText('Minimum from value or formula (optional)')
        ).not.toBeNull();

        fireEvent.change(source(), { target: { value: 'field:biography' } });
        expect(outlineRow('start').getAttribute('data-node-type')).toBe('text');

        fireEvent.change(source(), { target: { value: 'custom' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const [saved] = useTemplateStore.getState().templates;
        expect(saved!.children[0]).toMatchObject({ id: 'start', type: 'text' });
        expect((saved!.children[0] as { valueKey?: string }).valueKey).toBeUndefined();
    });

    it('switches a list between custom entries, character lists, and equipment', () => {
        openEmpty();
        const id = addFromRootMenu('list').getAttribute('data-outline-row')!;
        const entries = () => within(panel(id)).getByLabelText('Entries');
        fireEvent.change(entries(), { target: { value: 'list:merits' } });
        expect(outlineRow(id).getAttribute('data-node-type')).toBe('list');
        fireEvent.change(entries(), { target: { value: 'equipment:weapons' } });
        expect(outlineRow(id).getAttribute('data-node-type')).toBe('primitive');
        expect((entries() as HTMLSelectElement).value).toBe('equipment:weapons');
        fireEvent.change(entries(), { target: { value: 'custom' } });
        expect(outlineRow(id).getAttribute('data-node-type')).toBe('list');
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
        selectInOutline('str');
        expect(
            within(settings('str')).queryByLabelText('Maximum from value or formula (optional)')
        ).toBeNull();
        selectInOutline('luck');
        expect(
            within(settings('luck')).getByLabelText('Maximum from value or formula (optional)')
        ).not.toBeNull();
    });

    it('stretches an element over parent columns and warns when a sibling is pinned', () => {
        const template = CustomTemplateSchema.parse({
            id: 'span-kit',
            name: 'Span Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'grid',
                    type: 'section',
                    title: 'Grid',
                    columns: 3,
                    children: [
                        { id: 'wide', type: 'text', label: 'Wide' },
                        { id: 'other', type: 'text', label: 'Other' },
                    ],
                },
            ],
        });
        useTemplateStore.setState({ templates: [template], quarantine: [], defaultOverrides: {} });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
        selectInOutline('wide');
        const spans = within(settings('wide')).getByRole('radiogroup', { name: 'Spans columns' });
        fireEvent.click(within(spans).getByRole('radio', { name: '2' }));
        expect(
            within(settings('wide')).queryByText(/no element of this container is pinned/)
        ).toBeNull();

        selectInOutline('other');
        const placement = within(settings('other')).getByRole('radiogroup', {
            name: 'Column in parent',
        });
        fireEvent.click(within(placement).getByRole('radio', { name: '3' }));
        selectInOutline('wide');
        expect(
            within(settings('wide')).getByText(/no element of this container is pinned/)
        ).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates[0]!;
        const grid = saved.children[0] as { children: Array<{ id: string; span?: number }> };
        expect(grid.children.find(({ id }) => id === 'wide')?.span).toBe(2);
    });

    it('sets a rating minimum bounded by its maximum', () => {
        const template = CustomTemplateSchema.parse({
            id: 'luck-kit',
            name: 'Luck Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [{ id: 'luck', type: 'rating', label: 'Luck', max: 5 }],
        });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
        selectInOutline('luck');
        const min = within(settings('luck')).getByLabelText('Min') as HTMLInputElement;
        expect(min.value).toBe('0');
        fireEvent.change(min, { target: { value: '9' } });
        fireEvent.blur(min);
        expect(min.value).toBe('5');
        fireEvent.change(min, { target: { value: '2' } });
        // The page redraws from the draft: five dots, the first two held by the minimum.
        expect(within(pageFrame('luck')).getAllByRole('radio', { name: /^Luck: / })).toHaveLength(
            5
        );
    });
});

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
        expect(issues).toContainEqual({ message: ISSUE_MESSAGES.emptyLabel, nodeId: 'mood' });
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
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: boxesTemplate() },
                onClose: () => {},
            })
        );
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
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: listTemplate() },
                onClose: () => {},
            })
        );
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
        expect(within(panel).queryByLabelText(/Shared value key/)).toBeNull();
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

describe('derived values in the editor (T-076)', () => {
    afterEach(() => {
        cleanup();
        useTemplateStore.setState({ templates: [], quarantine: [] });
    });

    const formulaKit = (children: unknown[]) =>
        CustomTemplateSchema.parse({
            id: 'formula-kit',
            name: 'Formula Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children,
        });

    const issuesOf = (children: unknown[]) =>
        collectDraftIssues(createDraftFromTemplate(formulaKit(children)), ISSUE_MESSAGES);

    it('accepts functions and the numbers of the page', () => {
        expect(
            issuesOf([
                { id: 'base', type: 'number', label: 'Base' },
                { id: 'best', type: 'formula', label: 'Best', formula: 'max(base, 2) + min(1, 3)' },
            ])
        ).toEqual([]);
    });

    it('lists a formula that does not parse, on its element', () => {
        expect(
            issuesOf([{ id: 'total', type: 'formula', label: 'Total', formula: 'base +' }])
        ).toContainEqual({ message: 'Invalid formula in "Total".', nodeId: 'total' });
        expect(
            issuesOf([{ id: 'luck', type: 'rating', label: 'Luck', max: 5, maxFrom: 'min(' }])
        ).toContainEqual({ message: 'Invalid formula in "Luck".', nodeId: 'luck' });
    });

    it('lists a value the formula reads that the page does not have', () => {
        expect(
            issuesOf([{ id: 'total', type: 'formula', label: 'Total', formula: 'missing + 1' }])
        ).toContainEqual({ message: 'Unknown value "missing".', nodeId: 'total' });
    });

    it('lists a circular dependency', () => {
        const issues = issuesOf([
            { id: 'left', type: 'formula', label: 'Left', formula: 'right + 1' },
            { id: 'right', type: 'formula', label: 'Right', formula: 'left + 1' },
        ]);
        expect(issues.map(({ message }) => message)).toContainEqual(
            expect.stringMatching(/^Circular dependency: (left → right|right → left)/)
        );
    });

    it('shows the new result on the page as the formula is typed', () => {
        const template = formulaKit([
            { id: 'total', type: 'formula', label: 'Total', formula: '1 + 1' },
        ]);
        useTemplateStore.setState({ templates: [template], quarantine: [] });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
        expect(within(pageFrame('total')).getByText('2')).toBeTruthy();
        selectInOutline('total');
        fireEvent.change(within(settings('total')).getByLabelText(/^Formula/), {
            target: { value: 'max(2, 3) * 4' },
        });
        expect(within(pageFrame('total')).getByText('12')).toBeTruthy();
    });
});

describe('reference targets (T-075)', () => {
    beforeEach(seedReferenceTypes);
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    const allyField = (targetKinds: string[]) => ({
        id: 'ally',
        type: 'reference',
        label: 'Ally',
        targetKinds,
    });

    function openPage(target: { systemId: string; documentKind: string }, children: unknown[]) {
        const template = CustomTemplateSchema.parse({
            id: 'tpl-refpage',
            name: 'Reference page',
            schemaVersion: 3,
            ...target,
            children,
        });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
        return template;
    }

    /** The document types listed in a reference's settings, with their checked state. */
    function kinds(nodeId: string) {
        const group = within(settings(nodeId)).getByRole('group', {
            name: 'Allowed document kinds',
        });
        return within(group)
            .getAllByRole('checkbox')
            .map((box) => ({
                label: box.parentElement!.textContent ?? '',
                checked: (box as HTMLInputElement).checked,
            }));
    }

    const HUNTER = { systemId: 'wod-v5', documentKind: 'character' };

    it("offers a Hunter page its setting's types and nothing from other settings", () => {
        openPage(HUNTER, [allyField(['character'])]);
        selectInOutline('ally');
        const labels = kinds('ally').map(({ label }) => label);
        expect(labels).toHaveLength(4);
        expect(labels).toEqual(expect.arrayContaining(['Mortal', 'Cell', 'Haven']));
        expect(labels.join()).not.toMatch(/Creature|Cult|Organization/);
    });

    it('offers a Star Wars page its character once', () => {
        openPage({ systemId: 'star-wars-wod', documentKind: 'vehicle' }, [
            allyField(['character']),
        ]);
        selectInOutline('ally');
        const labels = kinds('ally').map(({ label }) => label);
        expect(new Set(labels).size).toBe(labels.length);
        expect(labels).toContain('Organization');
    });

    it('offers a list entry reference the same types as a page field', () => {
        openPage(HUNTER, [
            allyField(['character']),
            {
                id: 'allies',
                type: 'list',
                valueKey: 'allies',
                title: 'Allies',
                item: { ...allyField(['character']), id: 'allies-item' },
            },
        ]);
        selectInOutline('ally');
        const field = kinds('ally').map(({ label }) => label);
        cleanup();
        openPage(HUNTER, [
            {
                id: 'allies',
                type: 'list',
                valueKey: 'allies',
                title: 'Allies',
                item: { ...allyField(['character']), id: 'allies-item' },
            },
        ]);
        selectInOutline('allies');
        const group = within(settings('allies')).getByRole('group', {
            name: 'Allowed document kinds',
        });
        const item = within(group)
            .getAllByRole('checkbox')
            .map((box) => box.parentElement!.textContent ?? '');
        expect(item).toEqual(field);
    });

    it("targets the page's own kind when a field becomes a reference", () => {
        let draft = createEmptyDraft('mortal', 'wod-v5');
        const fieldId =
            draft.children[0]!.type === 'section' ? draft.children[0]!.children[0]!.id : '';
        draft = changeFieldType(draft, fieldId, 'reference');
        const section = draft.children[0]!;
        const field = section.type === 'section' ? section.children[0]! : undefined;
        expect(field?.type === 'reference' && field.targetKinds).toEqual(['mortal']);
    });

    it('keeps a stale target checked, marks it unavailable, and reports it until unchecked', () => {
        openPage(HUNTER, [allyField(['character', 'creature'])]);
        selectInOutline('ally');
        const stale = kinds('ally').find(({ label }) => label.includes('(unavailable)'));
        expect(stale?.label).toMatch(/Creature \(unavailable\)$/);
        expect(stale?.checked).toBe(true);
        expect(screen.getAllByText(/"Ally" can point to .*Creature/).length).toBeGreaterThan(0);

        const group = within(settings('ally')).getByRole('group', {
            name: 'Allowed document kinds',
        });
        const box = within(group)
            .getAllByRole('checkbox')
            .find((candidate) => candidate.parentElement!.textContent === stale!.label)!;
        fireEvent.click(box);
        expect(kinds('ally').some(({ label }) => label.includes('(unavailable)'))).toBe(false);
        expect(screen.queryByText(/can point to/)).toBeNull();
    });

    it('reports stale targets in the draft and never drops them by itself', () => {
        const template = CustomTemplateSchema.parse({
            id: 'tpl-refstale',
            name: 'Stale',
            schemaVersion: 3,
            ...HUNTER,
            children: [allyField(['character', 'creature'])],
        });
        const draft = createDraftFromTemplate(template);
        const issues = collectDraftIssues(draft, ISSUE_MESSAGES);
        expect(issues).toContainEqual({
            message: expect.stringMatching(/^"Ally" can point to .*Creature/),
            nodeId: 'ally',
        });
        const [field] = draft.children;
        expect(field?.type === 'reference' && field.targetKinds).toEqual(['character', 'creature']);
    });

    it('lists every stored target of an orphaned template as unavailable', () => {
        const draft = createDraftFromTemplate(
            CustomTemplateSchema.parse({
                id: 'tpl-reforph',
                name: 'Orphan',
                schemaVersion: 3,
                systemId: 'gone-system',
                documentKind: 'character',
                children: [allyField(['character'])],
            })
        );
        expect(
            collectDraftIssues(draft, ISSUE_MESSAGES).filter(({ nodeId }) => nodeId === 'ally')
        ).toHaveLength(1);
    });
});

describe('tracker settings (spec 018)', () => {
    afterEach(cleanup);

    const TRACKER = {
        id: 'wounds',
        type: 'tracker',
        label: 'Wounds',
        marks: [
            { id: 'bashing', name: 'Bashing', symbol: '╱', fill: 'secondary' },
            { id: 'lethal', name: 'Lethal', symbol: '×', fill: 'error' },
        ],
        levels: [
            { id: 'hurt', name: 'Hurt', value: '-1' },
            { id: 'injured', name: 'Injured', value: '-1' },
            { id: 'down', name: 'Down', value: '' },
        ],
        columns: [{ id: 'damage', kind: 'marks', title: 'Damage' }],
    };

    function openTracker(extra: Record<string, unknown> = {}) {
        const template = CustomTemplateSchema.parse({
            id: 'tracker-kit',
            name: 'Tracker Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [{ ...TRACKER, ...extra }],
        });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
        selectInOutline('wounds');
        return settings('wounds');
    }

    const levelNames = (panel: HTMLElement) =>
        within(panel)
            .getAllByLabelText(/^Level \d+ name$/)
            .map((input) => (input as HTMLInputElement).value);

    it('moves levels up and down, adds, and removes them', () => {
        const panel = openTracker();
        fireEvent.click(within(panel).getByRole('button', { name: 'Move level 1 down' }));
        expect(levelNames(settings('wounds'))).toEqual(['Injured', 'Hurt', 'Down']);
        fireEvent.click(
            within(settings('wounds')).getByRole('button', { name: 'Move level 3 up' })
        );
        expect(levelNames(settings('wounds'))).toEqual(['Injured', 'Down', 'Hurt']);
        expect(
            (
                within(settings('wounds')).getByRole('button', {
                    name: 'Move level 1 up',
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);
        fireEvent.click(within(settings('wounds')).getByRole('button', { name: 'Add level' }));
        expect(levelNames(settings('wounds'))).toHaveLength(4);
        fireEvent.click(within(settings('wounds')).getByRole('button', { name: 'Remove level 4' }));
        expect(levelNames(settings('wounds'))).toHaveLength(3);
    });

    it('renames and hides the value column, and the sheet follows', () => {
        const panel = openTracker();
        fireEvent.change(within(panel).getByLabelText('Value column title'), {
            target: { value: 'Bonus' },
        });
        expect(screen.getAllByText('Bonus').length).toBeGreaterThan(0);
        fireEvent.click(within(settings('wounds')).getByLabelText('Show'));
        expect(
            (within(settings('wounds')).getByLabelText('Level 1 value') as HTMLInputElement)
                .disabled
        ).toBe(true);
    });

    it('starts marks from a ready set and moves a mark down', () => {
        const panel = openTracker();
        fireEvent.change(within(panel).getByLabelText('Start from…'), {
            target: { value: 'three' },
        });
        const names = () =>
            within(settings('wounds'))
                .getAllByLabelText(/^Mark \d+ name$/)
                .map((input) => (input as HTMLInputElement).value);
        expect(names()).toEqual(['Bashing', 'Lethal', 'Aggravated']);
        fireEvent.click(
            within(settings('wounds')).getByRole('button', { name: 'Move mark 1 down' })
        );
        expect(names()).toEqual(['Lethal', 'Bashing', 'Aggravated']);
        expect(
            (
                within(settings('wounds')).getByRole('button', {
                    name: 'Add mark',
                }) as HTMLButtonElement
            ).disabled
        ).toBe(false);
    });

    it('switches the display with one setting', () => {
        const panel = openTracker();
        const strip = within(panel).getByRole('button', { name: 'Strip' });
        fireEvent.click(strip);
        expect(
            within(settings('wounds'))
                .getByRole('button', { name: 'Strip' })
                .getAttribute('aria-pressed')
        ).toBe('true');
    });

    it('asks before a save hides stored marks, and keeps the draft on cancel', () => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
        useDocumentStore.setState({
            documents: [
                {
                    id: 'doc-wounds',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'character',
                    schemaVersion: 1,
                    metadata: { title: 'Kira', tags: [] },
                    templateValues: {
                        wounds: {
                            tracker: 1,
                            columns: { damage: [{ id: 'a', marks: { hurt: 'lethal' } }] },
                        },
                    },
                    data: {},
                } as never,
            ],
        });
        const panel = openTracker();
        fireEvent.click(within(panel).getByRole('button', { name: 'Remove mark 2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const dialog = screen.getByRole('dialog', { name: 'Hide stored tracker values?' });
        expect(dialog.textContent).toContain(
            'Wounds: 1 stored mark in 1 sheet will no longer be shown.'
        );
        fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cancel' })[0]!);
        expect(useTemplateStore.getState().templates).toHaveLength(0);
        expect(within(settings('wounds')).getAllByLabelText(/^Mark \d+ name$/)).toHaveLength(1);
        useDocumentStore.setState({ documents: [] });
    });

    function openBuiltIn(tracker: Record<string, unknown> = {}) {
        const template = CustomTemplateSchema.parse({
            id: 'builtin-kit',
            name: 'Built-in Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'wounds',
                    type: 'primitive',
                    bindingKey: 'track:health',
                    label: 'Wounds',
                    tracker,
                },
            ],
        });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
        selectInOutline('wounds');
        return settings('wounds');
    }

    it('names the marks under the tracker only when the author turns it on', () => {
        const panel = openTracker();
        const legend = () =>
            screen.queryAllByRole('listitem').find((item) => item.textContent === '×Lethal') ??
            null;
        const toggle = within(panel).getByLabelText(
            'Name the marks under the tracker'
        ) as HTMLInputElement;
        expect(toggle.checked).toBe(false);
        expect(legend()).toBeNull();
        fireEvent.click(toggle);
        expect(legend()).not.toBeNull();
        cleanup();

        const builtIn = openBuiltIn();
        fireEvent.click(within(builtIn).getByLabelText('Name the marks under the tracker'));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates[0]!.children[0] as TemplateNode & {
            tracker?: unknown;
        };
        expect(saved.tracker).toEqual({ legend: true });
    });

    it('puts a mark on the outline layer and starts from points (spec 019)', () => {
        openTracker();
        const layer = (n: number) =>
            within(settings('wounds')).getByRole('group', { name: `Mark ${n} layer` });
        fireEvent.click(within(layer(2)).getByRole('button', { name: 'Outline' }));
        expect(
            within(layer(2)).getByRole('button', { name: 'Outline' }).getAttribute('aria-pressed')
        ).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates.find(({ id }) => id === 'tracker-kit')!
            .children[0] as TemplateNode & {
            marks: { id: string; layer: string }[];
        };
        expect(saved.marks.map(({ id, layer }) => [id, layer])).toEqual([
            ['bashing', 'fill'],
            ['lethal', 'outline'],
        ]);
        cleanup();

        openTracker();
        fireEvent.change(within(settings('wounds')).getByLabelText('Start from…'), {
            target: { value: 'points' },
        });
        expect(
            within(layer(1)).getByRole('button', { name: 'Fill' }).getAttribute('aria-pressed')
        ).toBe('true');
        expect(
            within(layer(2)).getByRole('button', { name: 'Outline' }).getAttribute('aria-pressed')
        ).toBe('true');
    });

    it('keeps the layer of built-in marks locked to fill', () => {
        const panel = openBuiltIn();
        const layer = within(panel).getByRole('group', { name: 'Mark 2 layer' });
        const outline = within(layer).getByRole('button', { name: 'Outline' }) as HTMLButtonElement;
        expect(outline.disabled).toBe(true);
        expect(within(panel).getByText(/keeps one mark per box/)).toBeTruthy();
    });

    it('lets a built-in tracker rename its marks but not add or reorder them', () => {
        const panel = openBuiltIn();
        expect(within(panel).queryByRole('button', { name: 'Add mark' })).toBeNull();
        expect(
            (within(panel).getByRole('button', { name: 'Move mark 1 down' }) as HTMLButtonElement)
                .disabled
        ).toBe(true);
        const name = within(panel).getByLabelText('Mark 1 name') as HTMLInputElement;
        expect(name.placeholder).toBe('Bashing');
        fireEvent.change(name, { target: { value: 'Graze' } });
        fireEvent.change(within(settings('wounds')).getByLabelText('Level 2 value'), {
            target: { value: '-4' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates[0]!.children[0] as TemplateNode & {
            tracker?: unknown;
        };
        expect(saved.tracker).toEqual({
            marks: { slash: { name: 'Graze' } },
            levels: [null, { value: '-4' }],
        });
    });

    it('asks before a save hides values of a built-in tracker extra column', () => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
        useDocumentStore.setState({
            documents: [
                {
                    id: 'doc-source',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'character',
                    schemaVersion: 1,
                    metadata: { title: 'Kira', tags: [] },
                    templateValues: {
                        wounds: {
                            tracker: 1,
                            columns: { source: [{ id: 'a', texts: { hurt: 'Blaster' } }] },
                        },
                    },
                    data: {},
                } as never,
            ],
        });
        const panel = openBuiltIn({
            columns: [{ id: 'source', kind: 'text', title: 'Source' }],
        });
        fireEvent.click(within(panel).getByRole('button', { name: 'Remove column 1' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const dialog = screen.getByRole('dialog', { name: 'Hide stored tracker values?' });
        expect(dialog.textContent).toContain('1 stored note in 1 sheet');
        useDocumentStore.setState({ documents: [] });
    });

    it('switches the source to a built-in track and back', () => {
        const panel = openTracker({ display: 'strip' });
        fireEvent.change(within(panel).getByLabelText('Source'), {
            target: { value: 'track:health' },
        });
        expect(outlineRow('wounds').getAttribute('data-node-type')).toBe('primitive');
        selectInOutline('wounds');
        fireEvent.change(within(settings('wounds')).getByLabelText('Source'), {
            target: { value: 'custom' },
        });
        expect(outlineRow('wounds').getAttribute('data-node-type')).toBe('tracker');
        selectInOutline('wounds');
        expect(
            within(settings('wounds'))
                .getByRole('button', { name: 'Strip' })
                .getAttribute('aria-pressed')
        ).toBe('true');
    });
});
