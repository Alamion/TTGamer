import { z } from 'zod';

import { compactId, randomToken } from '../../shared/utils/random';
import { SystemIdSchema } from '../types/document';
import { TEMPLATE_LIMITS } from '../types/templateLimits';
import type { CatalogBindingEntry, CatalogDetailValue, CatalogFillKind } from './catalogs';
import type { SystemRegistry } from './registry';
import { isUserKind } from './userTypes';

/**
 * User catalogs (spec 015): named lists with typed columns that an author keeps on a setting or
 * a ruleset. They reach generic code through the registry overlay, adapted to the shipped
 * `CatalogBindingEntry` shape, so every catalog consumer handles both alike.
 */
export const USER_CATALOG_PREFIX = 'user-catalog-';

export const newUserCatalogId = () => `${USER_CATALOG_PREFIX}${compactId()}`;
export const newCatalogColumnId = () => `c-${randomToken(8)}`;
export const newCatalogEntryId = () => `e-${randomToken(8)}`;

export function isUserCatalogId(id: string): boolean {
    return id.startsWith(USER_CATALOG_PREFIX);
}

export const CATALOG_COLUMN_TYPES = ['text', 'number', 'toggle'] as const;
export type CatalogColumnType = (typeof CATALOG_COLUMN_TYPES)[number];

export const CatalogColumnSchema = z
    .object({
        id: z.string().regex(/^c-[a-z0-9]{8}$/, 'Expected a catalog column id'),
        name: z.string().trim().min(1).max(60),
        type: z.enum(CATALOG_COLUMN_TYPES),
    })
    .strict();

export const CatalogCellValueSchema = z.union([z.string().max(2_000), z.number(), z.boolean()]);

export const CatalogEntrySchema = z
    .object({
        id: z.string().regex(/^e-[a-z0-9]{8}$/, 'Expected a catalog entry id'),
        name: z.string().trim().min(1).max(120),
        values: z.record(z.string(), CatalogCellValueSchema).default({}),
    })
    .strict();

const userSettingIdSchema = z
    .string()
    .regex(/^user-setting-(?:[a-z0-9]{8}|[a-z0-9]{32})$/, 'Expected a user setting id');

export const UserCatalogOwnerSchema = z.union([
    z.object({ settingId: userSettingIdSchema }).strict(),
    z
        .object({
            systemId: SystemIdSchema,
            moduleId: z.string().min(1).max(64).optional(),
        })
        .strict(),
    z.object({ rulesetId: SystemIdSchema }).strict(),
]);

export type CatalogColumn = z.infer<typeof CatalogColumnSchema>;
export type CatalogCellValue = z.infer<typeof CatalogCellValueSchema>;
export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;
export type UserCatalogOwner = z.infer<typeof UserCatalogOwnerSchema>;

const matchesType = (value: CatalogCellValue, type: CatalogColumnType) =>
    type === 'text'
        ? typeof value === 'string'
        : type === 'number'
          ? typeof value === 'number'
          : typeof value === 'boolean';

export const UserCatalogSchema = z
    .object({
        id: z
            .string()
            .regex(/^user-catalog-(?:[a-z0-9]{8}|[a-z0-9]{32})$/, 'Expected a user catalog id'),
        name: z.string().trim().min(1).max(80),
        description: z.string().max(500).optional(),
        owner: UserCatalogOwnerSchema,
        columns: z.array(CatalogColumnSchema).max(TEMPLATE_LIMITS.catalogColumnsMax),
        entries: z.array(CatalogEntrySchema).max(TEMPLATE_LIMITS.catalogEntriesMax),
        createdAt: z.string().min(1),
        updatedAt: z.string().min(1),
    })
    .superRefine((catalog, context) => {
        const unique = (ids: readonly string[]) => new Set(ids).size === ids.length;
        if (!unique(catalog.columns.map(({ id }) => id))) {
            context.addIssue({ code: 'custom', message: 'Duplicate column id' });
        }
        if (!unique(catalog.entries.map(({ id }) => id))) {
            context.addIssue({ code: 'custom', message: 'Duplicate entry id' });
        }
    })
    // Values of unknown columns, or of the wrong type, are dropped rather than failing the catalog.
    .transform((catalog) => {
        const types = new Map(catalog.columns.map(({ id, type }) => [id, type]));
        return {
            ...catalog,
            entries: catalog.entries.map((entry) => ({
                ...entry,
                values: Object.fromEntries(
                    Object.entries(entry.values).filter(([columnId, value]) => {
                        const type = types.get(columnId);
                        return type !== undefined && matchesType(value, type);
                    })
                ),
            })),
        };
    });

