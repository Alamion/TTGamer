import {
    isDocumentInReferenceScope,
    referenceKindName,
    referenceScopeOf,
    referenceTargetsOf,
    type ReferenceTemplateRef,
} from '@site/src/sheet_manager/features/sheet/data/referenceScope';
import { validateTemplateReferences } from '@site/src/sheet_manager/features/sheet/data/templateReferences';
import {
    type LibraryPayload,
    parseLibraryFile,
    serializeLibraryFile,
} from '@site/src/sheet_manager/features/sheet/shell/libraryFile';
import {
    parseTemplateFile,
    serializeTemplateFile,
} from '@site/src/sheet_manager/features/sheet/shell/templateFile';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { type CustomTemplate, CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import {
    ASHEN_ID,
    CULT_ID,
    HUNT_ID,
    ORG_ID,
    resetLibraryStores,
    seedReferenceTypes,
    SHARED_ID,
    userSetting,
    userType,
} from './helpers/library';

/** Reference targets and document scope per setting (spec 017, R2–R3). */

const kinds = (template: ReferenceTemplateRef) =>
    referenceTargetsOf(systemRegistry, template).map(({ kind }) => kind);

beforeEach(seedReferenceTypes);
afterEach(resetLibraryStores);

describe('reference targets per setting', () => {
    it('offers a Hunter page its line, the V5 core, and its user types', () => {
        expect(kinds({ systemId: 'wod-v5', documentKind: 'character' })).toEqual([
            'character',
            'mortal',
            HUNT_ID,
            SHARED_ID,
        ]);
    });

    it('offers a Star Wars page each of its kinds once, and its user types', () => {
        expect(kinds({ systemId: 'star-wars-wod', documentKind: 'vehicle' })).toEqual([
            'character',
            'creature',
            'vehicle',
            'group',
            ORG_ID,
        ]);
    });

    it('offers a V5 core page the core and V5-level user types, not the lines', () => {
        expect(kinds({ systemId: 'wod-v5', documentKind: 'mortal' })).toEqual([
            'mortal',
            SHARED_ID,
        ]);
    });

    it('offers a user setting its reused core kinds and its own types only', () => {
        const page = { systemId: 'wod-v5', documentKind: 'mortal', settingId: ASHEN_ID };
        expect(kinds(page)).toEqual(['mortal', CULT_ID]);
        // A user type's page belongs to its owner's setting.
        expect(kinds({ systemId: 'wod-v5', documentKind: CULT_ID })).toEqual(['mortal', CULT_ID]);
    });

    it('keeps WoD 2e and Star Wars apart', () => {
        expect(kinds({ systemId: 'wod-2e', documentKind: 'character' })).toEqual(['character']);
    });

    it('offers an orphaned template nothing', () => {
        expect(kinds({ systemId: 'gone-system', documentKind: 'character' })).toEqual([]);
    });

    it('names a type by itself, adding the setting only when two names collide', () => {
        const labels = () =>
            referenceTargetsOf(systemRegistry, { systemId: 'wod-v5', documentKind: 'mortal' }).map(
                ({ label }) => label
            );
        expect(labels()).toEqual(['Mortal', 'Haven']);
        const { types } = useDocumentTypeStore.getState();
        useDocumentTypeStore.setState({
            types: { ...types, [SHARED_ID]: { ...types[SHARED_ID]!, name: 'Mortal' } },
        });
        // Same setting: the settings read the same, so the user's own type is marked.
        const [core, user] = labels();
        expect(core).toBe('World of Darkness 5th Edition · Mortal');
        expect(user).toBe('World of Darkness 5th Edition · Mortal (yours)');
    });

    it('tells a line type from a ruleset-level user type of the same name by setting', () => {
        const { types } = useDocumentTypeStore.getState();
        useDocumentTypeStore.setState({
            types: { ...types, [SHARED_ID]: { ...types[SHARED_ID]!, name: 'Character' } },
        });
        const labels = referenceTargetsOf(systemRegistry, {
            systemId: 'wod-v5',
            documentKind: 'character',
        }).map(({ label }) => label);
        expect(labels).toContain('Hunter: the Reckoning 5e · Character');
        expect(labels).toContain('World of Darkness 5th Edition · Character');
    });
});

describe('documents in a reference scope', () => {
    const document = (systemId: string, kind: string, settingId?: string) => ({
        systemId,
        kind,
        metadata: settingId ? { settingId } : {},
    });

    it('matches system, user setting, and kind', () => {
        const hunter = referenceScopeOf(systemRegistry, {
            systemId: 'wod-v5',
            documentKind: 'character',
        });
        expect(isDocumentInReferenceScope(hunter, document('wod-v5', 'character'))).toBe(true);
        expect(isDocumentInReferenceScope(hunter, document('wod-v5', 'mortal'))).toBe(true);
        expect(isDocumentInReferenceScope(hunter, document('star-wars-wod', 'character'))).toBe(
            false
        );
        expect(isDocumentInReferenceScope(hunter, document('wod-v5', 'mortal', ASHEN_ID))).toBe(
            false
        );

        const ashen = referenceScopeOf(systemRegistry, {
            systemId: 'wod-v5',
            documentKind: CULT_ID,
        });
        expect(isDocumentInReferenceScope(ashen, document('wod-v5', CULT_ID, ASHEN_ID))).toBe(true);
        expect(isDocumentInReferenceScope(ashen, document('wod-v5', 'mortal', ASHEN_ID))).toBe(
            true
        );
        expect(isDocumentInReferenceScope(ashen, document('wod-v5', 'mortal'))).toBe(false);
        expect(isDocumentInReferenceScope(ashen, document('wod-v5', 'character', ASHEN_ID))).toBe(
            false
        );
    });
});

describe('names of kinds outside a scope', () => {
    it('resolves a known kind, a user type, and falls back to the id', () => {
        expect(referenceKindName(systemRegistry, 'creature')).toContain('Creature');
        expect(referenceKindName(systemRegistry, CULT_ID)).toBe('Cult');
        expect(referenceKindName(systemRegistry, 'user-gone0001')).toBe('user-gone0001');
    });
});

describe('stale reference targets (US4)', () => {
    const ally = (targetKinds: string[], id = 'ally') => ({
        id,
        type: 'reference',
        label: 'Ally',
        targetKinds,
    });

    const hunterTemplate = (children: unknown[]) =>
        CustomTemplateSchema.parse({
            id: 'tpl-refstale',
            name: 'Stale',
            systemId: 'wod-v5',
            documentKind: 'character',
            schemaVersion: 3,
            children,
        });

    const staleKeys = (template: CustomTemplate) =>
        validateTemplateReferences(template)
            .filter(({ code }) => code === 'reference-target-unavailable')
            .map(({ nodeId, key }) => `${nodeId}:${key}`);

    it('reports stale targets in a page field, a table cell, and a list item', () => {
        const template = hunterTemplate([
            ally(['character', 'creature']),
            {
                id: 'crew',
                type: 'table',
                title: 'Crew',
                columns: [ally([ORG_ID], 'crew-member')],
            },
            {
                id: 'allies',
                type: 'list',
                valueKey: 'allies',
                title: 'Allies',
                item: ally([CULT_ID], 'allies-item'),
            },
        ]);
        expect(staleKeys(template)).toEqual([
            'ally:creature',
            `crew-member:${ORG_ID}`,
            `allies-item:${CULT_ID}`,
        ]);
        // The schema keeps them: nothing is dropped on load.
        const [field] = template.children;
        expect(field?.type === 'reference' && field.targetKinds).toEqual(['character', 'creature']);
    });

    it('reports none for the shipped templates of every system', () => {
        for (const system of systemRegistry.getSystems()) {
            for (const template of system.defaultTemplates ?? []) {
                expect(staleKeys(template), template.id).toEqual([]);
            }
        }
    });

    it('skips the check only when asked (library parsing)', () => {
        const template = hunterTemplate([ally(['creature'])]);
        expect(
            validateTemplateReferences(template, { referenceScope: false }).filter(
                ({ code }) => code === 'reference-target-unavailable'
            )
        ).toEqual([]);
    });

    it('imports a template file with a stale target and reports it once', () => {
        const parsed = parseTemplateFile(
            serializeTemplateFile(hunterTemplate([ally(['creature'])]))
        );
        expect(parsed.ok).toBe(true);
        const reports = takeSheetIssues().filter(
            ({ code, details }) =>
                code === 'template-reference-invalid' &&
                (details as { code?: string }).code === 'reference-target-unavailable'
        );
        expect(reports).toHaveLength(1);
    });

    it("parses a library file whose pages target the file's own types without reports", () => {
        const page = CustomTemplateSchema.parse({
            id: 'tpl-cultref1',
            name: 'Cult roster',
            systemId: 'wod-v5',
            documentKind: CULT_ID,
            schemaVersion: 3,
            children: [ally([CULT_ID])],
        });
        const payload: LibraryPayload = {
            settings: [userSetting()],
            types: [userType()],
            templates: [page],
            overrides: [],
            catalogs: [],
            included: {},
            addresses: [],
        };
        // A fresh profile: the file's setting and type are not installed while it is parsed.
        resetLibraryStores();
        takeSheetIssues();
        expect(parseLibraryFile(serializeLibraryFile(payload)).ok).toBe(true);
        expect(takeSheetIssues().map(({ code }) => code)).not.toContain(
            'template-reference-invalid'
        );
    });
});
