import ts from 'typescript';

import type { VerifierContext } from '../types.ts';

const UI_ID = /^ttgamer\.ui\.([\w.-]+)$/;

export interface MessageReferences {
    /** Exact UI keys (without `ttgamer.ui.`) with the first location that uses them. */
    exact: Map<string, string>;
    /** Key prefixes used as a subtree (`uiMessages.sheet.v5.skills` passed around). */
    prefixes: Set<string>;
    /** `uiMessages.*` chains that resolve to nothing. */
    unknown: { location: string; path: string; file: string }[];
}

type Tree = { [key: string]: Tree | { id: string } };

function resolve(tree: unknown, parts: string[]): 'message' | 'subtree' | 'missing' {
    let current = tree;
    for (const part of parts) {
        if (typeof current !== 'object' || current === null || !(part in current)) {
            return 'missing';
        }
        current = (current as Record<string, unknown>)[part];
    }
    if (typeof current === 'string') return 'message';
    if (typeof current === 'object' && current !== null && 'message' in current) return 'message';
    return 'subtree';
}

/** The `uiMessages.a.b` path of the outermost property access rooted at `uiMessages`. */
function uiMessagesPath(node: ts.PropertyAccessExpression): string[] | undefined {
    const parts: string[] = [];
    let current: ts.Expression = node;
    while (ts.isPropertyAccessExpression(current)) {
        parts.unshift(current.name.text);
        current = current.expression;
    }
    return ts.isIdentifier(current) && current.text === 'uiMessages' ? parts : undefined;
}

/**
 * Collects every translation message reference in the scanned code; with `includeGlossary`,
 * glossary refs count as uses too (they are resolved by the glossary rule, not here).
 */
export function collectMessageReferences(
    context: VerifierContext,
    includeGlossary = false
): MessageReferences {
    const exact = new Map<string, string>();
    const prefixes = new Set<string>();
    const unknown: MessageReferences['unknown'] = [];
    const englishTree = context.sources.ui.en as Tree;
    for (const file of context.files) {
        const visit = (node: ts.Node) => {
            if (
                ts.isPropertyAccessExpression(node) &&
                !ts.isPropertyAccessExpression(node.parent)
            ) {
                const parts = uiMessagesPath(node);
                if (parts && parts.length > 0) {
                    const location =
                        file.path +
                        ':' +
                        (file.source.getLineAndCharacterOfPosition(node.getStart(file.source))
                            .line +
                            1);
                    const kind = resolve(englishTree, parts);
                    // Trailing descriptor fields (`.id`, `.message`) address the message itself.
                    const trimmed =
                        kind === 'missing' && ['id', 'message'].includes(parts.at(-1)!)
                            ? parts.slice(0, -1)
                            : parts;
                    const trimmedKind = trimmed === parts ? kind : resolve(englishTree, trimmed);
                    if (trimmedKind === 'message') {
                        if (!exact.has(trimmed.join('.'))) exact.set(trimmed.join('.'), location);
                    } else if (trimmedKind === 'subtree') {
                        prefixes.add(trimmed.join('.'));
                    } else {
                        unknown.push({ location, path: parts.join('.'), file: file.path });
                    }
                }
            } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
                const id = UI_ID.exec(node.text)?.[1];
                if (id) {
                    const location =
                        file.path +
                        ':' +
                        (file.source.getLineAndCharacterOfPosition(node.getStart(file.source))
                            .line +
                            1);
                    if (!exact.has(id)) exact.set(id, location);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(file.source);
    }
    for (const term of includeGlossary ? context.glossary : []) {
        for (const ref of term.refs) {
            const id = UI_ID.exec(ref)?.[1];
            if (id && !exact.has(id)) exact.set(id, 'glossary/' + term.system + '.yaml#' + term.id);
        }
    }
    return { exact, prefixes, unknown };
}

export function isReferenced(key: string, references: MessageReferences): boolean {
    if (references.exact.has(key)) return true;
    for (const prefix of references.prefixes) {
        if (key === prefix || key.startsWith(prefix + '.')) return true;
    }
    return false;
}
