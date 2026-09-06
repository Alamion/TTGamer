import { DocumentKindSchema, SystemIdSchema } from '../../types/document';
import type { CustomTemplate } from '../../types/template';

/**
 * Explicit default templates (feature 005 + review 2026-09-05).
 *
 * Identity = the registered view id (no migration, no special-case mapping). System-backed
 * content is composed through **regular declarative fields with shared value keys** that the
 * binding registry bridges to document data at render time — the authoring interface is
 * identical to custom (value-bag) composition. Only explicitly custom primitives that fields
 * cannot express (condition tracks, custom lists with presets) remain primitive blocks, and the
 * not-yet-covered parts (advantages, Force, body-inventory; the specialized creature/vehicle/
 * fodder pages) remain retained `built-in` placements — the sanctioned hybrid. Phase two
 * replaces them (see TODO.md phase-two pointer).
 */

interface FieldInput {
    id: string;
    label: string;
    type: 'text' | 'rating' | 'resource';
    valueKey: string;
    compact?: boolean;
    max?: number;
}

interface PrimitiveInput {
    id: string;
    bindingKey: string;
    compact?: boolean;
    presets?: Array<{ key: string; label: string; value?: number }>;
}

interface BuiltInInput {
    id: string;
    blockId: string;
}

interface GroupInput {
    id: string;
    label?: string;
    columns?: number;
    fields: FieldInput[];
}

interface SectionInput {
    id: string;
    title: string;
    presentation: 'card' | 'plain';
    blocks: Array<FieldInput | GroupInput | PrimitiveInput | BuiltInInput>;
}

function template(
    viewId: string,
    name: string,
    documentKind: string,
    sections: SectionInput[]
): CustomTemplate {
    return {
        id: viewId,
        name,
        systemId: SystemIdSchema.parse('star-wars-wod'),
        documentKind: DocumentKindSchema.parse(documentKind),
        schemaVersion: 1,
        sections: sections.map((section) => ({
            id: section.id,
            title: section.title,
            presentation: section.presentation,
            blocks: section.blocks.map((block) =>
                'blockId' in block
                    ? { id: block.id, type: 'built-in' as const, blockId: block.blockId }
                    : 'bindingKey' in block
                      ? {
                            id: block.id,
                            type: 'primitive' as const,
                            bindingKey: block.bindingKey,
                            compact: block.compact ?? false,
                            ...(block.presets ? { presets: block.presets } : {}),
                        }
                      : 'fields' in block
                        ? {
                              id: block.id,
                              type: 'fields' as const,
                              columns: block.columns ?? 1,
                              ...(block.label ? { title: block.label } : {}),
                              fields: block.fields.map(toTemplateField),
                          }
                        : {
                              id: block.id,
                              type: 'fields' as const,
                              columns: 1,
                              fields: [toTemplateField(block)],
                          }
            ),
        })),
    } as CustomTemplate;
}

function field(
    id: string,
    label: string,
    type: 'text' | 'rating' | 'resource',
    valueKey: string,
    options: { compact?: boolean; max?: number } = {}
): FieldInput {
    return { id, label, type, valueKey, ...options };
}

function toTemplateField(fieldInput: FieldInput) {
    return {
        id: fieldInput.id,
        label: fieldInput.label,
        type: fieldInput.type,
        valueKey: fieldInput.valueKey,
        compact: fieldInput.compact ?? false,
        required: false,
        ...(fieldInput.type === 'rating'
            ? { min: 0, max: fieldInput.max ?? 5, presentation: 'dots' as const }
            : {}),
        ...(fieldInput.type === 'resource' ? { min: 0, max: fieldInput.max ?? 10 } : {}),
        ...(fieldInput.type === 'text' ? { multiline: false } : {}),
    };
}

const ATTRIBUTE_FIELDS: ReadonlyArray<{ key: string; group: string }> = [
    { key: 'Strength', group: 'physical' },
    { key: 'Dexterity', group: 'physical' },
    { key: 'Stamina', group: 'physical' },
    { key: 'Charisma', group: 'social' },
    { key: 'Manipulation', group: 'social' },
    { key: 'Appearance', group: 'social' },
    { key: 'Perception', group: 'mental' },
    { key: 'Intelligence', group: 'mental' },
    { key: 'Wits', group: 'mental' },
];

