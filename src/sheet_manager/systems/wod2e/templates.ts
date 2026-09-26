import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { formula, group, primitive } from '../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../types/document';
import {
    type CustomTemplate,
    TEMPLATE_SCHEMA_VERSION,
    type TemplateNode,
} from '../../types/template';
import { dotsTrait as trait, traitCoordinate } from '../wod-like/templateBuilders';
import { WOD2E_ABILITIES } from './ruleset/profile';
import { WOD2E_VIRTUE_KEYS } from './ruleset/schema';
import {
    abilityGroups,
    advantagesSection,
    ATTRIBUTE_GROUPS,
    attributesSection,
    baseSection,
    experienceGroup,
    notesGroup,
    resource,
    skillsSection,
    STANDARD_INITIATIVE,
    textFields,
    virtuesGroup,
    wodSection as section,
} from './ruleset/templateParts';

export const WOD2E_SYSTEM_ID = 'wod-2e';

const IDENTITY_FIELDS: ReadonlyArray<[valueKey: string, label: string]> = [
    ['name', 'Name'],
    ['concept', 'Concept'],
    ['player', 'Player'],
    ['nature', 'Nature'],
    ['chronicle', 'Chronicle'],
    ['demeanor', 'Demeanor'],
    ['age', 'Age'],
];

const ABILITY_GROUPS = abilityGroups(WOD2E_ABILITIES);

function resourcesSection(): TemplateNode {
    return section(
        'resources',
        'Resources',
        undefined,
        [
            virtuesGroup(WOD2E_VIRTUE_KEYS, 1, undefined),
            group(
                'resources-willpower',
                'Willpower',
                [resource('resource-willpower', 'resource:willpower', 'Willpower')],
                { column: 2 }
            ),
        ],
        2
    );
}

function bodySection(): TemplateNode {
    const equipment = (id: string, title: string, bindingKey: string) =>
        group(`body-${id}`, title, [primitive(`equipment-${id}`, bindingKey)], {
            column: 1,
            collapsible: true,
        });
    return section(
        'body',
        'Body',
        undefined,
        [
            equipment('inventory', 'Inventory', 'equipment:inventory'),
            equipment('weapons', 'Weapons', 'equipment:weapons'),
            equipment('armor', 'Armor', 'equipment:armor'),
            group(
                'body-health',
                'Health',
                [primitive('track-health', 'track:health', { hideLabel: true, label: 'Health' })],
                { column: 2 }
            ),
        ],
        2,
        [2, 1]
    );
}

function otherSection(): TemplateNode {
    return section(
        'other',
        'Other',
        undefined,
        [
            group('derived-stats', 'Derived Stats', [
                formula('derived-initiative', 'Initiative', STANDARD_INITIATIVE),
            ]),
            experienceGroup(undefined),
            notesGroup(),
        ],
        3
    );
}

function template(id: string, name: string, children: TemplateNode[]): CustomTemplate {
    return {
        id,
        name,
        systemId: SystemIdSchema.parse(WOD2E_SYSTEM_ID),
        documentKind: DocumentKindSchema.parse('character'),
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children,
    };
}

