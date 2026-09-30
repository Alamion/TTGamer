import { systemRegistry } from '../systems';
import { type DocumentBindingDescriptor, listDocumentBindings } from '../systems/templateBindings';
import { type UserCatalog, UserCatalogSchema } from '../systems/userCatalogs';
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
                text('text-label-left', 'Label beside', { labelPosition: 'left' }),
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
                    id: 'rating-hidden-label',
                    type: 'rating',
                    label: 'Rating with hidden label',
                    hideLabel: true,
                    max: 5,
                },
                {
                    id: 'rating-text',
                    type: 'rating',
                    label: 'Rating with text',
                    max: 5,
                    textInput: true,
                },
                {
                    id: 'rating-numbers',
                    type: 'rating',
                    label: 'Rating with numbers',
                    max: 5,
                    showNumbers: true,
                },
                {
                    id: 'rating-dice',
                    type: 'rating',
                    label: 'Rating with a die',
                    max: 5,
                    dice: true,
                },
                {
                    id: 'rating-flags',
                    type: 'rating',
                    label: 'Rating with S, P, E',
                    max: 5,
                    dice: true,
                    textInput: true,
                    flags: ['specialization', 'practiced', 'experienced'],
                },
                {
                    id: 'rating-dice-number',
                    type: 'rating',
                    label: 'Rating: number with a die',
                    max: 10,
                    presentation: 'number',
                    dice: true,
                },
                {
                    id: 'rating-number-framed',
                    type: 'rating',
                    label: 'Rating: number with maximum',
                    max: 10,
                    presentation: 'number',
                    showNumbers: true,
                },
                {
                    id: 'rating-label-top',
                    type: 'rating',
                    label: 'Rating, label above',
                    max: 5,
                    labelPosition: 'top',
                },
                {
                    id: 'rating-many',
                    type: 'rating',
                    label: 'Rating with 30 dots',
                    max: 30,
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

/** A user catalog for the stories below (spec 015): registered on the registry, never stored. */
export const SAMPLE_CATALOG_ID = 'user-catalog-storybk1';
const SAMPLE_POWER = 'c-power001';
const SAMPLE_CURSED = 'c-cursed01';

export const SAMPLE_CATALOG: UserCatalog = UserCatalogSchema.parse({
    id: SAMPLE_CATALOG_ID,
    name: 'Sample relics',
    owner: { rulesetId: ENGINE.systemId },
    columns: [
        { id: SAMPLE_POWER, name: 'Power', type: 'number' },
        { id: SAMPLE_CURSED, name: 'Cursed', type: 'toggle' },
    ],
    entries: [
        {
            id: 'e-bonefl01',
            name: 'Bone Flute',
            values: { [SAMPLE_POWER]: 2, [SAMPLE_CURSED]: false },
        },
        {
            id: 'e-mirror01',
            name: 'Black Mirror',
            values: { [SAMPLE_POWER]: 4, [SAMPLE_CURSED]: true },
        },
        { id: 'e-candle01', name: 'Grave Candle', values: { [SAMPLE_POWER]: 1 } },
    ],
    createdAt: '2026-09-27T00:00:00.000Z',
    updatedAt: '2026-09-27T00:00:00.000Z',
});

const userCatalogFields = story(
    'user-catalog',
    'Your own catalog',
    'A choice field, a list, and a table column bound to a user catalog: picking fills the mapped fields, the list value, or the same row.',
    ENGINE,
    [
        group('user-catalog-field', 'Choice field', [
            {
                id: 'relic-pick',
                type: 'select',
                label: 'Relic',
                options: [{ id: 'placeholder', label: 'Placeholder' }],
                binding: {
                    catalogId: SAMPLE_CATALOG_ID,
                    fills: {
                        [SAMPLE_POWER]: { targetFieldId: 'relic-power' },
                        [SAMPLE_CURSED]: { targetFieldId: 'relic-cursed' },
                    },
                },
            },
            { id: 'relic-power', type: 'number', label: 'Power' },
            { id: 'relic-cursed', type: 'toggle', label: 'Cursed' },
        ]),
        {
            id: 'relic-list',
            type: 'list',
            title: 'Relics carried',
            showTitle: true,
            valueKey: 'relic-list',
            catalog: { catalogId: SAMPLE_CATALOG_ID, valueFrom: SAMPLE_POWER },
        },
        {
            id: 'relic-table',
            type: 'table',
            title: 'Relic table',
            minRows: 2,
            maxRows: 5,
            columns: [
                {
                    id: 'relic-item',
                    type: 'select',
                    label: 'Relic',
                    options: [{ id: 'placeholder', label: 'Placeholder' }],
                    binding: {
                        catalogId: SAMPLE_CATALOG_ID,
                        fills: {
                            [SAMPLE_POWER]: { targetFieldId: 'relic-item-power' },
                            [SAMPLE_CURSED]: { targetFieldId: 'relic-item-cursed' },
                        },
                    },
                },
                { id: 'relic-item-power', type: 'number', label: 'Power' },
                { id: 'relic-item-cursed', type: 'toggle', label: 'Cursed' },
            ],
        },
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

const listEntries = story(
    'list-entries',
    'Custom list entries',
    'One list per entry type: each entry is a copy of one field. Notes and pictures have no typed name.',
    ENGINE,
    [
        {
            id: 'section-entries',
            type: 'section',
            title: 'Entry types',
            columns: 2,
            children: [
                {
                    id: 'entries-text',
                    type: 'list',
                    title: 'Contacts (text)',
                    showTitle: true,
                    valueKey: 'entries-text',
                    item: text('entries-text-item', 'Note'),
                },
                {
                    id: 'entries-notes',
                    type: 'list',
                    title: 'Notes (multi-line, unnamed)',
                    showTitle: true,
                    valueKey: 'entries-notes',
                    named: false,
                    item: text('entries-notes-item', 'Note', { multiline: true, hideLabel: true }),
                },
                {
                    id: 'entries-number',
                    type: 'list',
                    title: 'Debts (number)',
                    showTitle: true,
                    valueKey: 'entries-number',
                    item: { id: 'entries-number-item', type: 'number', label: 'Amount', min: 0 },
                },
                {
                    id: 'entries-toggle',
                    type: 'list',
                    title: 'Oaths kept (toggle)',
                    showTitle: true,
                    valueKey: 'entries-toggle',
                    item: { id: 'entries-toggle-item', type: 'toggle', label: 'Kept' },
                },
                {
                    id: 'entries-select',
                    type: 'list',
                    title: 'Rituals (choice)',
                    showTitle: true,
                    valueKey: 'entries-select',
                    item: {
                        id: 'entries-select-item',
                        type: 'select',
                        label: 'Level',
                        options: options(3),
                    },
                },
                {
                    id: 'entries-rating',
                    type: 'list',
                    title: 'Backgrounds (rating, number style)',
                    showTitle: true,
                    valueKey: 'entries-rating',
                    item: {
                        id: 'entries-rating-item',
                        type: 'rating',
                        label: 'Dots',
                        presentation: 'number',
                        max: 10,
                        showNumbers: true,
                    },
                },
                {
                    id: 'entries-resource',
                    type: 'list',
                    title: 'Bonds (resource)',
                    showTitle: true,
                    valueKey: 'entries-resource',
                    item: { id: 'entries-resource-item', type: 'resource', label: 'Bond', max: 10 },
                },
                {
                    id: 'entries-reference',
                    type: 'list',
                    title: 'Allies (document reference)',
                    showTitle: true,
                    valueKey: 'entries-reference',
                    item: {
                        id: 'entries-reference-item',
                        type: 'reference',
                        label: 'Ally',
                        targetKinds: ['character'],
                    },
                },
                {
                    id: 'entries-image',
                    type: 'list',
                    title: 'Mementos (image, unnamed)',
                    showTitle: true,
                    valueKey: 'entries-image',
                    named: false,
                    item: { id: 'entries-image-item', type: 'image', label: 'Memento' },
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

/** Seven health levels with WoD penalties, ids fixed so stories stay stable. */
const HEALTH_LEVELS: NodeInput[] = [
    ['bruised', 'Bruised', '0'],
    ['hurt', 'Hurt', '-1'],
    ['injured', 'Injured', '-1'],
    ['wounded', 'Wounded', '-2'],
    ['mauled', 'Mauled', '-2'],
    ['crippled', 'Crippled', '-5'],
    ['incapacitated', 'Incapacitated', ''],
].map(([id, name, value]) => ({ id, name, value }));

const BASHING = { id: 'bashing', name: 'Bashing', symbol: '╱', fill: 'secondary' };
const LETHAL = { id: 'lethal', name: 'Lethal', symbol: '×', fill: 'error' };
const AGGRAVATED = { id: 'aggravated', name: 'Aggravated', symbol: '✱', fill: 'tertiary' };

const tracker = (id: string, label: string, extra: NodeInput = {}): NodeInput => ({
    id,
    type: 'tracker',
    label,
    marks: [BASHING, LETHAL],
    levels: HEALTH_LEVELS,
    valueColumn: { title: 'Penalty', show: true },
    columns: [{ id: 'damage', kind: 'marks', title: 'Damage' }],
    ...extra,
});

const trackers = story(
    'trackers',
    'Trackers',
    'Own trackers (spec 018): a click moves a box to the next mark, then back to empty. Each display, one to three and own marks, text and repeated columns, lengths, and out.',
    ENGINE,
    [
        {
            id: 'section-tracker-displays',
            type: 'section',
            title: 'Displays and marks',
            columns: 2,
            children: [
                tracker('tracker-table', 'Health (table, two marks)'),
                tracker('tracker-wod20', 'Health (WoD 20th, three marks)', {
                    marks: [BASHING, LETHAL, AGGRAVATED],
                }),
                tracker('tracker-strip', 'Health (strip)', { display: 'strip' }),
                tracker('tracker-line', 'Health (one line)', { display: 'line', total: false }),
                tracker('tracker-stress', 'Stress (one own mark, bonuses)', {
                    marks: [{ id: 'strained', name: 'Strained', symbol: '●', fill: '#0e7490' }],
                    levels: [
                        { id: 'calm', name: 'Calm', value: '' },
                        { id: 'tense', name: 'Tense', value: '+1' },
                        { id: 'shaken', name: 'Shaken', value: '+2' },
                        { id: 'frantic', name: 'Frantic', value: '+3' },
                        { id: 'broken', name: 'Broken', value: '' },
                    ],
                    valueColumn: { title: 'Bonus', show: true },
                    columns: [
                        { id: 'stress', kind: 'marks', title: 'Stress' },
                        { id: 'trigger', kind: 'text', title: 'Trigger', covers: 3 },
                    ],
                }),
                tracker('tracker-plain', 'Burden (one mark, no values)', {
                    marks: [{ id: 'marked', name: 'Marked', symbol: '×', fill: 'text' }],
                    valueColumn: { show: false },
                    total: false,
                    hideLabel: true,
                }),
            ],
        },
        {
            id: 'section-tracker-copies',
            type: 'section',
            title: 'Copies and lengths',
            children: [
                tracker('tracker-members', 'Members (copies A, B, C…, lengths 3 / 5 / 7, out)', {
                    columns: [
                        { id: 'health', kind: 'marks', title: 'Health', copies: { max: 12 } },
                    ],
                    lengths: [
                        { levels: ['hurt', 'injured', 'incapacitated'] },
                        { levels: ['bruised', 'hurt', 'injured', 'wounded', 'incapacitated'] },
                        { levels: HEALTH_LEVELS.map(({ id }) => id as string) },
                    ],
                    out: true,
                }),
            ],
        },
    ]
);

export const HANDWRITTEN_STORIES: readonly ElementStory[] = [
    containers,
    fields,
    catalogFields,
    userCatalogFields,
    collections,
    listEntries,
    trackers,
];

let allStories: readonly ElementStory[] | undefined;

/** Every story, handwritten first; bound parts are built on first use (the registry is ready). */
export function listElementStories(): readonly ElementStory[] {
    systemRegistry.registerSampleCatalogs([SAMPLE_CATALOG]);
    allStories ??= [...HANDWRITTEN_STORIES, ...boundPartStories()];
    return allStories;
}
