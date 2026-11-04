import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { group, list, primitive, section } from '../../../../../templates/builders';
import { DocumentKindSchema, SystemIdSchema } from '../../../../../types/document';
import {
    type CustomTemplate,
    type GroupNode,
    type RowButton,
    type SectionNode,
    TEMPLATE_SCHEMA_VERSION,
    type TemplateField,
} from '../../../../../types/template';
import { PORTRAIT_SHOWN } from '../../../../portraitBinding';
import { memberOfField } from '../../../core/group';
import {
    advantagesSection,
    attributesSection,
    biographyGroup,
    chronicleGroup,
    equipmentSection,
    otherSection,
    portraitGroup,
    skillsSection,
    touchstonesGroup,
    tracked,
    trackGroup,
    trackResourcesToggle,
    v5Text,
} from '../../../ruleset/templateParts';
import {
    baneField,
    bloodPotencyEffects,
    compulsionField,
    humanityTracker,
    powerRouseButton,
    predatorGrantsField,
    remorseButton,
    RITUALS_VISIBLE,
    rouseButton,
} from './mechanics';

/**
 * Vampire pages built for the screen (spec 037): what changes during play (Hunger, Humanity,
 * Health, Willpower) comes right after identity, disciplines sit together with their powers and
 * rituals, and the clan's bane and the predator type explain themselves from the catalogs.
 */

const v5 = uiMessages.sheet.v5;
const vampire = uiMessages.sheet.v5Vampire;

export const VAMPIRE_KIND = DocumentKindSchema.parse('vampire');

export const VAMPIRE_DOCS = {
    vampire: '/docs/wod-v5/vampire/first-vampire/what-is-a-vampire',
    concept: '/docs/wod-v5/vampire/first-vampire/concept-sire',
    clan: '/docs/wod-v5/vampire/reference/clans',
    generation: '/docs/wod-v5/vampire/reference/blood-potency#generation',
    predatorType: '/docs/wod-v5/vampire/reference/predator-types',
    chronicle: '/docs/wod-v5/vampire/first-vampire/concept-sire#chronicle',
    hunger: '/docs/wod-v5/vampire/reference/hunger-rouse',
    bloodPotency: '/docs/wod-v5/vampire/reference/blood-potency',
    humanity: '/docs/wod-v5/vampire/reference/humanity-stains',
    bloodPotencyEffects: '/docs/wod-v5/vampire/reference/blood-potency#what-it-changes',
    disciplines: '/docs/wod-v5/vampire/reference/disciplines-powers',
    powers: '/docs/wod-v5/vampire/reference/disciplines-powers#powers',
    rituals: '/docs/wod-v5/vampire/reference/disciplines-powers#rituals-ceremonies-and-formulas',
    bane: '/docs/wod-v5/vampire/reference/clans#reading-the-bane',
    compulsion: '/docs/wod-v5/vampire/reference/hunger-rouse#bestial-failure-and-compulsions',
    touchstones: '/docs/wod-v5/vampire/first-vampire/convictions-touchstones',
    tenets: '/docs/wod-v5/vampire/first-vampire/convictions-touchstones#chronicle-tenets',
    advantages: '/docs/wod-v5/vampire/first-vampire/advantages-flaws',
    weapons: '/docs/wod-v5/vampire/reference/weapons-gear#weapons',
} as const;

