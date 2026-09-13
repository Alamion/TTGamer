import {
    migrateTemplateStoreState,
    useTemplateStore,
} from '@site/src/sheet_manager/store/templateStore';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

function buildTemplate(id: string, name = 'Test Template') {
    return CustomTemplateSchema.parse({
        id,
        name,
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'identity',
                type: 'section',
                title: 'Identity',
                children: [
                    {
                        id: 'origin',
                        type: 'text',
                        label: 'Origin',
                        required: false,
                        compact: false,
                        multiline: false,
                    },
                ],
            },
        ],
    });
}

describe('template store', () => {
    beforeEach(() => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
    });

    it('saves a template as an upsert by id', () => {
        const { saveTemplate } = useTemplateStore.getState();
        const template = buildTemplate('my-kit');
        saveTemplate(template);
        expect(useTemplateStore.getState().templates).toHaveLength(1);

        const renamed = { ...template, name: 'Renamed Kit' };
        saveTemplate(renamed);
        const templates = useTemplateStore.getState().templates;
        expect(templates).toHaveLength(1);
        expect(templates[0]?.name).toBe('Renamed Kit');
    });

    it('rejects invalid templates instead of storing them', () => {
        const { saveTemplate } = useTemplateStore.getState();
        const invalid = { id: 'no-sections', name: 'No Sections', sections: [] };
        expect(() =>
            saveTemplate(invalid as unknown as ReturnType<typeof buildTemplate>)
        ).toThrow();
        expect(useTemplateStore.getState().templates).toHaveLength(0);
    });

    it('duplicates under a fresh id and removes by id', () => {
        const { saveTemplate, duplicateTemplate, removeTemplate } = useTemplateStore.getState();
        const template = buildTemplate('my-kit', 'My Kit');
        saveTemplate(template);

        const copy = duplicateTemplate('my-kit', 'copy-kit');
        expect(copy?.id).toBe('copy-kit');
        expect(copy?.name).toBe('My Kit');
        expect(useTemplateStore.getState().templates).toHaveLength(2);

        removeTemplate('my-kit');
        expect(useTemplateStore.getState().templates.map(({ id }) => id)).toEqual(['copy-kit']);
        expect(useTemplateStore.getState().getTemplate('my-kit')).toBeUndefined();
    });

    it('quarantines invalid persisted entries and keeps valid ones on migration', () => {
        const valid = buildTemplate('keeper');
        const migrated = migrateTemplateStoreState({
            templates: [
                valid,
                { id: 'broken', name: 'Broken' },
                { id: 'also-broken', sections: 'nope' },
            ],
            quarantine: [{ older: 'entry' }],
        });
        expect(migrated.templates.map(({ id }) => id)).toEqual(['keeper']);
        expect(migrated.quarantine).toHaveLength(3);
        expect(takeSheetIssues().map(({ details }) => details?.templateId)).toEqual([
            'broken',
            'also-broken',
        ]);
    });

    it('caps the quarantine collection size', () => {
        const broken = Array.from({ length: 150 }, (_, index) => ({ id: `bad-${index}` }));
        const migrated = migrateTemplateStoreState({ templates: [], quarantine: broken });
        expect(migrated.quarantine).toHaveLength(100);
    });

    it('returns undefined when duplicating a missing template', () => {
        expect(useTemplateStore.getState().duplicateTemplate('missing', 'new-id')).toBeUndefined();
    });
});
