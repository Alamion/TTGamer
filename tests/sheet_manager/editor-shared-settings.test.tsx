// @vitest-environment jsdom

import {
    MIXED,
    SHARED_SETTINGS,
    sharedSettingsFor,
    sharedValue,
} from '@site/src/sheet_manager/components/dialogs/template-editor/sharedSettings';
import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema, type TemplateNode } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { openSettingsGroups, resetEditorStores } from './helpers/editor';

vi.setConfig({ testTimeout: 20_000 });

const template = () =>
    CustomTemplateSchema.parse({
        id: 'shared-kit',
        name: 'Shared Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            { id: 'mode', type: 'text', label: 'Mode' },
            {
                id: 'sec',
                type: 'section',
                title: 'Sec',
                children: [
                    {
                        id: 'f1',
                        type: 'text',
                        label: 'F1',
                        visibleWhen: { coordinate: 'mode', equals: 'a' },
                    },
                    { id: 'f2', type: 'text', label: 'F2', required: true },
                    { id: 'f3', type: 'number', label: 'F3' },
                ],
            },
        ],
    });

const nodes = () => (template().children[1] as { children: TemplateNode[] }).children;

const outlineRow = (nodeId: string) =>
    document.querySelector(`[data-outline-row="${nodeId}"]`) as HTMLElement;
const clickRow = (nodeId: string, modifiers: Record<string, boolean> = {}) =>
    fireEvent.click(
        [...outlineRow(nodeId).querySelectorAll('button')].find(
            (button) => !button.hasAttribute('data-drag-handle')
        )!,
        modifiers
    );
const panel = () => document.querySelector('[data-settings-for="multiple"]') as HTMLElement;
const control = (key: string) => panel().querySelector<HTMLInputElement>(`[data-setting="${key}"]`);
const saved = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    return (useTemplateStore.getState().templates[0]!.children[1] as { children: TemplateNode[] })
        .children;
};

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
});

describe('shared settings (spec 023, US3)', () => {
    it('offers only settings every selected element has, and never identity settings', () => {
        const keys = (list: readonly TemplateNode[]) =>
            sharedSettingsFor(list).map(({ key }) => key);
        const [f1, , f3] = nodes();
        const section = template().children[1]!;
        expect(keys([f1!, f3!])).toContain('required');
        expect(keys([f1!, f3!])).not.toContain('min');
        expect(keys([f3!, f3!])).toContain('min');
        expect(keys([f1!, section])).toEqual(['span', 'visibleWhen']);
        for (const key of ['valueKey', 'options', 'columns', 'item', 'type', 'kind', 'label']) {
            expect(SHARED_SETTINGS.some((setting) => setting.key === key)).toBe(false);
        }
    });

    it('shows a common value or Mixed', () => {
        const [f1, f2, f3] = nodes();
        expect(sharedValue([f1!, f2!], 'required')).toBe(MIXED);
        expect(sharedValue([f1!, f3!], 'required')).toBe(false);
        expect(sharedValue([f1!, f2!], 'visibleWhen')).toBe(MIXED);
    });
});

describe('the settings area with several elements (spec 023, US3)', () => {
    beforeEach(() => resetEditorStores());
    afterEach(cleanup);

    function openWithThree() {
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: template() },
                onClose: () => {},
            })
        );
        clickRow('f1');
        clickRow('f2', { ctrlKey: true });
        clickRow('f3', { ctrlKey: true });
        openSettingsGroups();
    }

    it('lists the selection, marks mixed values, and opens one element alone', () => {
        openWithThree();
        expect(panel().querySelector('h4')!.textContent).toBe('3 elements selected');
        expect(control('required')!.getAttribute('aria-checked')).toBe('mixed');
        expect(panel().querySelector('[data-setting-mixed]')).not.toBeNull();
        expect(control('valueKey')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Open F2' }));
        expect(document.querySelector('[data-settings-for="f2"]')).not.toBeNull();
    });

    it('writes a change to every selected element as one undo step', () => {
        openWithThree();
        fireEvent.click(control('required')!);
        expect(saved().map((node) => (node as { required: boolean }).required)).toEqual([
            true,
            true,
            true,
        ]);
    });

    it('undoes a shared change for every element at once', () => {
        openWithThree();
        fireEvent.click(control('hideLabel')!);
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(saved().map((node) => (node as { hideLabel?: boolean }).hideLabel)).toEqual([
            undefined,
            undefined,
            undefined,
        ]);
    });

    it('still offers placement and visibility for elements of different kinds', () => {
        const [f1] = nodes();
        const primitive = CustomTemplateSchema.parse({
            ...template(),
            children: [{ id: 'p1', type: 'primitive', bindingKey: 'resource:willpower' }],
        }).children[0]!;
        expect(sharedSettingsFor([f1!, primitive]).map(({ key }) => key)).toEqual([
            'hideLabel',
            'compact',
            'span',
            'visibleWhen',
        ]);
    });
});
