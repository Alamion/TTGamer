import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { UserDocumentType, UserSetting } from '@site/src/sheet_manager/systems/userTypes';
import type { UnknownDocumentEnvelope } from '@site/src/sheet_manager/types/document';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';

export const NOW = '2026-09-26T10:00:00.000Z';
export const ASHEN_ID = 'user-setting-ash00001';
export const CULT_ID = 'user-cult0001';
export const ORG_ID = 'user-org00001';
export const CULT_PAGE_ID = 'tpl-cultpag1';
export const ASHEN_MORTAL_PAGE_ID = 'tpl-ashmort1';
export const ORG_PAGE_ID = 'tpl-orgpage1';
export const EDITED_SHIPPED_VIEW = 'full-sheet';

export function libraryPage(
    id: string,
    target: { systemId: string; documentKind: string; settingId?: string },
    name = `Page ${id}`
): CustomTemplate {
    return CustomTemplateSchema.parse({
        id,
        name,
        schemaVersion: 3,
        ...target,
        children: [{ id: 'motto', type: 'text', label: 'Motto' }],
    });
}

export function userSetting(overrides: Partial<UserSetting> = {}): UserSetting {
    return {
        id: ASHEN_ID,
        name: 'Ashen Realms',
        systemId: 'wod-v5' as UserSetting['systemId'],
        pages: { 'v5-character': ASHEN_MORTAL_PAGE_ID },
        createdAt: NOW,
        updatedAt: NOW,
        ...overrides,
    };
}

export function userType(overrides: Partial<UserDocumentType> = {}): UserDocumentType {
    return {
        id: CULT_ID,
        name: 'Cult',
        owner: { settingId: ASHEN_ID },
        defaultTemplateId: CULT_PAGE_ID,
        createdAt: NOW,
        updatedAt: NOW,
        ...overrides,
    } as UserDocumentType;
}

export function libraryDocument(
    id: string,
    target: { systemId: string; definitionId: string; kind?: string },
    metadata: { settingId?: string; templateId?: string } = {}
): UnknownDocumentEnvelope {
    const definition = systemRegistry.getDocumentDefinition(target.systemId, target.definitionId);
    return {
        id,
        kind: (target.kind ?? definition?.kind ?? target.definitionId) as never,
        systemId: target.systemId as never,
        definitionId: target.definitionId as never,
        schemaVersion: definition?.schemaVersion ?? 1,
        metadata: { title: id, tags: [], ...metadata },
        templateValues: {},
        data: definition ? definition.schema.parse(definition.createDefault()) : {},
    } as UnknownDocumentEnvelope;
}

/** Empties the document, template, and type stores. */
export function resetLibraryStores(): void {
    useTemplateStore.setState({ templates: [], quarantine: [], defaultOverrides: {} });
    useDocumentStore.setState({ documents: [], currentDocumentId: null, recoveryEntries: [] });
    useDocumentTypeStore.setState({ types: {}, settings: {}, defaultPages: {}, quarantine: [] });
}

/**
 * The example library of spec 013 through the real stores: "Ashen Realms" on V5 with a Cult type
 * (one page), its own mortal page, and 3 mortals; "Organization" in Star Wars with one page; and
 * one edited Star Wars page.
 */
export function seedLibrary(): void {
    const cultPage = libraryPage(
        CULT_PAGE_ID,
        { systemId: 'wod-v5', documentKind: CULT_ID, settingId: ASHEN_ID },
        'Cult card'
    );
    const mortalPage = libraryPage(
        ASHEN_MORTAL_PAGE_ID,
        { systemId: 'wod-v5', documentKind: 'mortal', settingId: ASHEN_ID },
        'Ashen mortal'
    );
    const orgPage = libraryPage(
        ORG_PAGE_ID,
        { systemId: 'star-wars-wod', documentKind: ORG_ID },
        'Organization card'
    );
    const shipped = systemRegistry
        .getSystem('star-wars-wod')!
        .defaultTemplates!.find(({ id }) => id === EDITED_SHIPPED_VIEW)!;
    useTemplateStore.setState({
        templates: [cultPage, mortalPage, orgPage],
        quarantine: [],
        defaultOverrides: {
            [`star-wars-wod:${EDITED_SHIPPED_VIEW}`]: { ...shipped, name: 'Edited full sheet' },
        },
    });
    useDocumentTypeStore.setState({
        types: {
            [CULT_ID]: userType(),
            [ORG_ID]: userType({
                id: ORG_ID,
                name: 'Organization',
                owner: { systemId: 'star-wars-wod' } as UserDocumentType['owner'],
                defaultTemplateId: ORG_PAGE_ID,
            }),
        },
        settings: { [ASHEN_ID]: userSetting() },
        defaultPages: {},
        quarantine: [],
    });
    const mortal = { systemId: 'wod-v5', definitionId: 'v5-character' };
    useDocumentStore.setState({
        documents: [
            libraryDocument('mortal-1', mortal, { settingId: ASHEN_ID }),
            libraryDocument('mortal-2', mortal, { settingId: ASHEN_ID }),
            libraryDocument('mortal-3', mortal, {
                settingId: ASHEN_ID,
                templateId: ASHEN_MORTAL_PAGE_ID,
            }),
            libraryDocument(
                'cult-1',
                { systemId: 'wod-v5', definitionId: CULT_ID, kind: CULT_ID },
                { settingId: ASHEN_ID }
            ),
            libraryDocument('org-1', {
                systemId: 'star-wars-wod',
                definitionId: ORG_ID,
                kind: ORG_ID,
            }),
        ],
        currentDocumentId: null,
        recoveryEntries: [],
    });
}
