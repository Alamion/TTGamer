import { uiMessages } from '@site/src/i18n/generated/uiMessages';

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
 * Shipped Star Wars default templates: pure declarative trees. Document-backed content is
 * composed through fields whose value keys the binding registry bridges to document data at
 * render time; multi-column sections place their groups with `column`, so a column can stack
 * several groups. Accents are automatic (sibling parity) and never stored.
 */

const DOCS = {
    base: '/docs/star-wars-wod-2e/quick-start#2-fill-in-the-basics',
    attributes: '/docs/star-wars-wod-2e/core-rules/attributes-abilities#attributes',
    skills: '/docs/star-wars-wod-2e/core-rules/attributes-abilities#abilities',
    meritsFlaws: '/docs/star-wars-wod-2e/character/merits-flaws',
    virtues: '/docs/star-wars-wod-2e/character/virtues-willpower#the-three-virtues',
    derived: '/docs/star-wars-wod-2e/character/virtues-willpower#derived-stats',
    force: '/docs/star-wars-wod-2e/character/force',
    forcePowers: '/docs/star-wars-wod-2e/character/force#force-powers',
    forceSkills: '/docs/star-wars-wod-2e/character/force#force-skills',
    equipment: '/docs/star-wars-wod-2e/equipment',
    inventory: '/docs/star-wars-wod-2e/equipment#tools-gear',
    weapons: '/docs/star-wars-wod-2e/equipment#weapons',
    armor: '/docs/star-wars-wod-2e/equipment#armor',
    implants: '/docs/star-wars-wod-2e/equipment#cybernetics',
    health: '/docs/star-wars-wod-2e/combat/health-damage-heal#the-health-track',
    experience: '/docs/star-wars-wod-2e/gm/rewards-advancement',
} as const;

const kebab = (value: string) => value.toLowerCase().replace(/\s+/g, '-');

interface TextOptions {
    multiline?: boolean;
    compact?: boolean;
    hideLabel?: boolean;
    placeholder?: string;
}

function text(
    id: string,
    label: string,
    valueKey: string,
    options: TextOptions = {}
): TemplateField {
    return {
        id,
        type: 'text',
        label,
        valueKey,
        multiline: options.multiline ?? false,
        compact: options.compact ?? false,
        required: false,
        ...(options.hideLabel ? { hideLabel: true } : {}),
        ...(options.placeholder ? { placeholder: options.placeholder } : {}),
    };
}

function number(id: string, label: string, valueKey: string): TemplateField {
    return { id, type: 'number', label, valueKey, min: 0, compact: false, required: false };
}

function formula(
    id: string,
    label: string,
    source: string,
    options: { compact?: boolean; prefix?: string } = {}
): TemplateField {
    return {
        id,
        type: 'formula',
        label,
        formula: source,
        compact: options.compact ?? false,
        required: false,
        ...(options.prefix ? { prefix: options.prefix } : {}),
    };
}

function trait(key: string, options: { compact?: boolean } = {}): TemplateField {
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
    };
}

function resource(
    id: string,
    bindingKey: string,
    label: string,
    options: {
        maxFrom?: string;
        minFrom?: string;
        compact?: boolean;
        part?: 'current' | 'max';
    } = {}
): PrimitiveNode {
    return {
        id,
        type: 'primitive',
        bindingKey,
        label,
        compact: options.compact ?? false,
        ...(options.maxFrom ? { maxFrom: options.maxFrom } : {}),
        ...(options.minFrom ? { minFrom: options.minFrom } : {}),
        ...(options.part ? { part: options.part } : {}),
    };
}

function primitive(
    id: string,
    bindingKey: string,
    options: { compact?: boolean; hideLabel?: boolean; label?: string } = {}
): PrimitiveNode {
    return {
        id,
        type: 'primitive',
        bindingKey,
        compact: options.compact ?? false,
        ...(options.hideLabel ? { hideLabel: true } : {}),
        ...(options.label ? { label: options.label } : {}),
    };
}

function systemList(id: string, bindingKey: string, title: string): ListNode {
    return { id, type: 'list', bindingKey, title, columns: 1 };
}

interface GroupOptions {
    columns?: number;
    columnWidths?: number[];
    column?: number;
    collapsible?: boolean;
    hideTitle?: boolean;
    docsPath?: string;
}

