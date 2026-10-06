import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { systemRegistry } from '../../../systems';
import { resolveDataBindingByCoordinate } from '../../../systems/templateBindings';
import type { TemplateField } from '../../../types/template';
import {
    collectFormulaDependencies,
    collectTreeIssues,
    isTemplateField,
    listItemField,
    TEMPLATE_LIMITS,
    walkTemplateNodes,
} from '../../../types/template';
import { checkFormulaInput } from '../../sheet/data/formulaCheck';
import { referenceKindName } from '../../sheet/data/referenceScope';
import {
    type CoordinateSetting,
    type TemplateReferenceIssue,
    validateTemplateReferences,
} from '../../sheet/data/templateReferences';
import {
    detectDependencyCycles,
    type FormulaDependencyEntry,
} from '../../sheet/declarative/formula';
import { findNode } from '../model/tree';
import { type EditorDraft } from '../model/types';
import { formulaCheckMessage } from '../settings/formulaMessage';
import type { SettingRef, SettingsGroupId } from '../settings/groupedSettings';

export interface DraftIssue {
    message: string;
    /** The element the issue belongs to, so the editor can mark and select it. */
    nodeId?: string;
    /** The setting to open and focus (spec 022, R3); table columns and list entries included. */
    setting?: SettingRef;
}

export interface DraftIssueMessages {
    emptyName: string;
    emptyLabel: string;
    duplicateId: string;
    invalidKey: string;
    limitReached: string;
    invalidBounds: string;
    unknownCoordinate: string;
    circularDependency: string;
    unknownBinding: string;
    unknownCatalog: string;
    unknownFillTarget: string;
    listCatalogUnnamed: string;
    unknownLabelMessage: string;
    invalidDocsLink: string;
    referenceTargetUnavailable: string;
    trackerLengthEmpty: string;
    trackerCovers: string;
}

export const at = (group: SettingsGroupId, key: string): SettingRef => ({ group, key });

const COORDINATE_SETTING: Record<CoordinateSetting, SettingRef> = {
    formula: at('limits', 'formula'),
    maxFrom: at('limits', 'maxFrom'),
    minFrom: at('limits', 'minFrom'),
    maxMinFrom: at('limits', 'maxMinFrom'),
    visibleWhen: at('visibility', 'visibleWhen'),
};

/** The message and setting of a reference problem (the element is named by the caller). */
function referenceIssue(
    issue: TemplateReferenceIssue,
    messages: DraftIssueMessages
): { message: string; setting?: SettingRef; formula?: true } {
    switch (issue.code) {
        case 'unknown-binding':
        case 'binding-kind-mismatch':
            return {
                message: interpolate(messages.unknownBinding, { id: issue.key }),
                setting: at('value', 'source'),
            };
        case 'unknown-catalog':
        case 'unknown-fill-detail':
            return {
                message: interpolate(messages.unknownCatalog, { id: issue.key }),
                setting: at('value', 'catalog'),
            };
        case 'unknown-fill-target':
            return {
                message: interpolate(messages.unknownFillTarget, { id: issue.key }),
                setting: at('value', 'catalog'),
            };
        case 'list-catalog-unnamed':
            return { message: messages.listCatalogUnnamed, setting: at('value', 'catalog') };
        case 'unknown-coordinate':
            return issue.setting === 'visibleWhen'
                ? {
                      message: interpolate(messages.unknownCoordinate, { id: issue.key }),
                      setting: COORDINATE_SETTING.visibleWhen,
                  }
                : {
                      message: formulaCheckMessage({
                          kind: 'error',
                          code: 'unknown',
                          name: issue.key,
                      })!.text,
                      setting: COORDINATE_SETTING[issue.setting],
                      formula: true,
                  };
        case 'unknown-label-message':
            return {
                message: interpolate(messages.unknownLabelMessage, { id: issue.key }),
                setting: at('content', 'label'),
            };
        case 'invalid-docs-link':
            return {
                message: interpolate(messages.invalidDocsLink, { id: issue.key }),
                setting: at('visibility', 'docsPath'),
            };
        case 'reference-target-unavailable':
            return {
                message: interpolate(messages.referenceTargetUnavailable, {
                    field: issue.label,
                    type: referenceKindName(systemRegistry, issue.key),
                }),
                setting: at('value', 'targetKinds'),
            };
    }
}

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const MAX_KEY_LENGTH = 64;

function isValidKey(key: string): boolean {
    return key.length > 0 && key.length <= MAX_KEY_LENGTH && IDENTIFIER_PATTERN.test(key);
}

