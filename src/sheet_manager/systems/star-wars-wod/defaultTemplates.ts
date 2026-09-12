import { DocumentKindSchema, SystemIdSchema } from '../../types/document';
import {
    type CustomTemplate,
    type GroupNode,
    type ListNode,
    type PrimitiveNode,
    type SectionNode,
    TEMPLATE_SCHEMA_VERSION,
    type TemplateField,
    type TemplateNode,
} from '../../types/template';

/**
 * Explicit default templates (feature 006, research R9): pure declarative trees rebuilt from
 * scratch to mirror the built-in viewer order Base → Attributes → Skills → Advantages → Force
 * → Body → Other — identity fields, portrait image, trait fields, custom + system list
 * bindings, the health track, resource primitives with system-default `maxFrom` formulas,
 * derived-stat formula fields, and equipment bindings. ZERO `built-in` placements: the
 * specialized creature/vehicle/fodder pages simply have no declarative default (their built-in
 * layout renders), so no shipped template references the legacy placement path.
 *
 * Document-backed content is composed through fields whose value keys the binding registry
 * bridges to document data at render time; accents are automatic (sibling parity, FR-11) and
 * never stored.
 */

const DOCS = {
    base: '/docs/star-wars-wod-2e/quick-start#2-fill-in-the-basics',
    attributes: '/docs/star-wars-wod-2e/core-rules/attributes-abilities#attributes',
    skills: '/docs/star-wars-wod-2e/core-rules/attributes-abilities#abilities',
    meritsFlaws: '/docs/star-wars-wod-2e/character/merits-flaws',
    backgrounds: '/docs/star-wars-wod-2e/character/backgrounds',
    virtues: '/docs/star-wars-wod-2e/character/virtues-willpower#the-three-virtues',
    derived: '/docs/star-wars-wod-2e/character/virtues-willpower#derived-stats',
    force: '/docs/star-wars-wod-2e/character/force',
    forcePowers: '/docs/star-wars-wod-2e/character/force#force-powers',
    forceSkills: '/docs/star-wars-wod-2e/character/force#force-skills',
    equipment: '/docs/star-wars-wod-2e/equipment',
} as const;

const kebab = (value: string) => value.toLowerCase().replace(/\s+/g, '-');

function text(
    id: string,
    label: string,
    valueKey: string,
    options: { multiline?: boolean; compact?: boolean } = {}
): TemplateField {
    return {
        id,
        type: 'text',
        label,
        valueKey,
        multiline: options.multiline ?? false,
        compact: options.compact ?? false,
        required: false,
    };
}

function trait(key: string, options: { compact?: boolean; maxFrom?: string } = {}): TemplateField {
    return {
        id: `trait-${kebab(key)}`,
        type: 'rating',
        label: key,
        valueKey: kebab(key),
        min: 0,
        max: 5,
        presentation: 'dots',
        compact: options.compact ?? false,
        required: false,
        ...(options.maxFrom ? { maxFrom: options.maxFrom } : {}),
    };
}

function resource(
    id: string,
    bindingKey: string,
    label: string,
    options: { maxFrom?: string; compact?: boolean } = {}
): PrimitiveNode {
    return {
        id,
        type: 'primitive',
        bindingKey,
        label,
        compact: options.compact ?? false,
        ...(options.maxFrom ? { maxFrom: options.maxFrom } : {}),
    };
}

function systemList(id: string, bindingKey: string, title: string): ListNode {
    return { id, type: 'list', bindingKey, title, columns: 1 };
}

function group(id: string, title: string, children: TemplateNode[], columns?: number): GroupNode {
    return {
        id,
        type: 'group',
        title,
        collapsible: false,
        children,
        ...(columns ? { columns } : {}),
    };
}

function section(
    id: string,
    title: string,
    docsPath: string,
    children: TemplateNode[],
    columns?: number
): SectionNode {
    return {
        id,
        type: 'section',
        title,
        docsPath,
        children,
        ...(columns ? { columns } : {}),
    };
}

const ATTRIBUTE_GROUPS: ReadonlyArray<{ id: string; title: string; keys: string[] }> = [
    { id: 'attributes-physical', title: 'Physical', keys: ['Strength', 'Dexterity', 'Stamina'] },
    { id: 'attributes-social', title: 'Social', keys: ['Charisma', 'Manipulation', 'Appearance'] },
    { id: 'attributes-mental', title: 'Mental', keys: ['Perception', 'Intelligence', 'Wits'] },
];

