import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { parseDocsLink } from '@site/src/shared/utils/docsLink';
import { elementHelpFor } from '@site/src/sheet_manager/features/sheet/declarative/elementHelp';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import {
    CustomTemplateSchema,
    isTemplateField,
    walkTemplateNodes,
} from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const LOCALES = {
    en: path.join(ROOT, 'docs'),
    ru: path.join(ROOT, 'i18n/ru/docusaurus-plugin-content-docs/current'),
};
const RULES_ROOTS: Readonly<Record<string, string>> = {
    'star-wars-wod': '/docs/star-wars-wod-2e',
    'wod-2e': '/docs/wod-2e',
    'wod-v5': '/docs/wod-v5',
};

interface ReviewRow {
    target: string | undefined;
    viaType: boolean;
}

interface ShippedNode {
    node: TemplateNode;
    systemId: string;
}

function readReview(): { rows: Map<string, ReviewRow>; problems: string[] } {
    const source = readFileSync(path.join(ROOT, 'specs/047-sheet-help-links/review.md'), 'utf8');
    const rows = new Map<string, ReviewRow>();
    const problems: string[] = [];
    let targetColumn = -1;
    let reachedElementTypes = false;
    for (const line of source.split('\n')) {
        if (/^## Element types\s*$/.test(line)) {
            reachedElementTypes = true;
            break;
        }
        if (!line.startsWith('|')) continue;
        const cells = line
            .split(/(?<!\\)\|/)
            .slice(1, -1)
            .map((cell) => cell.trim());
        if (cells[0] === 'id') {
            targetColumn = cells.indexOf('link it should have');
            continue;
        }
        const id = /^`([^`]+)`$/.exec(cells[0] ?? '')?.[1];
        if (!id || id.startsWith('type:')) continue;
        const cell = cells[targetColumn] ?? '';
        const target = /^`(\/docs\/[^`]+)`(?: \(via type\))?$/.exec(cell)?.[1];
        if (!id.includes('/') || (cell !== 'none' && !target)) {
            problems.push(`${id}: invalid review id or target column ${JSON.stringify(cell)}`);
            continue;
        }
        const row = { target, viaType: cell.includes('(via type)') };
        const previous = rows.get(id);
        if (previous && (previous.target !== row.target || previous.viaType !== row.viaType)) {
            problems.push(`${id}: conflicting duplicate review decisions`);
        } else {
            rows.set(id, row);
        }
    }
    if (!reachedElementTypes) problems.push('review.md: missing Element types boundary');
    if (!rows.size) problems.push('review.md: no template rows parsed');
    return { rows, problems };
}

function shippedNodes(): Map<string, ShippedNode> {
    const nodes = new Map<string, ShippedNode>();
    for (const system of systemRegistry.getSystems()) {
        for (const template of system.defaultTemplates ?? []) {
            const ancestors: string[] = [];
            const addNode = (id: string, node: TemplateNode) => {
                if (nodes.has(id)) throw new Error(`Duplicate shipped review id: ${id}`);
                nodes.set(id, { node, systemId: template.systemId });
            };
            walkTemplateNodes(template.children, (node, depth) => {
                ancestors.length = depth - 1;
                ancestors.push(node.id);
                const id = `${template.id}/${ancestors.join('/')}`;
                addNode(id, node);
                if (node.type === 'table') {
                    for (const column of node.columns)
                        addNode(`${id}/columns/${column.id}`, column);
                }
                if (node.type === 'list' && node.item) {
                    addNode(`${id}/item/${node.item.id}`, node.item);
                }
            });
        }
    }
    return nodes;
}

function docsPathOf(node: TemplateNode): string | undefined {
    return 'docsPath' in node ? node.docsPath : undefined;
}

function duplicateProblems(nodes: ReadonlyMap<string, { node: TemplateNode }>): string[] {
    const problems: string[] = [];
    for (const [id, { node }] of nodes) {
        const target = docsPathOf(node);
        if (!target) continue;
        for (const [childId, child] of nodes) {
            if (childId.startsWith(`${id}/`) && docsPathOf(child.node) === target) {
                problems.push(`${id} and ${childId}: repeat ${target}`);
            }
        }
        if (node.type !== 'section' && node.type !== 'group' && node.type !== 'brief') continue;
        const content: TemplateNode[] = [];
        walkTemplateNodes(node.children, (child) => {
            if (!('children' in child)) content.push(child);
        });
        if (content.length !== 1) continue;
        const only = content[0]!;
        if (docsPathOf(only)) {
            problems.push(`${id}/${only.id}: sole content must use its container's link`);
        }
    }
    return problems;
}

