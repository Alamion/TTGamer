import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { parse } from 'yaml';

export const TRANSLATION_SOURCE_ROOT = path.resolve('translations/source');

export interface UiMessage {
    message: string;
    description?: string;
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
    return 'message' in value || 'description' in value;
}

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
    if (!isPlainRecord(value)) {
        throw new Error(location + ': translation values must be strings or mappings');
    }
    if (domain === 'ui' && isUiMessage(value)) {
        if (Object.keys(value).some((key) => key !== 'message' && key !== 'description')) {
            throw new Error(location + ': a UI message may only contain message and description');
        }
        if (typeof value.message !== 'string' || value.message.trim().length === 0) {
            throw new Error(location + ': a UI message requires a non-empty message');
        }
        if (value.description !== undefined && typeof value.description !== 'string') {
            throw new Error(location + ': a UI description must be a string');
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
    if (typeof value === 'string') return 1;
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
    if (!isPlainRecord(value)) throw new Error(prefix.join('.') + ': expected a catalog mapping');
    for (const [key, nested] of Object.entries(value)) {
        flattenStringLeaves(nested, [...prefix, key], entries);
    }
    return entries;
}

export function interpolationNames(message: string): string[] {
    return Array.from(message.matchAll(/\{([\w-]+)\}/g), ([, name]) => name).sort();
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
