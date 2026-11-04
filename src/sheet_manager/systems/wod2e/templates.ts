import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { denseBrief, formula, group, primitive } from '../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../types/document';
import {
    type CustomTemplate,
    isContainerNode,
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
    conditionSection,
    equipmentSection,
    experienceNotesSection,
    resource,
    skillsSection,
    STANDARD_INITIATIVE,
    textFields,
    virtuesGroup,
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

const DOCS = {
    identity: '/docs/wod-2e/character#identity',
    concept: '/docs/wod-2e/character#concept',
    nature: '/docs/wod-2e/character#nature',
    chronicle: '/docs/wod-2e/character#chronicle',
    demeanor: '/docs/wod-2e/character#demeanor',
    condition: '/docs/wod-2e/character#condition',
    health: '/docs/wod-2e/rules/condition#health',
    willpower: '/docs/wod-2e/rules/condition#willpower',
    initiative: '/docs/wod-2e/rules/condition#initiative',
    virtues: '/docs/wod-2e/rules/condition#virtues',
    conscience: '/docs/wod-2e/rules/condition#conscience',
    selfControl: '/docs/wod-2e/rules/condition#self-control',
    courage: '/docs/wod-2e/rules/condition#courage',
    attributes: '/docs/wod-2e/rules/traits#attributes',
    appearance: '/docs/wod-2e/rules/traits#appearance',
    abilities: '/docs/wod-2e/rules/traits#abilities',
    talents: '/docs/wod-2e/rules/traits#talents',
    expression: '/docs/wod-2e/rules/traits#expression',
    skills: '/docs/wod-2e/rules/traits#skills',
    animalKen: '/docs/wod-2e/rules/traits#animal-ken',
    drive: '/docs/wod-2e/rules/traits#drive',
    melee: '/docs/wod-2e/rules/traits#melee',
    security: '/docs/wod-2e/rules/traits#security',
    knowledges: '/docs/wod-2e/rules/traits#knowledges',
    occult: '/docs/wod-2e/rules/traits#occult',
    advantages: '/docs/wod-2e/character/advantages#advantages',
    backgrounds: '/docs/wod-2e/character/advantages#backgrounds',
    merits: '/docs/wod-2e/character/advantages#merits',
    flaws: '/docs/wod-2e/character/advantages#flaws',
    weapons: '/docs/wod-2e/rules/equipment#weapons',
    armor: '/docs/wod-2e/rules/equipment#armor',
    experience: '/docs/wod-2e/character/advancement#experience',
    resolve: '/docs/wod-2e/character#resolve',
} as const;

/** Health, Willpower, and Initiative beside the virtues (spec 042). */
function condition(): TemplateNode {
    return conditionSection(
        [
            {
                ...primitive('track-health', 'track:health', { label: 'Health' }),
                docsPath: DOCS.health,
            },
            // One tracker: the rating framed, the current points filled (spec 020).
            {
                ...resource('resource-willpower', 'resource:willpower', 'Willpower', {
                    poolTracker: { display: 'row', legend: false, total: true },
                }),
                docsPath: DOCS.willpower,
            },
            {
                ...formula('derived-initiative', 'Initiative', STANDARD_INITIATIVE),
                docsPath: DOCS.initiative,
            },
        ],
        virtuesGroup(WOD2E_VIRTUE_KEYS, 2, DOCS.virtues, {
            Conscience: DOCS.conscience,
            'Self-Control': DOCS.selfControl,
            Courage: DOCS.courage,
        }),
        { docsPath: DOCS.condition }
    );
}

function equipment(): TemplateNode {
    const gear = (id: string, title: string, bindingKey: string, docsPath?: string) =>
        group(`body-${id}`, title, [primitive(`equipment-${id}`, bindingKey)], {
            collapsible: true,
            docsPath,
        });
    return equipmentSection(
        {
            first: [
                gear('weapons', 'Weapons', 'equipment:weapons', DOCS.weapons),
                gear('armor', 'Armor', 'equipment:armor', DOCS.armor),
            ],
            second: [gear('inventory', 'Inventory', 'equipment:inventory')],
        },
        undefined
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
    const compact = (keys: readonly string[]) =>
        keys.map((key) => trait(key, { compact: true, shortForm: true }));
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
            { columns: 3, docsPath: DOCS.attributes }
        ),
        group(
            'brief-abilities',
            'Abilities',
            ABILITY_GROUPS.flatMap(({ keys }, index) =>
                compact(keys).map((field) => placed(field, index + 1))
            ),
            { columns: 3, collapsible: true, docsPath: DOCS.abilities }
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
            { columns: 3, docsPath: DOCS.resolve }
        ),
        group(
            'brief-health',
            'Health',
            [primitive('track-health', 'track:health', { compact: true, label: 'Health' })],
            { hideTitle: true }
        ),
        group('brief-weapons', 'Weapons', [primitive('equipment-weapons', 'equipment:weapons')], {
            collapsible: true,
            docsPath: DOCS.weapons,
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
    'Show portrait': defaults.showPortrait,
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
    Condition: defaults.condition,
    'Health and Willpower': defaults.healthAndWillpower,
    Equipment: defaults.equipment,
    'Experience and Notes': defaults.experienceAndNotes,
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
    return isContainerNode(next)
        ? { ...next, children: next.children.map(withLabelMessages) }
        : next;
}

function translatable(page: CustomTemplate): CustomTemplate {
    return { ...page, children: page.children.map(withLabelMessages) };
}

export const wod2eTemplates: readonly CustomTemplate[] = [
    translatable(
        template('wod2e-sheet', 'Full sheet', [
            baseSection(DOCS.identity, IDENTITY_FIELDS, {
                concept: DOCS.concept,
                nature: DOCS.nature,
                chronicle: DOCS.chronicle,
                demeanor: DOCS.demeanor,
            }),
            condition(),
            attributesSection(DOCS.attributes, { Appearance: DOCS.appearance }),
            skillsSection(ABILITY_GROUPS, DOCS.abilities, undefined, {
                groups: {
                    'abilities-talents': DOCS.talents,
                    'abilities-skills': DOCS.skills,
                    'abilities-knowledges': DOCS.knowledges,
                },
                traits: {
                    Expression: DOCS.expression,
                    'Animal Ken': DOCS.animalKen,
                    Drive: DOCS.drive,
                    Melee: DOCS.melee,
                    Security: DOCS.security,
                    Occult: DOCS.occult,
                },
            }),
            advantagesSection(DOCS.advantages, {
                'advantages-backgrounds': DOCS.backgrounds,
                'advantages-merits': DOCS.merits,
                'advantages-flaws': DOCS.flaws,
            }),
            equipment(),
            experienceNotesSection(DOCS.experience),
        ])
    ),
    translatable(denseBrief(template('wod2e-brief', 'Brief', briefChildren()), ['brief-weapons'])),
];
