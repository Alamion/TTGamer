import { generateDraftId } from '../../../components/dialogs/template-editor/draft';
import { useDocumentTypeStore } from '../../../store/documentTypeStore';
import { useTemplateStore } from '../../../store/templateStore';
import { exportNotices, resolveDocumentPolicies, systemRegistry } from '../../../systems';
import {
    newUserSettingId,
    newUserTypeId,
    ownerSystemId,
    type UserDocumentType,
    UserDocumentTypeSchema,
    type UserSetting,
    UserSettingSchema,
} from '../../../systems/userTypes';
import type { CustomTemplate } from '../../../types/template';
import { CustomTemplateSchema } from '../../../types/template';
import { resolveImportedTemplate } from './templateFile';

/**
 * Type files (spec 012): a user document type with all its pages, and its user setting when it
 * belongs to one. Documents of a user type embed the same payload as `documentType`. Everything
 * is validated before any state changes.
 */
export const TYPE_FILE_FORMAT = 'ttgamer-document-type';
export const TYPE_FILE_VERSION = 1;

export interface TypePayload {
    type: UserDocumentType;
    setting?: UserSetting;
    templates: CustomTemplate[];
}

export type ParsedTypePayload =
    | { ok: true; payload: TypePayload; degradedCatalogFields: readonly string[] }
    | { ok: false; error: 'parse' | 'format' | 'version' | 'schema' | 'system' };

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The installed type with its pages (and setting), or `undefined` when it is not installed. */
export function buildTypePayload(typeId: string): TypePayload | undefined {
    const { types, settings } = useDocumentTypeStore.getState();
    const type = types[typeId];
    if (!type) return undefined;
    const setting = 'settingId' in type.owner ? settings[type.owner.settingId] : undefined;
    const templates = useTemplateStore
        .getState()
        .templates.filter((template) => template.documentKind === typeId);
    return { type, ...(setting ? { setting } : {}), templates };
}

function payloadPolicies(payload: TypePayload) {
    const systemId = ownerSystemId(
        payload.type,
        payload.setting ? { [payload.setting.id]: payload.setting } : {}
    );
    return systemId
        ? resolveDocumentPolicies(systemRegistry, { systemId, definitionId: payload.type.id })
        : [];
}

export function serializeTypeFile(payload: TypePayload): string {
    const policies = payloadPolicies(payload);
    return JSON.stringify(
        {
            format: TYPE_FILE_FORMAT,
            version: TYPE_FILE_VERSION,
            ...payload,
            ...(policies.length > 0 ? { notices: exportNotices(policies) } : {}),
        },
        null,
        2
    );
}

/** Validates a type payload (the body of a type file, or a document's `documentType`). */
export function validateTypePayload(raw: unknown): ParsedTypePayload {
    if (!isRecord(raw)) return { ok: false, error: 'schema' };
    const type = UserDocumentTypeSchema.safeParse(raw.type);
    const setting =
        raw.setting === undefined ? undefined : UserSettingSchema.safeParse(raw.setting);
    if (!type.success || (setting && !setting.success) || !Array.isArray(raw.templates)) {
        return { ok: false, error: 'schema' };
    }
    const templates: CustomTemplate[] = [];
    for (const entry of raw.templates) {
        const parsed = CustomTemplateSchema.safeParse(entry);
        if (!parsed.success || parsed.data.documentKind !== type.data.id) {
            return { ok: false, error: 'schema' };
        }
        templates.push(parsed.data);
    }
    const settingData = setting?.success ? setting.data : undefined;
    if ('settingId' in type.data.owner && settingData?.id !== type.data.owner.settingId) {
        return { ok: false, error: 'schema' };
    }
    if (
        type.data.defaultTemplateId !== undefined &&
        !templates.some(({ id }) => id === type.data.defaultTemplateId)
    ) {
        return { ok: false, error: 'schema' };
    }
    const systemId = ownerSystemId(type.data, settingData ? { [settingData.id]: settingData } : {});
    if (
        !systemId ||
        !systemRegistry.getSystem(systemId) ||
        templates.some((template) => template.systemId !== systemId)
    ) {
        return { ok: false, error: 'system' };
    }

    const degraded: string[] = [];
    const resolved = templates.map((template) => {
        const result = resolveImportedTemplate(template);
        degraded.push(...result.degradedFields);
        return result.template;
    });
    return {
        ok: true,
        payload: {
            type: type.data,
            ...(settingData ? { setting: settingData } : {}),
            templates: resolved,
        },
        degradedCatalogFields: degraded,
    };
}

