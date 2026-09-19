import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { parse } from 'yaml';

export const TRANSLATION_SOURCE_ROOT = path.resolve('translations/source');
export const GLOSSARY_ROOT = path.resolve('translations/glossary');
export const EXCEPTIONS_FILE = path.resolve('translations/i18n-exceptions.yaml');

/** Reserved key of a catalog data file: enumerated values shared by all entries. */
export const CATALOG_LABELS_KEY = '_labels';

export interface UiMessage {
    message: string;
    description?: string;
    /** Plural forms separated by `|` (en: one|other, ru: one|few|many). */
    plural?: boolean;
}

export interface GlossaryTerm {
    id: string;
    en: string;
    ru: string;
    ruShort?: string;
    note?: string;
    /** UI message ids (`ttgamer.ui.*`) or `catalog:<catalogId>/<entryId>` references. */
    refs: string[];
    /** Glossary file name without extension (e.g. `v5-hunter`). */
    system: string;
}

export interface I18nException {
    rule: string;
    file?: string;
    match: string;
    reason: string;
}

export interface TranslationSources {
    locales: string[];
    ui: Record<string, Record<string, unknown>>;
    data: Record<string, Record<string, unknown>>;
    counts: Record<string, Record<'ui' | 'data', number>>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUiMessage(value: Record<string, unknown>): boolean {
    return 'message' in value || 'description' in value || 'plural' in value;
}

const UI_MESSAGE_KEYS = new Set(['message', 'description', 'plural']);

async function sortedEntries(directory: string) {
    return (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
        left.name.localeCompare(right.name)
    );
}

function validateTree(value: unknown, domain: 'ui' | 'data', location: string): void {
    if (typeof value === 'string') {
        if (value.trim().length === 0)
            throw new Error(location + ': translation values cannot be empty');
        return;
    }
    if (domain === 'data' && Array.isArray(value)) {
        value.forEach((item, index) => {
            if (typeof item !== 'string' || item.trim().length === 0) {
                throw new Error(location + '.' + index + ': list items must be non-empty strings');
            }
        });
        return;
    }
    if (!isPlainRecord(value)) {
        throw new Error(location + ': translation values must be strings or mappings');
    }
    if (domain === 'ui' && isUiMessage(value)) {
        if (Object.keys(value).some((key) => !UI_MESSAGE_KEYS.has(key))) {
            throw new Error(
                location + ': a UI message may only contain message, description, and plural'
            );
        }
        if (typeof value.message !== 'string' || value.message.trim().length === 0) {
            throw new Error(location + ': a UI message requires a non-empty message');
        }
        if (value.description !== undefined && typeof value.description !== 'string') {
            throw new Error(location + ': a UI description must be a string');
        }
        if (value.plural !== undefined && typeof value.plural !== 'boolean') {
            throw new Error(location + ': plural must be true or false');
        }
        return;
    }
    for (const [key, nested] of Object.entries(value)) {
        validateTree(nested, domain, location + '.' + key);
    }
}

async function readYamlTree(
    directory: string,
    domain: 'ui' | 'data'
): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    for (const entry of await sortedEntries(directory)) {
        if (entry.name.startsWith('.')) continue;
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (entry.name in result) throw new Error(file + ': duplicate translation path');
            result[entry.name] = await readYamlTree(file, domain);
            continue;
        }
        if (!entry.isFile() || !entry.name.endsWith('.yaml')) {
            throw new Error(file + ': translation sources must be YAML files');
        }
        const parsed = parse(await readFile(file, 'utf8')) as unknown;
        if (!isPlainRecord(parsed))
            throw new Error(file + ': a translation file must contain a mapping');
        const key = path.basename(entry.name, '.yaml');
        if (key === 'index') {
            for (const [childKey, childValue] of Object.entries(parsed)) {
                if (childKey in result) {
                    throw new Error(file + ': duplicate translation key "' + childKey + '"');
                }
                result[childKey] = childValue;
            }
        } else {
            if (key in result) throw new Error(file + ': duplicate translation path');
            result[key] = parsed;
        }
    }
    validateTree(result, domain, directory);
    return result;
}

function countLeaves(value: unknown): number {
    if (typeof value === 'string' || Array.isArray(value)) return 1;
    if (!isPlainRecord(value)) return 0;
    if (isUiMessage(value)) return 1;
    let total = 0;
    for (const nested of Object.values(value)) {
        total += countLeaves(nested);
    }
    return total;
}

export function flattenUiMessages(
    value: unknown,
    prefix: string[] = [],
    entries: Record<string, UiMessage> = {}
): Record<string, UiMessage> {
    if (typeof value === 'string') {
        entries[prefix.join('.')] = { message: value };
        return entries;
    }
    if (!isPlainRecord(value)) throw new Error(prefix.join('.') + ': expected a UI message');
    if (isUiMessage(value)) {
        entries[prefix.join('.')] = {
            message: value.message as string,
            ...(typeof value.description === 'string' ? { description: value.description } : {}),
            ...(value.plural === true ? { plural: true } : {}),
        };
        return entries;
    }
    for (const [key, nested] of Object.entries(value)) {
        flattenUiMessages(nested, [...prefix, key], entries);
    }
    return entries;
}

export function flattenStringLeaves(
    value: unknown,
    prefix: string[] = [],
    entries: Record<string, string> = {}
): Record<string, string> {
    if (typeof value === 'string') {
        entries[prefix.join('.')] = value;
        return entries;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            entries[[...prefix, String(index)].join('.')] = String(item);
        });
        return entries;
    }
    if (!isPlainRecord(value)) throw new Error(prefix.join('.') + ': expected a catalog mapping');
    for (const [key, nested] of Object.entries(value)) {
        flattenStringLeaves(nested, [...prefix, key], entries);
    }
    return entries;
}

