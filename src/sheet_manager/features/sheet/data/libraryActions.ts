import { type DocumentRelocation, useDocumentStore } from '../../../store/documentStore';
import { defaultPageKey, useDocumentTypeStore } from '../../../store/documentTypeStore';
import { useTemplateStore } from '../../../store/templateStore';
import type { SystemRegistry } from '../../../systems/registry';
import {
    newUserSettingId,
    newUserTypeId,
    type UserDocumentType,
    UserDocumentTypeSchema,
    type UserSetting,
    UserSettingSchema,
    type UserTypeOwner,
} from '../../../systems/userTypes';
import { SystemIdSchema } from '../../../types/document';
import { type CustomTemplate, CustomTemplateSchema } from '../../../types/template';
import type { SettingRef } from './libraryPages';
import type { LibraryNode, PageNode, SettingNode, TypeNode } from './libraryTree';

/**
 * Library actions (spec 013) as pure plans: each returns every write it needs, and
 * `applyLibraryWrites` commits them with one store update per store.
 */
export interface LibraryWrites {
    saveSettings?: UserSetting[];
    removeSettings?: string[];
    saveTypes?: UserDocumentType[];
    removeTypes?: string[];
    saveTemplates?: CustomTemplate[];
    removeTemplates?: string[];
    documents?: DocumentRelocation[];
    /** `null` clears the choice. */
    defaultPages?: Record<string, string | null>;
}

export interface LibraryState {
    types: Readonly<Record<string, UserDocumentType>>;
    settings: Readonly<Record<string, UserSetting>>;
    templates: readonly CustomTemplate[];
    defaultPages: Readonly<Record<string, string>>;
    documents: ReadonlyArray<{
        id: string;
        systemId: string;
        kind: string;
        definitionId: string;
        metadata: { settingId?: string; templateId?: string };
    }>;
}

export function readLibraryState(): LibraryState {
    const { types, settings, defaultPages } = useDocumentTypeStore.getState();
    return {
        types,
        settings,
        defaultPages,
        templates: useTemplateStore.getState().templates,
        documents: useDocumentStore.getState().documents,
    };
}

export function mergeWrites(...all: LibraryWrites[]): LibraryWrites {
    const merged: LibraryWrites = {};
    const byId = <T extends { id: string }>(lists: (T[] | undefined)[]) => {
        const map = new Map<string, T>();
        for (const item of lists.flatMap((list) => list ?? [])) map.set(item.id, item);
        return [...map.values()];
    };
    const ids = (lists: (string[] | undefined)[]) => [...new Set(lists.flatMap((l) => l ?? []))];
    merged.saveSettings = byId(all.map((w) => w.saveSettings));
    merged.removeSettings = ids(all.map((w) => w.removeSettings));
    merged.saveTypes = byId(all.map((w) => w.saveTypes));
    merged.removeTypes = ids(all.map((w) => w.removeTypes));
    merged.saveTemplates = byId(all.map((w) => w.saveTemplates));
    merged.removeTemplates = ids(all.map((w) => w.removeTemplates));
    const documents = new Map<string, DocumentRelocation>();
    for (const change of all.flatMap((w) => w.documents ?? [])) {
        documents.set(change.id, { ...documents.get(change.id), ...change });
    }
    merged.documents = [...documents.values()];
    merged.defaultPages = Object.assign({}, ...all.map((w) => w.defaultPages ?? {}));
    return merged;
}

/** Commits a plan: settings and types, then templates, then documents, one update per store. */
export function applyLibraryWrites(writes: LibraryWrites): void {
    const saveSettings = (writes.saveSettings ?? []).map((s) => UserSettingSchema.parse(s));
    const saveTypes = (writes.saveTypes ?? []).map((t) => UserDocumentTypeSchema.parse(t));
    const saveTemplates = (writes.saveTemplates ?? []).map((t) => CustomTemplateSchema.parse(t));
    const pageChoices = Object.entries(writes.defaultPages ?? {});
    if (
        saveSettings.length ||
        saveTypes.length ||
        writes.removeSettings?.length ||
        writes.removeTypes?.length ||
        pageChoices.length
    ) {
        useDocumentTypeStore.setState((state) => {
            const settings = { ...state.settings };
            for (const id of writes.removeSettings ?? []) delete settings[id];
            for (const setting of saveSettings) settings[setting.id] = setting;
            const types = { ...state.types };
            for (const id of writes.removeTypes ?? []) delete types[id];
            for (const type of saveTypes) types[type.id] = type;
            const defaultPages = { ...state.defaultPages };
            for (const [key, value] of pageChoices) {
                if (value) defaultPages[key] = value;
                else delete defaultPages[key];
            }
            return { settings, types, defaultPages };
        });
    }
    if (saveTemplates.length || writes.removeTemplates?.length) {
        const removed = new Set(writes.removeTemplates ?? []);
        const saved = new Map(saveTemplates.map((template) => [template.id, template]));
        useTemplateStore.setState(({ templates }) => {
            const next = templates
                .filter(({ id }) => !removed.has(id) || saved.has(id))
                .map((template) => saved.get(template.id) ?? template);
            for (const template of saved.values()) {
                if (!templates.some(({ id }) => id === template.id)) next.push(template);
            }
            return { templates: next };
        });
    }
    if (writes.documents?.length) useDocumentStore.getState().relocateDocuments(writes.documents);
}

