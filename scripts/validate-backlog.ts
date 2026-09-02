import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

interface Violation {
    file: 'TODO.md' | 'TOFIX.md';
    line: number;
    code: string;
    message: string;
}

interface BacklogFiles {
    todo: string;
    tofix: string;
    roadmap: string;
}

const TODO_PAIRS: Record<string, string> = {
    '✅': 'done',
    '🟡': 'in progress',
    '⬜': 'not started',
    '🚫': 'closed',
};

const TOFIX_SECTIONS = ['🟠 Critical', '🟡 High', '🟢 Medium', '⬜ Low'];

const TODO_ENTRY = /^- \[(x|X| |\/)\] (\S) \*\*T-(\d{3,}) — ([^*]+)\*\* \(([^)]*)\) — (.+)$/u;
const TOFIX_ENTRY = /^### F-(\d{3,}) — (.+)$/;
const PATH_SUFFIX = /\s*\(task for roadmap path ([^)]+)\)\s*$/;
const SLUG_REF = /`([a-z][a-z0-9-]*)`/g;
const ROADMAP_TABLE_ROW = /^\| `([a-z][a-z0-9-]*)` +\|/;
const ROADMAP_HEADING = /^### `([a-z][a-z0-9-]*)` — /;
const FIELD_LINE = /^\*\*(Area|Evidence|Recommendation):\*\* ?(.*)$/;
const NGRAM_SIZE = 8;

const normalize = (text: string): string =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const ngrams = (text: string): string[] => {
    const words = normalize(text).split(' ').filter(Boolean);
    const out: string[] = [];
    for (let i = 0; i + NGRAM_SIZE <= words.length; i += 1) {
        out.push(words.slice(i, i + NGRAM_SIZE).join(' '));
    }
    return out;
};

interface RoadmapIndex {
    slugs: Set<string>;
    scopeNgrams: Set<string>;
}

const indexRoadmap = (content: string): RoadmapIndex => {
    const slugs = new Set<string>();
    const scopeChunks: string[] = [];
    const lines = content.split('\n');
    for (const line of lines) {
        const row = line.match(ROADMAP_TABLE_ROW);
        if (row) slugs.add(row[1]);
        const heading = line.match(ROADMAP_HEADING);
        if (heading) slugs.add(heading[1]);
    }
    for (let i = 0; i < lines.length; i += 1) {
        if (!/^- \*\*Scope\*\*: /.test(lines[i])) continue;
        let chunk = lines[i].replace(/^- \*\*Scope\*\*: /, '');
        let j = i + 1;
        while (j < lines.length && !/^- \*\*/.test(lines[j]) && !/^#{2,3} /.test(lines[j])) {
            chunk += ` ${lines[j].trim()}`;
            j += 1;
        }
        scopeChunks.push(chunk);
    }
    const scopeNgrams = new Set<string>();
    for (const chunk of scopeChunks) {
        for (const gram of ngrams(chunk)) scopeNgrams.add(gram);
    }
    return { slugs, scopeNgrams };
};

const overlapsScope = (text: string, roadmap: RoadmapIndex): string | null => {
    for (const gram of ngrams(text)) {
        if (roadmap.scopeNgrams.has(gram)) return gram;
    }
    return null;
};

