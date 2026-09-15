import {
    migrateDocumentStoreState,
    useDocumentStore,
} from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    createHunterDefault,
    hunterDefinition,
    HunterSchema,
} from '@site/src/sheet_manager/systems/v5';
import { describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../../../setup/sheetIssues';
import { currentHunter, hunterData, seedHunter } from './hunterFixtures';

const envelope = (data: unknown, definitionId = 'hunter') => ({
    id: 'hunter-1',
    kind: 'character',
    systemId: 'v5',
    definitionId,
    schemaVersion: 1,
    metadata: { title: 'Lena Varga' },
    data,
});

describe('hunter document definition', () => {
    it('belongs to the hunter module under the Dark Pack policy', () => {
        expect(hunterDefinition.module).toMatchObject({ id: 'hunter', policies: ['dark-pack'] });
        expect(hunterDefinition.module?.label.message).toBe('Hunter: the Reckoning 5e');
        expect(systemRegistry.getDocumentDefinition('v5', 'hunter')).toBe(hunterDefinition);
    });

    it('creates a blank hunter with empty module fields and cell values at 0', () => {
        const data = createHunterDefault();
        expect(HunterSchema.parse(data)).toEqual(data);
        expect(data).toMatchObject({
            concept: '',
            creed: '',
            drive: '',
            edges: [],
            despair: false,
            desperation: 0,
            danger: 0,
        });
        expect(data.attributes.stamina).toEqual({ value: 1 });
    });

    it('bounds cell values and perks, and accepts custom creeds and drives', () => {
        expect(HunterSchema.safeParse({ desperation: 6 }).success).toBe(false);
        expect(HunterSchema.safeParse({ danger: -1 }).success).toBe(false);
        const perks = Array.from({ length: 61 }, (_, index) => ({ id: `p${index}` }));
        expect(HunterSchema.safeParse({ perks }).success).toBe(false);
        expect(HunterSchema.parse({ creed: 'Wandering', drive: 'Duty' })).toMatchObject({
            creed: 'Wandering',
            drive: 'Duty',
        });
        expect(
            HunterSchema.parse({ edges: [{ id: 'e1', name: 'Second Sight' }] }).edges[0]
        ).toEqual({ id: 'e1', name: 'Second Sight', note: '' });
    });

    it('lifts draft perk lists on Edge rows into Perk rows', () => {
        const parsed = HunterSchema.parse({
            edges: [{ id: 'e1', name: 'Arsenal', entryId: 'arsenal', perks: ['Exotics'] }],
        });
        expect(parsed.edges).toEqual([{ id: 'e1', name: 'Arsenal', note: '' }]);
        expect(parsed.perks).toEqual([
            { id: 'e1-perk-1', name: 'Exotics', edge: 'Arsenal', note: '' },
        ]);
    });

    it('round-trips a filled hunter through the registry', () => {
        const data = hunterData({
            name: 'Lena Varga',
            creed: 'Faithful',
            drive: 'Atonement',
            attributes: { stamina: { value: 3 }, composure: { value: 2 }, resolve: { value: 3 } },
            skills: { medicine: { value: 3, specializationText: 'Trauma, Triage' } },
            health: { levels: ['slash'], bonus: 0 },
            edges: [{ id: 'e1', name: 'Sense the Unnatural', note: '' }],
            perks: [{ id: 'p1', name: 'Range', edge: 'Sense the Unnatural', note: '' }],
            despair: true,
            desperation: 2,
            danger: 1,
        });
        const parsed = systemRegistry.parseDocument(JSON.parse(JSON.stringify(envelope(data))));
        expect(parsed.envelope.data).toEqual(data);
    });

    it('keeps documents of an unknown module in recovery', () => {
        const migrated = migrateDocumentStoreState({
            documents: [envelope(createHunterDefault(), 'vampire')],
        } as never);
        expect(migrated.documents).toHaveLength(0);
        expect(migrated.recoveryEntries).toHaveLength(1);
        expect(takeSheetIssues().map(({ code }) => code)).toContain('document-recovered');
    });

    it('rejects an out-of-range write and keeps the previous value', () => {
        seedHunter(hunterData({ attributes: { strength: { value: 2 } } }));
        const { updateDocumentData } = useDocumentStore.getState();
        try {
            updateDocumentData('doc-hunter', (data) => ({
                ...(data as object),
                attributes: { strength: { value: 9 } },
            }));
        } catch {
            // The store may throw or report; either way nothing is written.
        }
        takeSheetIssues();
        expect(currentHunter().attributes.strength).toEqual({ value: 2 });
    });
});