const now = () => new Date().toISOString();

function withDescription<T extends { description?: string }>(item: T, description: string): T {
    const trimmed = description.trim();
    const { description: _old, ...rest } = item;
    void _old;
    return (trimmed ? { ...rest, description: trimmed } : rest) as T;
}

export function createSetting(rulesetId: string, name: string, description = ''): UserSetting {
    const stamp = now();
    return withDescription<UserSetting>(
        {
            id: newUserSettingId(),
            name: name.trim(),
            systemId: SystemIdSchema.parse(rulesetId),
            pages: {},
            createdAt: stamp,
            updatedAt: stamp,
        },
        description
    );
}

/** The owner a new or moved type gets in a setting; "Rules only" owns no new types (FR-006). */
export function ownerForSetting(ref: SettingRef): UserTypeOwner | undefined {
    switch (ref.kind) {
        case 'user':
            return { settingId: ref.settingId };
        case 'module':
            return { systemId: SystemIdSchema.parse(ref.systemId), moduleId: ref.moduleId };
        case 'system':
            return { systemId: SystemIdSchema.parse(ref.systemId) };
        case 'rules':
            return undefined;
    }
}

/** A new document type: never a page (FR-006); its documents show stored values until one. */
export function createType(
    setting: SettingRef,
    name: string,
    description = ''
): UserDocumentType | undefined {
    const owner = ownerForSetting(setting);
    if (!owner) return undefined;
    const stamp = now();
    return withDescription<UserDocumentType>(
        { id: newUserTypeId(), name: name.trim(), owner, createdAt: stamp, updatedAt: stamp },
        description
    );
}

/** Renames and re-describes a user setting, type, or page. */
export function renameItem(
    node: LibraryNode,
    name: string,
    description: string,
    state: LibraryState
): LibraryWrites {
    const trimmed = name.trim();
    if (!trimmed || node.ownership !== 'user') return {};
    const stamp = now();
    if (node.level === 'setting' && node.ref.kind === 'user') {
        const setting = state.settings[node.ref.settingId];
        if (!setting) return {};
        return {
            saveSettings: [
                withDescription({ ...setting, name: trimmed, updatedAt: stamp }, description),
            ],
        };
    }
    if (node.level === 'type' && node.ref.kind === 'user') {
        const type = state.types[node.ref.typeId];
        if (!type) return {};
        return {
            saveTypes: [withDescription({ ...type, name: trimmed, updatedAt: stamp }, description)],
        };
    }
    if (node.level === 'page' && node.ref.kind === 'user') {
        const templateId = node.ref.templateId;
        const template = state.templates.find(({ id }) => id === templateId);
        if (!template) return {};
        return { saveTemplates: [withDescription({ ...template, name: trimmed }, description)] };
    }
    return {};
}

/**
 * What must follow a page leaving its place (deleted or moved away): documents opened on it go
 * back to their default page, setting pages and type defaults stop naming it, and so do the
 * default-page choices of shipped types (edge case "default page deleted").
 */
export function pageDepartureWrites(
    templateId: string,
    state: LibraryState,
    options: { releaseDocuments: boolean } = { releaseDocuments: true }
): LibraryWrites {
    const stamp = now();
    const remaining = state.templates.filter(({ id }) => id !== templateId);
    const settings = Object.values(state.settings)
        .filter(({ pages }) => Object.values(pages).includes(templateId))
        .map((setting) => ({
            ...setting,
            pages: Object.fromEntries(
                Object.entries(setting.pages).filter(([, id]) => id !== templateId)
            ),
            updatedAt: stamp,
        }));
    const types = Object.values(state.types)
        .filter(({ defaultTemplateId }) => defaultTemplateId === templateId)
        .map((type) => {
            const { defaultTemplateId: _gone, ...rest } = type;
            void _gone;
            const next = remaining.find(({ documentKind }) => documentKind === type.id)?.id;
            return next
                ? { ...rest, defaultTemplateId: next, updatedAt: stamp }
                : { ...rest, updatedAt: stamp };
        });
    const defaultPages = Object.fromEntries(
        Object.entries(state.defaultPages)
            .filter(([, id]) => id === templateId)
            .map(([key]) => [key, null])
    );
    const documents = options.releaseDocuments
        ? state.documents
              .filter(({ metadata }) => metadata.templateId === templateId)
              .map(({ id }) => ({ id, templateId: null }))
        : [];
    return { saveSettings: settings, saveTypes: types, defaultPages, documents };
}