const validateTodo = (content: string, roadmap: RoadmapIndex): Violation[] => {
    const violations: Violation[] = [];
    const lines = content.split('\n');
    let section: string | null = null;
    const seenIds = new Set<string>();
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const lineNumber = i + 1;
        const heading = line.match(/^## (.+)$/);
        if (heading && heading[1].trim() !== 'Legend') {
            violations.push({
                file: 'TODO.md',
                line: lineNumber,
                code: 'E-SECT-UNKNOWN',
                message: `unexpected top-level section "${heading[1].trim()}"; only "Legend" and "### <Area>" sections are allowed`,
            });
            continue;
        }
        if (line.startsWith('### ')) {
            section = line.slice(4).trim();
            continue;
        }
        if (!line.startsWith('- [')) continue;
        if (section === null) {
            violations.push({
                file: 'TODO.md',
                line: lineNumber,
                code: 'E-SECT-UNKNOWN',
                message: 'entry appears before any "### <Area>" section',
            });
            continue;
        }
        const match = line.match(TODO_ENTRY);
        if (!match) {
            violations.push({
                file: 'TODO.md',
                line: lineNumber,
                code: 'E-ID-FMT',
                message:
                    'entry does not match the canonical grammar "- [x| ] <emoji> **T-### — Name** (dependencies) — scope"',
            });
            continue;
        }
        const [, rawBox, emoji, id, , deps, rest] = match;
        const box = rawBox === 'x' || rawBox === 'X' ? 'x' : rawBox;
        const entryLabel = `T-${id}`;
        if (box === '/') {
            violations.push({
                file: 'TODO.md',
                line: lineNumber,
                code: 'E-STATUS-AGREE',
                message: `${entryLabel}: the legacy "[/]" marker is not a status; use "[ ] 🟡" for in progress`,
            });
            continue;
        }
        if (!(emoji in TODO_PAIRS)) {
            violations.push({
                file: 'TODO.md',
                line: lineNumber,
                code: 'E-STATUS-VAL',
                message: `${entryLabel}: emoji "${emoji}" is outside the status legend (✅ 🟡 ⬜ 🚫)`,
            });
            continue;
        }
        const boxStatus = box === 'x' ? 'done' : 'open';
        const emojiStatus = emoji === '✅' ? 'done' : 'open';
        if (boxStatus !== emojiStatus) {
            violations.push({
                file: 'TODO.md',
                line: lineNumber,
                code: 'E-STATUS-AGREE',
                message: `${entryLabel}: checkbox and emoji disagree; expected "${box} ${box === 'x' ? '✅' : '🟡/⬜/🚫'}"`,
            });
            continue;
        }
        if (line.includes('(in progress)')) {
            violations.push({
                file: 'TODO.md',
                line: lineNumber,
                code: 'E-STATUS-AGREE',
                message: `${entryLabel}: parenthetical status suffixes are illegal; status is the checkbox+emoji pair`,
            });
        }
        if (seenIds.has(entryLabel)) {
            violations.push({
                file: 'TODO.md',
                line: lineNumber,
                code: 'E-ID-DUP',
                message: `${entryLabel}: identifier already used in this file; take the next free number`,
            });
        }
        seenIds.add(entryLabel);
        if (deps.trim().length === 0) {
            violations.push({
                file: 'TODO.md',
                line: lineNumber,
                code: 'E-FIELD-MISSING',
                message: `${entryLabel}: dependencies field is empty; name dependencies or write "none"`,
            });
        }
        const scope = rest.replace(PATH_SUFFIX, '').trim();
        if (scope.length === 0) {
            violations.push({
                file: 'TODO.md',
                line: lineNumber,
                code: 'E-FIELD-MISSING',
                message: `${entryLabel}: scope is empty; state what becomes possible and for whom`,
            });
        }
        const suffix = rest.match(PATH_SUFFIX);
        if (suffix) {
            for (const slugMatch of suffix[1].matchAll(SLUG_REF)) {
                if (!roadmap.slugs.has(slugMatch[1])) {
                    violations.push({
                        file: 'TODO.md',
                        line: lineNumber,
                        code: 'E-SLUG-DANGLING',
                        message: `${entryLabel}: referenced roadmap path "${slugMatch[1]}" does not exist in ROADMAP.md`,
                    });
                }
            }
        }
        const overlap = overlapsScope(scope, roadmap);
        if (overlap) {
            violations.push({
                file: 'TODO.md',
                line: lineNumber,
                code: 'E-SCOPE-OVERLAP',
                message: `${entryLabel}: scope restates roadmap path prose ("...${overlap}..."); reference the path slug instead`,
            });
        }
    }
    return violations;
};