const ABILITY_GROUPS: ReadonlyArray<{ id: string; title: string; list: string; keys: string[] }> = [
    {
        id: 'abilities-talents',
        title: 'Talents',
        list: 'list-talents',
        keys: [
            'Alertness',
            'Athletics',
            'Brawl',
            'Command',
            'Diplomacy',
            'Dodge',
            'Empathy',
            'Intimidation',
            'Streetwise',
            'Subterfuge',
        ],
    },
    {
        id: 'abilities-skills',
        title: 'Skills',
        list: 'list-skills',
        keys: [
            'Blaster',
            'Gunnery',
            'Melee',
            'Pilot',
            'Programming',
            'Repair',
            'Ride',
            'Security',
            'Stealth',
            'Survival',
        ],
    },
    {
        id: 'abilities-knowledges',
        title: 'Knowledges',
        list: 'list-knowledges',
        keys: [
            'Astrogation',
            'Bureaucracy',
            'Cultures',
            'Interfaces',
            'Investigation',
            'Languages',
            'Medicine',
            'Politics',
            'Tech',
            'Trade',
        ],
    },
];

const FORCE_SKILL_KEYS = ['Control', 'Dynamism', 'Rapport', 'Sense', 'Telekinesis'] as const;
const VIRTUE_KEYS = ['Conscience', 'Passion', 'Self Control'] as const;

const IDENTITY_FIELDS: ReadonlyArray<[string, string]> = [
    ['name', 'Name'],
    ['concept', 'Concept'],
    ['player', 'Player'],
    ['nature', 'Nature'],
    ['adventure', 'Adventure'],
    ['demeanor', 'Demeanor'],
    ['species', 'Species'],
    ['age', 'Age'],
];

function identityGroup(compact = false): GroupNode {
    return group(
        'identity-fields',
        'Identity',
        IDENTITY_FIELDS.map(([key, label], index) =>
            text(`field-${key}`, label, key, {
                ...(index < 2 && compact ? { multiline: false } : {}),
                compact,
            })
        ),
        compact ? 3 : 2
    );
}

function baseSection(compact = false): SectionNode {
    return section('base', 'Base', DOCS.base, [
        identityGroup(compact),
        group('base-description', 'Description', [
            text('field-appearance', 'Appearance', 'appearance', { multiline: true, compact }),
            text('field-biography', 'Biography', 'biography', { multiline: true, compact }),
        ]),
        {
            id: 'portrait-image',
            type: 'image',
            label: 'Portrait',
            valueKey: 'portrait',
            compact,
            required: false,
        },
    ]);
}

function attributesSection(compact = false): SectionNode {
    return section(
        'attributes',
        'Attributes',
        DOCS.attributes,
        ATTRIBUTE_GROUPS.map(({ id, title, keys }) =>
            group(
                id,
                title,
                keys.map((key) => trait(key, { compact })),
                compact ? 1 : 3
            )
        )
    );
}

function skillsSection(compact = false): SectionNode {
    return section(
        'skills',
        'Skills',
        DOCS.skills,
        ABILITY_GROUPS.map(({ id, title, list, keys }) =>
            group(id, title, [
                ...keys.map((key) => trait(key, { compact })),
                systemList(
                    list,
                    `list:custom${title.slice(0, 1).toUpperCase()}${title.slice(1)}`,
                    `Custom ${title.toLowerCase()}`
                ),
            ])
        )
    );
}

function advantagesSection(): SectionNode {
    return section(
        'advantages',
        'Advantages',
        DOCS.meritsFlaws,
        [
            group('advantages-backgrounds', 'Backgrounds', [
                systemList('list-backgrounds', 'list:backgrounds', 'Backgrounds'),
            ]),
            group('advantages-merits', 'Merits', [
                systemList('list-merits', 'list:merits', 'Merits'),
            ]),
            group('advantages-flaws', 'Flaws', [systemList('list-flaws', 'list:flaws', 'Flaws')]),
        ],
        3
    );
}

