import { describe, expect, it } from 'vitest';

import { generateDraftId } from '../../src/sheet_manager/features/template-editor/model/ids';
import {
    isUserCatalogId,
    newCatalogColumnId,
    newCatalogEntryId,
    newUserCatalogId,
    UserCatalogSchema,
} from '../../src/sheet_manager/systems/userCatalogs';
import {
    isUserKind,
    newUserSettingId,
    newUserTypeId,
    UserDocumentTypeSchema,
    UserSettingSchema,
} from '../../src/sheet_manager/systems/userTypes';
import { DocumentDefinitionIdSchema } from '../../src/sheet_manager/types/document';

const stamp = { createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z' };

const parsesType = (id: string, settingId?: string) =>
    UserDocumentTypeSchema.safeParse({
        id,
        name: 'Type',
        owner: settingId ? { settingId } : { systemId: 'wod-v5' },
        ...stamp,
    }).success;

const parsesSetting = (id: string) =>
    UserSettingSchema.safeParse({ id, name: 'Setting', systemId: 'wod-v5', ...stamp }).success;

const parsesCatalog = (id: string, columnId = 'c-1a2b3c4d', entryId = 'e-1a2b3c4d') =>
    UserCatalogSchema.safeParse({
        id,
        name: 'Catalog',
        owner: { systemId: 'wod-v5' },
        columns: [{ id: columnId, name: 'Name', type: 'text' }],
        entries: [{ id: entryId, name: 'Entry', values: { [columnId]: 'x' } }],
        ...stamp,
    }).success;

describe('library item ids (spec 030, FR-016)', () => {
    it('ends new type, setting, and catalog ids in the 32 hex digits of a UUIDv7', () => {
        expect(newUserTypeId()).toMatch(/^user-[0-9a-f]{12}7[0-9a-f]{19}$/);
        expect(newUserSettingId()).toMatch(/^user-setting-[0-9a-f]{12}7[0-9a-f]{19}$/);
        expect(newUserCatalogId()).toMatch(/^user-catalog-[0-9a-f]{12}7[0-9a-f]{19}$/);
    });

    it('accepts new ids in the schemas and the prefix checks', () => {
        const typeId = newUserTypeId();
        const settingId = newUserSettingId();
        const catalogId = newUserCatalogId();
        expect(DocumentDefinitionIdSchema.safeParse(typeId).success).toBe(true);
        expect(parsesType(typeId)).toBe(true);
        expect(parsesType(typeId, settingId)).toBe(true);
        expect(parsesSetting(settingId)).toBe(true);
        expect(parsesCatalog(catalogId, newCatalogColumnId(), newCatalogEntryId())).toBe(true);
        expect(isUserKind(typeId)).toBe(true);
        expect(isUserKind(settingId)).toBe(false);
        expect(isUserCatalogId(catalogId)).toBe(true);
    });

    it('still accepts the 8-digit ids stored before the change', () => {
        expect(parsesType('user-1a2b3c4d', 'user-setting-1a2b3c4d')).toBe(true);
        expect(parsesSetting('user-setting-1a2b3c4d')).toBe(true);
        expect(parsesCatalog('user-catalog-1a2b3c4d')).toBe(true);
        expect(isUserKind('user-1a2b3c4d')).toBe(true);
    });

    it('rejects ids of any other length', () => {
        expect(parsesType('user-1a2b3c4d5')).toBe(false);
        expect(parsesSetting('user-setting-1a2b')).toBe(false);
    });
});

describe('template ids (spec 030, FR-016)', () => {
    it('gives a template the 32 hex digits and its elements 8 random characters', () => {
        expect(generateDraftId('tpl')).toMatch(/^tpl-[0-9a-f]{12}7[0-9a-f]{19}$/);
        expect(generateDraftId('f')).toMatch(/^f-[0-9a-f]{8}$/);
    });

    it('never repeats element ids made in one burst, as a paste makes them', () => {
        const ids = new Set(Array.from({ length: 1_000 }, () => generateDraftId('f')));
        expect(ids.size).toBe(1_000);
    });
});