const ABILITY_GROUPS: ReadonlyArray<{ group: string; keys: string[] }> = [
    {
        group: 'talents',
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
        group: 'skills',
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
        group: 'knowledges',
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

const kebab = (value: string) => value.toLowerCase().replace(/\s+/g, '-');

function identityFields(compact = false): FieldInput[] {
    return (
        [
            ['name', 'Name'],
            ['concept', 'Concept'],
            ['player', 'Player'],
            ['nature', 'Nature'],
            ['adventure', 'Adventure'],
            ['demeanor', 'Demeanor'],
            ['species', 'Species'],
            ['age', 'Age'],
        ] as const
    ).map(([key, label]) =>
        field(`field-${key}`, label, 'text', key, { ...(compact ? { compact: true } : {}) })
    );
}

function traitFields(
    keys: ReadonlyArray<{ key: string; group: string }>,
    compact = false
): FieldInput[] {
    return keys.map(({ key }) =>
        field(`trait-${kebab(key)}`, key, 'rating', kebab(key), {
            max: 5,
            ...(compact ? { compact: true } : {}),
        })
    );
}

function abilityFields(compact = false): FieldInput[] {
    return ABILITY_GROUPS.flatMap((group) =>
        group.keys.map((key) =>
            field(`trait-${kebab(key)}`, key, 'rating', kebab(key), {
                max: 5,
                ...(compact ? { compact: true } : {}),
            })
        )
    );
}

function listPrimitives(compact = false): PrimitiveInput[] {
    return [
        {
            id: 'list-talents',
            bindingKey: 'list:customTalents',
            ...(compact ? { compact: true } : {}),
        },
        {
            id: 'list-skills',
            bindingKey: 'list:customSkills',
            ...(compact ? { compact: true } : {}),
        },
        {
            id: 'list-knowledges',
            bindingKey: 'list:customKnowledges',
            ...(compact ? { compact: true } : {}),
        },
    ];
}

const mainLegacyParts: BuiltInInput[] = [
    { id: 'advantages', blockId: 'advantages' },
    { id: 'force', blockId: 'force' },
    { id: 'body', blockId: 'body' },
];

type ConditionPart = FieldInput | GroupInput | PrimitiveInput;

function mainSheet(
    viewId: string,
    name: string,
    resources: ReadonlyArray<ConditionPart>
): CustomTemplate {
    return template(viewId, name, 'character', [
        {
            id: 'identity',
            title: 'Identity',
            presentation: 'card',
            blocks: [
                { id: 'identity-fields', label: 'Identity', columns: 2, fields: identityFields() },
            ],
        },
        {
            id: 'attributes',
            title: 'Attributes',
            presentation: 'card',
            blocks: traitFields(ATTRIBUTE_FIELDS),
        },
        {
            id: 'abilities',
            title: 'Abilities',
            presentation: 'card',
            blocks: abilityFields(),
        },
        {
            id: 'lists',
            title: 'Custom lists',
            presentation: 'card',
            blocks: listPrimitives(),
        },
        {
            id: 'condition',
            title: 'Condition',
            presentation: 'card',
            blocks: [{ id: 'track-health', bindingKey: 'track:health' }, ...resources],
        },
        {
            id: 'legacy-parts',
            title: 'Legacy parts',
            presentation: 'plain',
            blocks: mainLegacyParts,
        },
    ]);
}

function briefSheet(viewId: string, name: string): CustomTemplate {
    return template(viewId, name, 'character', [
        {
            id: 'identity',
            title: 'Identity',
            presentation: 'card',
            blocks: [
                {
                    id: 'identity-fields',
                    label: 'Identity',
                    columns: 3,
                    fields: identityFields(true).filter((f) =>
                        ['field-name', 'field-concept', 'field-species'].includes(f.id)
                    ),
                },
            ],
        },
        {
            id: 'attributes',
            title: 'Attributes',
            presentation: 'card',
            blocks: traitFields(ATTRIBUTE_FIELDS, true),
        },
        {
            id: 'condition',
            title: 'Condition',
            presentation: 'card',
            blocks: [
                { id: 'track-health', bindingKey: 'track:health', compact: true },
                field('resource-willpower', 'Willpower', 'resource', 'willpower', {
                    compact: true,
                    max: 10,
                }),
            ],
        },
        {
            id: 'lists',
            title: 'Custom lists',
            presentation: 'card',
            blocks: listPrimitives(true),
        },
    ]);
}

function placementOnlySheet(
    viewId: string,
    name: string,
    documentKind: string,
    blockId: string
): CustomTemplate {
    return template(viewId, name, documentKind, [
        {
            id: 'page',
            title: name,
            presentation: 'plain',
            blocks: [{ id: blockId, blockId }],
        },
    ]);
}

/** All default templates for the setup: bridged-field composition + sanctioned hybrid parts. */
export const starWarsWodDefaultTemplates: readonly CustomTemplate[] = [
    mainSheet('full-sheet', 'Full sheet', [
        {
            id: 'condition-resources',
            label: 'Resources',
            columns: 2,
            fields: [
                field('resource-willpower', 'Willpower', 'resource', 'willpower', { max: 10 }),
                field('resource-force-points', 'Force Points', 'resource', 'force-points', {
                    max: 10,
                }),
                field(
                    'resource-dark-side',
                    'Dark Side Resistance',
                    'resource',
                    'dark-side-resistance',
                    {
                        max: 10,
                    }
                ),
            ],
        },
        { id: 'track-health', bindingKey: 'track:health' },
    ]),
    mainSheet('droid-sheet', 'Droid sheet', [
        {
            id: 'condition-resources',
            label: 'Resources',
            columns: 2,
            fields: [
                field('resource-willpower', 'Willpower', 'resource', 'willpower', { max: 10 }),
            ],
        },
        { id: 'track-health', bindingKey: 'track:health' },
    ]),
    briefSheet('brief', 'Brief'),
    placementOnlySheet('creature-sheet', 'Creature sheet', 'creature', 'star-wars-creature-sheet'),
    placementOnlySheet('vehicle-sheet', 'Vehicle sheet', 'vehicle', 'star-wars-vehicle-sheet'),
    placementOnlySheet('fodder-sheet', 'Fodder group', 'group', 'star-wars-fodder-sheet'),
];