function forceSection(compact = false): SectionNode {
    return section('force', 'Force', DOCS.force, [
        group(
            'force-skills-group',
            'Force Skills',
            FORCE_SKILL_KEYS.map((key) => trait(key, { compact })),
            3
        ),
        group(
            'force-virtues',
            'Virtues',
            VIRTUE_KEYS.map((key) => trait(key, { compact })),
            3
        ),
        group(
            'force-resources',
            'Resources',
            [
                resource('resource-willpower', 'resource:willpower', 'Willpower', {
                    maxFrom: 'conscience + passion + self-control',
                    compact,
                }),
                resource('resource-force-points', 'resource:force-points', 'Force Points', {
                    maxFrom: 'willpower.max',
                    compact,
                }),
                resource(
                    'resource-dark-side',
                    'resource:dark-side-resistance',
                    'Dark Side Resistance',
                    {
                        compact,
                    }
                ),
            ],
            3
        ),
        group('force-powers-group', 'Force Powers', [
            systemList('list-force-powers', 'list:forcePowers', 'Force Powers'),
        ]),
    ]);
}

function bodySection(): SectionNode {
    return section('body', 'Body & health', DOCS.equipment, [
        { id: 'track-health', type: 'primitive', bindingKey: 'track:health', compact: false },
        {
            id: 'equipment-inventory',
            type: 'primitive',
            bindingKey: 'equipment:inventory',
            compact: false,
        },
        { id: 'equipment-armor', type: 'primitive', bindingKey: 'equipment:armor', compact: false },
        {
            id: 'equipment-weapons',
            type: 'primitive',
            bindingKey: 'equipment:weapons',
            compact: false,
        },
        {
            id: 'equipment-implants',
            type: 'primitive',
            bindingKey: 'equipment:implants',
            compact: false,
        },
    ]);
}

function otherSection(compact = false): SectionNode {
    return section('other', 'Other', DOCS.derived, [
        group(
            'derived-stats',
            'Derived Stats',
            [
                {
                    id: 'derived-initiative',
                    type: 'formula',
                    label: 'Initiative (standard)',
                    formula: 'wits + alertness',
                    compact,
                    required: false,
                },
                {
                    id: 'derived-initiative-saber',
                    type: 'formula',
                    label: 'Initiative (lightsaber)',
                    formula: 'wits + alertness + control',
                    compact,
                    required: false,
                },
            ],
            2
        ),
    ]);
}

function fullSheet(viewId: string, name: string, compact = false): CustomTemplate {
    return {
        id: viewId,
        name,
        systemId: SystemIdSchema.parse('star-wars-wod'),
        documentKind: DocumentKindSchema.parse('character'),
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            baseSection(compact),
            attributesSection(compact),
            skillsSection(compact),
            advantagesSection(),
            forceSection(compact),
            bodySection(),
            otherSection(compact),
        ],
    };
}

function briefSheet(viewId: string, name: string): CustomTemplate {
    return {
        id: viewId,
        name,
        systemId: SystemIdSchema.parse('star-wars-wod'),
        documentKind: DocumentKindSchema.parse('character'),
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            section('base', 'Base', DOCS.base, [
                group(
                    'identity-fields',
                    'Identity',
                    IDENTITY_FIELDS.filter(([key]) =>
                        ['name', 'concept', 'species'].includes(key)
                    ).map(([key, label]) => text(`field-${key}`, label, key, { compact: true })),
                    3
                ),
                {
                    id: 'portrait-image',
                    type: 'image',
                    label: 'Portrait',
                    valueKey: 'portrait',
                    compact: true,
                    required: false,
                },
            ]),
            attributesSection(true),
            section('condition', 'Condition', DOCS.derived, [
                group('condition-track', 'Condition', [
                    {
                        id: 'track-health',
                        type: 'primitive',
                        bindingKey: 'track:health',
                        compact: true,
                    },
                    resource('resource-willpower', 'resource:willpower', 'Willpower', {
                        maxFrom: 'conscience + passion + self-control',
                        compact: true,
                    }),
                    {
                        id: 'derived-initiative',
                        type: 'formula',
                        label: 'Initiative (standard)',
                        formula: 'wits + alertness',
                        compact: true,
                        required: false,
                    },
                ]),
            ]),
            section(
                'lists',
                'Custom lists',
                DOCS.skills,
                [
                    systemList('list-talents', 'list:customTalents', 'Custom talents'),
                    systemList('list-skills', 'list:customSkills', 'Custom skills'),
                    systemList('list-knowledges', 'list:customKnowledges', 'Custom knowledges'),
                ],
                3
            ),
        ],
    };
}

/** All default templates for the setup (R9): pure declarative trees, zero placements. */
export const starWarsWodDefaultTemplates: readonly CustomTemplate[] = [
    fullSheet('full-sheet', 'Full sheet'),
    fullSheet('droid-sheet', 'Droid sheet'),
    briefSheet('brief', 'Brief'),
];