export interface DeletePlan {
    documentCount: number;
    writes: LibraryWrites;
}

/** Deleting keeps every document (FR-010); what it removes depends on the level. */
export function deletePlan(node: LibraryNode, state: LibraryState): DeletePlan | undefined {
    if (node.ownership !== 'user') return undefined;
    if (node.level === 'setting' && node.ref.kind === 'user') {
        const settingId = node.ref.settingId;
        const ownTypes = Object.values(state.types)
            .filter(({ owner }) => 'settingId' in owner && owner.settingId === settingId)
            .map(({ id }) => id);
        const removedTemplates = state.templates
            .filter(
                ({ settingId: owner, documentKind }) =>
                    owner === settingId || ownTypes.includes(documentKind)
            )
            .map(({ id }) => id);
        const affected = state.documents.filter(
            ({ definitionId, metadata }) =>
                metadata.settingId === settingId || ownTypes.includes(definitionId)
        );
        return {
            documentCount: affected.length,
            writes: {
                removeSettings: [settingId],
                removeTypes: ownTypes,
                removeTemplates: removedTemplates,
                // Nothing may point at the deleted setting (edge case U1).
                documents: affected
                    .filter(({ metadata }) => metadata.settingId === settingId)
                    .map(({ id, metadata }) => ({
                        id,
                        settingId: null,
                        ...(metadata.templateId && removedTemplates.includes(metadata.templateId)
                            ? { templateId: null }
                            : {}),
                    })),
                defaultPages: Object.fromEntries(
                    Object.entries(state.defaultPages)
                        .filter(([, id]) => removedTemplates.includes(id))
                        .map(([key]) => [key, null])
                ),
            },
        };
    }
    if (node.level === 'type' && node.ref.kind === 'user') {
        const typeId = node.ref.typeId;
        return {
            documentCount: state.documents.filter(({ definitionId }) => definitionId === typeId)
                .length,
            writes: {
                removeTypes: [typeId],
                removeTemplates: state.templates
                    .filter(({ documentKind }) => documentKind === typeId)
                    .map(({ id }) => id),
            },
        };
    }
    if (node.level === 'page' && node.ref.kind === 'user') {
        const templateId = node.ref.templateId;
        const follow = pageDepartureWrites(templateId, state);
        return {
            documentCount: follow.documents?.length ?? 0,
            writes: { ...follow, removeTemplates: [templateId] },
        };
    }
    return undefined;
}

/** Makes a page the default of its type (FR-009); where that is recorded depends on the type. */
export function setDefaultWrites(
    type: TypeNode,
    page: PageNode,
    state: LibraryState,
    registry: SystemRegistry
): LibraryWrites {
    const pageId = page.ref.kind === 'user' ? page.ref.templateId : page.ref.viewId;
    const stamp = now();
    switch (type.ref.kind) {
        case 'user': {
            const existing = state.types[type.ref.typeId];
            return existing
                ? { saveTypes: [{ ...existing, defaultTemplateId: pageId, updatedAt: stamp }] }
                : {};
        }
        case 'core': {
            const setting = state.settings[type.ref.settingId];
            return setting
                ? {
                      saveSettings: [
                          {
                              ...setting,
                              pages: { ...setting.pages, [type.ref.definitionId]: pageId },
                              updatedAt: stamp,
                          },
                      ],
                  }
                : {};
        }
        case 'shipped': {
            const definition = registry.getDocumentDefinition(
                type.ref.systemId,
                type.ref.definitionId
            );
            const key = defaultPageKey(type.ref.systemId, type.ref.definitionId);
            // Choosing the definition's own default clears the preference.
            return {
                defaultPages: { [key]: definition?.defaultViewId === pageId ? null : pageId },
            };
        }
    }
}

/** Whether new user types may be created in a setting (not in "Rules only", not unavailable). */
export function acceptsNewTypes(setting: SettingNode): boolean {
    return setting.ref.kind !== 'rules' && !setting.unavailable;
}
