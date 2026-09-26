import { targetLabel } from '@site/src/sheet_manager/features/sheet/data/documentLabels';
import { migrateDocumentTypeStoreState } from '@site/src/sheet_manager/store/documentTypeStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { resolveDocumentPolicies, systemRegistry } from '@site/src/sheet_manager/systems';
import { SystemRegistry } from '@site/src/sheet_manager/systems/registry';
import type { DocumentDefinition, SystemPlugin } from '@site/src/sheet_manager/systems/types';
import {
    STORED_VALUES_VIEW_ID,
    type UserDocumentType,
} from '@site/src/sheet_manager/systems/userTypes';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { takeSheetIssues } from '../setup/sheetIssues';

const NOW = '2026-09-25T10:00:00.000Z';

function type(overrides: Partial<UserDocumentType> = {}): UserDocumentType {
    return {
        id: 'user-org00001',
        name: 'Organization',
        owner: { systemId: 'star-wars-wod' },
        defaultTemplateId: 'tpl-orgpage1',
        createdAt: NOW,
        updatedAt: NOW,
        ...overrides,
    } as UserDocumentType;
}

const page = (id: string, kind = 'user-org00001', systemId = 'star-wars-wod') =>
    CustomTemplateSchema.parse({
        id,
        name: `Page ${id}`,
        systemId,
        documentKind: kind,
        schemaVersion: 3,
        children: [{ id: 'name', type: 'text', label: 'Name' }],
    });

function document(definitionId = 'user-org00001') {
    return {
        id: 'doc-1',
        kind: definitionId,
        systemId: 'star-wars-wod',
        definitionId,
        schemaVersion: 1,
        metadata: { title: 'Rebel cell', tags: [] },
        templateValues: { motto: 'Hope', members: 12 },
        data: {},
    };
}

function install(types: Record<string, UserDocumentType>, templates = [page('tpl-orgpage1')]) {
    useTemplateStore.setState({ templates, quarantine: [], defaultOverrides: {} });
    useDocumentTypeStore.setState({ types, settings: {} });
}

describe('user document types in the registry (spec 012)', () => {
    beforeEach(() => install({}, []));
    afterEach(() => install({}, []));

    it('parses a user-type document without its type, values intact', () => {
        const parsed = systemRegistry.parseDocument(document());
        expect(parsed.envelope.templateValues).toEqual({ motto: 'Hope', members: 12 });
        expect(parsed.envelope.data).toEqual({});
        expect(parsed.definition.defaultViewId).toBe(STORED_VALUES_VIEW_ID);
    });

    it('lists an installed type and resolves its pages as views', () => {
        install({ 'user-org00001': type() }, [page('tpl-orgpage1'), page('tpl-orgpage2')]);
        const listed = systemRegistry
            .listDefinitions()
            .find(({ definition }) => definition.id === 'user-org00001');
        expect(listed?.system.id).toBe('star-wars-wod');
        const definition = systemRegistry.getDocumentDefinition('star-wars-wod', 'user-org00001')!;
        expect(definition.label.message).toBe('Organization');
        expect(definition.defaultViewId).toBe('tpl-orgpage1');
        expect(definition.views.map(({ id }) => id)).toEqual(['tpl-orgpage1', 'tpl-orgpage2']);

        // Deleting the type turns the definition into the orphan one; orphans are never listed.
        install({}, []);
        expect(
            systemRegistry.listDefinitions().some(({ definition: d }) => d.id === 'user-org00001')
        ).toBe(false);
        expect(
            systemRegistry.getDocumentDefinition('star-wars-wod', 'user-org00001')?.defaultViewId
        ).toBe(STORED_VALUES_VIEW_ID);
        expect(systemRegistry.parseDocument(document()).envelope.templateValues.motto).toBe('Hope');
    });

    it('rejects user-type documents of unknown systems or mismatched kinds', () => {
        expect(() =>
            systemRegistry.parseDocument({ ...document(), systemId: 'unknown-system' })
        ).toThrow();
        expect(() => systemRegistry.parseDocument({ ...document(), kind: 'character' })).toThrow();
    });

    it('reserves the user- prefix for user types', () => {
        const definition = {
            id: 'user-shipped',
            kind: 'character',
            label: { id: 'x', message: 'X' },
            schemaVersion: 1,
            schema: z.object({}),
            createDefault: () => ({}),
            defaultViewId: 'x-view',
            views: [
                {
                    id: 'x-view',
                    label: { id: 'x', message: 'X' },
                    layout: { type: 'declarative', templateId: 'x-view' },
                },
            ],
        } as unknown as DocumentDefinition;
        const plugin = {
            id: 'fake',
            label: { id: 'fake', message: 'Fake' },
            documents: [definition],
        } as unknown as SystemPlugin;
        expect(() => new SystemRegistry([plugin])).toThrow(/reserved/);
    });

    it('labels a type with the name of the user setting that owns it', () => {
        useTemplateStore.setState({
            templates: [page('tpl-cellpage', 'user-cell0001', 'wod-v5')],
            quarantine: [],
            defaultOverrides: {},
        });
        useDocumentTypeStore.setState({
            types: {
                'user-cell0001': type({
                    id: 'user-cell0001',
                    name: 'Cell',
                    owner: { settingId: 'user-setting-ash00001' } as UserDocumentType['owner'],
                    defaultTemplateId: 'tpl-cellpage',
                }),
            },
            settings: {
                'user-setting-ash00001': {
                    id: 'user-setting-ash00001',
                    name: 'Ashen Realms',
                    systemId: 'wod-v5' as never,
                    pages: {},
                    createdAt: NOW,
                    updatedAt: NOW,
                },
            },
        });
        expect(targetLabel('wod-v5', 'user-cell0001')).toBe('Ashen Realms · Cell');
    });

    it('gives a type the policies of its setting and module', () => {
        install(
            {
                'user-cell0001': type({
                    id: 'user-cell0001',
                    name: 'Cell',
                    owner: { systemId: 'wod-v5', moduleId: 'hunter' } as UserDocumentType['owner'],
                    defaultTemplateId: 'tpl-cellpage',
                }),
                'user-org00001': type(),
            },
            [page('tpl-cellpage', 'user-cell0001', 'wod-v5'), page('tpl-orgpage1')]
        );
        const ids = (systemId: string, definitionId: string) =>
            resolveDocumentPolicies(systemRegistry, { systemId, definitionId }).map(({ id }) => id);
        expect(ids('wod-v5', 'user-cell0001')).toEqual(['dark-pack']);
        expect(ids('star-wars-wod', 'user-org00001')).toEqual([]);
    });

    it('quarantines persisted types that do not parse', () => {
        const migrated = migrateDocumentTypeStoreState({
            types: { good: type(), bad: { id: 'user-bad', name: '' } },
            settings: {},
            quarantine: [],
        });
        expect(Object.keys(migrated.types)).toEqual(['user-org00001']);
        expect(migrated.quarantine).toHaveLength(1);
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['template-quarantined']);
    });
});
