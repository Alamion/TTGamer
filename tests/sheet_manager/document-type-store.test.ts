import {
    defaultPageKey,
    migrateDocumentTypeStoreState,
    useDocumentTypeStore,
} from '@site/src/sheet_manager/store/documentTypeStore';
import { UserDocumentTypeSchema } from '@site/src/sheet_manager/systems/userTypes';
import { beforeEach, describe, expect, it } from 'vitest';

import { NOW, userSetting, userType } from './helpers/library';

describe('documentTypeStore v2 (spec 013)', () => {
    beforeEach(() => {
        useDocumentTypeStore.setState({
            types: {},
            settings: {},
            defaultPages: {},
            quarantine: [],
        });
    });

    it('migrates a v1 state unchanged and adds empty default pages', () => {
        const type = userType();
        const setting = userSetting();
        const migrated = migrateDocumentTypeStoreState({
            types: { [type.id]: type },
            settings: { [setting.id]: setting },
            quarantine: [{ id: 'broken' }],
        });
        expect(migrated.types).toEqual({ [type.id]: type });
        expect(migrated.settings).toEqual({ [setting.id]: setting });
        expect(migrated.quarantine).toEqual([{ id: 'broken' }]);
        expect(migrated.defaultPages).toEqual({});
    });

    it('keeps valid default pages and drops malformed ones', () => {
        const migrated = migrateDocumentTypeStoreState({
            types: {},
            settings: {},
            defaultPages: { 'wod-v5:hunter': 'v5-hunter-brief', bad: 3, empty: '' },
        });
        expect(migrated.defaultPages).toEqual({ 'wod-v5:hunter': 'v5-hunter-brief' });
    });

    it('accepts a type without a default page', () => {
        const parsed = UserDocumentTypeSchema.parse({
            id: 'user-ship0001',
            name: 'Ship',
            owner: { systemId: 'wod-2e' },
            createdAt: NOW,
            updatedAt: NOW,
        });
        expect(parsed.defaultTemplateId).toBeUndefined();
    });

    it('records, clears, and forgets default pages', () => {
        const { setDefaultPage, dropDefaultPagesFor } = useDocumentTypeStore.getState();
        const key = defaultPageKey('star-wars-wod', 'character');
        setDefaultPage(key, 'tpl-pilot001');
        setDefaultPage(defaultPageKey('wod-v5', 'hunter'), 'tpl-pilot001');
        expect(useDocumentTypeStore.getState().defaultPages[key]).toBe('tpl-pilot001');
        dropDefaultPagesFor('tpl-pilot001');
        expect(useDocumentTypeStore.getState().defaultPages).toEqual({});
        setDefaultPage(key, 'brief');
        setDefaultPage(key, null);
        expect(useDocumentTypeStore.getState().defaultPages).toEqual({});
    });
});
