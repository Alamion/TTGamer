import { systemRegistry } from '../systems';
import { type DocumentBindingDescriptor, listDocumentBindings } from '../systems/templateBindings';
import { type CustomTemplate, CustomTemplateSchema, type TemplateNode } from '../types/template';

/**
 * The element storybook (constitution VI, T-069): templates that together show every variant
 * of every template element, rendered on the draft-only docs page `docs/dev/storybook/`.
 * Handwritten stories cover containers, fields, and collections; bound-part stories are
 * generated from each system's declared bindings, so a new binding shape appears on its own.
 * `tests/sheet_manager/storybook.test.tsx` fails when a variant is missing.
 */
export interface ElementStory {
    id: string;
    title: string;
    /** What to look at, for the reviewer. */
    note: string;
    template: CustomTemplate;
}

type NodeInput = Record<string, unknown>;

function story(
    id: string,
    title: string,
    note: string,
    target: { systemId: string; documentKind: string },
    children: NodeInput[]
): ElementStory {
    return {
        id,
        title,
        note,
        template: CustomTemplateSchema.parse({
            id: `storybook-${id}`,
            name: `Storybook: ${title}`,
            schemaVersion: 3,
            ...target,
            children,
        }),
    };
}

const ENGINE = { systemId: 'wod-2e', documentKind: 'character' };

const text = (id: string, label: string, extra: NodeInput = {}): NodeInput => ({
    id,
    type: 'text',
    label,
    ...extra,
});

const group = (id: string, title: string, children: NodeInput[], extra: NodeInput = {}) => ({
    id,
    type: 'group',
    title,
    collapsible: false,
    children,
    ...extra,
});

const options = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
        id: `option-${index + 1}`,
        label: `Option ${index + 1}`,
    }));

const containers = story(
    'containers',
    'Sections, groups, columns, conditions',
    'Accent bars alternate by sibling order; the second section starts collapsed; the toggle swaps two groups and hides a field and the whole last section.',
    ENGINE,
    [
        {
            id: 'section-site-link',
            type: 'section',
            title: 'Section with a site docs link',
            docsPath: '/docs/template-editor/elements#sections',
            columns: 2,
            children: [text('two-col-a', 'Column 1'), text('two-col-b', 'Column 2')],
        },
        {
            id: 'section-external-link',
            type: 'section',
            title: 'Collapsed section with an external link',
            docsPath: 'https://example.org/',
            defaultCollapsed: true,
            children: [text('collapsed-inside', 'Inside')],
        },
        {
            id: 'section-widths',
            type: 'section',
            title: 'Three columns, widths 2 : 1 : 1',
            columns: 3,
            columnWidths: [2, 1, 1],
            children: [
                text('wide', 'Wide column'),
                text('narrow-a', 'Narrow'),
                text('narrow-b', 'Narrow'),
            ],
        },
        {
            id: 'section-spans',
            type: 'section',
            title: 'Three equal columns: spans 2 + 1, then a full-width row',
            columns: 3,
            children: [
                text('span-wide', 'Spans 2 columns', { span: 2 }),
                text('span-narrow', 'Spans 1 column'),
                text('span-full', 'Spans all 3 columns', { span: 3 }),
            ],
        },
        {
            id: 'section-pinned',
            type: 'section',
            title: 'Pinned placement: once any child is pinned, unpinned ones stack in column 1',
            columns: 3,
            children: [
                text('unpinned-a', 'Unpinned → column 1'),
                text('unpinned-b', 'Unpinned → column 1'),
                text('pinned', 'Pinned to column 3', { column: 3 }),
            ],
        },
        {
            id: 'section-groups',
            type: 'section',
            title: 'Groups',
            columns: 4,
            children: [
                group('group-titled', 'Titled group', [text('g1', 'Field')]),
                group('group-no-title', 'Hidden title', [text('g2', 'Field')], {
                    hideTitle: true,
                }),
                group('group-collapsible', 'Collapsible group', [text('g3', 'Field')], {
                    collapsible: true,
                    docsPath: '/docs/template-editor/elements#groups',
                }),
                group('group-collapsed', 'Starts collapsed', [text('g4', 'Field')], {
                    collapsible: true,
                    defaultCollapsed: true,
                }),
            ],
        },
        {
            id: 'section-conditions',
            type: 'section',
            title: 'Display conditions',
            columns: 3,
            children: [
                { id: 'show-extra', type: 'toggle', label: 'Show the extra group' },
                group('group-when-on', 'Shown while the toggle is on', [text('c1', 'Field')], {
                    visibleWhen: { coordinate: 'show-extra', equals: true },
                }),
                group('group-when-off', 'Shown while the toggle is off', [text('c2', 'Field')], {
                    visibleWhen: { coordinate: 'show-extra', equals: true, not: true },
                }),
                text('field-when-on', 'Field shown only while the toggle is on', {
                    visibleWhen: { coordinate: 'show-extra', equals: true },
                }),
            ],
        },
        {
            id: 'section-when-on',
            type: 'section',
            title: 'Whole section shown only while the toggle above is on',
            visibleWhen: { coordinate: 'show-extra', equals: true },
            children: [text('c3', 'Field')],
        },
    ]
);

