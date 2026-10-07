// @vitest-environment happy-dom

import {
    switchGroupKind,
    switchListKind,
} from '@site/src/sheet_manager/features/template-editor/elements/kinds';
import {
    fieldFromSource,
    listFromSource,
    trackerFromSource,
    type ValueSourceBinding,
} from '@site/src/sheet_manager/features/template-editor/elements/sources';
import {
    droppedSettings,
    keepSettings,
    switchElement,
    type SwitchStash,
} from '@site/src/sheet_manager/features/template-editor/settings/keepSettings';
import {
    SETTING_ENTRIES,
    settingApplies,
    settingDescription,
    settingGroup,
    settingLabel,
} from '@site/src/sheet_manager/features/template-editor/settings/registry';
import { listElementStories } from '@site/src/sheet_manager/storybook/stories';
import { starWarsWodSystem } from '@site/src/sheet_manager/systems';
import {
    type ListBinding,
    listDocumentBindings,
    type TrackBinding,
} from '@site/src/sheet_manager/systems/templateBindings';
import type { CustomTemplate, TemplateNode } from '@site/src/sheet_manager/types/template';
import { collectTemplateNodes, CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openSettingsGroups, renderEditor, resetEditorStores } from '../helpers/editor';
import { outlineRow } from '../helpers/templateEditor';

vi.setConfig({ testTimeout: 60_000 });

const bindings = listDocumentBindings(starWarsWodSystem.id, 'character');
const trait = bindings.find((binding) => binding.kind === 'trait') as ValueSourceBinding;
const resource = bindings.find((binding) => binding.kind === 'resource') as ValueSourceBinding;
const gameList = bindings.find((binding) => binding.kind === 'list') as ListBinding;
const track = bindings.find((binding) => binding.kind === 'track') as TrackBinding;

const parse = (node: Record<string, unknown>) =>
    CustomTemplateSchema.parse({
        id: 'tpl',
        name: 'T',
        documentKind: 'character',
        schemaVersion: 3,
        children: [node],
    }).children[0]!;

const condition = { coordinate: 'flag', equals: 1 };

/** A free field with every carried setting it can have. */
const freeField = () =>
    parse({
        id: 'courage',
        type: 'number',
        label: 'Courage',
        description: 'Steel',
        labelPosition: 'left',
        hideLabel: true,
        compact: true,
        column: 2,
        span: 2,
        visibleWhen: condition,
    });

const tracker = (id: string) => ({
    id,
    type: 'tracker',
    label: id.toUpperCase(),
    marks: [{ id: 'hurt', name: 'Hurt', symbol: '×', fill: 'error' }],
    levels: [{ id: 'one', name: 'One', value: '' }],
    columns: [{ id: 'damage', kind: 'marks', title: 'Damage' }],
});

/** The `data-setting` key without its row index or its entry/column prefix. */
function baseKey(key: string): string {
    const last = key.replace(/^(entry\.|column:[^.]+\.)/, '');
    return last.split(':')[0]!;
}

function select(nodeId: string, modifiers: Record<string, boolean> = {}) {
    fireEvent.click(
        [...outlineRow(nodeId).querySelectorAll('button')].find(
            (button) => !button.hasAttribute('data-drag-handle')
        )!,
        modifiers
    );
}

/** One node per distinct settings panel: type, binding kind, and the options that add controls. */
function signature(node: TemplateNode): string {
    const flags = Object.keys(node)
        .filter((key) => ['catalog', 'poolTracker', 'tracker', 'bindingKey', 'item'].includes(key))
        .sort();
    const binding = node.type === 'primitive' ? node.bindingKey.split(':')[0] : '';
    return [node.type, binding, ...flags].join('|');
}

/**
 * One page per system and document kind holding one element per distinct settings panel from the
 * storybook (containers emptied, ids made unique), so each page renders once.
 */
function representativeTemplates(): CustomTemplate[] {
    const seen = new Set<string>();
    const pages = new Map<string, CustomTemplate>();
    for (const { template } of listElementStories()) {
        for (const node of collectTemplateNodes(template)) {
            const key = signature(node);
            if (seen.has(key)) continue;
            seen.add(key);
            const target = `${template.systemId}|${template.documentKind}`;
            const page = pages.get(target) ?? { ...template, children: [] };
            pages.set(target, page);
            const copy = 'children' in node ? { ...node, children: [] } : node;
            page.children.push({ ...copy, id: `e${seen.size}-${node.id}` } as TemplateNode);
        }
    }
    return [...pages.values()];
}

