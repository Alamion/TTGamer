import type { ListNode, PrimitiveNode, TableNode, TemplateField } from '../../../types/template';

export type HelpNode = TemplateField | PrimitiveNode | ListNode | TableNode;

/** Only text syntax and incoming mentions need automatic help on a page. */
export const ELEMENT_HELP = {
    markdown: '/docs/guide/template-editor/elements#markdown',
    mentions: '/docs/guide/template-editor/elements#mentions',
};

export function elementHelpFor(node: HelpNode): string | undefined {
    return node.type === 'markdown' || node.type === 'mentions'
        ? ELEMENT_HELP[node.type]
        : undefined;
}