const fields = story(
    'fields',
    'Fields',
    'Every field type and option. The last two formulas show their error states on purpose.',
    ENGINE,
    [
        {
            id: 'section-text',
            type: 'section',
            title: 'Text',
            columns: 2,
            children: [
                text('text-plain', 'Plain text'),
                text('text-placeholder', 'With placeholder', { placeholder: 'Type here…' }),
                text('text-described', 'Required, with help text', {
                    required: true,
                    description: 'Help text shows on hover.',
                }),
                text('text-hidden-label', 'Hidden label', { hideLabel: true }),
                text('text-multiline', 'Multiline', { multiline: true, column: 1 }),
            ],
        },
        {
            id: 'section-numbers',
            type: 'section',
            title: 'Numbers, toggles, ratings, resources',
            columns: 3,
            children: [
                { id: 'number-plain', type: 'number', label: 'Number' },
                {
                    id: 'number-bounded',
                    type: 'number',
                    label: 'Number 0–10, step 0.5',
                    min: 0,
                    max: 10,
                    step: 0.5,
                },
                {
                    id: 'number-capped',
                    type: 'number',
                    label: 'Maximum from "Number"',
                    maxFrom: 'number-plain',
                },
                { id: 'toggle', type: 'toggle', label: 'Toggle' },
                { id: 'rating-dots', type: 'rating', label: 'Rating: dots', max: 5 },
                {
                    id: 'rating-boxes',
                    type: 'rating',
                    label: 'Rating: boxes',
                    max: 10,
                    presentation: 'boxes',
                },
                {
                    id: 'rating-number',
                    type: 'rating',
                    label: 'Rating: number',
                    max: 5,
                    presentation: 'number',
                },
                {
                    id: 'rating-floor',
                    type: 'rating',
                    label: 'Rating with minimum 2',
                    min: 2,
                    max: 5,
                },
                {
                    id: 'rating-capped',
                    type: 'rating',
                    label: 'Rating, maximum from "Number"',
                    max: 10,
                    maxFrom: 'number-plain',
                },
                { id: 'resource', type: 'resource', label: 'Resource', max: 10 },
            ],
        },
        {
            id: 'section-choices',
            type: 'section',
            title: 'Choices',
            columns: 2,
            children: [
                {
                    id: 'choice-single',
                    type: 'select',
                    label: 'Single choice',
                    options: options(4),
                },
                {
                    id: 'choice-multiple',
                    type: 'select',
                    label: 'Multiple choice',
                    multiple: true,
                    options: options(5),
                },
                {
                    id: 'choice-hidden',
                    type: 'select',
                    label: 'Multiple, unselected hidden',
                    multiple: true,
                    hideUnselected: true,
                    options: options(5),
                },
                {
                    id: 'choice-searchable',
                    type: 'select',
                    label: 'Long list (searchable)',
                    options: options(14),
                },
            ],
        },
        {
            id: 'section-derived',
            type: 'section',
            title: 'Derived values, images, references',
            columns: 3,
            children: [
                {
                    id: 'formula-sum',
                    type: 'formula',
                    label: 'Number + Rating: dots',
                    formula: 'number-plain + rating-dots',
                },
                {
                    id: 'formula-decorated',
                    type: 'formula',
                    label: 'With prefix and suffix',
                    formula: 'max(1, rating-dots) * 2',
                    prefix: '×',
                    suffix: 'm',
                },
                {
                    id: 'formula-division',
                    type: 'formula',
                    label: 'Error: division by zero',
                    formula: '10 / (rating-number - rating-number)',
                },
                {
                    id: 'formula-unknown',
                    type: 'formula',
                    label: 'Error: unknown value',
                    formula: 'missing-value + 1',
                },
                { id: 'image', type: 'image', label: 'Image' },
                {
                    id: 'reference-single',
                    type: 'reference',
                    label: 'Document reference',
                    targetKinds: ['character'],
                },
                {
                    id: 'reference-multiple',
                    type: 'reference',
                    label: 'Several references',
                    targetKinds: ['character'],
                    multiple: true,
                },
            ],
        },
    ]
);

const catalogFields = story(
    'catalog-fields',
    'Catalog-backed choice',
    'Choosing a weapon copies its details into the fields beside it.',
    { systemId: 'star-wars-wod', documentKind: 'character' },
    [
        group('catalog-group', 'Weapon', [
            {
                id: 'weapon-pick',
                type: 'select',
                label: 'Weapon',
                options: [{ id: 'placeholder', label: 'Placeholder' }],
                binding: {
                    catalogId: 'melee-weapons',
                    fills: {
                        name: { targetFieldId: 'weapon-name' },
                        damage: { targetFieldId: 'weapon-damage' },
                    },
                },
            },
            text('weapon-name', 'Name'),
            text('weapon-damage', 'Damage'),
        ]),
    ]
);