const validateTofix = (content: string, roadmap: RoadmapIndex): Violation[] => {
    const violations: Violation[] = [];
    const lines = content.split('\n');
    let section: string | null = null;
    const seenIds = new Set<string>();
    let entryId: string | null = null;
    let entryStart = 0;
    let entryText = '';
    const closeEntry = (): void => {
        if (entryId === null) return;
        for (const field of ['Area', 'Evidence', 'Recommendation']) {
            const fieldLine = lines.slice(entryStart).find((l) => l.startsWith(`**${field}:**`));
            const value = fieldLine?.match(FIELD_LINE)?.[2] ?? '';
            if (!fieldLine || value.trim().length === 0) {
                violations.push({
                    file: 'TOFIX.md',
                    line: entryStart + 1,
                    code: 'E-FIELD-MISSING',
                    message: `${entryId}: required field "${field}" is missing or empty`,
                });
            }
        }
        const overlap = overlapsScope(entryText, roadmap);
        if (overlap) {
            violations.push({
                file: 'TOFIX.md',
                line: entryStart + 1,
                code: 'E-SCOPE-OVERLAP',
                message: `${entryId}: text restates roadmap path prose ("...${overlap}..."); defects describe bugs, not path scope`,
            });
        }
        entryId = null;
        entryText = '';
    };
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const lineNumber = i + 1;
        const h2 = line.match(/^## (.+)$/);
        if (h2) {
            closeEntry();
            const name = h2[1].trim();
            if (name !== 'Legend' && !TOFIX_SECTIONS.includes(name)) {
                violations.push({
                    file: 'TOFIX.md',
                    line: lineNumber,
                    code: 'E-SECT-UNKNOWN',
                    message: `unexpected section "${name}"; only "Legend" and the four severity sections are allowed`,
                });
            }
            section = TOFIX_SECTIONS.includes(name) ? name : null;
            continue;
        }
        if (line.startsWith('### ')) {
            closeEntry();
            const match = line.match(TOFIX_ENTRY);
            if (!match) {
                violations.push({
                    file: 'TOFIX.md',
                    line: lineNumber,
                    code: 'E-ID-FMT',
                    message:
                        'entry heading does not match the canonical grammar "### F-### — Name"',
                });
                continue;
            }
            if (section === null) {
                violations.push({
                    file: 'TOFIX.md',
                    line: lineNumber,
                    code: 'E-SECT-UNKNOWN',
                    message: `F-${match[1]}: entry sits outside a severity section`,
                });
                continue;
            }
            const id = `F-${match[1]}`;
            if (seenIds.has(id)) {
                violations.push({
                    file: 'TOFIX.md',
                    line: lineNumber,
                    code: 'E-ID-DUP',
                    message: `${id}: identifier already used in this file; take the next free number`,
                });
            }
            seenIds.add(id);
            entryId = id;
            entryStart = i;
            entryText = line;
            continue;
        }
        if (entryId !== null) entryText += ` ${line.trim()}`;
        if (/^\*\*(Version|Last updated):\*\*/i.test(line)) {
            violations.push({
                file: 'TOFIX.md',
                line: lineNumber,
                code: 'E-SECT-UNKNOWN',
                message:
                    'self-version/recency headers are illegal; git owns versioning and recency',
            });
        }
    }
    closeEntry();
    return violations;
};

export const validateBacklog = (files: BacklogFiles): Violation[] => {
    const roadmap = indexRoadmap(files.roadmap);
    return [...validateTodo(files.todo, roadmap), ...validateTofix(files.tofix, roadmap)];
};

const main = (): number => {
    const [, , todoArg, tofixArg, roadmapArg] = process.argv;
    const paths = {
        todo: resolve(todoArg ?? 'TODO.md'),
        tofix: resolve(tofixArg ?? 'TOFIX.md'),
        roadmap: resolve(roadmapArg ?? 'ROADMAP.md'),
    };
    for (const path of Object.values(paths)) {
        if (!existsSync(path)) {
            console.error(`validate-backlog: input file missing: ${path}`);
            return 2;
        }
    }
    const violations = validateBacklog({
        todo: readFileSync(paths.todo, 'utf8'),
        tofix: readFileSync(paths.tofix, 'utf8'),
        roadmap: readFileSync(paths.roadmap, 'utf8'),
    });
    if (violations.length > 0) {
        for (const v of violations) {
            console.error(`${v.file}:${v.line}: ${v.code}: ${v.message}`);
        }
        console.error(`${violations.length} violation(s)`);
        return 1;
    }
    return 0;
};

const invokedDirectly =
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
    process.exit(main());
}
