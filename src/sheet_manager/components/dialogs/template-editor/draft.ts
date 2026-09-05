import { generateId } from '../../../../shared/utils/random';
import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import type { CustomTemplate } from '../../../types/template';
import type { TemplateBlock, TemplateField } from '../../../types/template';
import { TEMPLATE_LIMITS, TemplateFieldSchema } from '../../../types/template';

/** Type-safe structural updates for a block (type/id/fields are managed separately). */
export type BlockUpdates = {
    title?: string;
    columns?: number;
    minRows?: number;
    maxRows?: number;
};

/** Kebab-safe identifier for a new draft node; the prefix guarantees a letter start. */
function newId(prefix: string): string {
    const token =
        generateId()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 8) || 'node';
    return `${prefix}-${token}`;
}

/** Public id generator for callers that seed drafts outside this module. */
export function generateDraftId(prefix: 'tpl' | 'sec' | 'blk' | 'f' | 'opt'): string {
    return newId(prefix);
}

export type EditorDraft = CustomTemplate;

export function newTextField(label = ''): TemplateField {
    return TemplateFieldSchema.parse({
        id: newId('f'),
        label: label || 'New field',
        type: 'text',
    });
}

function newFieldsBlock(): TemplateBlock {
    return {
        id: newId('blk'),
        type: 'fields',
        columns: 1,
        fields: [newTextField()],
    };
}

export function createEmptyDraft(documentKind: string): EditorDraft {
    return {
        id: newId('tpl'),
        name: '',
        systemId: SystemIdSchema.parse('star-wars-wod'),
        documentKind: documentKind as EditorDraft['documentKind'],
        schemaVersion: 1,
        sections: [
            {
                id: newId('sec'),
                title: 'New section',
                blocks: [newFieldsBlock()],
            },
        ],
    };
}

export function createDraftFromTemplate(
    source: EditorDraft,
    overrides: Partial<Pick<EditorDraft, 'id' | 'name'>> = {}
): EditorDraft {
    return structuredClone({ ...source, ...overrides });
}

export interface DraftIssue {
    message: string;
}

export interface DraftIssueMessages {
    emptyName: string;
    emptyLabel: string;
    duplicateId: string;
    invalidKey: string;
    limitReached: string;
    invalidBounds: string;
}

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const MAX_KEY_LENGTH = 64;

function isValidKey(key: string): boolean {
    return key.length > 0 && key.length <= MAX_KEY_LENGTH && IDENTIFIER_PATTERN.test(key);
}

