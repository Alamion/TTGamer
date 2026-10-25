import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { denseBrief, formula, group, number, primitive } from '../../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import {
    type CustomTemplate,
    isContainerNode,
    type SectionNode,
    TEMPLATE_SCHEMA_VERSION,
    type TemplateNode,
} from '../../../types/template';
import { dotsTrait as trait, traitCoordinate as kebab } from '../../wod-like/templateBuilders';
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
    systemList,
    textFields,
    virtuesGroup,
    wodSection as section,
} from '../../wod2e/ruleset/templateParts';
import { DOCS } from './docs';

/**
 * Shipped Star Wars default templates: pure declarative trees. Document-backed content is
 * composed through fields whose value keys the binding registry bridges to document data at
 * render time; multi-column sections place their groups with `column`, so a column can stack
 * several groups. Accents are automatic (sibling parity) and never stored.
 */

/** Character sheets and droid sheets share one layout with droid-specific differences. */
type SheetVariant = 'character' | 'droid';

/** Virtue-derived minimums of the editable resources (original sheet rules). */
const MINIMUMS = {
    willpower: 'min(passion + self-control, 10)',
    maxForcePoints: 'self-control',
    darkSide: 'max(0, min(5 + conscience - passion, 10))',
} as const;

const ABILITY_GROUPS = abilityGroups({
    talents: [
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
    skills: [
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
    knowledges: [
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
});

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

function skills(variant: SheetVariant): SectionNode {
    // Droids may bank ability points they have not spread yet (per group).
    return skillsSection(ABILITY_GROUPS, DOCS.skills, (list) =>
        variant === 'droid'
            ? [number(`droid-free-${list.slice(5)}`, 'Free points', `droid-free-${list.slice(5)}`)]
            : []
    );
}

/** Willpower, and for a sentient its Force Points and Dark Side Resistance. */
function resources(variant: SheetVariant): TemplateNode[] {
    return [
        resource('resource-willpower', 'resource:willpower', 'Willpower', {
            minFrom: MINIMUMS.willpower,
        }),
        ...(variant === 'droid'
            ? []
            : [
                  // One tracker: the maximum framed, the current points filled (spec 020).
                  resource('resource-force-points', 'resource:force-points', 'Force Points', {
                      poolTracker: { display: 'row', legend: false, total: true },
                      maxMinFrom: MINIMUMS.maxForcePoints,
                  }),
                  resource(
                      'resource-dark-side',
                      'resource:dark-side-resistance',
                      'Dark Side Resistance',
                      {
                          minFrom: MINIMUMS.darkSide,
                      }
                  ),
              ]),
    ];
}

const DERIVED = {
    initiative: STANDARD_INITIATIVE,
    initiativeSaber: 'wits + alertness + control',
    movement: 'max(min(control, telekinesis), 1)',
} as const;

/**
 * Health (a droid's damage), Willpower, and the virtues (spec 042). Droids have no initiative
 * on their sheet; a sentient also checks its Force resources here.
 */
function condition(variant: SheetVariant): SectionNode {
    const isDroid = variant === 'droid';
    return conditionSection(
        [
            primitive('track-health', isDroid ? 'track:droid-damage' : 'track:health', {
                label: isDroid ? 'Damage' : 'Health',
                // The penalty of the deepest marked level, under the table (spec 018).
                tracker: { total: true },
            }),
            ...(isDroid
                ? []
                : [formula('derived-initiative', 'Initiative (Std)', DERIVED.initiative)]),
            ...resources(variant),
        ],
        virtuesGroup(VIRTUE_KEYS, 2, DOCS.virtues),
        {
            title: isDroid ? 'Damage and Willpower' : 'Health and Willpower',
            docsPath: DOCS.virtues,
            vitalsDocsPath: DOCS.health,
        }
    );
}

/** Force skills and powers, and the values that follow from them (sentients only). */
function forceSection(): SectionNode {
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
            group(
                'force-powers-group',
                'Force Powers',
                [systemList('list-force-powers', 'list:forcePowers', 'Force Powers')],
                { column: 2, docsPath: DOCS.forcePowers }
            ),
            group(
                'derived-stats',
                'Force-derived stats',
                [
                    formula(
                        'derived-initiative-saber',
                        'Initiative (Saber)',
                        DERIVED.initiativeSaber
                    ),
                    formula('derived-jumping', 'Jumping Distance', DERIVED.movement, {
                        prefix: '×',
                    }),
                    formula('derived-running', 'Running Speed', DERIVED.movement, {
                        prefix: '×',
                    }),
                ],
                { column: 3, docsPath: DOCS.derived }
            ),
        ],
        3
    );
}

function equipment(variant: SheetVariant): SectionNode {
    const gear = (id: string, title: string, bindingKey: string, docsPath: string) =>
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
            second: [
                gear(
                    'inventory',
                    variant === 'droid' ? 'Built-in equipment' : 'Inventory',
                    'equipment:inventory',
                    DOCS.inventory
                ),
                gear('implants', 'Implants & Cyberware', 'equipment:implants', DOCS.implants),
            ],
        },
        DOCS.equipment
    );
}

