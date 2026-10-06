import { issueLocation } from '@site/src/sheet_manager/features/template-editor/issues';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const draft = CustomTemplateSchema.parse({
    id: 'location-kit',
    name: 'Location Kit',
    documentKind: 'character',
    schemaVersion: 3,
    children: [
        {
            id: 'sec',
            type: 'section',
            title: 'Stats',
            children: [
                { id: 'pick', type: 'select', label: 'Pick', options: [{ id: 'a', label: 'A' }] },
                {
                    id: 'kit',
                    type: 'table',
                    columns: [{ id: 'item', type: 'text', label: 'Item' }],
                },
                {
                    id: 'notes',
                    type: 'list',
                    valueKey: 'notes',
                    item: { id: 'note', type: 'text', label: 'Note' },
                    presets: [{ key: 'p1', label: 'First' }],
                },
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

const node = (index: number) => ['children', 0, 'children', index];

describe('issueLocation (spec 022, R4)', () => {
    it('maps tree paths to the nearest node and its setting', () => {
        expect(issueLocation(draft, ['children', 0, 'title'])).toEqual({
            nodeId: 'sec',
            setting: { group: 'content', key: 'title' },
        });
        expect(issueLocation(draft, [...node(0), 'options', 0, 'label'])).toEqual({
            nodeId: 'pick',
            setting: { group: 'content', key: 'option:0' },
        });
        expect(issueLocation(draft, [...node(0), 'visibleWhen', 'coordinate'])).toEqual({
            nodeId: 'pick',
            setting: { group: 'visibility', key: 'visibleWhen' },
        });
    });

    it('puts table columns and list entries under their table or list', () => {
        expect(issueLocation(draft, [...node(1), 'columns', 0, 'label'])).toEqual({
            nodeId: 'kit',
            setting: { group: 'content', key: 'column:item.label' },
        });
        expect(issueLocation(draft, [...node(2), 'item', 'label'])).toEqual({
            nodeId: 'notes',
            setting: { group: 'content', key: 'entry.label' },
        });
        expect(issueLocation(draft, [...node(2), 'presets', 0, 'label'])).toEqual({
            nodeId: 'notes',
            setting: { group: 'content', key: 'preset:0' },
        });
    });

    it('sends tracker problems to the tracker block', () => {
        expect(issueLocation(draft, [...node(3), 'levels', 0, 'name'])).toEqual({
            nodeId: 'wounds',
            setting: { group: 'look', key: 'tracker' },
        });
    });

    it('returns the node alone for whole-node rules, and nothing for unknown paths', () => {
        expect(issueLocation(draft, node(2))).toEqual({ nodeId: 'notes' });
        expect(issueLocation(draft, ['children', 7, 'label'])).toEqual({});
        expect(issueLocation(draft, [])).toEqual({});
    });
});
