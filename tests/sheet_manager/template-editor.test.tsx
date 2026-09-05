// @vitest-environment jsdom

import {
    addField,
    addSection,
    changeFieldType,
    collectDraftIssues,
    createDraftFromTemplate,
    createEmptyDraft,
    removeSection,
    updateField,
} from '@site/src/sheet_manager/components/dialogs/template-editor/draft';
import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { TemplateLibraryDialog } from '@site/src/sheet_manager/components/dialogs/TemplateLibraryDialog';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ISSUE_MESSAGES = {
    emptyName: 'Template name is required.',
    emptyLabel: 'Every section and field needs a non-empty label.',
    duplicateId: 'Duplicate identifier "{id}".',
    invalidKey: 'Invalid key "{id}" — use lowercase letters, digits, and dashes.',
    limitReached: 'Limit reached — {limit} {subject} maximum.',
    invalidBounds: 'Minimum cannot exceed maximum.',
};

function firstBlockFields(draft: ReturnType<typeof createEmptyDraft>) {
    const block = draft.sections[0]!.blocks[0]!;
    if (block.type !== 'fields') throw new Error('expected a fields block');
    return block.fields;
}

function savedTemplate() {
    return CustomTemplateSchema.parse({
        id: 'tpl-existing',
        name: 'Existing Kit',
        documentKind: 'character',
        schemaVersion: 1,
        sections: [
            {
                id: 'identity',
                title: 'Identity',
                blocks: [
                    {
                        id: 'identity-fields',
                        type: 'fields',
                        columns: 1,
                        fields: [{ id: 'origin', label: 'Origin', type: 'text' }],
                    },
                ],
            },
        ],
    });
}

describe('template editor draft model', () => {
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

    it('enforces template-wide effective value key uniqueness and format (FR-27)', () => {
        const draft = createEmptyDraft('character');
        const blockId = draft.sections[0]!.blocks[0]!.id;
        const firstFieldId = firstBlockFields(draft)[0]!.id;
        const second = addField(draft, blockId);
        const secondFieldId = firstBlockFields(second)[1]!.id;

        // Same explicit valueKey on two fields of one template — duplicate issue.
        let keyed = updateField(second, blockId, firstFieldId, { valueKey: 'shared-key' });
        keyed = updateField(keyed, blockId, secondFieldId, { valueKey: 'shared-key' });
        const dupIssues = collectDraftIssues({ ...keyed, name: 'Kit' }, ISSUE_MESSAGES).map(
            (issue) => issue.message
        );
        expect(dupIssues).toContain('Duplicate identifier "shared-key".');

        // Invalid format (uppercase/underscore) — invalid key issue.
        keyed = updateField(keyed, blockId, secondFieldId, { valueKey: 'Bad_Key' });
        const formatIssues = collectDraftIssues({ ...keyed, name: 'Kit' }, ISSUE_MESSAGES).map(
            (issue) => issue.message
        );
        expect(formatIssues).toContain(
            'Invalid key "Bad_Key" — use lowercase letters, digits, and dashes.'
        );
    });

    it('tolerates transient empty labels without crashing and flags them live', () => {
        const draft = createEmptyDraft('character');
        const blockId = draft.sections[0]!.blocks[0]!.id;
        const fieldId = firstBlockFields(draft)[0]!.id;

        let cleared = createEmptyDraft('character');
        expect(() => {
            cleared = updateField(draft, blockId, fieldId, { label: '' });
        }).not.toThrow();

        // Draft-safe type switching also survives an empty label.
        expect(() => changeFieldType(cleared!, blockId, fieldId, 'select')).not.toThrow();

        const issues = collectDraftIssues(cleared!, ISSUE_MESSAGES).map((issue) => issue.message);
        expect(issues).toContain(ISSUE_MESSAGES.emptyLabel);
        expect(issues).toContain(ISSUE_MESSAGES.emptyName);
    });

    it('guards the single-section minimum when removing sections', () => {
        const draft = createEmptyDraft('character');
        const doubled = addSection(draft);
        expect(doubled.sections).toHaveLength(2);
        const reduced = removeSection(doubled, doubled.sections[1]!.id);
        expect(reduced.sections).toHaveLength(1);
        expect(removeSection(reduced, reduced.sections[0]!.id)).toBe(reduced);
    });

    it('resets type-specific settings when the field type changes', () => {
        const draft = createEmptyDraft('character');
        const blockId = draft.sections[0]!.blocks[0]!.id;
        const fieldId = firstBlockFields(draft)[0]!.id;
        const withSelect = changeFieldType(draft, blockId, fieldId, 'select');
        const field = firstBlockFields(withSelect)[0]!;
        expect(field.type).toBe('select');
        if (field.type === 'select') expect(field.options).toHaveLength(1);

        const backToText = changeFieldType(withSelect, blockId, fieldId, 'text');
        const textField = firstBlockFields(backToText)[0]!;
        expect(textField.type).toBe('text');
        expect(textField).not.toHaveProperty('options');
    });

    it('copies a template with a fresh identity when requested', () => {
        const source = savedTemplate();
        const copy = createDraftFromTemplate(source, { id: 'tpl-copy', name: 'Copy' });
        expect(copy.id).toBe('tpl-copy');
        expect(copy.sections).toEqual(source.sections);
        expect(copy).not.toBe(source);
    });

    it('adds fields to a block', () => {
        const draft = createEmptyDraft('character');
        const blockId = draft.sections[0]!.blocks[0]!.id;
        const grown = addField(draft, blockId);
        expect(firstBlockFields(grown)).toHaveLength(2);
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
        expect(screen.getByText('Kind: character')).not.toBeNull();
    });

    it('deletes a template after confirmation', () => {
        render(createElement(TemplateLibraryDialog, { open: true, onOpenChange: () => {} }));

        fireEvent.click(screen.getByLabelText('Delete: Existing Kit'));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(useTemplateStore.getState().templates).toHaveLength(0);
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
        const block = saved.sections[0]!.blocks[0]!;
        expect(block.type).toBe('fields');
        if (block.type === 'fields') {
            const first = block.fields[0]!;
            expect(first.type).toBe('select');
            if (first.type === 'select') {
                expect(first.binding?.catalogId).toBe('melee-weapons');
                expect(first.multiple).toBe(false);
            }
        }
    });

    it('duplicates a template under a fresh identity', () => {
        render(createElement(TemplateLibraryDialog, { open: true, onOpenChange: () => {} }));

        fireEvent.click(screen.getByLabelText('Duplicate: Existing Kit'));

        const templates = useTemplateStore.getState().templates;
        expect(templates).toHaveLength(2);
        expect(templates.map((template) => template.id)).toContain('tpl-existing');
        expect(new Set(templates.map((template) => template.id)).size).toBe(2);
    });
});
