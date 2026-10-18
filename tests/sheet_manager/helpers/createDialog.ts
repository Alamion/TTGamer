import {
    buildLibraryTree,
    countDocuments,
} from '@site/src/sheet_manager/features/sheet/data/libraryTree';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { UserDocumentType, UserSetting } from '@site/src/sheet_manager/systems/userTypes';

import { NOW } from './library';

export const LUNAR_ID = 'user-setting-lunar001';

const typeId = (index: number) => `user-type${String(index).padStart(4, '0')}`;

/**
 * The fixture of spec 039: "Lunar Colony" on V5 with two same-named types, and further user types
 * on the shipped systems until `count` user types exist.
 */
export function seedUserKinds(count = 20): void {
    const settings: Record<string, UserSetting> = {
        [LUNAR_ID]: {
            id: LUNAR_ID,
            name: 'Lunar Colony',
            systemId: 'wod-v5' as UserSetting['systemId'],
            pages: {},
            createdAt: NOW,
            updatedAt: NOW,
        } as UserSetting,
    };
    const types: Record<string, UserDocumentType> = {};
    const add = (
        index: number,
        name: string,
        owner: UserDocumentType['owner'],
        description?: string
    ) => {
        const id = typeId(index);
        types[id] = {
            id,
            name,
            owner,
            ...(description ? { description } : {}),
            createdAt: NOW,
            updatedAt: NOW,
        } as UserDocumentType;
    };
    add(1, 'Habitat', { settingId: LUNAR_ID }, 'Pressurised dome');
    add(2, 'Habitat', { settingId: LUNAR_ID }, 'Mining outpost');
    const owners = ['wod-v5', 'star-wars-wod', 'wod-2e'];
    for (let index = 3; index <= count; index += 1) {
        add(index, `Ledger ${index}`, {
            systemId: owners[index % owners.length],
        } as UserDocumentType['owner']);
    }
    useDocumentTypeStore.setState({ types, settings });
}

export function resetUserKinds(): void {
    useDocumentTypeStore.setState({ types: {}, settings: {}, defaultPages: {}, catalogs: {} });
}

export function currentTree() {
    const { types, settings, defaultPages, catalogs } = useDocumentTypeStore.getState();
    const { templates, defaultOverrides } = useTemplateStore.getState();
    return buildLibraryTree({
        registry: systemRegistry,
        types,
        settings,
        catalogs,
        templates,
        defaultOverrides,
        defaultPages,
        counts: countDocuments([]),
    });
}

export { typeId as userKindId };