/** Name, Concept, Clan, Generation, Sire, Predator type, Chronicle. */
export function vampireIdentityGroup(options: { compact?: boolean; column?: number } = {}) {
    const compact = options.compact ?? false;
    return group(
        'identity',
        v5.sections.identity.message,
        [
            v5Text('name', 'name', v5.fields.name, { compact }),
            v5Text('concept', 'concept', vampire.fields.concept, {
                compact,
                docsPath: VAMPIRE_DOCS.concept,
            }),
            v5Text('clan', 'clan', vampire.fields.clan, { compact, docsPath: VAMPIRE_DOCS.clan }),
            {
                ...primitive('generation', 'field:generation', {
                    label: vampire.fields.generation.message,
                    labelMessage: vampire.fields.generation,
                    compact,
                }),
                docsPath: VAMPIRE_DOCS.generation,
            },
            v5Text('predator-type', 'predator-type', vampire.fields.predatorType, {
                compact,
                docsPath: VAMPIRE_DOCS.predatorType,
            }),
            // What the type gives, under it, labelled (spec 042: no one-field card of its own).
            ...(compact ? [] : [{ ...predatorGrants(), span: 2 }]),
            trackResourcesToggle(vampire.fields.trackResources, compact),
            ...(compact
                ? []
                : [
                      v5Text('sire', 'sire', vampire.fields.sire, {
                          docsPath: VAMPIRE_DOCS.concept,
                      }),
                      v5Text('chronicle', 'chronicle', vampire.fields.chronicle, {
                          docsPath: VAMPIRE_DOCS.chronicle,
                      }),
                      { ...memberOfField(), span: 2 },
                  ]),
        ],
        {
            ...(options.column ? { column: options.column } : {}),
            columns: compact ? 4 : 2,
            hideTitle: true,
            labelMessage: v5.sections.identity,
        }
    );
}

function predatorGrants(): TemplateField {
    const { hideLabel: _hidden, ...field } = predatorGrantsField();
    void _hidden;
    return field;
}

function vampireSection(): SectionNode {
    return section(
        'vampire',
        vampire.sections.vampire.message,
        VAMPIRE_DOCS.vampire,
        [portraitGroup(1, PORTRAIT_SHOWN), vampireIdentityGroup({ column: 2 }), biographyGroup(2)],
        { columns: 2, columnWidths: [1, 2], labelMessage: vampire.sections.vampire }
    );
}

/** Hunger, Blood Potency, and Humanity with stains. */
export function vampireBloodGroup(options: { compact?: boolean; column?: number } = {}): GroupNode {
    const compact = options.compact ?? false;
    return group(
        'blood',
        vampire.sections.blood.message,
        [
            tracked({
                ...primitive('hunger', 'resource:hunger', {
                    label: vampire.fields.hunger.message,
                    labelMessage: vampire.fields.hunger,
                    compact,
                }),
                docsPath: VAMPIRE_DOCS.hunger,
            }),
            {
                ...primitive('blood-potency', 'resource:blood-potency', {
                    label: vampire.fields.bloodPotency.message,
                    labelMessage: vampire.fields.bloodPotency,
                    compact,
                }),
                docsPath: VAMPIRE_DOCS.bloodPotency,
            },
            {
                ...primitive('humanity', 'resource:humanity', {
                    label: vampire.fields.humanity.message,
                    labelMessage: vampire.fields.humanity,
                    compact,
                    poolTracker: humanityTracker(compact),
                }),
                docsPath: VAMPIRE_DOCS.humanity,
            },
            tracked(rouseButton()),
            remorseButton(),
        ],
        {
            ...(options.column ? { column: options.column } : {}),
            hideTitle: compact,
            labelMessage: vampire.sections.blood,
        }
    );
}

/** What the current Blood Potency gives, as derived values (spec 037 D4, spec 038). */
function bloodPotencyGroup(column: number): GroupNode {
    return group(
        'blood-potency-effects',
        vampire.sections.bloodPotency.message,
        bloodPotencyEffects(),
        {
            column,
            columns: 2,
            collapsible: true,
            labelMessage: vampire.sections.bloodPotency,
            docsPath: VAMPIRE_DOCS.bloodPotencyEffects,
        }
    );
}

/** Health, Willpower, and the blood: everything that changes scene to scene. */
function vampireConditionSection(): SectionNode {
    return section(
        'condition',
        v5.sections.condition.message,
        undefined,
        [
            trackGroup('health', { column: 1 }),
            tracked(trackGroup('willpower', { column: 2 })),
            vampireBloodGroup({ column: 3 }),
            bloodPotencyGroup(3),
        ],
        { columns: 3, labelMessage: v5.sections.condition }
    );
}

