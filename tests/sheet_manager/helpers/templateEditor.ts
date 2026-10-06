import {
    createEmptyDraft,
    insertNode,
} from '@site/src/sheet_manager/features/template-editor/draft';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { fireEvent } from '@testing-library/react';

import { openSettingsGroups } from './editor';

export const ISSUE_MESSAGES = {
    emptyName: 'Template name is required.',
    emptyLabel: 'Every section and field needs a non-empty label.',
    duplicateId: 'Duplicate identifier "{id}".',
    invalidKey: 'Invalid key "{id}" — use lowercase letters, digits, and dashes.',
    limitReached: 'Limit reached — {limit} {subject} maximum.',
    invalidBounds: 'Minimum cannot exceed maximum.',
    unknownCoordinate: 'Unknown value "{id}".',
    circularDependency: 'Circular dependency: {id}',
    unknownBinding: 'Unknown binding "{id}".',
    unknownCatalog: 'Unknown catalog "{id}".',
    unknownFillTarget: 'Missing fill target "{id}".',
    listCatalogUnnamed: 'Suggestions need entry names.',
    unknownLabelMessage: 'Unknown translation "{id}".',
    invalidDocsLink: 'Invalid docs link "{id}".',
    referenceTargetUnavailable: '"{field}" can point to {type}, which this setting does not have.',
    trackerLengthEmpty: 'Tracker "{id}": length {n} shows no level.',
    trackerCovers: 'Tracker "{id}": a column covers all its levels or more.',
};

/** Asserts success so subsequent `.draft` accesses typecheck. */
export function insert(
    draft: ReturnType<typeof createEmptyDraft>,
    parentId: string | null,
    index: number,
    node: TemplateNode
) {
    const result = insertNode(draft, parentId, index, node);
    if (!result.ok) throw new Error(`insert failed: ${result.error}`);
    return result.draft;
}

export function outlineRow(nodeId: string): HTMLElement {
    return document.querySelector(`[data-outline-row="${nodeId}"]`) as HTMLElement;
}

/** Clicks the element's name in the outline (the keyboard-reachable way to select it). */
export function selectInOutline(nodeId: string): void {
    const row = outlineRow(nodeId);
    const name = [...row.querySelectorAll('button')].find(
        (button) => !button.hasAttribute('data-drag-handle')
    )!;
    fireEvent.click(name);
    openSettingsGroups();
}

export function settings(nodeId: string): HTMLElement {
    return document.querySelector(`[data-settings-for="${nodeId}"]`) as HTMLElement;
}

export function pageFrame(nodeId: string): HTMLElement {
    return document.querySelector(`[data-editor-frame][data-node-id="${nodeId}"]`) as HTMLElement;
}

export function outlineChildIds(parentId: string): string[] {
    return [
        ...document.querySelectorAll(`[data-children-of="${parentId}"] > li > [data-outline-row]`),
    ].map((element) => element.getAttribute('data-outline-row')!);
}

export function savedTemplate() {
    return CustomTemplateSchema.parse({
        id: 'tpl-existing',
        name: 'Existing Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'identity',
                type: 'section',
                title: 'Identity',
                children: [
                    {
                        id: 'origin',
                        type: 'text',
                        label: 'Origin',
                        required: false,
                        compact: false,
                        multiline: false,
                    },
                ],
            },
        ],
    });
}
