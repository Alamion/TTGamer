import {
    exportNotices,
    type PublisherPolicy,
    resolveDocumentPolicies,
    resolveSystemPolicies,
    systemRegistry,
} from '../../../systems';
import {
    ownerSystemId,
    type UserDocumentType,
    UserDocumentTypeSchema,
    type UserSetting,
    UserSettingSchema,
} from '../../../systems/userTypes';
import { type CustomTemplate, CustomTemplateSchema } from '../../../types/template';
import type { LibraryState } from '../data/libraryActions';
import {
    childrenOf,
    findNode,
    hasUserContent,
    type LibraryNode,
    type RulesetNode,
} from '../data/libraryTree';
import { resolveImportedTemplate } from './templateFile';

/**
 * Library files (spec 013, contracts/library-file-format.md): the user's settings, types, pages,
 * and edited shipped pages, with the addresses of the shipped places they attach to. Shipped
 * content is never serialized. Everything is validated before any state change.
 */
export const LIBRARY_FILE_FORMAT = 'ttgamer-library';
export const LIBRARY_FILE_VERSION = 1;
const TYPE_FILE_FORMAT = 'ttgamer-document-type';
const TEMPLATE_FILE_FORMAT = 'ttgamer-template';

export type Inclusion = 'picked' | 'auto';

export interface LibraryAddress {
    systemId: string;
    moduleId?: string;
    definitionId?: string;
    viewId?: string;
}

export interface LibraryPayload {
    settings: UserSetting[];
    types: UserDocumentType[];
    templates: CustomTemplate[];
    /** Edited shipped pages: `systemId` + `id` name the shipped page they replace. */
    overrides: CustomTemplate[];
    /** Record id (override: `systemId:viewId`) → how it got into the file. */
    included: Record<string, Inclusion>;
    addresses: LibraryAddress[];
}

// --- Selection -------------------------------------------------------------------------------

/** A node that is an exportable item itself: the user's setting, type, or page, or an edit. */
function isItem(node: LibraryNode): boolean {
    if (node.unavailable) return false;
    if (node.level === 'page') {
        return node.ref.kind === 'user' || node.ref.edited;
    }
    return node.ownership === 'user' && node.level !== 'ruleset';
}

/** The exportable item keys in a subtree, the node itself included. */
export function exportableKeys(node: LibraryNode): string[] {
    const keys = isItem(node) ? [node.key] : [];
    for (const child of childrenOf(node)) keys.push(...exportableKeys(child));
    return keys;
}

export function isExportable(node: LibraryNode): boolean {
    return !node.unavailable && hasUserContent(node) && exportableKeys(node).length > 0;
}

export type Tick = 'checked' | 'unchecked' | 'partial';

export function tickState(node: LibraryNode, picked: ReadonlySet<string>): Tick {
    const keys = exportableKeys(node);
    const count = keys.filter((key) => picked.has(key)).length;
    if (count === 0) return 'unchecked';
    return count === keys.length ? 'checked' : 'partial';
}

/** Ticking a branch picks every item in it; unticking a fully ticked branch clears it. */
export function toggleTick(node: LibraryNode, picked: ReadonlySet<string>): Set<string> {
    const next = new Set(picked);
    const keys = exportableKeys(node);
    if (tickState(node, picked) === 'checked') for (const key of keys) next.delete(key);
    else for (const key of keys) next.add(key);
    return next;
}

export interface ExportClosure {
    picked: Set<string>;
    /** The user's parents a picked item cannot be installed without (tertiary in the tree). */
    auto: Map<string, string>;
    addresses: LibraryAddress[];
}

function addressOf(node: LibraryNode): LibraryAddress | undefined {
    switch (node.level) {
        case 'ruleset':
            return node.unavailable ? undefined : { systemId: node.systemId };
        case 'setting':
            if (node.ref.kind === 'module')
                return { systemId: node.ref.systemId, moduleId: node.ref.moduleId };
            if (node.ref.kind === 'system' || node.ref.kind === 'rules')
                return { systemId: node.ref.systemId };
            return undefined;
        case 'type':
            return node.ref.kind === 'shipped' || node.ref.kind === 'core'
                ? { systemId: node.ref.systemId, definitionId: node.ref.definitionId }
                : undefined;
        case 'page':
            return node.ref.kind === 'shipped'
                ? { systemId: node.ref.systemId, viewId: node.ref.viewId }
                : undefined;
    }
}

/** Picked items plus the user parents they need; shipped parents become addresses (FR-017). */
export function exportClosure(
    tree: readonly RulesetNode[],
    picked: ReadonlySet<string>
): ExportClosure {
    const auto = new Map<string, string>();
    const addresses = new Map<string, LibraryAddress>();
    for (const key of picked) {
        const found = findNode(tree, key);
        if (!found) continue;
        for (const ancestor of found.ancestors) {
            if (ancestor.ownership === 'user' && isItem(ancestor)) {
                if (!picked.has(ancestor.key) && !auto.has(ancestor.key)) {
                    auto.set(ancestor.key, found.node.name);
                }
            } else {
                const address = addressOf(ancestor);
                if (address) addresses.set(JSON.stringify(address), address);
            }
        }
        if (found.node.level === 'page' && found.node.ref.kind === 'shipped') {
            const address = addressOf(found.node);
            if (address) addresses.set(JSON.stringify(address), address);
        }
    }
    return { picked: new Set(picked), auto, addresses: [...addresses.values()] };
}