/** The clan's bane (usual or variant) and compulsion, from the catalog until rewritten. */
function baneGroup(column: number): GroupNode {
    return group(
        'bane',
        vampire.sections.bane.message,
        [
            primitive('bane-variant', 'field:bane-variant', {
                label: vampire.fields.baneVariant.message,
                labelMessage: vampire.fields.baneVariant,
            }),
            baneField(),
            { ...compulsionField(), docsPath: VAMPIRE_DOCS.compulsion },
        ],
        {
            column,
            collapsible: true,
            labelMessage: vampire.sections.bane,
            docsPath: VAMPIRE_DOCS.bane,
        }
    );
}

function rowsGroup(
    id: string,
    bindingKey: string,
    title: { id: string; message: string },
    column: number,
    extra: Partial<GroupNode> = {},
    rowButtons?: RowButton[]
): GroupNode {
    return {
        ...group(
            id,
            title.message,
            [
                primitive(`${id}-table`, bindingKey, {
                    label: title.message,
                    labelMessage: title,
                    hideLabel: true,
                    // Powers and rituals up to their discipline's dots (spec 037 D3, spec 038).
                    limitByParent: { entryKey: 'level', column: 'level', parentValue: 'value' },
                    ...(rowButtons ? { rowButtons } : {}),
                }),
            ],
            { column, labelMessage: title }
        ),
        ...extra,
    };
}

export function vampireDisciplinesSection(): SectionNode {
    return section(
        'disciplines',
        vampire.sections.disciplines.message,
        VAMPIRE_DOCS.disciplines,
        [
            group(
                'discipline-list',
                vampire.sections.disciplineList.message,
                [
                    list(
                        'disciplines-list',
                        { bindingKey: 'list:disciplines' },
                        vampire.sections.disciplineList.message
                    ),
                ],
                { column: 1, labelMessage: vampire.sections.disciplineList }
            ),
            rowsGroup(
                'power-list',
                'rows:powers',
                vampire.sections.powers,
                2,
                { docsPath: VAMPIRE_DOCS.powers },
                [powerRouseButton()]
            ),
            rowsGroup('ritual-list', 'rows:rituals', vampire.sections.rituals, 2, {
                visibleWhen: RITUALS_VISIBLE,
                docsPath: VAMPIRE_DOCS.rituals,
            }),
        ],
        { columns: 2, columnWidths: [1, 2], labelMessage: vampire.sections.disciplines }
    );
}

/** Ambition, Desire, convictions with touchstones, the clan's bane, chronicle tenets. */
function vampirePurposeSection(): SectionNode {
    return section(
        'purpose',
        vampire.sections.purpose.message,
        undefined,
        [
            group(
                'aims',
                vampire.sections.aims.message,
                [
                    v5Text('ambition', 'ambition', vampire.fields.ambition, { multiline: true }),
                    v5Text('desire', 'desire', vampire.fields.desire, { multiline: true }),
                ],
                { column: 1, labelMessage: vampire.sections.aims, docsPath: VAMPIRE_DOCS.concept }
            ),
            baneGroup(1),
            { ...touchstonesGroup(2), docsPath: VAMPIRE_DOCS.touchstones },
            { ...chronicleGroup(2), docsPath: VAMPIRE_DOCS.tenets },
        ],
        { columns: 2, labelMessage: vampire.sections.purpose }
    );
}

/** Full vampire page. */
export const vampireSheetTemplate: CustomTemplate = {
    id: 'v5-vampire-sheet',
    name: 'Vampire: the Masquerade 5e — Full sheet',
    systemId: SystemIdSchema.parse('wod-v5'),
    documentKind: VAMPIRE_KIND,
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    children: [
        vampireSection(),
        vampireConditionSection(),
        attributesSection(),
        skillsSection(),
        vampireDisciplinesSection(),
        vampirePurposeSection(),
        advantagesSection(VAMPIRE_DOCS.advantages),
        equipmentSection(VAMPIRE_DOCS.weapons),
        otherSection(),
    ],
};