/** Distinct placeholder names of a message (plural forms repeat them). */
export function interpolationNames(message: string): string[] {
    return [...new Set(Array.from(message.matchAll(/\{([\w-]+)\}/g), ([, name]) => name))].sort();
}

export async function loadTranslationSources(
    sourceRoot = TRANSLATION_SOURCE_ROOT
): Promise<TranslationSources> {
    const locales = (await sortedEntries(sourceRoot))
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => entry.name);
    if (!locales.includes('en'))
        throw new Error(sourceRoot + ': the English source locale is required');

    const ui: Record<string, Record<string, unknown>> = {};
    const data: Record<string, Record<string, unknown>> = {};
    const counts: Record<string, Record<'ui' | 'data', number>> = {};

    for (const locale of locales) {
        const localeRoot = path.join(sourceRoot, locale);
        const domainNames = (await sortedEntries(localeRoot))
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
            .map((entry) => entry.name);
        if (domainNames.some((domain) => domain !== 'ui' && domain !== 'data')) {
            throw new Error(localeRoot + ': only ui and data translation domains are supported');
        }
        ui[locale] = domainNames.includes('ui')
            ? await readYamlTree(path.join(localeRoot, 'ui'), 'ui')
            : {};
        data[locale] = domainNames.includes('data')
            ? await readYamlTree(path.join(localeRoot, 'data'), 'data')
            : {};
        counts[locale] = { ui: countLeaves(ui[locale]), data: countLeaves(data[locale]) };
    }
    return { locales, ui, data, counts };
}

function requireString(record: Record<string, unknown>, key: string, location: string): string {
    const value = record[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(location + ': "' + key + '" must be a non-empty string');
    }
    return value;
}

function optionalString(
    record: Record<string, unknown>,
    key: string,
    location: string
): string | undefined {
    const value = record[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(location + ': "' + key + '" must be a non-empty string when present');
    }
    return value;
}

const GLOSSARY_REF = /^(ttgamer\.ui\.[\w.-]+|catalog:[\w-]+\/[\w.-]+)$/;
const KEBAB_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Reads `translations/glossary/*.yaml`; ids are unique per file, refs unique across files. */
export async function loadGlossary(root = GLOSSARY_ROOT): Promise<GlossaryTerm[]> {
    let entries;
    try {
        entries = await sortedEntries(root);
    } catch (error) {
        if (error instanceof Error && error.message.includes('ENOENT')) return [];
        throw error;
    }
    const terms: GlossaryTerm[] = [];
    const refOwners = new Map<string, string>();
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue;
        const file = path.join(root, entry.name);
        const system = path.basename(entry.name, '.yaml');
        const parsed = (parse(await readFile(file, 'utf8')) as unknown) ?? [];
        if (!Array.isArray(parsed)) throw new Error(file + ': a glossary file must be a list');
        const ids = new Set<string>();
        parsed.forEach((raw: unknown, index) => {
            const location = file + '[' + index + ']';
            if (!isPlainRecord(raw)) throw new Error(location + ': a term must be a mapping');
            const id = requireString(raw, 'id', location);
            if (!KEBAB_ID.test(id))
                throw new Error(location + ': id "' + id + '" is not kebab-case');
            if (ids.has(id)) throw new Error(location + ': duplicate term id "' + id + '"');
            ids.add(id);
            const refs = raw.refs ?? [];
            if (!Array.isArray(refs) || refs.some((ref) => typeof ref !== 'string')) {
                throw new Error(location + ': refs must be a list of strings');
            }
            for (const ref of refs as string[]) {
                if (!GLOSSARY_REF.test(ref)) {
                    throw new Error(location + ': ref "' + ref + '" is not a UI id or catalog ref');
                }
                const owner = refOwners.get(ref);
                if (owner) {
                    throw new Error(
                        location + ': ref "' + ref + '" already belongs to term ' + owner
                    );
                }
                refOwners.set(ref, system + '/' + id);
            }
            const ruShort = optionalString(raw, 'ruShort', location);
            const note = optionalString(raw, 'note', location);
            terms.push({
                id,
                en: requireString(raw, 'en', location),
                ru: requireString(raw, 'ru', location),
                ...(ruShort ? { ruShort } : {}),
                ...(note ? { note } : {}),
                refs: refs as string[],
                system,
            });
        });
    }
    return terms;
}

/** Reads the verifier exception list; every entry needs a rule, a match, and a reason. */
export async function loadExceptions(file = EXCEPTIONS_FILE): Promise<I18nException[]> {
    let content: string;
    try {
        content = await readFile(file, 'utf8');
    } catch (error) {
        if (error instanceof Error && error.message.includes('ENOENT')) return [];
        throw error;
    }
    const parsed = (parse(content) as unknown) ?? [];
    if (!Array.isArray(parsed)) throw new Error(file + ': the exception list must be a list');
    return parsed.map((raw: unknown, index) => {
        const location = file + '[' + index + ']';
        if (!isPlainRecord(raw)) throw new Error(location + ': an exception must be a mapping');
        const fileGlob = optionalString(raw, 'file', location);
        return {
            rule: requireString(raw, 'rule', location),
            match: requireString(raw, 'match', location),
            reason: requireString(raw, 'reason', location),
            ...(fileGlob ? { file: fileGlob } : {}),
        };
    });
}