export function overrideRecordId(template: Pick<CustomTemplate, 'systemId' | 'id'>): string {
    return `${template.systemId}:${template.id}`;
}

/** The records of a closure, with references to records left out of the file dropped. */
export function buildLibraryPayload(
    tree: readonly RulesetNode[],
    closure: ExportClosure,
    state: Pick<LibraryState, 'settings' | 'types' | 'templates'>
): LibraryPayload {
    const payload: LibraryPayload = {
        settings: [],
        types: [],
        templates: [],
        overrides: [],
        included: {},
        addresses: closure.addresses,
    };
    const keys = [...closure.picked, ...closure.auto.keys()];
    for (const key of keys) {
        const node = findNode(tree, key)?.node;
        if (!node) continue;
        const inclusion: Inclusion = closure.picked.has(key) ? 'picked' : 'auto';
        if (node.level === 'setting' && node.ref.kind === 'user') {
            const setting = state.settings[node.ref.settingId];
            if (setting) {
                payload.settings.push(setting);
                payload.included[setting.id] = inclusion;
            }
        } else if (node.level === 'type' && node.ref.kind === 'user') {
            const type = state.types[node.ref.typeId];
            if (type) {
                payload.types.push(type);
                payload.included[type.id] = inclusion;
            }
        } else if (node.level === 'page' && node.ref.kind === 'user') {
            payload.templates.push(node.template);
            payload.included[node.template.id] = inclusion;
        } else if (node.level === 'page' && node.ref.kind === 'shipped' && node.ref.edited) {
            payload.overrides.push(node.template);
            payload.included[overrideRecordId(node.template)] = inclusion;
        }
    }
    const templateIds = new Set(payload.templates.map(({ id }) => id));
    payload.settings = payload.settings.map((setting) => ({
        ...setting,
        pages: Object.fromEntries(
            Object.entries(setting.pages).filter(([, id]) => templateIds.has(id))
        ),
    }));
    payload.types = payload.types.map((type) => {
        if (!type.defaultTemplateId || templateIds.has(type.defaultTemplateId)) return type;
        const { defaultTemplateId: _dropped, ...rest } = type;
        void _dropped;
        return rest;
    });
    return payload;
}

function payloadPolicies(payload: LibraryPayload): PublisherPolicy[] {
    const all = new Map<string, PublisherPolicy>();
    const add = (policies: readonly PublisherPolicy[]) => {
        for (const policy of policies) all.set(policy.id, policy);
    };
    const settings = Object.fromEntries(payload.settings.map((s) => [s.id, s]));
    for (const setting of payload.settings) {
        add(resolveSystemPolicies(systemRegistry, setting.systemId));
    }
    for (const type of payload.types) {
        const systemId = ownerSystemId(type, settings) ?? ownerSystemId(type, {});
        if (systemId)
            add(resolveDocumentPolicies(systemRegistry, { systemId, definitionId: type.id }));
    }
    for (const template of [...payload.templates, ...payload.overrides]) {
        const definition = systemRegistry
            .getSystem(template.systemId)
            ?.documents.find(({ kind }) => kind === template.documentKind);
        add(
            definition
                ? resolveDocumentPolicies(systemRegistry, {
                      systemId: template.systemId,
                      definitionId: definition.id,
                  })
                : resolveSystemPolicies(systemRegistry, template.systemId)
        );
    }
    for (const address of payload.addresses) {
        const module = address.moduleId
            ? systemRegistry
                  .getSystem(address.systemId)
                  ?.documents.find((definition) => definition.module?.id === address.moduleId)
            : undefined;
        add(
            module
                ? resolveDocumentPolicies(systemRegistry, {
                      systemId: address.systemId,
                      definitionId: module.id,
                  })
                : []
        );
    }
    return [...all.values()];
}

export function serializeLibraryFile(payload: LibraryPayload, exportedAt = new Date()): string {
    const policies = payloadPolicies(payload);
    return JSON.stringify(
        {
            format: LIBRARY_FILE_FORMAT,
            version: LIBRARY_FILE_VERSION,
            exportedAt: exportedAt.toISOString(),
            settings: payload.settings,
            types: payload.types,
            templates: payload.templates,
            overrides: payload.overrides,
            included: payload.included,
            addresses: payload.addresses,
            ...(policies.length > 0 ? { notices: exportNotices(policies) } : {}),
        },
        null,
        2
    );
}

export function buildLibraryFilename(name: string | undefined): string {
    const slug = (name ?? '').trim().replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'selection';
    return `ttgamer_library_${slug}.json`;
}

