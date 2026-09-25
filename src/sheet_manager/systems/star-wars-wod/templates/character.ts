import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { formula, group, number, primitive } from '../../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import {
    type CustomTemplate,
    type GroupNode,
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
    experienceGroup,
    notesGroup,
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
    const virtues = (column: number) => virtuesGroup(VIRTUE_KEYS, column, DOCS.virtues);
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
    initiative: STANDARD_INITIATIVE,
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
    const experience = experienceGroup(DOCS.experience);
    const notes = notesGroup();
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
            baseSection(DOCS.base, IDENTITY_FIELDS),
            attributesSection(DOCS.attributes),
            skills(variant),
            advantagesSection(DOCS.meritsFlaws),
            forceSection(variant),
            bodySection(variant),
            otherSection(variant),
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
                    ...(isDroid
                        ? []
                        : [
                              placed(
                                  resource(
                                      'resource-force-points',
                                      'resource:force-points',
                                      'Force Points',
                                      { compact: true }
                                  ),
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
                          ]),
                    placed(
                        formula('derived-initiative', 'Initiative (Std)', DERIVED.initiative, {
                            compact: true,
                        }),
                        3
                    ),
                    ...(isDroid
                        ? []
                        : [
                              placed(
                                  formula(
                                      'derived-initiative-saber',
                                      'Initiative (Saber)',
                                      DERIVED.initiativeSaber,
                                      { compact: true }
                                  ),
                                  3
                              ),
                          ]),
                ],
                { columns: 3 }
            ),
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
    Other: defaultMessages.other,
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
    return next.type === 'section' || next.type === 'group'
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
    translatable(briefSheet('brief', 'Brief', 'character')),
    translatable(briefSheet('droid-brief', 'Droid brief', 'droid')),
];
