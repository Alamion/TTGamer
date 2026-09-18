import ts from 'typescript';

import { matchesAny } from '../config.ts';
import type { Finding, Rule } from '../types.ts';

/** Receivers that look like catalog entry lists (`MELEE_WEAPONS`, `catalog.entries`). */
const CATALOG_RECEIVER = /(^|\.)([A-Z][A-Z0-9_]{2,}|entries|\w*[Cc]atalog\w*)$/;
const NORMALIZED = /\b(normalizeSearchText|matchesSearch)\b/;
const RAW_LOWERCASE = /\.(toLowerCase|toLocaleLowerCase)\(\)/;

function returnedObject(body: ts.ConciseBody): ts.ObjectLiteralExpression | undefined {
    let expression: ts.Expression | undefined;
    if (ts.isBlock(body)) {
        const statement = body.statements.find(ts.isReturnStatement);
        expression = statement?.expression;
    } else {
        expression = body;
    }
    while (expression && ts.isParenthesizedExpression(expression)) {
        expression = expression.expression;
    }
    return expression && ts.isObjectLiteralExpression(expression) ? expression : undefined;
}

/**
 * FR-006h, FR-013/014 (structural): option lists built from catalog entries must label them
 * through pickLabel/entryLabel/entryText, and search filters must normalize text.
 */
export const pickersRule: Rule = {
    id: 'pickers',
    area: 'interface',
    run(context) {
        const findings: Finding[] = [];
        for (const file of context.files) {
            if (!matchesAny(file.path, context.config.pickerFiles)) continue;
            const source = file.source;
            const lineOf = (node: ts.Node) =>
                source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
            const visit = (node: ts.Node) => {
                if (
                    ts.isCallExpression(node) &&
                    ts.isPropertyAccessExpression(node.expression) &&
                    node.arguments.length > 0
                ) {
                    const method = node.expression.name.text;
                    const receiver = node.expression.expression.getText(source);
                    const callback = node.arguments[0];
                    if (
                        method === 'map' &&
                        CATALOG_RECEIVER.test(receiver) &&
                        (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
                    ) {
                        const [parameter] = callback.parameters;
                        const object = returnedObject(callback.body);
                        if (parameter && ts.isIdentifier(parameter.name) && object) {
                            const entry = parameter.name.text;
                            for (const property of object.properties) {
                                if (
                                    ts.isPropertyAssignment(property) &&
                                    ['name', 'label'].includes(property.name.getText(source)) &&
                                    property.initializer.getText(source) === entry + '.name'
                                ) {
                                    findings.push({
                                        rule: 'pickers',
                                        level: 'error',
                                        location: file.path + ':' + lineOf(property),
                                        message:
                                            'option ' +
                                            property.name.getText(source) +
                                            ' uses raw ' +
                                            entry +
                                            '.name from ' +
                                            receiver +
                                            '; use pickLabel',
                                        match: receiver,
                                        file: file.path,
                                    });
                                }
                            }
                        }
                    }
                    if (
                        method === 'filter' &&
                        (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
                    ) {
                        const text = callback.getText(source);
                        if (
                            RAW_LOWERCASE.test(text) &&
                            /\.includes\(/.test(text) &&
                            !NORMALIZED.test(text)
                        ) {
                            findings.push({
                                rule: 'pickers',
                                level: 'error',
                                location: file.path + ':' + lineOf(callback),
                                message: 'search filter lowercases without normalizeSearchText',
                                match: 'search filter',
                                file: file.path,
                            });
                        }
                    }
                }
                ts.forEachChild(node, visit);
            };
            visit(source);
        }
        return { findings };
    },
};
