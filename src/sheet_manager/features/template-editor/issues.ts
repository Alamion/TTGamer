import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useEffect, useState } from 'react';
import type { ZodIssue } from 'zod';

import { reportSheetIssue } from '../../diagnostics';
import { CustomTemplateSchema, type TemplateNode } from '../../types/template';
import type { DraftIssue, EditorDraft } from './draft';
import type { SettingRef, SettingsGroupId } from './settings/groupedSettings';

const editor = uiMessages.sheet.templates.editor;
const primitives = uiMessages.sheet.templates.primitives;

export interface IssueLocation {
    nodeId?: string;
    setting?: SettingRef;
}

/** The group each setting key lives in; unlisted keys are in Look. */
const GROUP_KEYS: Partial<Record<SettingsGroupId, readonly string[]>> = {
    content: [
        'label',
        'title',
        'description',
        'placeholder',
        'options',
        'type',
        'named',
        'item',
        'hideLabel',
        'labelPosition',
    ],
    value: [
        'valueKey',
        'bindingKey',
        'source',
        'binding',
        'catalog',
        'targetKinds',
        'multiple',
        'part',
    ],
    limits: [
        'min',
        'max',
        'step',
        'minRows',
        'maxRows',
        'formula',
        'maxFrom',
        'minFrom',
        'maxMinFrom',
    ],
    visibility: [
        'required',
        'termHint',
        'visibleWhen',
        'docsPath',
        'collapsible',
        'defaultCollapsed',
    ],
};

const KEY_GROUPS = new Map(
    Object.entries(GROUP_KEYS).flatMap(([group, keys]) =>
        keys.map((key) => [key, group as SettingsGroupId] as const)
    )
);

/** The settings whose names the backstop message uses; others read "A setting". */
const SETTING_NAMES: Record<string, { message: string }> = {
    label: editor.label,
    title: editor.title,
    description: editor.helpText,
    placeholder: editor.placeholderText,
    valueKey: editor.valueKey,
    formula: editor.formula,
    maxFrom: editor.maxFromShort,
    minFrom: editor.minFromShort,
    maxMinFrom: editor.maxAtLeast,
    docsPath: editor.docsLink,
    visibleWhen: editor.visibleWhen,
    option: editor.optionLabel,
    options: editor.options,
    preset: primitives.presetLabel,
    min: editor.numberMin,
    max: editor.numberMax,
    minRows: editor.minRows,
    maxRows: editor.maxRows,
    columns: editor.columns,
    columnWidths: editor.columns,
    name: editor.name,
};

/** Arrays inside a node whose items are settings rows, keyed `<row>:<index>`. */
const ROW_KEYS: Record<string, string> = { options: 'option', presets: 'preset' };
/** Arrays a tracker edits in one block (spec 018). */
const TRACKER_KEYS = new Set(['marks', 'levels', 'lengths', 'valueColumn', 'tracker', 'track']);

function settingKey(segments: readonly (string | number)[]): string | undefined {
    const [first, second] = segments;
    if (typeof first !== 'string') return undefined;
    if (ROW_KEYS[first] && typeof second === 'number') return `${ROW_KEYS[first]}:${second}`;
    if (TRACKER_KEYS.has(first)) return 'tracker';
    if (first === 'poolTracker') return 'tracker';
    return first;
}

/**
 * Where a schema path points in the draft (spec 022, R4): the nearest tree node, and the setting
 * inside it. Table columns and the list entry field belong to their table or list. `{}` when
 * the path leads to no node.
 */
export function issueLocation(
    draft: EditorDraft,
    path: readonly (string | number)[]
): IssueLocation {
    let children: readonly TemplateNode[] | undefined = draft.children;
    let node: TemplateNode | undefined;
    let index = 0;
    while (index < path.length && children) {
        const segment = path[index];
        const position = path[index + 1];
        if (segment !== 'children' || typeof position !== 'number' || !children[position]) break;
        node = children[position];
        children = 'children' in node ? node.children : undefined;
        index += 2;
    }
    if (!node) {
        const key = settingKey(path);
        return key === 'name' ? { setting: { group: 'content', key } } : {};
    }
    const rest = path.slice(index);
    if (node.type === 'table' && rest[0] === 'columns' && typeof rest[1] === 'number') {
        const column = node.columns[rest[1]];
        if (column) {
            const key = settingKey(rest.slice(2)) ?? 'label';
            return {
                nodeId: node.id,
                setting: { group: 'content', key: `column:${column.id}.${key}` },
            };
        }
    }
    if (node.type === 'list' && rest[0] === 'item') {
        const key = settingKey(rest.slice(1)) ?? 'label';
        return { nodeId: node.id, setting: { group: 'content', key: `entry.${key}` } };
    }
    const key = settingKey(rest);
    if (!key) return { nodeId: node.id };
    const group = KEY_GROUPS.get(key.split(':')[0]!) ?? (key.includes(':') ? 'content' : 'look');
    return { nodeId: node.id, setting: { group, key } };
}

