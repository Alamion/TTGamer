import { collectDraftIssues } from '@site/src/sheet_manager/components/dialogs/template-editor/draft';
import { schemaIssues } from '@site/src/sheet_manager/components/dialogs/template-editor/issues';
import { listElementStories } from '@site/src/sheet_manager/storybook/stories';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { type CustomTemplate, CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const MESSAGES = {
    emptyName: 'Template name is required.',
    emptyLabel: 'Every section and field needs a non-empty label.',
    duplicateId: 'Duplicate identifier "{id}".',
    invalidKey: 'Invalid key "{id}".',
    limitReached: 'Limit reached — {limit} {subject} maximum.',
    invalidBounds: 'Minimum cannot exceed maximum.',
    unknownCoordinate: 'Unknown value "{id}".',
    circularDependency: 'Circular dependency: {id}',
    unknownBinding: 'Unknown binding "{id}".',
    unknownCatalog: 'Unknown catalog "{id}".',
    unknownFillTarget: 'Missing fill target "{id}".',
    listCatalogUnnamed: 'Suggestions need entry names.',
    unknownLabelMessage: 'Unknown translation "{id}".',
    invalidDocsLink: 'Invalid docs link "{id}".',
    referenceTargetUnavailable: '"{field}" can point to {type}.',
    trackerLengthEmpty: 'Tracker "{id}": length {n} shows no level.',
    trackerCovers: 'Tracker "{id}": a column covers all its levels.',
};

const base = (): CustomTemplate =>
    CustomTemplateSchema.parse({
        id: 'coverage-kit',
        name: 'Coverage Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'sec',
                type: 'section',
                title: 'Stats',
                children: [
                    { id: 'motto', type: 'text', label: 'Motto' },
                    {
                        id: 'pick',
                        type: 'select',
                        label: 'Pick',
                        options: [{ id: 'a', label: 'A' }],
                    },
                    { id: 'hp', type: 'resource', label: 'HP', min: 0, max: 10 },
                    { id: 'calc', type: 'formula', label: 'Calc', formula: '1' },
                    {
                        id: 'kit',
                        type: 'table',
                        title: 'Kit',
                        columns: [
                            { id: 'item', type: 'text', label: 'Item' },
                            {
                                id: 'kind',
                                type: 'select',
                                label: 'Kind',
                                options: [{ id: 'x', label: 'X' }],
                            },
                        ],
                    },
                    {
                        id: 'notes',
                        type: 'list',
                        title: 'Notes',
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

type Node = Record<string, unknown> & { id: string };

/** A copy of the base draft with one node changed in place. */
function withNode(id: string, change: (node: Node) => void): CustomTemplate {
    const draft = structuredClone(base());
    const section = draft.children[0] as unknown as { children: Node[] };
    const node =
        id === 'sec' ? (section as unknown as Node) : section.children.find((n) => n.id === id)!;
    change(node);
    return draft;
}

const allIssues = (draft: CustomTemplate) => {
    const specific = collectDraftIssues(draft, MESSAGES);
    return [...specific, ...schemaIssues(draft, specific)];
};

const CASES: Array<[string, CustomTemplate, string, string]> = [
    [
        'entry field label',
        withNode('notes', (n) => ((n.item as Node).label = '')),
        'notes',
        'entry.label',
    ],
    [
        'column label',
        withNode('kit', (n) => ((n.columns as Node[])[0]!.label = '')),
        'kit',
        'column:item.label',
    ],
    [
        'column option label',
        withNode('kit', (n) => (((n.columns as Node[])[1]!.options as Node[])[0]!.label = '')),
        'kit',
        'column:kind.option:0',
    ],
    [
        'preset label',
        withNode('notes', (n) => ((n.presets as Node[])[0]!.label = '')),
        'notes',
        'preset:0',
    ],
    [
        'tracker mark name',
        withNode('wounds', (n) => ((n.marks as Node[])[0]!.name = '')),
        'wounds',
        'tracker',
    ],
    [
        'tracker level name',
        withNode('wounds', (n) => ((n.levels as Node[])[0]!.name = '')),
        'wounds',
        'tracker',
    ],
    [
        'pool tracker longer than twenty boxes',
        withNode('hp', (n) => {
            n.max = 30;
            n.poolTracker = { display: 'row', legend: false, total: true };
        }),
        'hp',
        'max',
    ],
    ['empty formula', withNode('calc', (n) => (n.formula = '')), 'calc', 'formula'],
    ['empty table title', withNode('kit', (n) => (n.title = '')), 'kit', 'title'],
    ['list with no source', withNode('notes', (n) => delete n.valueKey), 'notes', 'source'],
    [
        'option label',
        withNode('pick', (n) => ((n.options as Node[])[0]!.label = '')),
        'pick',
        'option:0',
    ],
    ['choice without options', withNode('pick', (n) => (n.options = [])), 'pick', 'options'],
    [
        'column widths',
        withNode('sec', (n) => {
            n.columns = 2;
            n.columnWidths = [0, 1];
        }),
        'sec',
        'columnWidths',
    ],
    ['identifier', withNode('motto', (n) => (n.valueKey = 'Bad Key')), 'motto', 'valueKey'],
];

describe('every save problem is listed on its element (spec 022, US4)', () => {
    it('starts from a valid draft', () => {
        expect(allIssues(base())).toEqual([]);
    });

    it.each(CASES)('%s', (_, draft, nodeId, key) => {
        const issues = allIssues(draft);
        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatchObject({ nodeId, setting: { key } });
        expect(issues[0]!.message).not.toMatch(/"code"|"path"|too_small|invalid_type/);
    });

    it('finds nothing in shipped templates and storybook stories', () => {
        const templates = [
            ...systemRegistry.getSystems().flatMap((system) => system.defaultTemplates ?? []),
            ...listElementStories().map(({ template }) => template),
        ];
        expect(templates.length).toBeGreaterThan(5);
        for (const template of templates) {
            expect(CustomTemplateSchema.safeParse(template).success, template.id).toBe(true);
            // The storybook shows a formula with an unknown value on purpose (degraded story).
            const issues = allIssues(structuredClone(template)).filter(
                ({ nodeId }) => nodeId !== 'formula-unknown'
            );
            expect(issues, template.id).toEqual([]);
        }
    });
});