function briefChildren(): TemplateNode[] {
    const placed = <T extends TemplateNode>(node: T, column: number): T => ({ ...node, column });
    const compact = (keys: readonly string[]) => keys.map((key) => trait(key, { compact: true }));
    return [
        group(
            'identity-fields',
            'Identity',
            textFields(
                IDENTITY_FIELDS.filter(([key]) => ['name', 'concept'].includes(key)),
                true
            ),
            { columns: 3, hideTitle: true }
        ),
        group(
            'brief-attributes',
            'Attributes',
            ATTRIBUTE_GROUPS.flatMap(({ keys }, index) =>
                compact(keys).map((field) => placed(field, index + 1))
            ),
            { columns: 3 }
        ),
        group(
            'brief-abilities',
            'Abilities',
            ABILITY_GROUPS.flatMap(({ keys }, index) =>
                compact(keys).map((field) => placed(field, index + 1))
            ),
            { columns: 3, collapsible: true }
        ),
        group(
            'brief-resolve',
            'Resolve',
            [
                ...compact(WOD2E_VIRTUE_KEYS).map((field) => placed(field, 1)),
                placed(
                    resource('resource-willpower', 'resource:willpower', 'Willpower', {
                        compact: true,
                    }),
                    2
                ),
                placed(
                    formula('derived-initiative', 'Initiative', STANDARD_INITIATIVE, {
                        compact: true,
                    }),
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
        group('brief-weapons', 'Weapons', [primitive('equipment-weapons', 'equipment:weapons')], {
            collapsible: true,
        }),
    ];
}

const sheet = uiMessages.sheet;
const defaults = sheet.templates.defaults;
const fields = sheet.base.fields;
const documentFields = sheet.documents.fields;

/** Stored English label → translation reference (the engine's own trait names). */
const LABEL_MESSAGES: Readonly<Record<string, { id: string }>> = {
    Base: sheet.base.title,
    Identity: documentFields.identity,
    Name: fields.name.label,
    Concept: fields.concept.label,
    Player: fields.player.label,
    Nature: fields.nature.label,
    Chronicle: sheet.wod2e.identity.chronicle,
    Demeanor: fields.demeanor.label,
    Age: fields.age.label,
    Gender: fields.gender.label,
    Height: fields.height.label,
    Build: fields.build.label,
    Hair: fields.hair.label,
    Eyes: fields.eyes.label,
    Features: fields.features.label,
    Appearance: sheet.base.appearance,
    Biography: sheet.base.biography,
    Portrait: defaults.portrait,
    Attributes: documentFields.attributes,
    Abilities: documentFields.abilities,
    Physical: defaults.physical,
    Social: defaults.social,
    Mental: defaults.mental,
    Skills: defaults.skills,
    Talents: defaults.talents,
    Knowledges: defaults.knowledges,
    'Custom talents': defaults.customTalents,
    'Custom skills': defaults.customSkills,
    'Custom knowledges': defaults.customKnowledges,
    Advantages: defaults.advantages,
    Backgrounds: documentFields.backgrounds,
    Merits: documentFields.merits,
    Flaws: documentFields.flaws,
    Virtues: documentFields.virtues,
    Resources: documentFields.resources,
    Resolve: defaults.resolve,
    Willpower: documentFields.willpower,
    Body: defaults.body,
    Inventory: defaults.inventory,
    Weapons: documentFields.weapons,
    Armor: documentFields.armor,
    Health: documentFields.health,
    Other: defaults.other,
    'Derived Stats': defaults.derivedStats,
    Initiative: defaults.initiativeStandard,
    Experience: defaults.experience,
    'Total XP': defaults.experienceTotal,
    Spent: defaults.experienceSpent,
    Available: defaults.experienceAvailable,
    Notes: documentFields.notes,
};

const traitMessages = sheet.wod2e.traits as Readonly<Record<string, { id: string }>>;
const camel = (key: string) =>
    traitCoordinate(key).replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());

function withLabelMessages(node: TemplateNode): TemplateNode {
    const label = 'title' in node ? node.title : 'label' in node ? node.label : undefined;
    const traitReference =
        node.type === 'rating' && node.valueKey !== undefined
            ? traitMessages[camel(node.label)]?.id
            : undefined;
    const reference = traitReference ?? (label ? LABEL_MESSAGES[label]?.id : undefined);
    let next: TemplateNode = reference ? { ...node, labelMessage: reference } : node;
    if (next.type === 'text' && next.placeholder === 'Character biography...') {
        next = { ...next, placeholderMessage: sheet.base.biographyPlaceholder.id };
    }
    return next.type === 'section' || next.type === 'group'
        ? { ...next, children: next.children.map(withLabelMessages) }
        : next;
}

function translatable(page: CustomTemplate): CustomTemplate {
    return { ...page, children: page.children.map(withLabelMessages) };
}

export const wod2eTemplates: readonly CustomTemplate[] = [
    translatable(
        template('wod2e-sheet', 'Full sheet', [
            baseSection(undefined, IDENTITY_FIELDS),
            attributesSection(undefined),
            skillsSection(ABILITY_GROUPS, undefined),
            advantagesSection(undefined),
            resourcesSection(),
            bodySection(),
            otherSection(),
        ])
    ),
    translatable(template('wod2e-brief', 'Brief', briefChildren())),
];