describe('setting registry (spec 025, US1)', () => {
    beforeEach(resetEditorStores);
    afterEach(cleanup);

    it('describes every setting a panel renders, in the group the panel shows it', () => {
        const missing = new Set<string>();
        const misplaced = new Set<string>();
        for (const template of representativeTemplates()) {
            renderEditor(template);
            for (const node of template.children) {
                select(node.id);
                openSettingsGroups();
                const panel = document.querySelector(`[data-settings-for="${node.id}"]`)!;
                for (const control of panel.querySelectorAll<HTMLElement>('[data-setting]')) {
                    const key = control.dataset.setting!;
                    const base = baseKey(key);
                    if (!settingDescription(base)) missing.add(`${node.type}: ${key}`);
                    const shown =
                        control.closest<HTMLElement>('[data-settings-group]')?.dataset
                            .settingsGroup;
                    if (key === base && shown && shown !== settingGroup(base, node)) {
                        misplaced.add(`${node.type}: ${key} in ${shown}`);
                    }
                }
            }
            cleanup();
        }
        expect([...missing]).toEqual([]);
        expect([...misplaced]).toEqual([]);
    });

    it('describes the settings of the multi-selection panel', () => {
        renderEditor(
            CustomTemplateSchema.parse({
                id: 'tpl-multi',
                name: 'Multi',
                documentKind: 'character',
                schemaVersion: 3,
                children: [
                    { id: 'a', type: 'number', label: 'A' },
                    { id: 'b', type: 'number', label: 'B' },
                    tracker('c'),
                    tracker('d'),
                ],
            })
        );
        for (const [first, second] of [
            ['a', 'b'],
            ['c', 'd'],
        ] as const) {
            select(first);
            select(second, { ctrlKey: true });
            openSettingsGroups();
            const panel = document.querySelector('[data-settings-for="multiple"]')!;
            const keys = [...panel.querySelectorAll<HTMLElement>('[data-setting]')].map(
                (control) => control.dataset.setting!
            );
            expect(keys.length).toBeGreaterThan(0);
            expect(keys.filter((key) => !settingDescription(baseKey(key)))).toEqual([]);
        }
    });

    it('announces the settings a switch drops, and undo brings the list back in one step', () => {
        renderEditor(
            CustomTemplateSchema.parse({
                id: 'tpl-switch',
                name: 'Switch',
                documentKind: 'character',
                schemaVersion: 3,
                children: [
                    {
                        id: 'notes',
                        type: 'list',
                        title: 'Notes',
                        valueKey: 'notes',
                        showTitle: true,
                        framed: true,
                    },
                ],
            })
        );
        select('notes');
        const panel = () => document.querySelector('[data-settings-for="notes"]')!;
        const radio = (name: RegExp) =>
            [...panel().querySelectorAll<HTMLInputElement>('input[type="radio"]')].find((input) =>
                name.test(input.closest('label')!.textContent!)
            )!;
        fireEvent.click(radio(/^Table/));
        const announcer = document.querySelector('[data-editor-announcer]')!;
        expect(announcer.textContent).toContain(settingLabel('showTitle'));
        expect(announcer.textContent).toContain(settingLabel('framed'));
        expect(outlineRow('notes').getAttribute('data-node-type')).toBe('table');
        fireEvent.click(document.querySelector<HTMLButtonElement>('button[aria-label="Undo"]')!);
        expect(outlineRow('notes').getAttribute('data-node-type')).toBe('list');
    });

    it('gives every shared or carried setting the elements it applies to', () => {
        for (const [key, description] of SETTING_ENTRIES) {
            if (description.shared || description.carry) {
                expect(description.appliesTo, key).toBeDefined();
            }
        }
    });
});

