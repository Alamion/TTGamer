import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = path.resolve('docs/star-wars-wod-2e');
const translationRoot = path.resolve(
    'i18n/ru/docusaurus-plugin-content-docs/current/star-wars-wod-2e'
);
const translationJsonFiles = [
    'code.json',
    'docusaurus-plugin-content-docs/current.json',
    'docusaurus-theme-classic/navbar.json',
] as const;

interface TranslationEntry {
    message?: unknown;
}

type TranslationCatalog = Record<string, TranslationEntry>;

async function collectDocuments(root: string, directory = root): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const paths = await Promise.all(
        entries.map(async (entry) => {
            const absolutePath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                return collectDocuments(root, absolutePath);
            }
            return /\.mdx?$/.test(entry.name) ? [path.relative(root, absolutePath)] : [];
        })
    );
    return paths.flat().sort();
}

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

async function main() {
    const [sourceDocuments, translatedDocuments] = await Promise.all([
        collectDocuments(sourceRoot),
        collectDocuments(translationRoot),
    ]);
    const errors = [
        ...difference(sourceDocuments, translatedDocuments).map(
            (document) => `Missing Russian document: ${document}`
        ),
        ...difference(translatedDocuments, sourceDocuments).map(
            (document) => `Russian document has no English source: ${document}`
        ),
    ];

    await Promise.all(translationJsonFiles.map((file) => validateTranslationCatalog(file, errors)));

    for (const document of sourceDocuments.filter((item) => translatedDocuments.includes(item))) {
        const [source, translation] = await Promise.all([
            readFile(path.join(sourceRoot, document), 'utf8'),
            readFile(path.join(translationRoot, document), 'utf8'),
        ]);
        const sourceId = frontmatterId(source);
        const translationId = frontmatterId(translation);
        if (translation.trim().length === 0) {
            errors.push(`${document}: Russian document is empty`);
        }
        if (sourceId !== translationId) {
            errors.push(
                `${document}: frontmatter id differs (${sourceId ?? 'missing'} / ${translationId ?? 'missing'})`
            );
        }
        const sourceImports = moduleImports(source);
        const translationImports = moduleImports(translation);
        if (JSON.stringify(sourceImports) !== JSON.stringify(translationImports)) {
            errors.push(`${document}: MDX component imports differ between locales`);
        }
    }

    if (errors.length > 0) {
        console.error(errors.join('\n'));
        process.exitCode = 1;
    } else {
        console.log(
            `Validated ${sourceDocuments.length} English/Russian document pairs and ${translationJsonFiles.length} translation catalogs.`
        );
    }
}

void main();
