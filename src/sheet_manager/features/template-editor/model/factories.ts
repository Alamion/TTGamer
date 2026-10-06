import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { DocumentKindSchema, SystemIdSchema } from '../../../types/document';
import type { GroupNode, SectionNode, TableNode, TemplateField } from '../../../types/template';
import { TEMPLATE_SCHEMA_VERSION } from '../../../types/template';
import { defaultTrackerSettings } from '../../sheet/data/trackerDefaults';
import { generateDraftId } from './ids';
import { type EditorDraft } from './types';

export function baseField(type: TemplateField['type'], label: string): TemplateField {
    const base = {
        id: generateDraftId('f'),
        // Draft-safe: transient empty labels are allowed in the draft and flagged live.
        label,
        required: false,
        compact: false,
    };
    switch (type) {
        case 'text':
            return { ...base, type: 'text', multiline: false };
        case 'number':
            return { ...base, type: 'number' };
        case 'toggle':
            return { ...base, type: 'toggle' };
        case 'image':
            return { ...base, type: 'image' };
        case 'formula':
            return { ...base, type: 'formula', formula: '' };
        case 'select':
            return {
                ...base,
                type: 'select',
                multiple: false,
                options: [
                    {
                        id: generateDraftId('opt'),
                        label: translate(uiMessages.sheet.templates.editor.newOption, { index: 1 }),
                    },
                ],
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
        case 'tracker':
            return { ...base, type: 'tracker', ...defaultTrackerSettings() };
    }
}

export function newField(type: TemplateField['type'], label?: string): TemplateField {
    return baseField(type, label ?? '');
}

export function newSectionNode(): SectionNode {
    return {
        id: generateDraftId('sec'),
        type: 'section',
        title: translate(uiMessages.sheet.templates.editor.newSection),
        children: [],
    };
}

export function newGroupNode(): GroupNode {
    return {
        id: generateDraftId('grp'),
        type: 'group',
        title: translate(uiMessages.sheet.templates.editor.newGroup),
        collapsible: false,
        children: [],
    };
}

export function newTableNode(): TableNode {
    return {
        id: generateDraftId('blk'),
        type: 'table',
        minRows: 0,
        maxRows: 100,
        columns: [newField('text', 'Column 1')],
    };
}

export function createEmptyDraft(documentKind: string, systemId = 'star-wars-wod'): EditorDraft {
    const section = newSectionNode();
    section.children.push(newField('text', 'New field'));
    return {
        id: generateDraftId('tpl'),
        name: '',
        systemId: SystemIdSchema.parse(systemId),
        documentKind: documentKind as EditorDraft['documentKind'],
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [section],
    };
}

export function createDraftFromTemplate(
    source: EditorDraft,
    overrides: Partial<Pick<EditorDraft, 'id' | 'name'>> = {}
): EditorDraft {
    return structuredClone({ ...source, ...overrides });
}
