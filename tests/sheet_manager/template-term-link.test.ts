import {
    updateField,
    updateNode,
} from '@site/src/sheet_manager/components/dialogs/template-editor/draft';
import { fieldFromSource } from '@site/src/sheet_manager/components/dialogs/template-editor/sourceNodes';
import {
    parseTemplateFile,
    serializeTemplateFile,
} from '@site/src/sheet_manager/features/sheet/shell/templateFile';
import { starWarsWodDefaultTemplates } from '@site/src/sheet_manager/systems/star-wars-wod/defaultTemplates';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema, walkTemplateNodes } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const fullSheet = starWarsWodDefaultTemplates.find(({ id }) => id === 'full-sheet')!;

function findNode(children: readonly TemplateNode[], id: string) {
    let found: TemplateNode | undefined;
    walkTemplateNodes(children, (node) => {
        if (node.id === id) found = node;
    });
    return found as
        | (TemplateNode & { termRef?: string; termHint?: false; labelMessage?: string })
        | undefined;
}

describe('book-term link in the template editor', () => {
    it('keeps the book term as termRef when a field is renamed, also after a second rename', () => {
        const renamed = updateField(fullSheet, 'trait-strength', { label: 'Might' });
        const node = findNode(renamed.children, 'trait-strength');
        expect(node?.labelMessage).toBeUndefined();
        expect(node?.termRef).toBe('catalog:attributes/strength');
        const again = updateField(renamed, 'trait-strength', { label: 'Brawn' });
        expect(findNode(again.children, 'trait-strength')?.termRef).toBe(
            'catalog:attributes/strength'
        );
    });

    it('does not give container titles a term', () => {
        const retitled = updateNode(fullSheet, 'attributes', { title: 'Stats' });
        const section = findNode(retitled.children, 'attributes');
        expect(section?.labelMessage).toBeUndefined();
        expect(section?.termRef).toBeUndefined();
    });

    it('stores the hint switch and drops the term when the field becomes custom', () => {
        const off = updateField(fullSheet, 'trait-strength', { termHint: false });
        expect(findNode(off.children, 'trait-strength')?.termHint).toBe(false);
        const renamed = updateField(off, 'trait-strength', { label: 'Might' });
        const custom = fieldFromSource(
            findNode(renamed.children, 'trait-strength') as never,
            undefined
        ) as {
            termRef?: string;
            termHint?: false;
            labelMessage?: string;
        };
        expect(custom.termRef).toBeUndefined();
        expect(custom.termHint).toBeUndefined();
        expect(custom.labelMessage).toBeUndefined();
    });

    it('survives template export and import, and old templates still parse', () => {
        const renamed = updateField(
            updateField(fullSheet, 'trait-strength', { label: 'Might' }),
            'trait-strength',
            { termHint: false }
        );
        const template = CustomTemplateSchema.parse({ ...fullSheet, ...renamed });
        const parsed = parseTemplateFile(serializeTemplateFile(template));
        expect(parsed.ok).toBe(true);
        const node = parsed.ok ? findNode(parsed.template.children, 'trait-strength') : undefined;
        expect(node).toMatchObject({
            label: 'Might',
            termRef: 'catalog:attributes/strength',
            termHint: false,
        });
        expect(CustomTemplateSchema.safeParse(fullSheet).success).toBe(true);
    });
});