function group(
    id: string,
    title: string,
    children: TemplateNode[],
    options: GroupOptions = {}
): GroupNode {
    return {
        id,
        type: 'group',
        title,
        collapsible: options.collapsible ?? false,
        children,
        ...(options.columns ? { columns: options.columns } : {}),
        ...(options.columnWidths ? { columnWidths: options.columnWidths } : {}),
        ...(options.column ? { column: options.column } : {}),
        ...(options.hideTitle ? { hideTitle: true } : {}),
        ...(options.docsPath ? { docsPath: options.docsPath } : {}),
    };
}

function section(
    id: string,
    title: string,
    docsPath: string,
    children: TemplateNode[],
    columns?: number,
    columnWidths?: number[]
): SectionNode {
    return {
        id,
        type: 'section',
        title,
        docsPath,
        children,
        ...(columns ? { columns } : {}),
        ...(columnWidths ? { columnWidths } : {}),
    };
}

/** Character sheets and droid sheets share one layout with droid-specific differences. */
type SheetVariant = 'character' | 'droid';

/** Virtue-derived minimums of the editable resources (original sheet rules). */
const MINIMUMS = {
    willpower: 'min(passion + self-control, 10)',
    maxForcePoints: 'self-control',
    darkSide: 'max(0, min(5 + conscience - passion, 10))',
} as const;

const ATTRIBUTE_GROUPS: ReadonlyArray<{ id: string; title: string; keys: string[] }> = [
    { id: 'attributes-physical', title: 'Physical', keys: ['Strength', 'Dexterity', 'Stamina'] },
    { id: 'attributes-social', title: 'Social', keys: ['Charisma', 'Manipulation', 'Appearance'] },
    { id: 'attributes-mental', title: 'Mental', keys: ['Perception', 'Intelligence', 'Wits'] },
];