export function parseTypeFile(text: string): ParsedTypePayload {
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        return { ok: false, error: 'parse' };
    }
    if (!isRecord(raw) || raw.format !== TYPE_FILE_FORMAT) return { ok: false, error: 'format' };
    if (raw.version !== TYPE_FILE_VERSION) return { ok: false, error: 'version' };
    return validateTypePayload(raw);
}

function comparable(payload: TypePayload): string {
    const { createdAt: _created, updatedAt: _updated, ...type } = payload.type;
    void _created;
    void _updated;
    return JSON.stringify([type, payload.templates]);
}

/** Whether installing the payload is new, a no-op, or needs the replace / keep both choice. */
export function typeInstallState(payload: TypePayload): 'new' | 'same' | 'conflict' {
    const installed = buildTypePayload(payload.type.id);
    if (!installed) return 'new';
    return comparable(installed) === comparable(payload) ? 'same' : 'conflict';
}

/** "Keep both": a new identity for the type (and its setting), carried into every template. */
export function rewriteTypeIdentity(payload: TypePayload): TypePayload {
    const typeId = newUserTypeId();
    const setting = payload.setting ? { ...payload.setting, id: newUserSettingId() } : undefined;
    return {
        type: {
            ...payload.type,
            id: typeId,
            owner: setting ? { settingId: setting.id } : payload.type.owner,
        },
        ...(setting ? { setting } : {}),
        templates: payload.templates.map((template) => ({
            ...template,
            documentKind: typeId as CustomTemplate['documentKind'],
            ...(setting && template.settingId ? { settingId: setting.id } : {}),
        })),
    };
}

/** Templates whose ids collide with another installed template get fresh ids (references follow). */
function reissueCollidingTemplates(payload: TypePayload): TypePayload {
    const { templates } = useTemplateStore.getState();
    const renamed = new Map<string, string>();
    for (const template of payload.templates) {
        const clash = templates.find(
            (existing) => existing.id === template.id && existing.documentKind !== payload.type.id
        );
        if (clash) renamed.set(template.id, generateDraftId('tpl'));
    }
    if (renamed.size === 0) return payload;
    const rename = (id: string) => renamed.get(id) ?? id;
    return {
        type: {
            ...payload.type,
            ...(payload.type.defaultTemplateId
                ? { defaultTemplateId: rename(payload.type.defaultTemplateId) }
                : {}),
        },
        ...(payload.setting
            ? {
                  setting: {
                      ...payload.setting,
                      pages: Object.fromEntries(
                          Object.entries(payload.setting.pages).map(([key, id]) => [
                              key,
                              rename(id),
                          ])
                      ),
                  },
              }
            : {}),
        templates: payload.templates.map((template) => ({ ...template, id: rename(template.id) })),
    };
}

/** Writes the type, its setting, and its pages (replacing the installed pages of that type). */
export function installTypePayload(payload: TypePayload): TypePayload {
    const installed = reissueCollidingTemplates(payload);
    const templateStore = useTemplateStore.getState();
    for (const template of templateStore.templates) {
        if (template.documentKind === installed.type.id) templateStore.removeTemplate(template.id);
    }
    for (const template of installed.templates) useTemplateStore.getState().saveTemplate(template);
    if (installed.setting) useDocumentTypeStore.getState().saveSetting(installed.setting);
    useDocumentTypeStore.getState().saveType(installed.type);
    return installed;
}
