import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { z } from 'zod';

import { generateId } from '../../shared/utils/random';
import {
    type DocumentDefinitionId,
    DocumentDefinitionIdSchema,
    type DocumentKind,
    DocumentKindSchema,
    type DocumentViewId,
    DocumentViewIdSchema,
    SystemIdSchema,
} from '../types/document';
import type { CustomTemplate } from '../types/template';
import type { DocumentDefinition, DocumentViewDefinition } from './types';

/**
 * User document types and user settings (spec 012). A user type's id is at once its document
 * kind and definition id; every user-type document keeps its values in `templateValues`, so its
 * data is one empty shape and documents parse without the type (a deleted type never hides them).
 */
export const USER_KIND_PREFIX = 'user-';
export const USER_SETTING_PREFIX = 'user-setting-';

const token = () =>
    generateId()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 8)
        .padEnd(8, '0');

export function isUserKind(id: string): boolean {
    return id.startsWith(USER_KIND_PREFIX) && !id.startsWith(USER_SETTING_PREFIX);
}

export function newUserTypeId(): string {
    return `${USER_KIND_PREFIX}${token()}`;
}

export function newUserSettingId(): string {
    return `${USER_SETTING_PREFIX}${token()}`;
}

export const USER_TYPE_SCHEMA_VERSION = 1;
export const UserTypeDataSchema = z.object({}).strip();

const userTypeIdSchema = z.string().regex(/^user-[a-z0-9]{8}$/, 'Expected a user type id');
const userSettingIdSchema = z
    .string()
    .regex(/^user-setting-[a-z0-9]{8}$/, 'Expected a user setting id');

export const UserTypeOwnerSchema = z.union([
    z.object({ settingId: userSettingIdSchema }).strict(),
    z
        .object({
            systemId: SystemIdSchema,
            moduleId: z.string().min(1).max(64).optional(),
        })
        .strict(),
]);

export const UserDocumentTypeSchema = z.object({
    id: userTypeIdSchema,
    name: z.string().trim().min(1).max(80),
    description: z.string().max(500).optional(),
    owner: UserTypeOwnerSchema,
    defaultTemplateId: z.string().min(1).max(64),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
});

export const UserSettingSchema = z.object({
    id: userSettingIdSchema,
    name: z.string().trim().min(1).max(80),
    description: z.string().max(500).optional(),
    systemId: SystemIdSchema,
    pages: z.record(z.string(), z.string()).default({}),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
});

export type UserTypeOwner = z.infer<typeof UserTypeOwnerSchema>;
export type UserDocumentType = z.infer<typeof UserDocumentTypeSchema>;
export type UserSetting = z.infer<typeof UserSettingSchema>;

/** The registry's view of user types: what the overlay resolves definitions from. */
export interface UserTypesSnapshot {
    types: Readonly<Record<string, UserDocumentType>>;
    settings: Readonly<Record<string, UserSetting>>;
    templates: readonly CustomTemplate[];
}

export const EMPTY_USER_TYPES: UserTypesSnapshot = { types: {}, settings: {}, templates: [] };

/** The system a user type's documents belong to (a user setting names its ruleset system). */
export function ownerSystemId(
    type: Pick<UserDocumentType, 'owner'>,
    settings: UserTypesSnapshot['settings']
): string | undefined {
    return 'settingId' in type.owner
        ? settings[type.owner.settingId]?.systemId
        : type.owner.systemId;
}

/**
 * The page a document opens on: its own assignment first, then its user setting's page for its
 * definition (a page added to the setting after the document was created).
 */
export function assignedTemplateId(
    document: {
        definitionId: string;
        metadata: { templateId?: string; settingId?: string };
    },
    settings: UserTypesSnapshot['settings']
): string | undefined {
    if (document.metadata.templateId) return document.metadata.templateId;
    const settingId = document.metadata.settingId;
    return settingId ? settings[settingId]?.pages[document.definitionId] : undefined;
}

/** Templates offered to a document: those of its own user setting, or of none. */
export function templateMatchesSetting(
    template: Pick<CustomTemplate, 'settingId'>,
    document: { metadata: { settingId?: string } }
): boolean {
    return (template.settingId ?? undefined) === (document.metadata.settingId ?? undefined);
}

/** The fixed view of a document whose type is gone: its stored values, listed (spec FR-020). */
export const STORED_VALUES_VIEW_ID = DocumentViewIdSchema.parse('user-type-stored-values');

const storedValuesView: DocumentViewDefinition = {
    id: STORED_VALUES_VIEW_ID,
    label: uiMessages.sheet.documents.views.storedValues,
    layout: { type: 'declarative', templateId: STORED_VALUES_VIEW_ID },
};

function templateView(template: CustomTemplate): DocumentViewDefinition {
    return {
        id: template.id as DocumentViewId,
        // The author's own words: shown as written in every locale.
        label: { id: `ttgamer.user.view.${template.id}`, message: template.name },
        layout: { type: 'declarative', templateId: template.id },
    };
}

function baseDefinition(definitionId: string) {
    return {
        id: DocumentDefinitionIdSchema.parse(definitionId) as DocumentDefinitionId,
        kind: DocumentKindSchema.parse(definitionId) as DocumentKind,
        schemaVersion: USER_TYPE_SCHEMA_VERSION,
        schema: UserTypeDataSchema,
        createDefault: () => ({}),
        migrate: (data: unknown) => data,
    };
}

/** The definition of an installed user type: its pages are its views, default page first. */
export function synthesizeUserDefinition(
    type: UserDocumentType,
    templates: readonly CustomTemplate[],
    systemId: string
): DocumentDefinition {
    const pages = templates
        .filter((template) => template.documentKind === type.id && template.systemId === systemId)
        .sort(
            (left, right) =>
                Number(right.id === type.defaultTemplateId) -
                Number(left.id === type.defaultTemplateId)
        );
    const views = pages.length > 0 ? pages.map(templateView) : [storedValuesView];
    return {
        ...baseDefinition(type.id),
        label: { id: `ttgamer.user.type.${type.id}`, message: type.name },
        defaultViewId: views[0]!.id,
        views,
    };
}

/** The definition of a user-type document whose type is not installed. */
export function synthesizeOrphanDefinition(definitionId: string): DocumentDefinition {
    return {
        ...baseDefinition(definitionId),
        label: uiMessages.sheet.documents.types.unknown,
        defaultViewId: STORED_VALUES_VIEW_ID,
        views: [storedValuesView],
    };
}
