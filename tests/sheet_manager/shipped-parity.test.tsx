// @vitest-environment happy-dom
import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    collectTemplateNodes,
    type CustomTemplate,
    type TemplateNode,
} from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { openSettingsGroups, renderEditor, resetEditorStores } from './helpers/editor';
import { outlineRow } from './helpers/templateEditor';

/**
 * Constitution VI, template-editor parity (spec 038, SC-003): every property a shipped template
 * gives an element is a setting the editor shows for it, so an author can rebuild any shipped
 * mechanic. Keys that name or store an element, or that the editor sets by other means, are listed
 * with the reason.
 */

vi.setConfig({ testTimeout: 120_000 });

const NOT_SETTINGS: Readonly<Record<string, string>> = {
    id: 'the element itself',
    type: 'chosen by the element kind or the field type',
    children: 'the elements inside, edited in the outline',
    labelMessage: 'the translation of a shipped label; editing the label replaces it',
    termRef: 'the book term a renamed label still stands for',
    termHint: 'set together with the term reference',
    required: 'a default the field type stores',
    column: 'set by dragging the element into a column',
    multiline: 'shown for text fields only',
    successMessage: 'the translation of a shipped button text',
    failureMessage: 'the translation of a shipped button text',
    placeholderMessage: 'the translation of a shipped placeholder',
    textMessages: 'the translations of a shipped formula’s texts',
    options: 'listed with the choice’s options',
    item: 'edited as the list’s entry',
    named: 'edited with the list’s entry',
    valueKey: 'shown as the shared value key of custom values only',
    bindingKey: 'shown as the source',
    collapsible: 'shown with the group',
    labelPosition: 'a default of the field type',
};

/** Properties edited by a control of another name. */
const SHOWN_AS: Readonly<Record<string, string>> = {
    poolTracker: 'tracker',
    binding: 'catalog',
    columnWidths: 'columns',
    track: 'tracker',
    trackLayout: 'tracker',
};

/** Properties a panel rightly leaves out for this element (they do not apply to it). */
function notApplicable(node: TemplateNode, key: string): boolean {
    // The game decides a trait's bounds and look.
    if (node.type === 'rating' && ['min', 'max', 'presentation'].includes(key)) {
        return systemRegistry
            .getSystems()
            .some((system) =>
                (system.templateBindings ?? []).some(
                    (binding) =>
                        binding.kind === 'trait' &&
                        binding.coordinate === (node.valueKey ?? node.id)
                )
            );
    }
    // A hidden title has no help link to show.
    if ((node.type === 'group' || node.type === 'brief') && key === 'docsPath') {
        return node.hideTitle === true;
    }
    // A table's columns are edited one by one.
    return node.type === 'table' && key === 'columns';
}

/** The setting keys an element's panel shows, without row, entry, or column prefixes. */
function shownSettings(nodeId: string): Set<string> {
    const panel = document.querySelector(`[data-settings-for="${nodeId}"]`)!;
    return new Set(
        [...panel.querySelectorAll<HTMLElement>('[data-setting]')].map(
            (control) =>
                control.dataset
                    .setting!.replace(/^(entry\.|column:[^.]+\.|rowButton:[^.]+\.)/, '')
                    .split(/[:.]/)[0]!
        )
    );
}

/** One element per distinct set of properties, from every shipped template of every system. */
function representatives(): CustomTemplate[] {
    const pages = new Map<string, CustomTemplate>();
    const seen = new Set<string>();
    for (const system of systemRegistry.getSystems()) {
        for (const template of system.defaultTemplates ?? []) {
            for (const node of collectTemplateNodes(template)) {
                const binding =
                    node.type === 'primitive' ? node.bindingKey.split(':')[0] : undefined;
                const signature = [node.type, binding, ...Object.keys(node).sort()].join('|');
                if (seen.has(signature)) continue;
                seen.add(signature);
                // Elements of a brief sit on a brief: their settings follow the page (spec 041).
                const brief = template.pageKind === 'brief';
                const target = `${template.systemId}|${template.documentKind}|${brief}`;
                const page =
                    pages.get(target) ??
                    ({
                        ...template,
                        id: `parity-${pages.size}`,
                        children: [
                            {
                                id: 'parity-columns',
                                type: brief ? 'brief' : 'section',
                                title: 'Parity',
                                columns: 2,
                                ...(brief ? { collapsible: false } : {}),
                                children: [],
                            },
                        ],
                    } as CustomTemplate);
                pages.set(target, page);
                // Unpinned, so the column span setting shows.
                const { column: _column, ...unpinned } = node as TemplateNode & { column?: number };
                void _column;
                const copy = 'children' in unpinned ? { ...unpinned, children: [] } : unpinned;
                const placed = {
                    ...copy,
                    id: `p${seen.size}-${node.id}`.slice(0, 64),
                } as TemplateNode;
                // A block holds no container: blocks stand on the page itself.
                if (placed.type === 'brief') page.children.push(placed);
                else (page.children[0] as { children: TemplateNode[] }).children.push(placed);
            }
        }
    }
    return [...pages.values()];
}

describe('shipped templates use only what the editor can set (spec 038, SC-003)', () => {
    beforeEach(resetEditorStores);
    afterEach(() => {
        cleanup();
        takeSheetIssues();
    });

    it('shows a setting for every property of every shipped element', () => {
        const missing = new Set<string>();
        for (const page of representatives()) {
            renderEditor(page);
            const [holder, ...blocks] = page.children as Array<{ children: TemplateNode[] }>;
            for (const node of [...holder!.children, ...(blocks as TemplateNode[])]) {
                fireEvent.click(
                    [...outlineRow(node.id).querySelectorAll('button')].find(
                        (button) => !button.hasAttribute('data-drag-handle')
                    )!
                );
                openSettingsGroups();
                const shown = shownSettings(node.id);
                for (const key of Object.keys(node)) {
                    if (key in NOT_SETTINGS || shown.has(SHOWN_AS[key] ?? key)) continue;
                    if (notApplicable(node, key)) continue;
                    missing.add(
                        `${node.type}${node.type === 'primitive' ? `(${(node as { bindingKey: string }).bindingKey})` : ''}: ${key}`
                    );
                }
            }
            cleanup();
        }
        expect([...missing].sort()).toEqual([]);
    });
});