function interpolate(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

/** The name an issue uses for an element (what the outline shows, or its id). */
function issueName(node: { id: string; label?: string; title?: string; bindingKey?: string }) {
    return node.label || node.title || node.bindingKey || node.id;
}

const inElement = (element: string, problem: string) =>
    translate(uiMessages.sheet.templates.editor.issueIn, { element, problem });

/** A formula setting that does not parse, worded as under its box. */
function formulaSyntaxProblem(source: string | undefined): string | undefined {
    const check = checkFormulaInput(source);
    return check.kind === 'error' ? formulaCheckMessage(check)?.text : undefined;
}

/**
 * The checks of one field's own settings, shared by page fields, table columns, and list entry
 * fields (spec 022, R4): label, options, bounds, formulas, pool tracker length, tracker names.
 * `report` receives the problem and the setting inside the field.
 */
function checkFieldSettings(
    field: TemplateField,
    messages: DraftIssueMessages,
    /** `named`: the message already names the element (or needs no name, like empty labels). */
    report: (problem: string, setting: SettingRef, named?: true) => void
): void {
    const text = uiMessages.sheet.templates.editor;
    if (field.label.trim().length === 0) report(messages.emptyLabel, at('content', 'label'), true);
    if (field.type === 'formula') {
        if (field.formula.trim().length === 0) {
            report(translate(text.issueFormulaEmpty), at('limits', 'formula'));
        } else {
            const problem = formulaSyntaxProblem(field.formula);
            if (problem) report(problem, at('limits', 'formula'));
        }
    }
    if (field.type === 'rating' || field.type === 'number') {
        const problem = formulaSyntaxProblem(field.maxFrom);
        if (problem) report(problem, at('limits', 'maxFrom'));
    }
    if (field.type === 'select') {
        const seenOptions = new Set<string>();
        field.options.forEach((option, index) => {
            if (seenOptions.has(option.id)) {
                report(
                    interpolate(messages.duplicateId, { id: option.id }),
                    at('content', `option:${index}`)
                );
            }
            seenOptions.add(option.id);
            if (option.label.trim().length === 0) {
                report(translate(text.issueOptionEmpty), at('content', `option:${index}`));
            }
        });
    }
    if (field.type === 'number' || field.type === 'rating' || field.type === 'resource') {
        if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
            report(messages.invalidBounds, at('limits', 'min'));
        }
    }
    if (
        field.type === 'resource' &&
        field.poolTracker &&
        field.max > TEMPLATE_LIMITS.trackerLevelsMax
    ) {
        report(
            translate(text.issuePoolTooLong, { max: TEMPLATE_LIMITS.trackerLevelsMax }),
            at('limits', 'max')
        );
    }
    if (field.type === 'tracker') {
        const tracker = at('look', 'tracker');
        if ([...field.marks, ...field.levels].some(({ name }) => name.trim().length === 0)) {
            report(translate(text.issueTrackerNameEmpty), tracker);
        }
        const levelIds = new Set(field.levels.map(({ id }) => id));
        field.lengths.forEach((length, index) => {
            if (!length.levels.some((id) => levelIds.has(id))) {
                report(
                    interpolate(messages.trackerLengthEmpty, { id: field.label, n: index + 1 }),
                    tracker,
                    true
                );
            }
        });
        if (
            field.columns.some(
                ({ covers }) => covers !== undefined && covers >= field.levels.length
            )
        ) {
            report(interpolate(messages.trackerCovers, { id: field.label }), tracker, true);
        }
    }
}

/**
 * Live draft integrity feedback. Structural identifiers are generated, but the checks stay
 * defensive (imports/edits could introduce collisions) alongside limits, bounds, and formula
 * validation (parse errors, unknown coordinates, cycles — FR-14). Each issue names its element
 * and, where one exists, the setting that fixes it (spec 022).
 */
