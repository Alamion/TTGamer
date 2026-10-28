import { systemRegistry } from '@site/src/sheet_manager/systems';
import {
    isContainerNode,
    type TemplateNode,
    walkTemplateNodes,
} from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

/**
 * The maintainer's composition rule for shipped pages (spec 041, FR-013; the `sheet-templates`
 * skill, "Composition of shipped pages"): a full page is sections of at least five fields made of
 * cards of at least three, with no loose field in a section; a brief holds only brief blocks and
 * fields. A growing element (a list, a table, built-in rows, equipment, a track, a multiline
 * text, a markdown text, a multiple reference, a tracker) counts as a card's worth on its own.
 */

/** The shared portrait card is one picture by design. */
const SMALL_CARDS = new Set(['portrait', 'base-portrait']);

function growing(node: TemplateNode): boolean {
    switch (node.type) {
        case 'list':
        case 'table':
        case 'tracker':
        case 'markdown':
            return true;
        case 'text':
            return node.multiline;
        case 'reference':
            return node.multiple;
        case 'primitive':
            return /^(list|rows|equipment|track):/.test(node.bindingKey);
        default:
            return false;
    }
}

function weight(node: TemplateNode): number {
    if (isContainerNode(node)) return node.children.reduce((sum, child) => sum + weight(child), 0);
    return growing(node) ? 3 : 1;
}

/**
 * A document page, not a sheet (spec 043): one markdown text with at most a one-line name field
 * beside it and a "Mentioned in" list below it (spec 044). The rule groups a sheet's fields; such a page has none to group.
 */
function isDocumentPage(children: readonly TemplateNode[]): boolean {
    const markdown = children.filter((node) => node.type === 'markdown');
    const mentions = children.filter((node) => node.type === 'mentions');
    const rest = children.filter((node) => node.type !== 'markdown' && node.type !== 'mentions');
    return (
        markdown.length === 1 &&
        mentions.length <= 1 &&
        rest.length <= 1 &&
        rest.every((node) => node.type === 'text' && !node.multiline)
    );
}

function fullPageProblems(children: readonly TemplateNode[]): string[] {
    if (isDocumentPage(children)) return [];
    const problems: string[] = [];
    for (const section of children) {
        if (section.type !== 'section') {
            problems.push(`top ${section.type} ${section.id}`);
            continue;
        }
        if (weight(section) < 5) problems.push(`section ${section.id}=${weight(section)}`);
        for (const child of section.children) {
            if (child.type !== 'group') {
                problems.push(`loose ${child.type} ${child.id} in ${section.id}`);
            } else if (weight(child) < 3 && !SMALL_CARDS.has(child.id)) {
                problems.push(`card ${child.id}=${weight(child)}`);
            }
        }
    }
    return problems;
}

const shipped = systemRegistry.getSystems().flatMap((system) => system.defaultTemplates ?? []);

describe('shipped pages follow the composition rule', () => {
    for (const template of shipped) {
        it(`${template.id}`, () => {
            if (template.pageKind === 'brief') {
                const containers: string[] = [];
                walkTemplateNodes(template.children, (node) => {
                    if (isContainerNode(node) && node.type !== 'brief') containers.push(node.id);
                });
                expect(containers).toEqual([]);
                return;
            }
            expect(fullPageProblems(template.children)).toEqual([]);
        });
    }
});
