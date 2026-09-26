import { reportSheetIssue } from '../../../diagnostics';
import { defaultPageKey } from '../../../store/documentTypeStore';
import type { SystemRegistry } from '../../../systems/registry';
import { isUserKind, type UserDocumentType, type UserSetting } from '../../../systems/userTypes';
import { type DocumentViewId, DocumentViewIdSchema } from '../../../types/document';
import type { CustomTemplate } from '../../../types/template';

/**
 * Library node keys (spec 013, data-model "Node keys"): stable across renders, so they serve as
 * selection, expansion, and export ids.
 */
export const rulesetNodeKey = (systemId: string) => `r:${systemId}`;
export const UNAVAILABLE_RULESET_KEY = 'r:unavailable';

export type SettingRef =
    | { kind: 'rules'; systemId: string }
    | { kind: 'module'; systemId: string; moduleId: string }
    | { kind: 'system'; systemId: string }
    | { kind: 'user'; settingId: string };

export type TypeRef =
    | { kind: 'shipped'; systemId: string; definitionId: string }
    | { kind: 'core'; systemId: string; definitionId: string; settingId: string }
    | { kind: 'user'; typeId: string };

export type PageRef =
    | { kind: 'shipped'; systemId: string; viewId: string; edited: boolean }
    | { kind: 'user'; templateId: string };

export function settingNodeKey(ref: SettingRef): string {
    switch (ref.kind) {
        case 'rules':
            return `s:rules:${ref.systemId}`;
        case 'module':
            return `s:module:${ref.systemId}:${ref.moduleId}`;
        case 'system':
            return `s:system:${ref.systemId}`;
        case 'user':
            return `s:user:${ref.settingId}`;
    }
}

export function typeNodeKey(ref: TypeRef): string {
    switch (ref.kind) {
        case 'shipped':
            return `t:${ref.systemId}:${ref.definitionId}`;
        case 'core':
            return `t:core:${ref.settingId}:${ref.definitionId}`;
        case 'user':
            return `t:user:${ref.typeId}`;
    }
}

export function pageNodeKey(ref: PageRef): string {
    return ref.kind === 'shipped' ? `p:${ref.systemId}:${ref.viewId}` : `p:user:${ref.templateId}`;
}

export interface PageState {
    types: Readonly<Record<string, UserDocumentType>>;
    settings: Readonly<Record<string, UserSetting>>;
    templates: readonly CustomTemplate[];
    defaultPages: Readonly<Record<string, string>>;
}

/**
 * The page a shipped type's new documents open on: the user's choice when it still names one of
 * the type's pages, otherwise the definition's own default. `undefined` means "definition default".
 */
export function shippedDefaultPage(
    registry: SystemRegistry,
    systemId: string,
    definitionId: string,
    state: Pick<PageState, 'templates' | 'defaultPages'>
): string | undefined {
    const chosen = state.defaultPages[defaultPageKey(systemId, definitionId)];
    if (!chosen) return undefined;
    const definition = registry.getDocumentDefinition(systemId, definitionId);
    if (!definition) return undefined;
    const valid =
        definition.views.some(({ id }) => id === chosen) ||
        state.templates.some(
            (template) =>
                template.id === chosen &&
                template.systemId === systemId &&
                template.documentKind === definition.kind &&
                !template.settingId
        );
    if (valid) return chosen;
    reportSheetIssue({
        code: 'template-fallback',
        message: 'A chosen default page no longer belongs to its type; the shipped default applies',
        details: { systemId, definitionId, requested: chosen, reason: 'default-page-missing' },
    });
    return undefined;
}

/**
 * How a new document picks its page (spec 013, R4). User types and core characters in a user
 * setting already resolve through `defaultTemplateId` / `setting.pages`; shipped types apply the
 * user's default-page choice, which is either one of their views or a user template.
 */
export function newDocumentPage(
    registry: SystemRegistry,
    systemId: string,
    definitionId: string,
    settingId: string | undefined,
    state: Pick<PageState, 'templates' | 'defaultPages'>
): { preferredViewId?: DocumentViewId; templateId?: string } {
    if (isUserKind(definitionId) || settingId) return {};
    const chosen = shippedDefaultPage(registry, systemId, definitionId, state);
    if (!chosen) return {};
    const definition = registry.getDocumentDefinition(systemId, definitionId);
    return definition?.views.some(({ id }) => id === chosen)
        ? { preferredViewId: DocumentViewIdSchema.parse(chosen) }
        : { templateId: chosen };
}
