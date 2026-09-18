import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
    collectDocuments,
    DOCUMENT_ROOTS,
    ROOT_DOCUMENTS,
    TRANSLATION_DOCS_ROOT,
} from './docs-source.ts';

const translationDocsRoot = TRANSLATION_DOCS_ROOT;
const translationJsonFiles = [
    'code.json',
    'docusaurus-plugin-content-docs/current.json',
    'docusaurus-theme-classic/navbar.json',
] as const;

interface TranslationEntry {
    message?: unknown;
}

type TranslationCatalog = Record<string, TranslationEntry>;

function difference(left: string[], right: string[]) {
    const rightSet = new Set(right);
    return left.filter((item) => !rightSet.has(item));
}

function frontmatterId(content: string) {
    const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/);
    return frontmatter?.[1].match(/^id:\s*["']?([^\n"']+)/m)?.[1].trim();
}

function moduleImports(content: string) {
    return Array.from(content.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g), ([, source]) => {
        const sourceIndex = source.indexOf('/src/');
        return sourceIndex >= 0 ? source.slice(sourceIndex) : source;
    }).sort();
}

async function validateTranslationCatalog(relativePath: string, errors: string[]) {
    const [source, translation] = await Promise.all(
        ['en', 'ru'].map(
            async (locale) =>
                JSON.parse(
                    await readFile(path.resolve('i18n', locale, relativePath), 'utf8')
                ) as TranslationCatalog
        )
    );
    const sourceKeys = Object.keys(source).sort();
    const translationKeys = Object.keys(translation).sort();
    for (const key of difference(sourceKeys, translationKeys)) {
        errors.push(`${relativePath}: missing Russian translation key "${key}"`);
    }
    for (const key of difference(translationKeys, sourceKeys)) {
        errors.push(`${relativePath}: Russian key has no English source "${key}"`);
    }
    for (const key of sourceKeys.filter((item) => translationKeys.includes(item))) {
        const message = translation[key]?.message;
        if (typeof message !== 'string' || message.trim().length === 0) {
            errors.push(`${relativePath}: Russian message is empty for "${key}"`);
        }
    }
}

async function exists(target: string) {
    try {
        await access(target);
        return true;
    } catch {
        return false;
    }
}

async function validateDocumentRoot(root: string, errors: string[]): Promise<number> {
    const sourceRoot = path.resolve('docs', root);
    const translationRoot = path.resolve(translationDocsRoot, root);
    // A tree that has no English pages yet has nothing to mirror.
    if (!(await exists(sourceRoot))) return 0;
    const [sourceDocuments, translatedDocuments] = await Promise.all([
        collectDocuments(sourceRoot),
        (await exists(translationRoot)) ? collectDocuments(translationRoot) : ([] as string[]),
    ]);
    errors.push(
        ...difference(sourceDocuments, translatedDocuments).map(
            (document) => `Missing Russian document: ${root}/${document}`
        ),
        ...difference(translatedDocuments, sourceDocuments).map(
            (document) => `Russian document has no English source: ${root}/${document}`
        )
    );

    for (const document of sourceDocuments.filter((item) => translatedDocuments.includes(item))) {
        const [source, translation] = await Promise.all([
            readFile(path.join(sourceRoot, document), 'utf8'),
            readFile(path.join(translationRoot, document), 'utf8'),
        ]);
        const label = `${root}/${document}`;
        const sourceId = frontmatterId(source);
        const translationId = frontmatterId(translation);
        if (translation.trim().length === 0) {
            errors.push(`${label}: Russian document is empty`);
        }
        if (sourceId !== translationId) {
            errors.push(
                `${label}: frontmatter id differs (${sourceId ?? 'missing'} / ${translationId ?? 'missing'})`
            );
        }
        const sourceImports = moduleImports(source);
        const translationImports = moduleImports(translation);
        if (JSON.stringify(sourceImports) !== JSON.stringify(translationImports)) {
            errors.push(`${label}: MDX component imports differ between locales`);
        }
    }
    return sourceDocuments.length;
}

async function main() {
    const errors: string[] = [];
    let documentCount = 0;
    for (const root of DOCUMENT_ROOTS) {
        documentCount += await validateDocumentRoot(root, errors);
    }
    for (const document of ROOT_DOCUMENTS) {
        if (!(await exists(path.resolve(translationDocsRoot, document)))) {
            errors.push(`Missing Russian document: ${document}`);
        }
        documentCount += 1;
    }

    await Promise.all(translationJsonFiles.map((file) => validateTranslationCatalog(file, errors)));

    if (errors.length > 0) {
        console.error(errors.join('\n'));
        process.exitCode = 1;
    } else {
        console.log(
            `Validated ${documentCount} English/Russian document pairs and ${translationJsonFiles.length} translation catalogs.`
        );
    }
}

void main();