function nodeName(draft: EditorDraft, nodeId: string): string | undefined {
    let found: string | undefined;
    const visit = (nodes: readonly TemplateNode[]) => {
        for (const node of nodes) {
            if (found !== undefined) return;
            if (node.id === nodeId) {
                const named = node as { label?: string; title?: string; bindingKey?: string };
                found = named.label || named.title || named.bindingKey || node.id;
                return;
            }
            if ('children' in node) visit(node.children);
        }
    };
    visit(draft.children);
    return found;
}

/** The setting's name in a message: the last key part, translated where known. */
function settingName(key: string | undefined): string {
    const last = key?.split('.').at(-1)?.split(':')[0];
    const name = last ? SETTING_NAMES[last] : undefined;
    return translate(name ?? editor.issueSomething);
}

function covered(location: IssueLocation, known: readonly DraftIssue[]): boolean {
    if (!location.nodeId) {
        // Name, depth, count, and duplicate id problems are checked without an element.
        return known.some(({ nodeId }) => nodeId === undefined);
    }
    return known.some(
        ({ nodeId, setting }) =>
            nodeId === location.nodeId &&
            (!setting || !location.setting || setting.key === location.setting.key)
    );
}

interface Uncovered {
    issue: ZodIssue;
    location: IssueLocation;
}

function uncoveredIssues(draft: EditorDraft, known: readonly DraftIssue[]): Uncovered[] {
    const result = CustomTemplateSchema.safeParse(draft);
    if (result.success) return [];
    const seen = new Set<string>();
    return result.error.issues
        .map((issue) => ({ issue, location: issueLocation(draft, issue.path) }))
        .filter(({ location }) => {
            if (covered(location, known)) return false;
            const signature = `${location.nodeId ?? ''}|${location.setting?.key ?? ''}`;
            if (seen.has(signature)) return false;
            seen.add(signature);
            return true;
        });
}

/** The message of a mapped schema problem: never raw schema text (spec 022, FR-019). */
export function describeLocation(draft: EditorDraft, location: IssueLocation): DraftIssue {
    const problem = translate(editor.issueNotAllowed, {
        setting: settingName(location.setting?.key),
    });
    const element = location.nodeId ? nodeName(draft, location.nodeId) : undefined;
    return {
        message: element ? translate(editor.issueIn, { element, problem }) : problem,
        ...(location.nodeId ? { nodeId: location.nodeId } : {}),
        ...(location.setting ? { setting: location.setting } : {}),
    };
}

/**
 * The schema backstop (spec 022, R4): every rule the specific checks (`known`) do not cover,
 * mapped to its element and setting in plain words. Nothing is reported here; a save does that.
 */
export function schemaIssues(draft: EditorDraft, known: readonly DraftIssue[]): DraftIssue[] {
    return uncoveredIssues(draft, known).map(({ location }) => describeLocation(draft, location));
}

/**
 * Reports each schema rule a save found uncovered, once, for developers (constitution III): it
 * marks a check the editor is missing. Called only when a save is refused.
 */
export function reportUncoveredIssues(draft: EditorDraft, known: readonly DraftIssue[]): void {
    for (const { issue, location } of uncoveredIssues(draft, known)) {
        reportSheetIssue({
            code: 'template-draft-invalid',
            message: `A template rule has no editor check: ${issue.message}`,
            details: {
                path: issue.path.join('.'),
                code: issue.code,
                nodeId: location.nodeId,
                setting: location.setting?.key,
            },
        });
    }
}

/** How long typing pauses before the backstop parses the draft again. */
const BACKSTOP_DELAY_MS = 300;

/**
 * The schema backstop for the editor: parsed when the dialog opens, then after typing pauses, so
 * a keystroke never pays for a full schema parse (about 20 ms on the largest shipped sheet).
 */
export function useSchemaBackstop(
    draft: EditorDraft,
    known: readonly DraftIssue[]
): readonly DraftIssue[] {
    const [checked, setChecked] = useState(() => ({
        draft,
        issues: schemaIssues(draft, known),
    }));
    useEffect(() => {
        if (checked.draft === draft) return;
        const timer = setTimeout(
            () => setChecked({ draft, issues: schemaIssues(draft, known) }),
            BACKSTOP_DELAY_MS
        );
        return () => clearTimeout(timer);
    }, [checked.draft, draft, known]);
    return checked.issues;
}
