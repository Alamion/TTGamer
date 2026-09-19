import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import ts from 'typescript';

import { collectDocuments } from '../docs-source.ts';
import {
    flattenStringLeaves,
    flattenUiMessages,
    loadExceptions,
    loadGlossary,
    loadTranslationSources,
    type UiMessage,
} from '../translation-source.ts';
import { DEFAULT_CONFIG, matchesAny, type VerifierConfig } from './config.ts';
import type { DocsPage, ParsedSourceFile, TraitRowKind, VerifierContext } from './types.ts';

export interface LoadOptions {
    root?: string;
    config?: VerifierConfig;
    /** Catalog ids that need translation sources; defaults to the code catalogs. */
    catalogIds?: readonly string[];
    /** Ref → row kinds; defaults to the shipped templates of the system registry. */
    rowKinds?: ReadonlyMap<string, ReadonlySet<TraitRowKind>>;
}

async function walkFiles(directory: string): Promise<string[]> {
    let entries;
    try {
        entries = await readdir(directory, { withFileTypes: true });
    } catch {
        return [];
    }
    const nested = await Promise.all(
        entries.map((entry) => {
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                return entry.name === 'node_modules' ? [] : walkFiles(file);
            }
            return entry.isFile() ? [file] : [];
        })
    );
    return nested.flat();
}

const toPosix = (file: string) => file.split(path.sep).join('/');

async function loadSourceFiles(root: string, config: VerifierConfig): Promise<ParsedSourceFile[]> {
    const files = (await walkFiles(path.join(root, 'src')))
        .map((file) => toPosix(path.relative(root, file)))
        .filter((file) => matchesAny(file, config.scan.include))
        .filter((file) => !matchesAny(file, config.scan.exclude))
        .sort();
    return Promise.all(
        files.map(async (file) => ({
            path: file,
            source: ts.createSourceFile(
                file,
                await readFile(path.join(root, file), 'utf8'),
                ts.ScriptTarget.Latest,
                true,
                file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
            ),
        }))
    );
}

async function readPages(root: string, docsRoot: string, pages: string[]): Promise<DocsPage[]> {
    return Promise.all(
        pages.map(async (page) => {
            const file = toPosix(path.join(docsRoot, page));
            return { page, file, content: await readFile(path.join(root, file), 'utf8') };
        })
    );
}

async function listPages(root: string, docsRoot: string, config: VerifierConfig) {
    const pages: string[] = [];
    for (const tree of config.docRoots) {
        try {
            const found = await collectDocuments(path.join(root, docsRoot, tree));
            pages.push(...found.map((page) => toPosix(path.join(tree, page))));
        } catch {
            // A tree without pages has nothing to mirror.
        }
    }
    for (const page of config.rootDocuments) {
        try {
            await readFile(path.join(root, docsRoot, page));
            pages.push(page);
        } catch {
            // Missing top-level page.
        }
    }
    return readPages(root, docsRoot, pages);
}

function flattenUi(tree: Record<string, unknown>): Record<string, UiMessage> {
    return flattenUiMessages(tree);
}

/** Loads everything the rules read: sources, glossary, exceptions, code, and docs. */
export async function loadVerifierContext(options: LoadOptions = {}): Promise<VerifierContext> {
    const root = path.resolve(options.root ?? '.');
    const config = options.config ?? DEFAULT_CONFIG;
    const sources = await loadTranslationSources(path.join(root, config.paths.sources));
    const [glossary, exceptions, files, en] = await Promise.all([
        loadGlossary(path.join(root, config.paths.glossary)),
        loadExceptions(path.join(root, config.paths.exceptions)),
        loadSourceFiles(root, config),
        listPages(root, config.paths.docs, config),
    ]);
    const translated: Record<string, DocsPage[]> = {};
    for (const [locale, docsRoot] of Object.entries(config.paths.translatedDocs)) {
        translated[locale] = await listPages(root, docsRoot, config);
    }
    const catalogIds = options.catalogIds ?? [
        ...(await import('../catalogSources.ts')).codeCatalogs().keys(),
    ];
    const rowKinds =
        options.rowKinds ?? (await import('./templateRowKinds.ts')).shippedTemplateRowKinds();
    return {
        root,
        config,
        sources,
        ui: Object.fromEntries(
            sources.locales.map((locale) => [locale, flattenUi(sources.ui[locale])])
        ),
        data: Object.fromEntries(
            sources.locales.map((locale) => [locale, flattenStringLeaves(sources.data[locale])])
        ),
        glossary,
        exceptions,
        files,
        docs: { en, translated },
        catalogIds,
        rowKinds,
    };
}
