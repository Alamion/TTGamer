import type { BriefNode, GroupNode, SectionNode, TemplateNode } from '../../../types/template';
import { collectTemplateNodes, isContainerNode } from '../../../types/template';
import { generateDraftId } from './ids';
import type { EditorDraft } from './types';

/**
 * Containers that change with the page kind (spec 041, design D6): a brief is built from brief
 * blocks, a full page from sections and cards. Fields never change; they keep their reading order.
 */

export type PageKind = 'brief' | 'full';

export const pageKindOf = (draft: Pick<EditorDraft, 'pageKind'>): PageKind =>
    draft.pageKind === 'brief' ? 'brief' : 'full';

/** What a conversion did, for the announcement: containers that changed kind. */
export interface Conversion<T> {
    nodes: T;
    converted: number;
}

type Container = SectionNode | GroupNode | BriefNode;

/** A container's leaves in reading order: nested containers give up their fields. */
function leavesOf(nodes: readonly TemplateNode[]): TemplateNode[] {
    return nodes.flatMap((node) => (isContainerNode(node) ? leavesOf(node.children) : [node]));
}

function blockFrom(container: Container, children: TemplateNode[]): BriefNode {
    return {
        id: container.id,
        type: 'brief',
        title: container.title,
        ...(container.labelMessage ? { labelMessage: container.labelMessage } : {}),
        ...(container.column ? { column: container.column } : {}),
        ...(container.span ? { span: container.span } : {}),
        ...(container.visibleWhen ? { visibleWhen: container.visibleWhen } : {}),
        ...('hideTitle' in container && container.hideTitle ? { hideTitle: true } : {}),
        ...(container.docsPath ? { docsPath: container.docsPath } : {}),
        collapsible: container.type === 'section' ? false : container.collapsible,
        ...(container.type !== 'section' && container.defaultCollapsed
            ? { defaultCollapsed: true }
            : {}),
        ...(container.columns ? { columns: container.columns } : {}),
        ...(container.columnWidths ? { columnWidths: container.columnWidths } : {}),
        children,
    };
}

function cardFrom(block: BriefNode): GroupNode {
    const { type: _type, ...shared } = block;
    void _type;
    return { ...shared, type: 'group' };
}

/** Nodes for a brief: cards become blocks, a section one block per card and per run of fields. */
export function toBriefNodes(
    nodes: readonly TemplateNode[],
    taken: Set<string>
): Conversion<TemplateNode[]> {
    let converted = 0;
    const freshId = (base: string) => {
        let index = 2;
        while (taken.has(`${base}-${index}`)) index += 1;
        taken.add(`${base}-${index}`);
        return `${base}-${index}`;
    };
    const result = nodes.flatMap((node): TemplateNode[] => {
        if (node.type === 'brief') {
            const children = leavesOf(node.children);
            if (children.length !== node.children.length) converted += 1;
            return [{ ...node, children }];
        }
        if (node.type === 'group') {
            converted += 1;
            return [blockFrom(node, leavesOf(node.children))];
        }
        if (node.type !== 'section') return [node];
        converted += 1;
        const blocks: BriefNode[] = [];
        let run: TemplateNode[] = [];
        let ownId = true;
        const closeRun = () => {
            if (run.length === 0) return;
            const id = ownId ? node.id : freshId(node.id);
            ownId = false;
            blocks.push(blockFrom({ ...node, id }, run));
            run = [];
        };
        for (const child of node.children) {
            if (isContainerNode(child)) {
                closeRun();
                blocks.push(blockFrom(child, leavesOf(child.children)));
            } else {
                run.push(child);
            }
        }
        closeRun();
        return blocks;
    });
    return { nodes: result, converted };
}

/** Nodes for a full page: blocks become cards; everything else stays. */
export function toFullNodes(nodes: readonly TemplateNode[]): Conversion<TemplateNode[]> {
    let converted = 0;
    const result = nodes.map((node) => {
        if (node.type !== 'brief') return node;
        converted += 1;
        return cardFrom(node);
    });
    return { nodes: result, converted };
}

/** The ids a draft already uses, so a split section's extra blocks get fresh ones. */
export function draftIds(draft: EditorDraft): Set<string> {
    return new Set(collectTemplateNodes(draft).map(({ id }) => id));
}

/**
 * The page switched to the other kind: a brief's blocks become cards inside one section named
 * after the page (its loose fields join them); a full page's cards and sections become blocks.
 */
export function switchPageKind(draft: EditorDraft, title: string): Conversion<EditorDraft> {
    if (pageKindOf(draft) === 'brief') {
        const { nodes, converted } = toFullNodes(draft.children);
        const { pageKind: _pageKind, ...full } = draft;
        void _pageKind;
        const section: SectionNode = {
            id: generateDraftId('sec'),
            type: 'section',
            title,
            children: nodes,
        };
        return { nodes: { ...full, children: [section] }, converted };
    }
    const { nodes, converted } = toBriefNodes(draft.children, draftIds(draft));
    return { nodes: { ...draft, pageKind: 'brief', children: nodes }, converted };
}