// Keep the route and explicit-heading resolution used by docs-links-anchors.test.ts.
function pageFile(base: string, docPath: string): string | undefined {
    const segments = docPath
        .replace(/^\/docs\/?/, '')
        .replace(/\/$/, '')
        .split('/')
        .filter(Boolean);
    let dir = base;
    for (const [index, segment] of segments.entries()) {
        if (!existsSync(dir)) return undefined;
        const names = readdirSync(dir);
        const match = (name: string) =>
            name.replace(/^\d+-/, '').replace(/\.mdx?$/, '') === segment;
        const last = index === segments.length - 1;
        const file = last ? names.find((name) => /\.mdx?$/.test(name) && match(name)) : undefined;
        if (file) return path.join(dir, file);
        const folder = names.find((name) => !/\.mdx?$/.test(name) && match(name));
        if (!folder) return undefined;
        dir = path.join(dir, folder);
    }
    return ['index.mdx', 'index.md']
        .map((name) => path.join(dir, name))
        .find((file) => existsSync(file));
}

function expectNoProblems(problems: string[]): void {
    expect(problems, `${problems.length} problem(s):\n${problems.join('\n')}`).toEqual([]);
}

describe('shipped help links follow the approved spec 047 review', () => {
    const review = readReview();
    const shipped = shippedNodes();

    it('parses template decisions before Element types and merges repeated draft ids', () => {
        expectNoProblems(review.problems);
        expect(new Set([...review.rows.keys()].map((id) => id.split('/')[0]))).toEqual(
            new Set([...shipped.keys()].map((id) => id.split('/')[0]))
        );
    });

    it('matches every reviewed link and names shipped links missing from the table', () => {
        const problems: string[] = [];
        for (const [id, row] of review.rows) {
            const entry = shipped.get(id);
            if (!entry) {
                problems.push(`${id}: review row has no shipped node`);
                continue;
            }
            const { node } = entry;
            const canHaveHelp =
                isTemplateField(node) ||
                node.type === 'primitive' ||
                node.type === 'list' ||
                node.type === 'table';
            const actual = row.viaType
                ? canHaveHelp
                    ? elementHelpFor(node)
                    : undefined
                : docsPathOf(node);
            if (actual !== row.target) {
                problems.push(
                    `${id}: expected ${row.target ?? 'none'}, received ${actual ?? 'none'}`
                );
            }
        }
        for (const [id, { node }] of shipped) {
            // The approved review deliberately omits obvious, unlinked nodes (FR-009).
            if (docsPathOf(node) !== undefined && !review.rows.has(id)) {
                problems.push(`${id}: missing review row`);
            }
        }
        expectNoProblems(problems);
    });

    it('rejects repeated ancestor links and linked sole content (FR-003, FR-010)', () => {
        expectNoProblems(duplicateProblems(shipped));
    });

    it('detects duplicates below groups, through nested containers, columns, and list items', () => {
        const target = '/docs/guide/sheet#equipment';
        const field = CustomTemplateSchema.parse({
            id: 'test',
            name: 'Test',
            schemaVersion: 4,
            documentKind: 'note',
            systemId: 'general',
            children: [{ id: 'field', type: 'text', label: 'Field', docsPath: target }],
        }).children[0]!;
        const card = CustomTemplateSchema.parse({
            id: 'test',
            name: 'Test',
            schemaVersion: 4,
            documentKind: 'note',
            systemId: 'general',
            children: [
                {
                    id: 'card',
                    type: 'group',
                    title: 'Card',
                    docsPath: target,
                    children: [field, { ...field, id: 'other', docsPath: undefined }],
                },
            ],
        }).children[0]!;
        const nodes = new Map<string, { node: TemplateNode }>([
            ['page/card', { node: card }],
            ['page/card/nested/field', { node: field }],
            ['page/card/table/columns/field', { node: field }],
            ['page/card/list/item/field', { node: field }],
        ]);
        expect(duplicateProblems(nodes)).toHaveLength(3);
    });

    it('rejects a broader link on sole content but keeps distinct rules terms among fields', () => {
        for (const type of ['section', 'group', 'brief'] as const) {
            const parse = (extra: unknown[] = []) =>
                CustomTemplateSchema.parse({
                    id: 'test',
                    name: 'Test',
                    schemaVersion: 4,
                    documentKind: 'note',
                    systemId: 'general',
                    ...(type === 'brief' ? { pageKind: 'brief' } : {}),
                    children: [
                        {
                            id: 'weapons-card',
                            type,
                            title: 'Weapons',
                            docsPath: '/docs/wod-v5/rules/weapons-gear#weapons',
                            children:
                                type === 'brief'
                                    ? [
                                          {
                                              id: 'weapons',
                                              type: 'primitive',
                                              bindingKey: 'equipment:weapons',
                                              docsPath: '/docs/guide/sheet#equipment',
                                          },
                                          ...extra,
                                      ]
                                    : [
                                          {
                                              id: 'nested',
                                              type: 'group',
                                              title: 'Nested',
                                              children: [
                                                  {
                                                      id: 'weapons',
                                                      type: 'primitive',
                                                      bindingKey: 'equipment:weapons',
                                                      docsPath: '/docs/guide/sheet#equipment',
                                                  },
                                                  ...extra,
                                              ],
                                          },
                                      ],
                        },
                    ],
                }).children[0]!;
            // Brief blocks cannot nest cards; the same ownership rule applies to their direct content.
            const node = parse();
            expect(duplicateProblems(new Map([['page/weapons-card', { node }]]))).toEqual([
                "page/weapons-card/weapons: sole content must use its container's link",
            ]);
            const multiple = parse([
                { id: 'armor', type: 'text', label: 'Armor', docsPath: '/docs/guide/sheet#armor' },
            ]);
            expectNoProblems(
                duplicateProblems(new Map([['page/weapons-card', { node: multiple }]]))
            );
        }
    });

    it('keeps rules help in the page system and interaction help in the guide (FR-005)', () => {
        const problems: string[] = [];
        for (const [id, { node, systemId }] of shipped) {
            const target = docsPathOf(node);
            if (target === undefined) continue;
            const link = parseDocsLink(target);
            const page = link?.kind === 'site' ? link.path.split('#')[0]! : undefined;
            const roots = ['/docs/guide', RULES_ROOTS[systemId]].filter(
                (root): root is string => root !== undefined
            );
            if (!page || !roots.some((root) => page === root || page.startsWith(`${root}/`))) {
                problems.push(`${id} (${systemId}): ${target} is outside ${roots.join(' or ')}`);
            }
        }
        expectNoProblems(problems);
    });

    it('resolves every approved and shipped route and explicit anchor in en and ru (FR-006)', () => {
        const targets = new Map<string, Set<string>>();
        const addTarget = (id: string, target: string | undefined) => {
            if (target === undefined) return;
            const users = targets.get(target) ?? new Set<string>();
            users.add(id);
            targets.set(target, users);
        };
        for (const [id, row] of review.rows) addTarget(id, row.target);
        for (const [id, { node }] of shipped) addTarget(id, docsPathOf(node));
        const problems: string[] = [];
        for (const [target, users] of targets) {
            const link = parseDocsLink(target);
            if (link?.kind !== 'site') {
                problems.push(`${target}: expected a site docs target (${[...users].join(', ')})`);
                continue;
            }
            const [page, anchor] = link.path.split('#') as [string, string | undefined];
            for (const [locale, base] of Object.entries(LOCALES)) {
                const file = pageFile(base, page);
                const context = `${locale} ${target} (${[...users].join(', ')})`;
                if (!file) {
                    problems.push(`${context}: no page`);
                    continue;
                }
                if (!anchor) continue;
                const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const heading = new RegExp(`^#{1,6}\\s.*\\\\?\\{#${escaped}\\}\\s*$`, 'm');
                if (!heading.test(readFileSync(file, 'utf8'))) {
                    problems.push(`${context}: no {#${anchor}}`);
                }
            }
        }
        expectNoProblems(problems);
    });
});
