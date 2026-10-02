// @vitest-environment jsdom

import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openSettingsGroups, resetEditorStores } from './helpers/editor';

vi.setConfig({ testTimeout: 20_000 });

const GROUP_ORDER = ['content', 'value', 'limits', 'look', 'visibility'];

const template = () =>
    CustomTemplateSchema.parse({
        id: 'tpl-settings',
        name: 'Settings Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'stats',
                type: 'section',
                title: 'Stats',
                children: [
                    { id: 'courage', type: 'number', label: 'Courage' },
                    {
                        id: 'willpower',
                        type: 'rating',
                        label: 'Willpower',
                        valueKey: 'will',
                        max: 10,
                        maxFrom: 'courage',
                    },
                    { id: 'total', type: 'formula', label: 'Total', formula: 'courage + 1' },
                    {
                        id: 'gear',
                        type: 'group',
                        title: 'Gear',
                        children: [{ id: 'motto', type: 'text', label: 'Motto' }],
                    },
                    {
                        id: 'kit',
                        type: 'table',
                        title: 'Kit',
                        columns: [{ id: 'item', type: 'text', label: 'Item' }],
                    },
                    {
                        id: 'notes',
                        type: 'list',
                        title: 'Notes',
                        valueKey: 'notes',
                        item: { id: 'note', type: 'text', label: 'Note' },
                    },
                    { id: 'str', type: 'primitive', bindingKey: 'trait:physical:Strength' },
                    { id: 'fp', type: 'primitive', bindingKey: 'resource:force-points' },
                    {
                        id: 'wounds',
                        type: 'tracker',
                        label: 'Wounds',
                        marks: [{ id: 'hurt', name: 'Hurt', symbol: '×', fill: 'error' }],
                        levels: [{ id: 'one', name: 'One', value: '' }],
                        columns: [{ id: 'damage', kind: 'marks', title: 'Damage' }],
                    },
                ],
            },
        ],
    });

const select = (nodeId: string) =>
    fireEvent.click(
        [
            ...document.querySelector(`[data-outline-row="${nodeId}"]`)!.querySelectorAll('button'),
        ].find((button) => !button.hasAttribute('data-drag-handle'))!
    );
const settingsOf = (nodeId: string) =>
    document.querySelector(`[data-settings-for="${nodeId}"]`) as HTMLElement;
const groupsOf = (nodeId: string) =>
    [...settingsOf(nodeId).querySelectorAll<HTMLElement>('[data-settings-group]')].map(
        (group) => group.dataset.settingsGroup!
    );
const groupOf = (control: Element) =>
    control.closest<HTMLElement>('[data-settings-group]')?.dataset.settingsGroup;
const header = (nodeId: string, group: string) =>
    settingsOf(nodeId).querySelector<HTMLButtonElement>(
        `[data-settings-group="${group}"] > button`
    )!;

describe('readable settings panel (spec 022, US1)', () => {
    beforeEach(() => {
        resetEditorStores();
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template: template() },
                onClose: () => {},
            })
        );
    });
    afterEach(cleanup);

    const ELEMENTS = ['stats', 'willpower', 'total', 'gear', 'kit', 'notes', 'str', 'fp', 'wounds'];

    it('shows only non-empty groups, always in the same order', () => {
        for (const id of ELEMENTS) {
            select(id);
            openSettingsGroups();
            const groups = groupsOf(id);
            expect(groups.length).toBeGreaterThan(0);
            expect(groups).toEqual(GROUP_ORDER.filter((group) => groups.includes(group)));
            for (const group of groups) {
                const body = settingsOf(id).querySelector(
                    `[data-settings-group="${group}"] > div`
                )!;
                expect(body.children.length, `${id}: ${group}`).toBeGreaterThan(0);
            }
        }
    });

    it('names every single setting with a visible label', () => {
        for (const id of ELEMENTS) {
            select(id);
            openSettingsGroups();
            const controls = settingsOf(id).querySelectorAll<HTMLElement>(
                'input:not([type="checkbox"]):not([type="radio"]):not([type="color"]), select, textarea'
            );
            for (const control of controls) {
                if (control.closest('[data-setting-list], details')) continue;
                const label = control.id
                    ? document.querySelector(`label[for="${control.id}"]`)
                    : null;
                expect(label?.textContent?.trim(), `${id}: ${control.outerHTML}`).toBeTruthy();
            }
        }
    });

    it('keeps the value key and Maximum from in different groups', () => {
        select('willpower');
        const panel = settingsOf('willpower');
        expect(groupOf(within(panel).getByLabelText('Value key'))).toBe('value');
        expect(groupOf(within(panel).getByLabelText('Maximum from'))).toBe('limits');
        expect(within(panel).getByText('fx')).toBeTruthy();
    });

    it('shows a bad formula under its box and on the closed group', () => {
        select('willpower');
        const panel = settingsOf('willpower');
        const maxFrom = within(panel).getByLabelText('Maximum from');
        expect(within(panel).getByText('Reads courage.')).toBeTruthy();
        fireEvent.change(maxFrom, { target: { value: 'curage + 2' } });
        expect(within(settingsOf('willpower')).getByText('No value named “curage”.')).toBeTruthy();
        expect(maxFrom.getAttribute('aria-invalid')).toBe('true');

        fireEvent.click(header('willpower', 'limits'));
        expect(header('willpower', 'limits').getAttribute('aria-expanded')).toBe('false');
        expect(header('willpower', 'limits').textContent).toContain('1 issue');
    });

    it('keeps the open groups when another element is selected', () => {
        select('willpower');
        fireEvent.click(header('willpower', 'value'));
        expect(header('willpower', 'value').getAttribute('aria-expanded')).toBe('false');
        select('courage');
        expect(header('courage', 'value').getAttribute('aria-expanded')).toBe('false');
        expect(header('courage', 'content').getAttribute('aria-expanded')).toBe('true');
    });

    it('puts the actions above the kind and the full name', () => {
        select('willpower');
        const panel = settingsOf('willpower');
        const remove = within(panel).getByRole('button', { name: 'Remove' });
        const name = panel.querySelector('[data-element-name]')!;
        expect(name.textContent).toContain('Willpower');
        expect(
            remove.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
    });
});
