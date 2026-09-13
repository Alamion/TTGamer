import { listDocumentBindings, listNumericCoordinates } from '../../../systems/templateBindings';
import type { CustomTemplate } from '../../../types/template';
import { fieldValueKey, isTemplateField, walkTemplateNodes } from '../../../types/template';
import { parseFormula } from '../declarative/formula';
import { isKnownLabelMessage } from '../declarative/localizeTemplate';
import { CATALOG_BINDINGS } from './catalogBindings';

/**
 * Reference integrity for templates: every string key a template persists (binding keys,
 * catalog ids, fill details/targets, formula coordinates) must resolve against the owning
 * system's registries and the template itself. Runs wherever templates enter the system —
 * the editor, file import, and the shipped-defaults test — so a typo fails there instead of
 * degrading silently at render time.
 */
export type TemplateReferenceIssue =
    | { code: 'unknown-binding'; nodeId: string; key: string }
    | { code: 'binding-kind-mismatch'; nodeId: string; key: string; expected: string }
    | { code: 'unknown-catalog'; nodeId: string; key: string }
    | { code: 'unknown-fill-detail'; nodeId: string; key: string }
    | { code: 'unknown-fill-target'; nodeId: string; key: string }
    | { code: 'unknown-coordinate'; nodeId: string; key: string }
    | { code: 'unknown-label-message'; nodeId: string; key: string };

export interface NumericCoordinateOption {
    coordinate: string;
    label: string;
}

/**
 * The unified numeric coordinate space: system bindings (traits, pool parts) plus the
 * template's own numeric fields — one undifferentiated list for formula pickers and validation.
 */
export function listTemplateNumericCoordinates(
    template: CustomTemplate
): readonly NumericCoordinateOption[] {
    const options: NumericCoordinateOption[] = [
        ...listNumericCoordinates(template.systemId, template.documentKind),
    ];
    walkTemplateNodes(template.children, (node) => {
        if (node.type === 'number' || node.type === 'rating') {
            options.push({ coordinate: fieldValueKey(node), label: node.label });
        } else if (node.type === 'resource') {
            const key = fieldValueKey(node);
            options.push({ coordinate: `${key}.current`, label: `${node.label} (current)` });
            options.push({ coordinate: `${key}.max`, label: `${node.label} (max)` });
        } else if (node.type === 'formula') {
            options.push({ coordinate: fieldValueKey(node), label: node.label });
        }
    });
    return options;
}

export function validateTemplateReferences(template: CustomTemplate): TemplateReferenceIssue[] {
    const issues: TemplateReferenceIssue[] = [];
    const bindings = new Map(
        listDocumentBindings(template.systemId, template.documentKind).map((binding) => [
            binding.key,
            binding,
        ])
    );
    const coordinates = new Set(
        listTemplateNumericCoordinates(template).map(({ coordinate }) => coordinate)
    );
    const fieldIds = new Set<string>();
    walkTemplateNodes(template.children, (node) => {
        if (isTemplateField(node)) fieldIds.add(node.id);
        if (node.type === 'table') for (const column of node.columns) fieldIds.add(column.id);
    });

    const checkCoordinates = (nodeId: string, source: string | undefined) => {
        if (!source) return;
        const parsed = parseFormula(source);
        // Unparseable formulas are authoring errors reported by the draft checks.
        if (!parsed.ok) return;
        for (const coordinate of parsed.coords) {
            if (!coordinates.has(coordinate)) {
                issues.push({ code: 'unknown-coordinate', nodeId, key: coordinate });
            }
        }
    };

    const checkFieldReferences = (field: Parameters<typeof isTemplateField>[0]) => {
        if (!isTemplateField(field)) return;
        if (field.type === 'formula') checkCoordinates(field.id, field.formula);
        if ((field.type === 'number' || field.type === 'rating') && field.maxFrom) {
            checkCoordinates(field.id, field.maxFrom);
        }
        if (field.type !== 'select' || !field.binding) return;
        const catalog = CATALOG_BINDINGS.get(field.binding.catalogId);
        if (!catalog) {
            issues.push({
                code: 'unknown-catalog',
                nodeId: field.id,
                key: field.binding.catalogId,
            });
            return;
        }
        const details = new Set(catalog.fillableDetails.map(({ key }) => key));
        for (const [detailKey, rule] of Object.entries(field.binding.fills)) {
            if (!details.has(detailKey)) {
                issues.push({ code: 'unknown-fill-detail', nodeId: field.id, key: detailKey });
            }
            if (!rule.disabled && !fieldIds.has(rule.targetFieldId)) {
                issues.push({
                    code: 'unknown-fill-target',
                    nodeId: field.id,
                    key: rule.targetFieldId,
                });
            }
        }
    };

    walkTemplateNodes(template.children, (node) => {
        const labelNodes = node.type === 'table' ? [node, ...node.columns] : [node];
        for (const labelled of labelNodes) {
            const references = [
                labelled.labelMessage,
                labelled.type === 'text' ? labelled.placeholderMessage : undefined,
            ];
            for (const reference of references) {
                if (reference && !isKnownLabelMessage(reference)) {
                    issues.push({
                        code: 'unknown-label-message',
                        nodeId: labelled.id,
                        key: reference,
                    });
                }
            }
        }
        if (node.type === 'primitive') {
            if (!bindings.has(node.bindingKey)) {
                issues.push({ code: 'unknown-binding', nodeId: node.id, key: node.bindingKey });
            }
            checkCoordinates(node.id, node.maxFrom);
            checkCoordinates(node.id, node.minFrom);
        } else if (node.type === 'list' && node.bindingKey !== undefined) {
            const binding = bindings.get(node.bindingKey);
            if (!binding) {
                issues.push({ code: 'unknown-binding', nodeId: node.id, key: node.bindingKey });
            } else if (binding.kind !== 'list') {
                issues.push({
                    code: 'binding-kind-mismatch',
                    nodeId: node.id,
                    key: node.bindingKey,
                    expected: 'list',
                });
            }
        } else if (node.type === 'table') {
            for (const column of node.columns) checkFieldReferences(column);
        } else {
            checkFieldReferences(node);
        }
    });
    return issues;
}
