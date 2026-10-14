import { readLibraryState } from '@site/src/sheet_manager/features/sheet/data/libraryActions';
import { deletePlan } from '@site/src/sheet_manager/features/sheet/data/libraryActions';
import {
    bulkMoveTargets,
    bulkSubjects,
    planBulkDelete,
    planBulkMove,
} from '@site/src/sheet_manager/features/sheet/data/libraryBulk';
import {
    buildLibraryTree,
    countDocuments,
    findNode,
} from '@site/src/sheet_manager/features/sheet/data/libraryTree';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { UserSetting } from '@site/src/sheet_manager/systems/userTypes';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ASHEN_ID, CULT_ID, resetLibraryStores, seedLibrary, userSetting } from './helpers/library';

const DUSK_ID = 'user-setting-dusk0001';
const MIST_ID = 'user-setting-mist0001';

function tree() {
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

const keys = (...list: string[]) => new Set(list);
const names = (nodes: readonly { key: string }[]) => nodes.map(({ key }) => key);

describe('acting on several rows at once (spec 032, library)', () => {
    beforeEach(() => {
        seedLibrary();
        useDocumentStore.setState({ documents: [], currentDocumentId: null });
        useDocumentTypeStore.setState((state) => ({
            settings: {
                ...state.settings,
                [DUSK_ID]: userSetting({ id: DUSK_ID, name: 'Dusk', pages: {} }),
                [MIST_ID]: userSetting({
                    id: MIST_ID,
                    name: 'Misty Archipelago',
                    systemId: 'wod-2e' as UserSetting['systemId'],
                    pages: {},
                }),
            },
        }));
    });
    afterEach(resetLibraryStores);

    it('lets a row ride along with its selected parent', () => {
        const current = tree();
        const subjects = bulkSubjects(
            current,
            keys(`s:user:${ASHEN_ID}`, `t:user:${CULT_ID}`, `s:user:${DUSK_ID}`)
        );
        expect(names(subjects)).toEqual([`s:user:${ASHEN_ID}`, `s:user:${DUSK_ID}`]);
    });

    it('deletes what each subject deletes, in one set of writes', () => {
        const current = tree();
        const subjects = bulkSubjects(current, keys(`s:user:${ASHEN_ID}`, `s:user:${DUSK_ID}`));
        const plan = planBulkDelete(subjects, readLibraryState());
        expect(plan.blocked).toEqual([]);
        expect(plan.writes.removeSettings?.sort()).toEqual([ASHEN_ID, DUSK_ID].sort());
        const own = deletePlan(subjects[0]!, readLibraryState())!;
        expect(plan.writes.removeTypes).toEqual(expect.arrayContaining(own.writes.removeTypes!));
    });

    it('holds the delete back while a shipped row is among the subjects', () => {
        const current = tree();
        const subjects = bulkSubjects(
            current,
            keys(`s:user:${ASHEN_ID}`, 's:system:star-wars-wod')
        );
        const plan = planBulkDelete(subjects, readLibraryState());
        expect(names(plan.blocked)).toEqual(['s:system:star-wars-wod']);
    });

    it('offers only the places every subject can go to, of one kind', () => {
        const current = tree();
        const both = bulkSubjects(current, keys(`s:user:${ASHEN_ID}`, `s:user:${DUSK_ID}`));
        const targets = bulkMoveTargets(both, current)!;
        expect(targets.length).toBeGreaterThan(0);
        expect(targets.map(({ node }) => node.key)).not.toContain('r:wod-v5');
        const apart = bulkSubjects(current, keys(`s:user:${ASHEN_ID}`, `s:user:${MIST_ID}`));
        const common = bulkMoveTargets(apart, current)!.map(({ node }) => node.key);
        expect(common).not.toContain('r:wod-v5');
        expect(common).not.toContain('r:wod-2e');

        const mixed = bulkSubjects(current, keys(`s:user:${MIST_ID}`, `t:user:${CULT_ID}`));
        expect(bulkMoveTargets(mixed, current)).toBeUndefined();
        const withShipped = bulkSubjects(current, keys(`s:user:${ASHEN_ID}`, 's:rules:wod-v5'));
        expect(bulkMoveTargets(withShipped, current)).toBeUndefined();
    });

    it('plans one move for all subjects with their writes merged', () => {
        const current = tree();
        const both = bulkSubjects(current, keys(`s:user:${ASHEN_ID}`, `s:user:${DUSK_ID}`));
        const target = bulkMoveTargets(both, current)![0]!.node.key;
        const plan = planBulkMove(both, target, current, readLibraryState(), systemRegistry)!;
        expect(plan.target.key).toBe(target);
        expect(plan.writes.saveSettings?.map(({ id }) => id).sort()).toEqual(
            [ASHEN_ID, DUSK_ID].sort()
        );
        expect(findNode(current, target)).toBeDefined();
        expect(planBulkMove(both, 'r:nowhere', current, readLibraryState(), systemRegistry)).toBe(
            undefined
        );
    });
});
