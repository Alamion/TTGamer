// @vitest-environment jsdom

import {
    changeFieldType,
    collectDraftIssues,
    createDraftFromTemplate,
    createEmptyDraft,
} from '@site/src/sheet_manager/components/dialogs/template-editor/draft';
import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetLibraryStores, seedReferenceTypes } from './helpers/library';
import { ISSUE_MESSAGES, pageFrame, selectInOutline, settings } from './helpers/templateEditor';

// Full editor renders are slow under a loaded test run.
vi.setConfig({ testTimeout: 20_000 });

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
        ).toContainEqual({
            message: 'Total: This formula does not parse (at character 7).',
            nodeId: 'total',
            setting: { group: 'limits', key: 'formula' },
        });
        expect(
            issuesOf([{ id: 'luck', type: 'rating', label: 'Luck', max: 5, maxFrom: 'min(' }])
        ).toContainEqual({
            message: expect.stringMatching(/^Luck: This formula does not parse/),
            nodeId: 'luck',
            setting: { group: 'limits', key: 'maxFrom' },
        });
    });

    it("lists a pool tracker's maximum formula that does not parse (spec 020)", () => {
        expect(
            issuesOf([
                {
                    id: 'force',
                    type: 'primitive',
                    bindingKey: 'resource:force-points',
                    label: 'Force',
                    poolTracker: {},
                    maxMinFrom: 'self-control +',
                },
            ])
        ).toContainEqual({
            message: expect.stringMatching(/^Force: This formula does not parse/),
            nodeId: 'force',
            setting: { group: 'limits', key: 'maxMinFrom' },
        });
    });

    it('lists a value the formula reads that the page does not have', () => {
        expect(
            issuesOf([{ id: 'total', type: 'formula', label: 'Total', formula: 'missing + 1' }])
        ).toContainEqual({
            message: 'Total: No value named “missing”.',
            nodeId: 'total',
            setting: { group: 'limits', key: 'formula' },
        });
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
            setting: { group: 'value', key: 'targetKinds' },
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
