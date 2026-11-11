// @vitest-environment happy-dom
import { serializeDocumentExport } from '@site/src/sheet_manager/features/sheet/shell/documentFile';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { wod2eCharacterDefinition } from '@site/src/sheet_manager/systems/wod2e';
import { createDefaultWod2eCharacterData } from '@site/src/sheet_manager/systems/wod2e/ruleset/schema';
import { UnknownDocumentEnvelopeSchema } from '@site/src/sheet_manager/types/document';
import { beforeEach, describe, expect, it } from 'vitest';

const original = ['slash', 'cross', 'empty', 'slash', 'empty', 'empty', 'empty'];
const ordinary = original.map((mark) => (mark === 'empty' ? 'empty' : 'slash'));
const oldDocument = () => ({
    id: 'classic-legacy',
    systemId: 'wod-2e',
    kind: 'character',
    definitionId: 'wod2e-character',
    schemaVersion: 1,
    metadata: { title: 'Mara', tags: [], settingId: 'user-setting-classic1' },
    templateValues: { 'my-coordinate': 'Keep this note' },
    data: {
        ...createDefaultWod2eCharacterData(),
        notes: 'Keep character notes',
        health: { levels: [...original] },
        willpower: { current: 2, max: 7 },
        skills: { Drive: { value: 4, specialization: true, experienced: true, practiced: true } },
    },
});

beforeEach(() => {
    useDocumentStore.setState({ documents: [], entries: [], currentDocumentId: null });
});

describe('classic edition document migration', () => {
    it('converts old damage to ordinary, keeps originals and works for a user-setting core character', () => {
        const raw = oldDocument();
        const { envelope } = systemRegistry.parseDocument(raw);
        expect(envelope.schemaVersion).toBe(2);
        expect(envelope.metadata.settingId).toBe(raw.metadata.settingId);
        expect(envelope.data).toMatchObject({
            health: { levels: ordinary },
            legacyHealth: { levels: original },
            willpower: { current: 2, max: 7 },
            skills: raw.data.skills,
        });
        expect(raw.data.health.levels).toEqual(original);
        expect(wod2eCharacterDefinition.migrationNotice?.(envelope.data)).toBeDefined();
    });

    it('preserves notes, coordinates and original wounds through editing, export, import and reparse', () => {
        useDocumentStore
            .getState()
            .importDocument(UnknownDocumentEnvelopeSchema.parse(oldDocument()));
        useDocumentStore.getState().updateDocumentData('classic-legacy', (data) => ({
            ...(data as object),
            notes: 'Edited character notes',
            health: { levels: ['slash', 'cross', 'empty', 'slash', 'empty', 'empty', 'empty'] },
        }));
        const edited = useDocumentStore.getState().documents[0]!;
        const file = JSON.parse(serializeDocumentExport(edited));
        useDocumentStore.setState({ documents: [], entries: [], currentDocumentId: null });
        useDocumentStore.getState().importDocument(file);
        const reopened = systemRegistry.parseDocument(
            useDocumentStore.getState().documents[0]
        ).envelope;
        expect(reopened.schemaVersion).toBe(2);
        expect(reopened.templateValues).toEqual({ 'my-coordinate': 'Keep this note' });
        expect(reopened.data).toMatchObject({
            health: { levels: ['slash', 'cross', 'empty', 'slash', 'empty', 'empty', 'empty'] },
            legacyHealth: { levels: original },
            notes: 'Edited character notes',
            willpower: { current: 2, max: 7 },
            skills: oldDocument().data.skills,
        });
    });

    it('creates version 2 characters without a conversion backup or notice', () => {
        const data = createDefaultWod2eCharacterData();
        expect(data).not.toHaveProperty('legacyHealth');
        expect(wod2eCharacterDefinition.schemaVersion).toBe(2);
        expect(wod2eCharacterDefinition.migrationNotice?.(data)).toBeUndefined();
    });

    it('does not reinterpret arbitrary user-type values on the same ruleset', () => {
        const { envelope } = systemRegistry.parseDocument({
            ...oldDocument(),
            kind: 'user-custom01',
            definitionId: 'user-custom01',
            data: {},
            templateValues: { health: original },
        });
        expect(envelope.schemaVersion).toBe(1);
        expect(envelope.templateValues).toEqual({ health: original });
        expect(envelope.data).toEqual({});
    });

    it('rejects malformed old wounds instead of losing unsupported values', () => {
        expect(() =>
            systemRegistry.parseDocument({
                ...oldDocument(),
                data: { ...oldDocument().data, health: { levels: ['unknown'] } },
            })
        ).toThrow();
    });
});