export function downloadTextFile(contents: string, filename: string): void {
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

// --- Parsing -----------------------------------------------------------------------------------

export type LibraryFileError = 'parse' | 'format' | 'version' | 'schema';

export type ParsedLibraryFile =
    | { ok: true; payload: LibraryPayload; degradedCatalogFields: readonly string[] }
    | { ok: false; error: LibraryFileError; entry?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function entryName(raw: unknown, index: number, collection: string): string {
    if (isRecord(raw) && typeof raw.name === 'string' && raw.name.trim()) return raw.name;
    if (isRecord(raw) && typeof raw.id === 'string') return raw.id;
    return `${collection}[${index}]`;
}

type RawPayload = Record<'settings' | 'types' | 'templates' | 'overrides', unknown[]> & {
    included?: unknown;
    addresses?: unknown;
};

/** Older files open in the same preview (contracts "Backward compatibility"). */
function adaptLegacy(raw: Record<string, unknown>): RawPayload | LibraryFileError {
    if (raw.format === LIBRARY_FILE_FORMAT) {
        if (raw.version !== LIBRARY_FILE_VERSION) return 'version';
        const list = (value: unknown) => (value === undefined ? [] : value);
        const collections = {
            settings: list(raw.settings),
            types: list(raw.types),
            templates: list(raw.templates),
            overrides: list(raw.overrides),
        };
        if (!Object.values(collections).every(Array.isArray)) return 'schema';
        return {
            ...(collections as RawPayload),
            included: raw.included,
            addresses: raw.addresses,
        };
    }
    if (raw.format === TYPE_FILE_FORMAT) {
        if (raw.version !== 1) return 'version';
        if (!Array.isArray(raw.templates)) return 'schema';
        return {
            settings: raw.setting === undefined ? [] : [raw.setting],
            types: [raw.type],
            templates: raw.templates,
            overrides: [],
        };
    }
    if (raw.format === TEMPLATE_FILE_FORMAT) {
        if (raw.formatVersion !== 3) return 'version';
        return { settings: [], types: [], templates: [raw.template], overrides: [] };
    }
    return 'format';
}

function parseIncluded(raw: unknown): Record<string, Inclusion> {
    if (!isRecord(raw)) return {};
    return Object.fromEntries(
        Object.entries(raw).filter(
            (entry): entry is [string, Inclusion] => entry[1] === 'picked' || entry[1] === 'auto'
        )
    );
}

function parseAddresses(raw: unknown): LibraryAddress[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((entry) => {
        if (!isRecord(entry) || typeof entry.systemId !== 'string') return [];
        const address: LibraryAddress = { systemId: entry.systemId };
        for (const key of ['moduleId', 'definitionId', 'viewId'] as const) {
            if (typeof entry[key] === 'string') address[key] = entry[key];
        }
        return [address];
    });
}

export function parseLibraryFile(text: string): ParsedLibraryFile {
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        return { ok: false, error: 'parse' };
    }
    if (!isRecord(raw)) return { ok: false, error: 'format' };
    const adapted = adaptLegacy(raw);
    if (typeof adapted === 'string') return { ok: false, error: adapted };

    const parseAll = <T>(
        collection: 'settings' | 'types' | 'templates' | 'overrides',
        parse: (entry: unknown) => { success: true; data: T } | { success: false }
    ): T[] | { entry: string } => {
        const parsed: T[] = [];
        for (const [index, entry] of adapted[collection].entries()) {
            const result = parse(entry);
            if (!result.success) return { entry: entryName(entry, index, collection) };
            parsed.push(result.data);
        }
        return parsed;
    };
    const settings = parseAll('settings', (entry) => UserSettingSchema.safeParse(entry));
    const types = parseAll('types', (entry) => UserDocumentTypeSchema.safeParse(entry));
    const templates = parseAll('templates', (entry) => CustomTemplateSchema.safeParse(entry));
    const overrides = parseAll('overrides', (entry) => CustomTemplateSchema.safeParse(entry));
    for (const result of [settings, types, templates, overrides]) {
        if (!Array.isArray(result)) return { ok: false, error: 'schema', entry: result.entry };
    }
    const lists = {
        settings: settings as UserSetting[],
        types: types as UserDocumentType[],
        templates: templates as CustomTemplate[],
        overrides: overrides as CustomTemplate[],
    };
    if (Object.values(lists).every((list) => list.length === 0)) {
        return { ok: false, error: 'schema' };
    }

    const degraded: string[] = [];
    const resolve = (template: CustomTemplate) => {
        const result = resolveImportedTemplate(template);
        degraded.push(...result.degradedFields);
        return result.template;
    };
    return {
        ok: true,
        payload: {
            ...lists,
            templates: lists.templates.map(resolve),
            overrides: lists.overrides.map(resolve),
            included: parseIncluded(adapted.included),
            addresses: parseAddresses(adapted.addresses),
        },
        degradedCatalogFields: degraded,
    };
}