const ABILITY_GROUPS: ReadonlyArray<{
    id: string;
    title: string;
    list: string;
    bindingKey: string;
    listTitle: string;
    keys: string[];
}> = [
    {
        id: 'abilities-talents',
        title: 'Talents',
        list: 'list-talents',
        bindingKey: 'list:customTalents',
        listTitle: 'Custom talents',
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
        bindingKey: 'list:customSkills',
        listTitle: 'Custom skills',
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
        bindingKey: 'list:customKnowledges',
        listTitle: 'Custom knowledges',
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

/** Identity fields in reading order (three columns: left→right, top→bottom). */
const IDENTITY_FIELDS: ReadonlyArray<[valueKey: string, label: string]> = [
    ['name', 'Name'],
    ['concept', 'Concept'],
    ['species', 'Species'],
    ['player', 'Player'],
    ['nature', 'Nature'],
    ['home-world', 'Home World'],
    ['adventure', 'Adventure'],
    ['demeanor', 'Demeanor'],
    ['age', 'Age'],
];

const APPEARANCE_FIELDS: ReadonlyArray<[valueKey: string, label: string]> = [
    ['gender', 'Gender'],
    ['height', 'Height'],
    ['build', 'Build'],
    ['hair', 'Hair'],
    ['eyes', 'Eyes'],
    ['features', 'Features'],
];

const PORTRAIT: TemplateField = {
    id: 'portrait-image',
    type: 'image',
    label: 'Portrait',
    valueKey: 'portrait',
    compact: false,
    required: false,
};

const textFields = (fields: ReadonlyArray<[string, string]>, compact = false) =>
    fields.map(([key, label]) => text(`field-${key}`, label, key, { compact }));

function baseSection(): SectionNode {
    return section(
        'base',
        'Base',
        DOCS.base,
        [
            group('base-portrait', 'Portrait', [{ ...PORTRAIT, hideLabel: true }], {
                column: 1,
                collapsible: true,
            }),
            group('identity-fields', 'Identity', textFields(IDENTITY_FIELDS), {
                column: 2,
                columns: 3,
                hideTitle: true,
            }),
            group('base-appearance', 'Appearance', textFields(APPEARANCE_FIELDS), {
                column: 2,
                columns: 3,
                collapsible: true,
            }),
            group(
                'base-biography',
                'Biography',
                [
                    text('field-biography', 'Biography', 'biography', {
                        multiline: true,
                        hideLabel: true,
                        placeholder: 'Character biography...',
                    }),
                ],
                { column: 2, collapsible: true }
            ),
        ],
        2
    );
}

function attributesSection(): SectionNode {
    return section(
        'attributes',
        'Attributes',
        DOCS.attributes,
        ATTRIBUTE_GROUPS.map(({ id, title, keys }) =>
            group(
                id,
                title,
                keys.map((key) => trait(key))
            )
        ),
        3
    );
}

function skillsSection(variant: SheetVariant): SectionNode {
    return section(
        'skills',
        'Skills',
        DOCS.skills,
        ABILITY_GROUPS.map(({ id, title, list, bindingKey, listTitle, keys }) =>
            group(id, title, [
                ...keys.map((key) => trait(key)),
                systemList(list, bindingKey, listTitle),
                // Droids may bank ability points they have not spread yet (per group).
                ...(variant === 'droid'
                    ? [
                          number(
                              `droid-free-${list.slice(5)}`,
                              'Free points',
                              `droid-free-${list.slice(5)}`
                          ),
                      ]
                    : []),
            ])
        ),
        3
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

function resourcesGroup(variant: SheetVariant, column: number): GroupNode {
    return group(
        'force-resources',
        'Resources',
        [
            resource('resource-willpower', 'resource:willpower', 'Willpower', {
                minFrom: MINIMUMS.willpower,
            }),
            ...(variant === 'droid'
                ? []
                : [
                      resource(
                          'resource-max-force-points',
                          'resource:force-points',
                          'Max Force Points',
                          {
                              part: 'max',
                              minFrom: MINIMUMS.maxForcePoints,
                          }
                      ),
                      resource('resource-force-points', 'resource:force-points', 'Force Points'),
                      resource(
                          'resource-dark-side',
                          'resource:dark-side-resistance',
                          'Dark Side Resistance',
                          {
                              minFrom: MINIMUMS.darkSide,
                          }
                      ),
                  ]),
        ],
        { column }
    );
}

function forceSection(variant: SheetVariant): SectionNode {
    const virtues = (column: number) =>
        group(
            'force-virtues',
            'Virtues',
            VIRTUE_KEYS.map((key) => trait(key)),
            { column, docsPath: DOCS.virtues }
        );
    // Droids have no Force: virtues and Willpower only.
    if (variant === 'droid') {
        return section(
            'force',
            'Resources',
            DOCS.virtues,
            [virtues(1), resourcesGroup(variant, 2)],
            2
        );
    }
    return section(
        'force',
        'Force',
        DOCS.force,
        [
            group(
                'force-skills-group',
                'Force Skills',
                FORCE_SKILL_KEYS.map((key) => trait(key)),
                { column: 1, docsPath: DOCS.forceSkills }
            ),
            virtues(2),
            resourcesGroup(variant, 2),
            group(
                'force-powers-group',
                'Force Powers',
                [systemList('list-force-powers', 'list:forcePowers', 'Force Powers')],
                { column: 3, docsPath: DOCS.forcePowers }
            ),
        ],
        3
    );
}

function bodySection(variant: SheetVariant): SectionNode {
    const equipment = (id: string, title: string, bindingKey: string, docsPath: string) =>
        group(`body-${id}`, title, [primitive(`equipment-${id}`, bindingKey)], {
            column: 1,
            collapsible: true,
            docsPath,
        });
    const isDroid = variant === 'droid';
    return section(
        'body',
        'Body',
        DOCS.equipment,
        [
            equipment(
                'inventory',
                isDroid ? 'Built-in equipment' : 'Inventory',
                'equipment:inventory',
                DOCS.inventory
            ),
            equipment('weapons', 'Weapons', 'equipment:weapons', DOCS.weapons),
            equipment('armor', 'Armor', 'equipment:armor', DOCS.armor),
            equipment('implants', 'Implants & Cyberware', 'equipment:implants', DOCS.implants),
            group(
                'body-health',
                isDroid ? 'Damage' : 'Health',
                [
                    primitive('track-health', isDroid ? 'track:droid-damage' : 'track:health', {
                        hideLabel: true,
                        label: isDroid ? 'Damage' : 'Health',
                    }),
                ],
                { column: 2, docsPath: DOCS.health }
            ),
        ],
        2,
        [2, 1]
    );
}

const DERIVED = {
    initiative: 'wits + alertness',
    initiativeSaber: 'wits + alertness + control',
    movement: 'max(min(control, telekinesis), 1)',
} as const;

function otherSection(variant: SheetVariant): SectionNode {
    const derived = group(
        'derived-stats',
        'Derived Stats',
        [
            formula('derived-initiative', 'Initiative (Std)', DERIVED.initiative),
            formula('derived-initiative-saber', 'Initiative (Saber)', DERIVED.initiativeSaber),
            formula('derived-jumping', 'Jumping Distance', DERIVED.movement, { prefix: '×' }),
            formula('derived-running', 'Running Speed', DERIVED.movement, { prefix: '×' }),
        ],
        { columns: 2, docsPath: DOCS.derived }
    );
    const experience = group(
        'experience',
        'Experience',
        [
            number('field-experience-total', 'Total XP', 'experience-total'),
            number('field-experience-spent', 'Spent', 'experience-spent'),
            formula(
                'derived-experience-available',
                'Available',
                'experience-total - experience-spent'
            ),
        ],
        { docsPath: DOCS.experience }
    );
    const notes = group('notes', 'Notes', [
        text('field-notes', 'Notes', 'notes', { multiline: true, hideLabel: true }),
    ]);
    // Derived stats depend on Force skills, which droids do not have.
    return variant === 'droid'
        ? section('other', 'Other', DOCS.experience, [experience, notes], 2)
        : section('other', 'Other', DOCS.derived, [derived, experience, notes], 3);
}

function fullSheet(viewId: string, name: string, variant: SheetVariant): CustomTemplate {
    return {
        id: viewId,
        name,
        systemId: SystemIdSchema.parse('star-wars-wod'),
        documentKind: DocumentKindSchema.parse('character'),
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            baseSection(),
            attributesSection(),
            skillsSection(variant),
            advantagesSection(),
            forceSection(variant),
            bodySection(variant),
            otherSection(variant),
        ],
    };
}

/**
 * Brief perspective: no sections — only the field groups a player or GM glances at during a
 * mission, in compact presentation.
 */
function briefSheet(viewId: string, name: string): CustomTemplate {
    const compactTraits = (keys: readonly string[]) =>
        keys.map((key) => trait(key, { compact: true }));
    const placed = <T extends TemplateNode>(node: T, column: number): T => ({ ...node, column });
    return {
        id: viewId,
        name,
        systemId: SystemIdSchema.parse('star-wars-wod'),
        documentKind: DocumentKindSchema.parse('character'),
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            group(
                'identity-fields',
                'Identity',
                textFields(
                    IDENTITY_FIELDS.filter(([key]) => ['name', 'concept', 'species'].includes(key)),
                    true
                ),
                { columns: 3, hideTitle: true }
            ),
            group(
                'brief-attributes',
                'Attributes',
                ATTRIBUTE_GROUPS.flatMap(({ keys }, index) =>
                    compactTraits(keys).map((field) => placed(field, index + 1))
                ),
                { columns: 3 }
            ),
            group(
                'brief-abilities',
                'Abilities',
                ABILITY_GROUPS.flatMap(({ keys }, index) =>
                    compactTraits(keys).map((field) => placed(field, index + 1))
                ),
                { columns: 3, collapsible: true }
            ),
            group(
                'brief-resolve',
                'Resolve',
                [
                    ...compactTraits(VIRTUE_KEYS).map((field) => placed(field, 1)),
                    placed(
                        resource('resource-willpower', 'resource:willpower', 'Willpower', {
                            compact: true,
                        }),
                        2
                    ),
                    placed(
                        resource('resource-force-points', 'resource:force-points', 'Force Points', {
                            compact: true,
                        }),
                        2
                    ),
                    placed(
                        resource(
                            'resource-dark-side',
                            'resource:dark-side-resistance',
                            'Dark Side Resistance',
                            { compact: true }
                        ),
                        2
                    ),
                    placed(
                        formula('derived-initiative', 'Initiative (Std)', DERIVED.initiative, {
                            compact: true,
                        }),
                        3
                    ),
                    placed(
                        formula(
                            'derived-initiative-saber',
                            'Initiative (Saber)',
                            DERIVED.initiativeSaber,
                            { compact: true }
                        ),
                        3
                    ),
                ],
                { columns: 3 }
            ),
            group(
                'brief-health',
                'Health',
                [primitive('track-health', 'track:health', { compact: true, label: 'Health' })],
                { hideTitle: true }
            ),
            group(
                'brief-weapons',
                'Weapons',
                [primitive('equipment-weapons', 'equipment:weapons')],
                { collapsible: true }
            ),
        ],
    };
}

const sheetMessages = uiMessages.sheet;
const defaultMessages = sheetMessages.templates.defaults;
const baseFields = sheetMessages.base.fields;
const documentFields = sheetMessages.documents.fields;

/** Stored English label/title → translation reference for the shipped trees. */
const LABEL_MESSAGES: Readonly<Record<string, { id: string }>> = {
    Base: sheetMessages.base.title,
    Identity: documentFields.identity,
    Name: baseFields.name.label,
    Concept: baseFields.concept.label,
    Species: baseFields.species.label,
    Player: baseFields.player.label,
    Nature: baseFields.nature.label,
    'Home World': baseFields.homeWorld.label,
    Adventure: baseFields.adventure.label,
    Demeanor: baseFields.demeanor.label,
    Age: baseFields.age.label,
    Gender: baseFields.gender.label,
    Height: baseFields.height.label,
    Build: baseFields.build.label,
    Hair: baseFields.hair.label,
    Eyes: baseFields.eyes.label,
    Features: baseFields.features.label,
    Appearance: sheetMessages.base.appearance,
    Biography: sheetMessages.base.biography,
    Portrait: defaultMessages.portrait,
    Attributes: documentFields.attributes,
    Abilities: documentFields.abilities,
    Physical: defaultMessages.physical,
    Social: defaultMessages.social,
    Mental: defaultMessages.mental,
    Skills: defaultMessages.skills,
    Talents: defaultMessages.talents,
    Knowledges: defaultMessages.knowledges,
    'Custom talents': defaultMessages.customTalents,
    'Custom skills': defaultMessages.customSkills,
    'Custom knowledges': defaultMessages.customKnowledges,
    Advantages: defaultMessages.advantages,
    Backgrounds: documentFields.backgrounds,
    Merits: documentFields.merits,
    Flaws: documentFields.flaws,
    Force: defaultMessages.force,
    'Force Skills': defaultMessages.forceSkills,
    'Max Force Points': defaultMessages.maxForcePoints,
    'Force Points': documentFields.forcePoints,
    'Force Powers': defaultMessages.forcePowers,
    Virtues: documentFields.virtues,
    Resources: documentFields.resources,
    Resolve: defaultMessages.resolve,
    Willpower: documentFields.willpower,
    'Dark Side Resistance': defaultMessages.darkSideResistance,
    'Free points': defaultMessages.freePoints,
    'Built-in equipment': documentFields.builtInEquipment,
    Damage: documentFields.damage,
    Body: defaultMessages.body,
    Inventory: defaultMessages.inventory,
    Weapons: documentFields.weapons,
    Armor: documentFields.armor,
    'Implants & Cyberware': defaultMessages.implants,
    Health: documentFields.health,
    Other: sheetMessages.templates.builtInBlocks.other,
    'Derived Stats': defaultMessages.derivedStats,
    'Initiative (Std)': defaultMessages.initiativeStandard,
    'Initiative (Saber)': defaultMessages.initiativeLightsaber,
    'Jumping Distance': defaultMessages.jumpingDistance,
    'Running Speed': defaultMessages.runningSpeed,
    Experience: defaultMessages.experience,
    'Total XP': defaultMessages.experienceTotal,
    Spent: defaultMessages.experienceSpent,
    Available: defaultMessages.experienceAvailable,
    Notes: documentFields.notes,
};

/** Attribute names are owned by the `attributes` data catalog (single translation owner). */
const ATTRIBUTE_COORDINATES: ReadonlySet<string> = new Set(
    ATTRIBUTE_GROUPS.flatMap(({ keys }) => keys.map(kebab))
);

function withLabelMessages(node: TemplateNode): TemplateNode {
    const label = 'title' in node ? node.title : 'label' in node ? node.label : undefined;
    const isAttribute =
        node.type === 'rating' &&
        node.valueKey !== undefined &&
        ATTRIBUTE_COORDINATES.has(node.valueKey);
    const reference = isAttribute
        ? `catalog:attributes/${node.valueKey}`
        : label
          ? LABEL_MESSAGES[label]?.id
          : undefined;
    let next: TemplateNode = reference ? { ...node, labelMessage: reference } : node;
    if (next.type === 'text' && next.placeholder === 'Character biography...') {
        next = { ...next, placeholderMessage: sheetMessages.base.biographyPlaceholder.id };
    }
    return next.type === 'section' || next.type === 'group'
        ? { ...next, children: next.children.map(withLabelMessages) }
        : next;
}

function translatable(template: CustomTemplate): CustomTemplate {
    return { ...template, children: template.children.map(withLabelMessages) };
}

/** All default templates for the setup: pure declarative trees. */
export const starWarsWodDefaultTemplates: readonly CustomTemplate[] = [
    translatable(fullSheet('full-sheet', 'Full sheet', 'character')),
    translatable(fullSheet('droid-sheet', 'Droid sheet', 'droid')),
    translatable(briefSheet('brief', 'Brief')),
];