function interpolate(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

/**
 * Live draft integrity feedback (spec FR-4). Structural identifiers are generated, but the
 * checks stay defensive (imports/edits could introduce collisions) alongside limits and bounds.
 */
export function collectDraftIssues(draft: EditorDraft, messages: DraftIssueMessages): DraftIssue[] {
    const issues: DraftIssue[] = [];
    if (draft.name.trim().length === 0) {
        issues.push({ message: messages.emptyName });
    }

    // FR-27: one namespace per template — effective keys of all fields and table blocks.
    const seenEffectiveKeys = new Set<string>();
    const checkEffectiveKey = (key: string) => {
        if (!isValidKey(key)) {
            issues.push({ message: interpolate(messages.invalidKey, { id: key }) });
            return;
        }
        if (seenEffectiveKeys.has(key)) {
            issues.push({ message: interpolate(messages.duplicateId, { id: key }) });
        }
        seenEffectiveKeys.add(key);
    };

    const seenSectionIds = new Set<string>();
    for (const section of draft.sections) {
        if (seenSectionIds.has(section.id)) {
            issues.push({ message: interpolate(messages.duplicateId, { id: section.id }) });
        }
        seenSectionIds.add(section.id);
        if (section.title.trim().length === 0) {
            issues.push({ message: messages.emptyLabel });
        }

        const seenBlockIds = new Set<string>();
        for (const block of section.blocks) {
            if (seenBlockIds.has(block.id)) {
                issues.push({ message: interpolate(messages.duplicateId, { id: block.id }) });
            }
            seenBlockIds.add(block.id);

            if (block.type === 'table') {
                checkEffectiveKey(block.valueKey ?? block.id);
            }

            const items: readonly TemplateField[] =
                block.type === 'fields' ? block.fields : block.columns;
            const seenFieldIds = new Set<string>();
            for (const field of items) {
                if (seenFieldIds.has(field.id)) {
                    issues.push({ message: interpolate(messages.duplicateId, { id: field.id }) });
                }
                seenFieldIds.add(field.id);
                if (field.label.trim().length === 0) {
                    issues.push({ message: messages.emptyLabel });
                }
                checkEffectiveKey(field.valueKey ?? field.id);

                if (field.type === 'select') {
                    const seenOptions = new Set<string>();
                    for (const option of field.options) {
                        if (seenOptions.has(option.id)) {
                            issues.push({
                                message: interpolate(messages.duplicateId, { id: option.id }),
                            });
                        }
                        seenOptions.add(option.id);
                    }
                }
            }
        }
    }

    const sectionCount = draft.sections.length;
    if (sectionCount > TEMPLATE_LIMITS.sections) {
        issues.push({
            message: interpolate(messages.limitReached, {
                limit: TEMPLATE_LIMITS.sections,
                subject: 'sections',
            }),
        });
    }
    for (const section of draft.sections) {
        if (section.blocks.length > TEMPLATE_LIMITS.blocksPerSection) {
            issues.push({
                message: interpolate(messages.limitReached, {
                    limit: TEMPLATE_LIMITS.blocksPerSection,
                    subject: 'blocks',
                }),
            });
        }
        for (const block of section.blocks) {
            if (block.type === 'fields' && block.fields.length > TEMPLATE_LIMITS.fieldsPerBlock) {
                issues.push({
                    message: interpolate(messages.limitReached, {
                        limit: TEMPLATE_LIMITS.fieldsPerBlock,
                        subject: 'fields',
                    }),
                });
            }
            if (block.type === 'table' && block.columns.length > TEMPLATE_LIMITS.fieldsPerBlock) {
                issues.push({
                    message: interpolate(messages.limitReached, {
                        limit: TEMPLATE_LIMITS.fieldsPerBlock,
                        subject: 'columns',
                    }),
                });
            }
            if (block.type === 'table' && block.minRows > block.maxRows) {
                issues.push({ message: messages.invalidBounds });
            }
            const items: readonly TemplateField[] =
                block.type === 'fields' ? block.fields : block.columns;
            for (const field of items) {
                if (
                    (field.type === 'number' ||
                        field.type === 'rating' ||
                        field.type === 'resource') &&
                    field.min !== undefined &&
                    field.max !== undefined &&
                    field.min > field.max
                ) {
                    issues.push({ message: messages.invalidBounds });
                }
            }
        }
    }
    return issues;
}

function move<T>(items: T[], index: number, offset: -1 | 1): T[] {
    const target = index + offset;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    return next;
}

export function addSection(draft: EditorDraft): EditorDraft {
    return {
        ...draft,
        sections: [
            ...draft.sections,
            {
                id: newId('sec'),
                title: 'New section',
                blocks: [newFieldsBlock()],
            },
        ],
    };
}

export function removeSection(draft: EditorDraft, sectionId: string): EditorDraft {
    if (draft.sections.length <= 1) return draft;
    return {
        ...draft,
        sections: draft.sections.filter((section) => section.id !== sectionId),
    };
}

export function moveSection(draft: EditorDraft, sectionId: string, offset: -1 | 1): EditorDraft {
    const index = draft.sections.findIndex((section) => section.id === sectionId);
    return { ...draft, sections: move(draft.sections, index, offset) };
}

export function renameSection(draft: EditorDraft, sectionId: string, title: string): EditorDraft {
    return {
        ...draft,
        sections: draft.sections.map((section) =>
            section.id === sectionId ? { ...section, title } : section
        ),
    };
}

export function addBlock(
    draft: EditorDraft,
    sectionId: string,
    type: 'fields' | 'table'
): EditorDraft {
    const block: TemplateBlock =
        type === 'fields'
            ? newFieldsBlock()
            : {
                  id: newId('blk'),
                  type: 'table',
                  minRows: 0,
                  maxRows: 100,
                  columns: [newTextField()],
              };
    return {
        ...draft,
        sections: draft.sections.map((section) =>
            section.id === sectionId ? { ...section, blocks: [...section.blocks, block] } : section
        ),
    };
}

export function removeBlock(draft: EditorDraft, sectionId: string, blockId: string): EditorDraft {
    return {
        ...draft,
        sections: draft.sections.map((section) =>
            section.id === sectionId
                ? { ...section, blocks: section.blocks.filter((block) => block.id !== blockId) }
                : section
        ),
    };
}

export function moveBlock(
    draft: EditorDraft,
    sectionId: string,
    blockId: string,
    offset: -1 | 1
): EditorDraft {
    return {
        ...draft,
        sections: draft.sections.map((section) => {
            if (section.id !== sectionId) return section;
            const index = section.blocks.findIndex((block) => block.id === blockId);
            return { ...section, blocks: move(section.blocks, index, offset) };
        }),
    };
}

export function updateBlock(
    draft: EditorDraft,
    sectionId: string,
    blockId: string,
    updates: BlockUpdates
): EditorDraft {
    return {
        ...draft,
        sections: draft.sections.map((section) =>
            section.id === sectionId
                ? {
                      ...section,
                      blocks: section.blocks.map((block) =>
                          block.id === blockId ? ({ ...block, ...updates } as TemplateBlock) : block
                      ),
                  }
                : section
        ),
    };
}

function mapBlockItems(
    draft: EditorDraft,
    blockId: string,
    map: (fields: TemplateField[]) => TemplateField[]
): EditorDraft {
    return {
        ...draft,
        sections: draft.sections.map((section) => ({
            ...section,
            blocks: section.blocks.map((block) => {
                if (block.id !== blockId) return block;
                if (block.type === 'fields') return { ...block, fields: map([...block.fields]) };
                return { ...block, columns: map([...block.columns]) };
            }),
        })),
    };
}

export function addField(draft: EditorDraft, blockId: string): EditorDraft {
    return mapBlockItems(draft, blockId, (items) => [...items, newTextField()]);
}

export function removeField(draft: EditorDraft, blockId: string, fieldId: string): EditorDraft {
    return mapBlockItems(draft, blockId, (items) =>
        items.length <= 1 ? items : items.filter((field) => field.id !== fieldId)
    );
}

export function moveField(
    draft: EditorDraft,
    blockId: string,
    fieldId: string,
    offset: -1 | 1
): EditorDraft {
    return mapBlockItems(draft, blockId, (items) =>
        move(
            items,
            items.findIndex((field) => field.id === fieldId),
            offset
        )
    );
}

/**
 * Draft mutations are lenient: they apply structural changes without running the save-time
 * schema, so transient states (a cleared label mid-keystroke) cannot crash the editor.
 * Integrity is enforced by `collectDraftIssues` (live feedback) and the save parse.
 */

export function updateField(
    draft: EditorDraft,
    blockId: string,
    fieldId: string,
    updates: Partial<TemplateField>
): EditorDraft {
    return mapBlockItems(draft, blockId, (items) =>
        items.map((field) =>
            field.id === fieldId ? ({ ...field, ...updates } as TemplateField) : field
        )
    );
}

/** Type-change defaults mirror the schema defaults without parsing the whole field. */
function retypeField(field: TemplateField, type: TemplateField['type']): TemplateField {
    const base = {
        id: field.id,
        label: field.label,
        required: field.required,
        ...(field.description !== undefined ? { description: field.description } : {}),
        ...(field.valueKey !== undefined ? { valueKey: field.valueKey } : {}),
    };
    switch (type) {
        case 'text':
            return { ...base, type: 'text', multiline: false };
        case 'number':
            return { ...base, type: 'number' };
        case 'toggle':
            return { ...base, type: 'toggle' };
        case 'select':
            return {
                ...base,
                type: 'select',
                multiple: false,
                options: [{ id: newId('opt'), label: 'Option 1' }],
            };
        case 'rating':
            return { ...base, type: 'rating', min: 0, max: 5, presentation: 'dots' };
        case 'resource':
            return { ...base, type: 'resource', min: 0, max: 100 };
        case 'reference':
            return {
                ...base,
                type: 'reference',
                targetKinds: [DocumentKindSchema.parse('character')],
                multiple: false,
            };
    }
}

/** Changing the type resets type-specific settings so the field stays valid. */
export function changeFieldType(
    draft: EditorDraft,
    blockId: string,
    fieldId: string,
    type: TemplateField['type']
): EditorDraft {
    return mapBlockItems(draft, blockId, (items) =>
        items.map((field) => (field.id === fieldId ? retypeField(field, type) : field))
    );
}

export function addOption(draft: EditorDraft, blockId: string, fieldId: string): EditorDraft {
    return mapBlockItems(draft, blockId, (items) =>
        items.map((field) => {
            if (field.id !== fieldId || field.type !== 'select') return field;
            if (field.options.length >= TEMPLATE_LIMITS.optionsPerField) return field;
            return {
                ...field,
                options: [
                    ...field.options,
                    { id: newId('opt'), label: `Option ${field.options.length + 1}` },
                ],
            };
        })
    );
}

export function updateOption(
    draft: EditorDraft,
    blockId: string,
    fieldId: string,
    optionId: string,
    label: string
): EditorDraft {
    return mapBlockItems(draft, blockId, (items) =>
        items.map((field) => {
            if (field.id !== fieldId || field.type !== 'select') return field;
            return {
                ...field,
                options: field.options.map((option) =>
                    option.id === optionId ? { ...option, label } : option
                ),
            };
        })
    );
}

export function removeOption(
    draft: EditorDraft,
    blockId: string,
    fieldId: string,
    optionId: string
): EditorDraft {
    return mapBlockItems(draft, blockId, (items) =>
        items.map((field) => {
            if (field.id !== fieldId || field.type !== 'select' || field.options.length <= 1) {
                return field;
            }
            return { ...field, options: field.options.filter((option) => option.id !== optionId) };
        })
    );
}

export function renameDraft(draft: EditorDraft, name: string): EditorDraft {
    return { ...draft, name };
}

export function describeDraft(draft: EditorDraft, description: string): EditorDraft {
    return { ...draft, description: description.length > 0 ? description : undefined };
}

export function setDraftKind(draft: EditorDraft, documentKind: string): EditorDraft {
    return { ...draft, documentKind: documentKind as EditorDraft['documentKind'] };
}

/** Attaches (or re-points) a catalog binding on a select field; enforces single choice. */
export function attachCatalog(
    draft: EditorDraft,
    blockId: string,
    fieldId: string,
    catalogId: string
): EditorDraft {
    return mapBlockItems(draft, blockId, (items) =>
        items.map((field) => {
            if (field.id !== fieldId || field.type !== 'select') return field;
            return {
                ...field,
                multiple: false,
                binding: { catalogId, fills: field.binding?.fills ?? {} },
            } as TemplateField;
        })
    );
}

export function detachCatalog(draft: EditorDraft, blockId: string, fieldId: string): EditorDraft {
    return mapBlockItems(draft, blockId, (items) =>
        items.map((field) => {
            if (field.id !== fieldId || field.type !== 'select') return field;
            const { binding: _removed, ...withoutBinding } = field;
            void _removed;
            return withoutBinding as TemplateField;
        })
    );
}

export function updateFill(
    draft: EditorDraft,
    blockId: string,
    fieldId: string,
    detailKey: string,
    rule: { targetFieldId: string; disabled?: boolean } | undefined
): EditorDraft {
    return mapBlockItems(draft, blockId, (items) =>
        items.map((field) => {
            if (field.id !== fieldId || field.type !== 'select' || !field.binding) return field;
            const fills = { ...field.binding.fills };
            if (rule) fills[detailKey] = rule;
            else delete fills[detailKey];
            return { ...field, binding: { ...field.binding, fills } } as TemplateField;
        })
    );
}
