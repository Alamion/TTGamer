import { systemRegistry } from '../../../systems';
import {
    templateMatchesSetting,
    type UserDocumentType,
    type UserSetting,
} from '../../../systems/userTypes';
import { isTemplateCompatible } from '../../../systems/view';
import type { CustomTemplate } from '../../../types/template';

interface RetargetState {
    documents: ReadonlyArray<{
        id: string;
        systemId: string;
        kind: string;
        metadata: { templateId?: string; settingId?: string };
    }>;
    settings: Readonly<Record<string, UserSetting>>;
    types: Readonly<Record<string, UserDocumentType>>;
    templates: readonly CustomTemplate[];
}

/** What moving a template to another type or setting changes outside the template itself. */
export interface RetargetPlan {
    /** Documents assigned to the template that it can no longer render: they lose the assignment. */
    documentIds: string[];
    settings: UserSetting[];
    types: UserDocumentType[];
}

/**
 * The follow-up of a retarget (T-070): documents fall back to their default page instead of an
 * incompatible one, user setting pages follow the template (a setting's core definition without
 * a page adopts it), and a user type whose default page left picks another of its pages.
 */
export function planTemplateRetarget(after: CustomTemplate, state: RetargetState): RetargetPlan {
    const now = new Date().toISOString();
    const documentIds = state.documents
        .filter(
            (document) =>
                document.metadata.templateId === after.id &&
                !(isTemplateCompatible(after, document) && templateMatchesSetting(after, document))
        )
        .map(({ id }) => id);

    const settings: UserSetting[] = [];
    for (const setting of Object.values(state.settings)) {
        const pages = { ...setting.pages };
        for (const [definitionId, templateId] of Object.entries(pages)) {
            if (templateId !== after.id) continue;
            const kind = systemRegistry.getDocumentDefinition(setting.systemId, definitionId)?.kind;
            if (after.settingId !== setting.id || kind !== after.documentKind) {
                delete pages[definitionId];
            }
        }
        if (after.settingId === setting.id) {
            const definitionId = (
                systemRegistry.getSystem(setting.systemId)?.coreDefinitions ?? []
            ).find(
                (id) =>
                    systemRegistry.getDocumentDefinition(setting.systemId, id)?.kind ===
                    after.documentKind
            );
            if (definitionId && !pages[definitionId]) pages[definitionId] = after.id;
        }
        if (JSON.stringify(pages) !== JSON.stringify(setting.pages)) {
            settings.push({ ...setting, pages, updatedAt: now });
        }
    }

    const templates = state.templates.map((template) =>
        template.id === after.id ? after : template
    );
    const types: UserDocumentType[] = [];
    for (const type of Object.values(state.types)) {
        const pageOfType = (id: string) =>
            templates.some((template) => template.id === id && template.documentKind === type.id);
        if (pageOfType(type.defaultTemplateId)) continue;
        const next =
            after.documentKind === type.id
                ? after.id
                : templates.find((template) => template.documentKind === type.id)?.id;
        // No page left: the type keeps its id and shows stored values until it gets one.
        if (next) types.push({ ...type, defaultTemplateId: next, updatedAt: now });
    }

    return { documentIds, settings, types };
}
