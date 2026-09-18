import ts from 'typescript';

import { matchesAny, type VerifierConfig } from './config.ts';

/**
 * User-facing positions (spec 009 research D2): where a string literal in interface code is
 * shown to users and therefore must come from the translation sources. Everything else
 * (class names, keys, ids, imports, logging, errors) is ignored.
 */

export type LiteralPosition = 'jsx-text' | 'jsx-attribute' | 'jsx-expression' | 'sink' | 'object';

export interface UserFacingLiteral {
    line: number;
    text: string;
    position: LiteralPosition;
    /** Attribute, sink, or property name. */
    name?: string;
}

/** Text of a string-like literal; template literals join their static parts. */
export function literalText(node: ts.Node): string | undefined {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isTemplateExpression(node)) {
        return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)]
            .join(' ')
            .trim();
    }
    return undefined;
}

/** String literals an expression can evaluate to (branches of `?:`, `||`, `??`, parentheses). */
function expressionLiterals(node: ts.Expression): string[] {
    const text = literalText(node);
    if (text !== undefined) return [text];
    if (ts.isParenthesizedExpression(node)) return expressionLiterals(node.expression);
    if (ts.isConditionalExpression(node)) {
        return [...expressionLiterals(node.whenTrue), ...expressionLiterals(node.whenFalse)];
    }
    if (
        ts.isBinaryExpression(node) &&
        (node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
            node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
    ) {
        return [...expressionLiterals(node.left), ...expressionLiterals(node.right)];
    }
    return [];
}

const LETTERS = /\p{L}{2,}/u;
const NOT_TEXT: readonly RegExp[] = [
    /^(https?:|mailto:|\/|\.\.?\/|#|@site\/)/, // URLs and paths
    /^[\d\s+\-*/<>=()!.,%:dDfFkKhHlLxX]+$/, // dice notation and arithmetic
    /^[A-Z0-9]{1,4}$/, // short abbreviations (HP, AR, d10)
    /^[a-z][\w]*(\.[\w-]+)+$/, // dotted ids (ttgamer.ui.x, file.ext)
    /^[a-z0-9]+([-_:][a-z0-9]+)+$/, // kebab, snake, and prefixed ids
    /^[a-z]+[A-Z]\w*$/, // camelCase identifiers
    /^\{[\w.]+\}$/, // a lone placeholder
    /^catalog:/, // catalog refs
];

/** True when a literal reads as words a user would see. */
export function isUserFacingText(raw: string): boolean {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!LETTERS.test(text)) return false;
    return !NOT_TEXT.some((pattern) => pattern.test(text));
}

function calleeName(node: ts.CallExpression, source: ts.SourceFile): string {
    return node.expression.getText(source).replace(/\s+/g, '');
}

function objectHasProperty(node: ts.ObjectLiteralExpression, name: string): boolean {
    return node.properties.some(
        (property) =>
            (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) &&
            property.name.getText() === name
    );
}

function propertyName(node: ts.PropertyAssignment): string | undefined {
    const name = node.name;
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
    return undefined;
}

/** Every user-facing literal of one source file. */
export function userFacingLiterals(
    source: ts.SourceFile,
    file: string,
    config: VerifierConfig
): UserFacingLiteral[] {
    const found: UserFacingLiteral[] = [];
    const checkObjects = matchesAny(file, config.objectPropFiles);
    const props = new Set(config.userFacingProps);
    const objectProps = new Set(config.objectProps);
    const sinks = new Set(config.sinks);
    const lineOf = (node: ts.Node) =>
        source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    const add = (node: ts.Node, text: string, position: LiteralPosition, name?: string) => {
        if (isUserFacingText(text)) {
            found.push({
                line: lineOf(node),
                text: text.replace(/\s+/g, ' ').trim(),
                position,
                ...(name ? { name } : {}),
            });
        }
    };

    const visit = (node: ts.Node) => {
        if (ts.isJsxText(node)) {
            add(node, node.text, 'jsx-text');
        } else if (ts.isJsxAttribute(node)) {
            const name = node.name.getText(source);
            const initializer = node.initializer;
            if (props.has(name) && initializer) {
                if (ts.isStringLiteral(initializer)) {
                    add(initializer, initializer.text, 'jsx-attribute', name);
                } else if (ts.isJsxExpression(initializer) && initializer.expression) {
                    for (const text of expressionLiterals(initializer.expression)) {
                        add(initializer, text, 'jsx-attribute', name);
                    }
                }
            }
        } else if (
            ts.isJsxExpression(node) &&
            node.expression &&
            (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
        ) {
            for (const text of expressionLiterals(node.expression)) {
                add(node, text, 'jsx-expression');
            }
        } else if (ts.isCallExpression(node) && sinks.has(calleeName(node, source))) {
            const [first] = node.arguments;
            if (first) {
                for (const text of expressionLiterals(first)) {
                    add(first, text, 'sink', calleeName(node, source));
                }
            }
        } else if (
            checkObjects &&
            ts.isPropertyAssignment(node) &&
            ts.isObjectLiteralExpression(node.parent)
        ) {
            const name = propertyName(node);
            // A literal next to labelMessage is the English fallback of a translated label.
            if (name && objectProps.has(name) && !objectHasProperty(node.parent, 'labelMessage')) {
                for (const text of expressionLiterals(node.initializer)) {
                    add(node.initializer, text, 'object', name);
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return found;
}
