import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import {
    ELEMENT_EDITORS,
    type ElementEditor,
    elementName,
    elementTypeLabel,
    elementTypeShort,
    PALETTE,
} from '@site/src/sheet_manager/features/template-editor/elements/registry';
import { listElementStories } from '@site/src/sheet_manager/storybook/stories';
import {
    collectTemplateNodes,
    TEMPLATE_FIELD_TYPES,
    TEMPLATE_STRUCTURE_TYPES,
    type TemplateNode,
    type TemplateNodeType,
} from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const editor = uiMessages.sheet.templates.editor;
const fieldTypes = uiMessages.sheet.templates.fieldTypes;

/** One node of every type the storybook shows. */
function nodeOfEachType(): Map<string, TemplateNode> {
    const nodes = new Map<string, TemplateNode>();
    for (const { template } of listElementStories()) {
        for (const node of collectTemplateNodes(template)) {
            if (!nodes.has(node.type)) nodes.set(node.type, node);
        }
    }
    return nodes;
}

describe('element registry (spec 025, US3)', () => {
    it('has one entry per node type', () => {
        expect(Object.keys(ELEMENT_EDITORS).sort()).toEqual(
            [...TEMPLATE_STRUCTURE_TYPES, ...TEMPLATE_FIELD_TYPES].sort()
        );
    });

    it('names each type as the outline and header did', () => {
        const nodes = nodeOfEachType();
        expect(nodes.size).toBe(Object.keys(ELEMENT_EDITORS).length);
        const kinds: Record<string, string> = {
            section: `${translate(editor.elementGroup)} · ${translate(editor.kindSection)}`,
            group: `${translate(editor.elementGroup)} · ${translate(editor.kindCard)}`,
            list: `${translate(editor.elementList)} · ${translate(editor.kindEntries)}`,
            table: `${translate(editor.elementList)} · ${translate(editor.kindTable)}`,
            primitive: translate(fieldTypes.builtIn),
        };
        for (const [type, node] of nodes) {
            const expected = kinds[type] ?? translate(fieldTypes[type as keyof typeof fieldTypes]);
            expect(elementTypeLabel(node).replace(/\s+/g, ' '), type).toBe(expected);
            expect(elementName(node), type).not.toBe('');
        }
        expect(elementTypeShort(nodes.get('table')!)).toBe(translate(editor.kindTable));
    });

    it('falls back to the binding or value key for unnamed elements', () => {
        expect(
            elementName({ id: 'p', type: 'primitive', bindingKey: 'trait:x', compact: false })
        ).toBe('trait:x');
        expect(
            elementName({ id: 'l', type: 'list', valueKey: 'notes', columns: 1 } as TemplateNode)
        ).toBe('notes');
    });

    it('offers group, field, list, and tracker in the "+" menu', () => {
        expect(PALETTE.map(({ key }) => key)).toEqual(['group', 'field', 'list', 'tracker']);
        expect(PALETTE[0]!.build(true).type).toBe('section');
        expect(PALETTE[0]!.build(false).type).toBe('group');
        expect(PALETTE[3]!.build(false).type).toBe('tracker');
    });

    it('fails the type check when a type has no entry', () => {
        const { rating: _rating, ...missing } = ELEMENT_EDITORS;
        void _rating;
        // @ts-expect-error -- every node type must have an editor entry
        const incomplete: { [T in TemplateNodeType]: ElementEditor<never> } = missing;
        expect(incomplete).not.toHaveProperty('rating');
    });
});