export function collectDraftIssues(draft: EditorDraft, messages: DraftIssueMessages): DraftIssue[] {
    const issues: DraftIssue[] = [];
    if (draft.name.trim().length === 0) {
        issues.push({ message: messages.emptyName });
    }

    for (const issue of collectTreeIssues(draft)) {
        if (issue.code === 'depth') {
            issues.push({
                message: interpolate(messages.limitReached, {
                    limit: issue.limit ?? 0,
                    subject: 'nesting levels',
                }),
            });
        } else if (issue.code === 'count') {
            issues.push({
                message: interpolate(messages.limitReached, {
                    limit: issue.limit ?? 0,
                    subject: 'elements',
                }),
            });
        } else {
            issues.push({
                message: interpolate(messages.duplicateId, { id: issue.nodeId ?? '' }),
                nodeId: issue.nodeId,
            });
        }
    }

    const names = new Map<string, string>();
    const seenEffectiveKeys = new Set<string>();
    const checkEffectiveKey = (key: string, nodeId: string, setting: SettingRef) => {
        if (!isValidKey(key)) {
            issues.push({
                message: interpolate(messages.invalidKey, { id: key }),
                nodeId,
                setting,
            });
            return;
        }
        // Two elements showing the same system datum (a copied trait row) are two views of
        // one value, not a collision.
        const bridged = resolveDataBindingByCoordinate(draft.systemId, draft.documentKind, key);
        if (seenEffectiveKeys.has(key) && !bridged) {
            issues.push({
                message: interpolate(messages.duplicateId, { id: key }),
                nodeId,
                setting,
            });
        }
        seenEffectiveKeys.add(key);
    };

    const seenNodeIds = new Set<string>();
    walkTemplateNodes(draft.children, (node) => {
        if (seenNodeIds.has(node.id)) return;
        seenNodeIds.add(node.id);
        const name = issueName(node);
        names.set(node.id, name);
        const issue = (message: string, setting?: SettingRef) =>
            issues.push({ message, nodeId: node.id, ...(setting ? { setting } : {}) });
        const formulaIssue = (source: string | undefined, setting: SettingRef) => {
            const problem = formulaSyntaxProblem(source);
            if (problem) issue(inElement(name, problem), setting);
        };
        if (node.type === 'section' || node.type === 'group') {
            if (node.title.trim().length === 0) issue(messages.emptyLabel, at('content', 'title'));
        }
        if ((node.type === 'table' || node.type === 'list') && node.title?.trim() === '') {
            issue(messages.emptyLabel, at('content', 'title'));
        }
        if (node.type === 'table') {
            checkEffectiveKey(node.valueKey ?? node.id, node.id, at('value', 'valueKey'));
            if (node.minRows > node.maxRows) issue(messages.invalidBounds, at('limits', 'minRows'));
            node.columns.forEach((column, index) => {
                const columnName = column.label.trim() || `#${index + 1}`;
                checkFieldSettings(column, messages, (problem, setting) =>
                    issue(
                        translate(uiMessages.sheet.templates.editor.issueColumn, {
                            table: name,
                            column: columnName,
                            problem,
                        }),
                        at('content', `column:${column.id}.${setting.key}`)
                    )
                );
            });
        }
        if (isTemplateField(node)) {
            checkEffectiveKey(node.valueKey ?? node.id, node.id, at('value', 'valueKey'));
            checkFieldSettings(node, messages, (problem, setting, named) =>
                issue(named ? problem : inElement(name, problem), setting)
            );
        }
        if (node.type === 'primitive') {
            formulaIssue(node.minFrom, at('limits', 'minFrom'));
            formulaIssue(node.maxMinFrom, at('limits', 'maxMinFrom'));
            formulaIssue(node.maxFrom, at('limits', 'maxFrom'));
        }
        if (node.type === 'list') {
            if ((node.valueKey === undefined) === (node.bindingKey === undefined)) {
                issue(
                    inElement(name, translate(uiMessages.sheet.templates.editor.issueListSource)),
                    at('value', 'source')
                );
            }
            if (node.valueKey !== undefined) {
                checkEffectiveKey(node.valueKey, node.id, at('value', 'valueKey'));
                const item = listItemField(node);
                checkFieldSettings(item, messages, (problem, setting) =>
                    issue(
                        setting.key === 'label'
                            ? translate(uiMessages.sheet.templates.editor.issueEntryLabel, {
                                  list: name,
                              })
                            : inElement(name, problem),
                        at('content', `entry.${setting.key}`)
                    )
                );
            }
            (node.presets ?? []).forEach((preset, index) => {
                if (preset.label.trim().length === 0) {
                    issue(
                        inElement(
                            name,
                            translate(uiMessages.sheet.templates.editor.issuePresetEmpty)
                        ),
                        at('content', `preset:${index}`)
                    );
                }
            });
        }
        // A built-in tracker's extra columns keep their values under their own key.
        if (node.type === 'primitive' && (node.tracker?.columns ?? []).length > 0) {
            checkEffectiveKey(node.tracker?.valueKey ?? node.id, node.id, at('look', 'tracker'));
        }
    });

    // Cycle detection across formula writers (FR-14; defense in depth at render separately).
    const dependencies: FormulaDependencyEntry[] = collectFormulaDependencies(draft).map(
        (source) => ({ id: source.id, writes: source.writes, reads: source.reads })
    );
    for (const cycle of detectDependencyCycles(dependencies)) {
        issues.push({
            message: interpolate(messages.circularDependency, { id: cycle.join(' → ') }),
            nodeId: cycle[0],
        });
    }
    for (const reference of validateTemplateReferences(draft)) {
        const { message, setting, formula } = referenceIssue(reference, messages);
        const element = names.get(reference.nodeId);
        issues.push({
            message: formula && element ? inElement(element, message) : message,
            nodeId: reference.nodeId,
            ...(setting ? { setting } : {}),
        });
    }
    return issues.map((issue) => ownedByContainer(draft, issue));
}

/**
 * Table columns and list entry fields are not tree nodes: their issues select the table or list
 * and point at the column's or entry's setting inside its Content group (spec 022, R3).
 */
function ownedByContainer(draft: EditorDraft, issue: DraftIssue): DraftIssue {
    if (!issue.nodeId || findNode(draft, issue.nodeId)) return issue;
    let owner: { nodeId: string; prefix: string } | undefined;
    walkTemplateNodes(draft.children, (node) => {
        if (owner) return;
        if (node.type === 'table' && node.columns.some(({ id }) => id === issue.nodeId)) {
            owner = { nodeId: node.id, prefix: `column:${issue.nodeId}.` };
        }
        if (node.type === 'list' && node.item?.id === issue.nodeId) {
            owner = { nodeId: node.id, prefix: 'entry.' };
        }
    });
    if (!owner) return issue;
    return {
        ...issue,
        nodeId: owner.nodeId,
        setting: at('content', `${owner.prefix}${issue.setting?.key ?? 'label'}`),
    };
}