export type UserCatalog = z.output<typeof UserCatalogSchema>;

/** An owner as plain ids (a stored owner, or one derived from a template). */
export type CatalogOwnerRef =
    { settingId: string } | { systemId: string; moduleId?: string } | { rulesetId: string };

/** A stable string for one owner: compares and counts owners. */
export function catalogOwnerKey(owner: CatalogOwnerRef): string {
    if ('settingId' in owner) return `setting:${owner.settingId}`;
    if ('rulesetId' in owner) return `ruleset:${owner.rulesetId}`;
    return owner.moduleId
        ? `system:${owner.systemId}:${owner.moduleId}`
        : `system:${owner.systemId}`;
}

/** The two owners whose catalogs a template sees: its setting and its setting's ruleset. */
export interface CatalogScope {
    setting: CatalogOwnerRef;
    rulesetId: string | undefined;
}

/**
 * A template's catalog scope (spec 015, R2): its user setting (directly or through its user
 * type), or its shipped setting (system plus the module of its definition), and that setting's
 * ruleset.
 */
export function catalogScopeOf(
    registry: SystemRegistry,
    template: { systemId: string; documentKind: string; settingId?: string }
): CatalogScope {
    const { types, settings } = registry.getUserDocumentTypes();
    const rulesetOfSystem = (systemId: string) => registry.rulesetOf(systemId)?.id;
    const ofUserSetting = (settingId: string): CatalogScope => ({
        setting: { settingId },
        rulesetId: settings[settingId]?.systemId ?? rulesetOfSystem(template.systemId),
    });
    if (template.settingId) return ofUserSetting(template.settingId);
    if (isUserKind(template.documentKind)) {
        const owner = types[template.documentKind]?.owner;
        if (owner && 'settingId' in owner) return ofUserSetting(owner.settingId);
        if (owner) {
            return {
                setting: owner.moduleId
                    ? { systemId: owner.systemId, moduleId: owner.moduleId }
                    : { systemId: owner.systemId },
                rulesetId: rulesetOfSystem(owner.systemId),
            };
        }
    }
    const moduleId = registry
        .getSystem(template.systemId)
        ?.documents.find(({ kind }) => kind === template.documentKind)?.module?.id;
    return {
        setting: moduleId
            ? { systemId: template.systemId, moduleId }
            : { systemId: template.systemId },
        rulesetId: rulesetOfSystem(template.systemId),
    };
}

/** Whether a catalog owned by `owner` is visible in `scope`. */
export function isInCatalogScope(owner: CatalogOwnerRef, scope: CatalogScope): boolean {
    if ('rulesetId' in owner) return owner.rulesetId === scope.rulesetId;
    return catalogOwnerKey(owner) === catalogOwnerKey(scope.setting);
}

/** An entry as catalog consumers see it: id, name, and its values keyed by column id. */
export interface UserCatalogEntryView {
    id: string;
    name: string;
    [columnId: string]: string | number | boolean;
}

const FILL_KIND: Record<CatalogColumnType, CatalogFillKind> = {
    text: 'text',
    number: 'number',
    toggle: 'boolean',
};

const bindings = new WeakMap<UserCatalog, CatalogBindingEntry<UserCatalogEntryView>>();

/**
 * A user catalog as a `CatalogBindingEntry` (R4). Single-language: every label is the typed name.
 * An empty cell resolves to `null`, so a pick clears a target the entry has no value for.
 */
export function userCatalogBinding(
    catalog: UserCatalog
): CatalogBindingEntry<UserCatalogEntryView> {
    const cached = bindings.get(catalog);
    if (cached) return cached;
    const name = (entry: UserCatalogEntryView) => entry.name;
    const binding: CatalogBindingEntry<UserCatalogEntryView> = {
        catalogId: catalog.id,
        entries: catalog.entries.map((entry) => ({
            ...entry.values,
            id: entry.id,
            name: entry.name,
        })),
        entryLabel: name,
        pickLabel: name,
        pickSearchText: name,
        fillableDetails: catalog.columns.map(({ id, name: label, type }) => ({
            key: id,
            kind: FILL_KIND[type],
            label,
        })),
        defaultMapping: Object.fromEntries(catalog.columns.map(({ id }) => [id, ''])),
        resolveDetails: (entry) =>
            Object.fromEntries(
                catalog.columns.map(({ id }): [string, CatalogDetailValue] => [
                    id,
                    entry[id] ?? null,
                ])
            ),
        entryText: (entry, key) => {
            const value = entry[key];
            return typeof value === 'string' ? value : undefined;
        },
        entryList: () => undefined,
    };
    bindings.set(catalog, binding);
    return binding;
}