describe('settings across a source or kind switch (spec 025, FR-001, FR-002)', () => {
    it('keeps span, display condition, compact, hidden label, and help when bound to a trait', () => {
        const bound = fieldFromSource(freeField() as never, trait);
        expect(bound).toMatchObject({
            type: 'rating',
            column: 2,
            span: 2,
            visibleWhen: condition,
            compact: true,
            hideLabel: true,
            description: 'Steel',
            labelPosition: 'left',
        });
    });

    it('keeps the layout of a game value when it becomes a free field again', () => {
        const primitive = fieldFromSource(freeField() as never, resource);
        expect(primitive).toMatchObject({
            type: 'primitive',
            span: 2,
            visibleWhen: condition,
            hideLabel: true,
        });
        const free = fieldFromSource(primitive as never, undefined);
        expect(free).toMatchObject({ span: 2, visibleWhen: condition, hideLabel: true });
    });

    it('keeps every carried setting each switch target can have', () => {
        const sources: Array<[string, (node: TemplateNode) => TemplateNode]> = [
            ['trait', (node) => fieldFromSource(node as never, trait)],
            ['resource', (node) => fieldFromSource(node as never, resource)],
            ['free', (node) => fieldFromSource(node as never, undefined)],
            ['game list', (node) => listFromSource(node as never, gameList)],
            ['own list', (node) => listFromSource(node as never, undefined)],
            ['track', (node) => trackerFromSource(node as never, track)],
        ];
        const carried = SETTING_ENTRIES.filter(([, description]) => description.carry);
        const from = freeField();
        for (const [name, switchTo] of sources) {
            const next = switchTo(from) as unknown as Record<string, unknown>;
            for (const [key] of carried) {
                const value = (from as unknown as Record<string, unknown>)[key];
                if (value === undefined || !settingApplies(key, next as never)) continue;
                if (name === 'track' && key === 'compact') continue; // trackers draw their own look
                expect(next[key], `${name}: ${key}`).toEqual(value);
            }
        }
    });

    it('names the settings the new element cannot have, and brings them back on return', () => {
        const stash: SwitchStash = new Map();
        const from = freeField();
        const toResource = switchElement(from, fieldFromSource(from as never, resource), stash);
        expect(toResource.dropped).toEqual(['description', 'labelPosition']);
        expect(toResource.node).not.toHaveProperty('labelPosition');
        const back = switchElement(
            toResource.node,
            fieldFromSource(toResource.node as never, undefined),
            stash
        );
        expect(back.dropped).toEqual([]);
        expect(back.node).toMatchObject({ description: 'Steel', labelPosition: 'left' });
    });

    it('keeps a display condition that points at the element’s own old value key', () => {
        const own = parse({
            id: 'grit',
            type: 'number',
            label: 'Grit',
            valueKey: 'grit',
            visibleWhen: { coordinate: 'grit', equals: 1 },
        });
        expect(fieldFromSource(own as never, trait)).toMatchObject({
            visibleWhen: { coordinate: 'grit', equals: 1 },
        });
    });

    it('drops list-only settings when a list becomes a table, and restores them', () => {
        const stash: SwitchStash = new Map();
        const list = parse({
            id: 'notes',
            type: 'list',
            title: 'Notes',
            valueKey: 'notes',
            span: 2,
            showTitle: true,
            framed: true,
            presets: [{ key: 'p', label: 'Preset' }],
        });
        expect(droppedSettings(list, { ...list, type: 'table' } as never)).toEqual([
            'presets',
            'showTitle',
            'framed',
        ]);
        const { node: table } = switchListKind(list as never, 'table', stash);
        expect(table).toMatchObject({ type: 'table', span: 2 });
        expect(table).not.toHaveProperty('presets');
        const { node: again } = switchListKind(table, 'entries', stash);
        expect(again).toMatchObject({ showTitle: true, framed: true, presets: [{ key: 'p' }] });
    });

    it('keeps the help link and folding when a card becomes a section', () => {
        const stash: SwitchStash = new Map();
        const card = parse({
            id: 'gear',
            type: 'group',
            title: 'Gear',
            docsPath: '/docs/x',
            defaultCollapsed: true,
            hideTitle: true,
            children: [],
        });
        const section = switchGroupKind(card as never, 'section', stash);
        expect(section).toMatchObject({ docsPath: '/docs/x', defaultCollapsed: true });
        expect(droppedSettings(card, section)).toEqual(['hideTitle']);
    });

    it('copies only settings the target has', () => {
        const list = parse({ id: 'l', type: 'list', title: 'L', valueKey: 'l' });
        const kept = keepSettings(freeField(), list);
        expect(kept).toMatchObject({ span: 2, visibleWhen: condition });
        expect(kept).not.toHaveProperty('hideLabel');
    });
});
