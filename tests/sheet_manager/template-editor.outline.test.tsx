// @vitest-environment happy-dom

import { TemplateEditorDialog } from '@site/src/sheet_manager/features/template-editor/TemplateEditorDialog';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dragNode, dragOver, renderEditor, startDrag } from './helpers/editor';
import {
    outlineChildIds,
    outlineRow,
    pageFrame,
    selectInOutline,
    settings,
} from './helpers/templateEditor';

// Full editor renders are slow under a loaded test run.
vi.setConfig({ testTimeout: 20_000 });

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

    it('never offers a place inside the dragged group', () => {
        openEditor();
        startDrag('identity', 'outline');
        dragOver(slot('first'));
        expect(slot('first').hasAttribute('data-drop-target')).toBe(false);
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(outlineChildIds('page')).toEqual(['identity']);
        expect(outlineChildIds('identity')).toEqual(['first', 'second']);
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
        renderEditor(starWarsWodDefaultTemplates[0]!);
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

    it('offers exactly the four element kinds with descriptions', () => {
        openEmpty();
        openRootMenu();
        const options = [...document.querySelectorAll('[data-palette-option]')].map((element) =>
            element.getAttribute('data-palette-option')
        );
        expect(options).toEqual(['group', 'field', 'list', 'tracker']);
        expect(
            screen.getByText('Boxes to mark by level: health, stress, or any other burden')
        ).not.toBeNull();
        const menu = document.querySelector('[data-palette-option="group"]')!.parentElement!;
        expect(menu.textContent).not.toContain('Strength');
    });

    it('adds each kind as a valid element and selects it', () => {
        openEmpty();
        // A group on the page is a section; inside another group it is a card.
        const section = addFromRootMenu('group');
        expect(section.getAttribute('data-node-type')).toBe('section');
        const sectionId = section.getAttribute('data-outline-row')!;
        fireEvent.click(document.querySelector(`[data-insert-slot^="${sectionId}:"]`)!);
        fireEvent.click(document.querySelector('[data-palette-option="group"]')!);
        expect(
            outlineChildIds(sectionId).map((id) => outlineRow(id).getAttribute('data-node-type'))
        ).toEqual(['group']);
        expect(addFromRootMenu('field').getAttribute('data-node-type')).toBe('text');
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
        expect(within(panel('start')).getByLabelText('Minimum from')).not.toBeNull();

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
        expect(within(settings('str')).queryByLabelText('Maximum from')).toBeNull();
        selectInOutline('luck');
        expect(within(settings('luck')).getByLabelText('Maximum from')).not.toBeNull();
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