const collections = story(
    'collections',
    'Tables and custom lists',
    'A table with mixed column types; lists with and without their own title and frame, one with presets.',
    ENGINE,
    [
        {
            id: 'table',
            type: 'table',
            title: 'Table',
            minRows: 1,
            maxRows: 5,
            columns: [
                text('table-name', 'Name'),
                { id: 'table-count', type: 'number', label: 'Count', min: 0 },
                { id: 'table-flag', type: 'toggle', label: 'Carried' },
                {
                    id: 'table-kind',
                    type: 'select',
                    label: 'Kind',
                    options: options(3),
                },
            ],
        },
        {
            id: 'section-lists',
            type: 'section',
            title: 'Custom lists',
            columns: 3,
            children: [
                { id: 'list-plain', type: 'list', title: 'Plain list', valueKey: 'list-plain' },
                {
                    id: 'list-titled',
                    type: 'list',
                    title: 'Own title and frame, 2 columns',
                    valueKey: 'list-titled',
                    columns: 2,
                    showTitle: true,
                    framed: true,
                },
                {
                    id: 'list-presets',
                    type: 'list',
                    title: 'With presets',
                    valueKey: 'list-presets',
                    showTitle: true,
                    presets: [
                        { key: 'first-preset', label: 'First preset', value: 2 },
                        { key: 'second-preset', label: 'Second preset' },
                    ],
                },
            ],
        },
    ]
);

/**
 * One variant per binding shape: the kind plus what changes its rendering (pool or rating
 * resource, member or computed-length track, field value type, equipment section).
 */
export function bindingSignature(binding: DocumentBindingDescriptor): string {
    switch (binding.kind) {
        case 'resource':
            return `resource:${binding.mode}`;
        case 'track':
            return `track:${binding.members ? 'members' : binding.length ? 'length' : binding.variants ? 'variants' : 'levels'}`;
        case 'field':
            return `field:${binding.valueType}${binding.options ? ':options' : ''}`;
        case 'equipment':
            return `equipment:${binding.sectionId}`;
        default:
            return binding.kind;
    }
}

function boundNodes(binding: DocumentBindingDescriptor, index: number): NodeInput[] {
    const id = `bound-${index}`;
    const primitive = (suffix: string, extra: NodeInput = {}): NodeInput => ({
        id: `${id}-${suffix}`,
        type: 'primitive',
        bindingKey: binding.key,
        ...extra,
    });
    switch (binding.kind) {
        case 'list':
            return [
                {
                    id,
                    type: 'list',
                    bindingKey: binding.key,
                    title: binding.label,
                    showTitle: true,
                    framed: true,
                },
            ];
        case 'resource':
            return binding.mode === 'pool'
                ? [
                      primitive('current'),
                      primitive('max', { part: 'max' }),
                      primitive('compact', { compact: true }),
                  ]
                : [primitive('full'), primitive('compact', { compact: true })];
        case 'track':
            return [
                primitive('table', { trackLayout: 'table' }),
                primitive('strip', { trackLayout: 'strip' }),
                primitive('compact', { compact: true }),
            ];
        case 'equipment':
        case 'rows':
            return [primitive('full')];
        default:
            return [primitive('full'), primitive('compact', { compact: true })];
    }
}

/** Bound parts per system: each binding shape once, on the first document kind declaring it. */
export function boundPartStories(): ElementStory[] {
    const stories: ElementStory[] = [];
    for (const system of systemRegistry.getSystems()) {
        const seen = new Set<string>();
        const kinds = [...new Set(system.documents.map(({ kind }) => String(kind)))];
        for (const kind of kinds) {
            const picked = listDocumentBindings(system.id, kind).filter((binding) => {
                const signature = bindingSignature(binding);
                if (seen.has(signature)) return false;
                seen.add(signature);
                return true;
            });
            if (picked.length === 0) continue;
            const children: TemplateNode[] = [];
            picked.forEach((binding, index) => {
                children.push({
                    id: `part-${index}`,
                    type: 'group',
                    title: `${bindingSignature(binding)} — ${binding.label}`,
                    collapsible: false,
                    children: boundNodes(binding, index),
                } as unknown as TemplateNode);
            });
            stories.push(
                story(
                    `bound-${system.id}-${kind}`,
                    `Built-in parts: ${system.id} / ${kind}`,
                    'Each binding shape of this system once: full, compact, and part or layout variants.',
                    { systemId: system.id, documentKind: kind },
                    children as unknown as NodeInput[]
                )
            );
        }
    }
    return stories;
}

export const HANDWRITTEN_STORIES: readonly ElementStory[] = [
    containers,
    fields,
    catalogFields,
    collections,
];

let allStories: readonly ElementStory[] | undefined;

/** Every story, handwritten first; bound parts are built on first use (the registry is ready). */
export function listElementStories(): readonly ElementStory[] {
    allStories ??= [...HANDWRITTEN_STORIES, ...boundPartStories()];
    return allStories;
}
