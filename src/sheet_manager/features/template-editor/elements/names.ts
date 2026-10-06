import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { TemplateNode } from '../../../types/template';
import { isContainerNode } from '../../../types/template';
import { elementKind } from '../elementKinds';

const editor = uiMessages.sheet.templates.editor;
const fieldTypes = uiMessages.sheet.templates.fieldTypes;

/** What the outline, chips, and announcements call a node. */
export function nodeDisplayName(node: TemplateNode): string {
    const name =
        node.type === 'primitive'
            ? (node.label ?? node.bindingKey)
            : node.type === 'list'
              ? (node.title ?? node.bindingKey ?? node.valueKey)
              : node.type === 'table' || isContainerNode(node)
                ? node.title
                : node.label;
    return name || '—';
}

export const KIND_NAMES = {
    group: editor.elementGroup,
    list: editor.elementList,
    section: editor.kindSection,
    card: editor.kindCard,
    entries: editor.kindEntries,
    table: editor.kindTable,
} as const;

/** The translated element kind ("Group · Section", "List · Table", Rating, …). */
export function nodeKindLabel(node: TemplateNode): string {
    if (node.type === 'primitive') return translate(fieldTypes.builtIn);
    const kind = elementKind(node);
    if (kind) {
        return translate(editor.kindOf, {
            element: translate(KIND_NAMES[kind.element]),
            kind: translate(KIND_NAMES[kind.kind]),
        });
    }
    return translate(fieldTypes[node.type]);
}

/** The kind alone for groups and lists ("Section", "Table"), else the kind label. */
export function nodeKindShort(node: TemplateNode): string {
    const kind = elementKind(node);
    return kind ? translate(KIND_NAMES[kind.kind]) : nodeKindLabel(node);
}
