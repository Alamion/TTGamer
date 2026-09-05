import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import { type CustomTemplate, CustomTemplateSchema } from '../../../types/template';

/**
 * Code-owned declarative starter skeletons, offered as "copy of a built-in page layout"
 * bases (research R4). They approximate each built-in page's section structure with plain
 * fields/tables — never executable content — and are copied (never referenced) when chosen.
 */
function skeleton(
    id: string,
    name: string,
    documentKind: CustomTemplate['documentKind'],
    sections: unknown
): CustomTemplate {
    return CustomTemplateSchema.parse({
        id,
        name,
        systemId: SystemIdSchema.parse('star-wars-wod'),
        documentKind,
        schemaVersion: 1,
        sections,
    });
}

const identitySection = {
    id: 'identity',
    title: 'Identity',
    blocks: [
        {
            id: 'identity-fields',
            type: 'fields' as const,
            columns: 2,
            fields: [
                { id: 'name', label: 'Name', type: 'text' as const, required: true },
                { id: 'concept', label: 'Concept', type: 'text' as const },
                { id: 'description', label: 'Description', type: 'text' as const, multiline: true },
            ],
        },
        {
            id: 'notes-table',
            type: 'table' as const,
            title: 'Notes',
            minRows: 0,
            maxRows: 50,
            columns: [
                { id: 'note-topic', label: 'Topic', type: 'text' as const },
                { id: 'note-text', label: 'Note', type: 'text' as const, multiline: true },
            ],
        },
    ],
};

const attributesSection = {
    id: 'attributes',
    title: 'Attributes',
    blocks: [
        {
            id: 'attribute-table',
            type: 'table' as const,
            title: 'Attributes',
            minRows: 0,
            maxRows: 20,
            columns: [
                { id: 'attribute-name', label: 'Attribute', type: 'text' as const, required: true },
                { id: 'attribute-value', label: 'Value', type: 'number' as const, min: 0, max: 10 },
                { id: 'attribute-notes', label: 'Notes', type: 'text' as const },
            ],
        },
    ],
};

const skillsSection = {
    id: 'skills',
    title: 'Skills',
    blocks: [
        {
            id: 'skill-table',
            type: 'table' as const,
            title: 'Skills',
            minRows: 0,
            maxRows: 100,
            columns: [
                { id: 'skill-name', label: 'Skill', type: 'text' as const, required: true },
                { id: 'skill-value', label: 'Value', type: 'number' as const, min: 0, max: 10 },
                { id: 'skill-notes', label: 'Notes', type: 'text' as const },
            ],
        },
    ],
};

const advantagesSection = {
    id: 'advantages',
    title: 'Advantages',
    blocks: [
        {
            id: 'advantage-table',
            type: 'table' as const,
            title: 'Advantages',
            minRows: 0,
            maxRows: 100,
            columns: [
                { id: 'advantage-name', label: 'Advantage', type: 'text' as const, required: true },
                { id: 'advantage-value', label: 'Value', type: 'number' as const, min: 0, max: 10 },
                { id: 'advantage-notes', label: 'Notes', type: 'text' as const },
            ],
        },
    ],
};

const equipmentSection = {
    id: 'equipment',
    title: 'Equipment',
    blocks: [
        {
            id: 'equipment-table',
            type: 'table' as const,
            title: 'Equipment',
            minRows: 0,
            maxRows: 100,
            columns: [
                { id: 'item-name', label: 'Item', type: 'text' as const, required: true },
                { id: 'item-quantity', label: 'Qty', type: 'number' as const, min: 0, max: 9999 },
                { id: 'item-notes', label: 'Notes', type: 'text' as const },
            ],
        },
        {
            id: 'wealth',
            type: 'fields' as const,
            title: 'Wealth',
            columns: 2,
            fields: [
                {
                    id: 'credits',
                    label: 'Credits',
                    type: 'resource' as const,
                    max: 1_000_000,
                },
            ],
        },
    ],
};

const combatSection = {
    id: 'combat',
    title: 'Combat & Damage',
    blocks: [
        {
            id: 'combat-fields',
            type: 'fields' as const,
            columns: 2,
            fields: [
                { id: 'initiative', label: 'Initiative', type: 'number' as const, min: 0, max: 30 },
                { id: 'defense', label: 'Defense', type: 'number' as const, min: 0, max: 30 },
            ],
        },
        {
            id: 'damage-fields',
            type: 'fields' as const,
            title: 'Condition',
            columns: 1,
            fields: [
                {
                    id: 'condition-note',
                    label: 'Condition',
                    type: 'select' as const,
                    options: [
                        { id: 'healthy', label: 'Healthy' },
                        { id: 'bruised', label: 'Bruised' },
                        { id: 'hurt', label: 'Hurt' },
                        { id: 'injured', label: 'Injured' },
                        { id: 'crippled', label: 'Crippled' },
                        { id: 'incapacitated', label: 'Incapacitated' },
                    ],
                },
            ],
        },
    ],
};

export const TEMPLATE_SKELETONS: readonly CustomTemplate[] = [
    skeleton(
        'skeleton-character',
        'Character page skeleton',
        DocumentKindSchema.parse('character'),
        [
            identitySection,
            attributesSection,
            skillsSection,
            advantagesSection,
            combatSection,
            equipmentSection,
        ]
    ),
    skeleton('skeleton-creature', 'Creature page skeleton', DocumentKindSchema.parse('creature'), [
        identitySection,
        combatSection,
        skillsSection,
    ]),
    skeleton('skeleton-vehicle', 'Vehicle page skeleton', DocumentKindSchema.parse('vehicle'), [
        identitySection,
        combatSection,
        equipmentSection,
    ]),
    skeleton('skeleton-group', 'Group page skeleton', DocumentKindSchema.parse('group'), [
        identitySection,
        equipmentSection,
    ]),
];

export function getSkeletonsForKind(
    documentKind: CustomTemplate['documentKind']
): readonly CustomTemplate[] {
    return TEMPLATE_SKELETONS.filter((template) => template.documentKind === documentKind);
}

/** Skeletons of every kind, offered when the document kind is not known yet. */
export const ALL_TEMPLATE_SKELETONS = TEMPLATE_SKELETONS;