/** The layout the WoD 2e character shares (spec 042): only the Force is the sentient's own. */
function fullSheet(viewId: string, name: string, variant: SheetVariant): CustomTemplate {
    return {
        id: viewId,
        name,
        systemId: SystemIdSchema.parse('star-wars-wod'),
        documentKind: DocumentKindSchema.parse('character'),
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            baseSection(DOCS.base, IDENTITY_FIELDS),
            condition(variant),
            attributesSection(DOCS.attributes),
            skills(variant),
            ...(variant === 'droid' ? [] : [forceSection()]),
            advantagesSection(DOCS.meritsFlaws),
            equipment(variant),
            experienceNotesSection(DOCS.experience),
        ],
    };
}

/**
 * Brief perspective: no sections — only the field groups a player or GM glances at during a
 * mission, in compact presentation. Droids have no Force: Resolve keeps virtues, Willpower, and
 * standard initiative, and the condition strip uses the damage chart.
 */
function briefSheet(viewId: string, name: string, variant: SheetVariant): CustomTemplate {
    const isDroid = variant === 'droid';
    const compactTraits = (keys: readonly string[]) =>
        keys.map((key) => trait(key, { compact: true, shortForm: true }));
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
            group('brief-resolve', 'Resolve', [
                ...compactTraits(VIRTUE_KEYS),
                resource('resource-willpower', 'resource:willpower', 'Willpower', {
                    compact: true,
                }),
                ...(isDroid
                    ? []
                    : [
                          resource(
                              'resource-force-points',
                              'resource:force-points',
                              'Force Points',
                              { compact: true }
                          ),
                          resource(
                              'resource-dark-side',
                              'resource:dark-side-resistance',
                              'Dark Side Resistance',
                              { compact: true, shortForm: true }
                          ),
                      ]),
                formula('derived-initiative', 'Initiative (Std)', DERIVED.initiative, {
                    compact: true,
                }),
                ...(isDroid
                    ? []
                    : [
                          formula(
                              'derived-initiative-saber',
                              'Initiative (Saber)',
                              DERIVED.initiativeSaber,
                              { compact: true }
                          ),
                      ]),
            ]),
            group(
                'brief-health',
                isDroid ? 'Damage' : 'Health',
                [
                    primitive('track-health', isDroid ? 'track:droid-damage' : 'track:health', {
                        compact: true,
                        label: isDroid ? 'Damage' : 'Health',
                    }),
                ],
                { hideTitle: true }
            ),
            group(
                'brief-weapons',
                'Weapons',
                [primitive('equipment-weapons', 'equipment:weapons')],
                { collapsible: true, defaultCollapsed: true }
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
    'Show portrait': defaultMessages.showPortrait,
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
    Other: defaultMessages.other,
    'Derived Stats': defaultMessages.derivedStats,
    'Force-derived stats': defaultMessages.forceDerivedStats,
    Condition: defaultMessages.condition,
    'Health and Willpower': defaultMessages.healthAndWillpower,
    'Damage and Willpower': defaultMessages.damageAndWillpower,
    Equipment: defaultMessages.equipment,
    'Experience and Notes': defaultMessages.experienceAndNotes,
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

/**
 * Trait names are owned by data catalogs (single translation owner, and the glossary's book
 * terms): trait coordinate → `catalog:<catalogId>/<entryId>`.
 */
const TRAIT_CATALOG_REFS: ReadonlyMap<string, string> = new Map([
    ...ATTRIBUTE_GROUPS.flatMap(({ keys }) =>
        keys.map((key) => [kebab(key), `catalog:attributes/${kebab(key)}`] as const)
    ),
    ...ABILITY_GROUPS.flatMap(({ keys }) =>
        keys.map((key) => [kebab(key), `catalog:abilities/${kebab(key)}`] as const)
    ),
    ...FORCE_SKILL_KEYS.map((key) => [kebab(key), `catalog:force-skills/${kebab(key)}`] as const),
    ...VIRTUE_KEYS.map((key) => [kebab(key), `catalog:virtues/${kebab(key)}`] as const),
]);

function withLabelMessages(node: TemplateNode): TemplateNode {
    const label = 'title' in node ? node.title : 'label' in node ? node.label : undefined;
    const traitReference =
        node.type === 'rating' && node.valueKey !== undefined
            ? TRAIT_CATALOG_REFS.get(node.valueKey)
            : undefined;
    const reference = traitReference
        ? traitReference
        : label
          ? LABEL_MESSAGES[label]?.id
          : undefined;
    let next: TemplateNode = reference ? { ...node, labelMessage: reference } : node;
    if (next.type === 'text' && next.placeholder === 'Character biography...') {
        next = { ...next, placeholderMessage: sheetMessages.base.biographyPlaceholder.id };
    }
    return isContainerNode(next)
        ? { ...next, children: next.children.map(withLabelMessages) }
        : next;
}

function translatable(template: CustomTemplate): CustomTemplate {
    return { ...template, children: template.children.map(withLabelMessages) };
}

/** All default templates for the setup: pure declarative trees. */
export const starWarsCharacterTemplates: readonly CustomTemplate[] = [
    translatable(fullSheet('full-sheet', 'Full sheet', 'character')),
    translatable(fullSheet('droid-sheet', 'Droid sheet', 'droid')),
    denseBrief(translatable(briefSheet('brief', 'Brief', 'character'))),
    denseBrief(translatable(briefSheet('droid-brief', 'Droid brief', 'droid'))),
];
