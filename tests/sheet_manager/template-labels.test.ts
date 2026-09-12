import {
    updateField,
    updateNode,
} from '@site/src/sheet_manager/components/dialogs/template-editor/draft';
import { validateTemplateReferences } from '@site/src/sheet_manager/features/sheet/data/templateReferences';
import {
    isKnownLabelMessage,
    localizeTemplate,
} from '@site/src/sheet_manager/features/sheet/declarative/localizeTemplate';
import { starWarsWodDefaultTemplates } from '@site/src/sheet_manager/systems/star-wars-wod/defaultTemplates';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema, walkTemplateNodes } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const fullSheet = starWarsWodDefaultTemplates.find(({ id }) => id === 'full-sheet')!;

function findNode(children: readonly TemplateNode[], id: string): TemplateNode | undefined {
    let found: TemplateNode | undefined;
    walkTemplateNodes(children, (node) => {
        if (node.id === id) found = node;
    });
    return found;
}

describe('template label translations (labelMessage)', () => {
    it('references a known message for every shipped label it translates', () => {
        let referenced = 0;
        for (const template of starWarsWodDefaultTemplates) {
            walkTemplateNodes(template.children, (node) => {
                if (!node.labelMessage) return;
                referenced += 1;
                expect(isKnownLabelMessage(node.labelMessage), node.labelMessage).toBe(true);
            });
        }
        expect(referenced).toBeGreaterThan(50);
    });

    it('resolves catalog references for the locale and leaves ids untouched', () => {
        const localized = localizeTemplate(fullSheet, 'ru');
        const strength = findNode(localized.children, 'trait-strength');
        expect(strength && 'label' in strength && strength.label).toBe('Сила');
        expect(strength && 'valueKey' in strength && strength.valueKey).toBe('strength');
        // The source template is not mutated.
        const source = findNode(fullSheet.children, 'trait-strength');
        expect(source && 'label' in source && source.label).toBe('Strength');
    });

    it('rejects references that do not resolve', () => {
        const template = CustomTemplateSchema.parse({
            id: 'labels-kit',
            name: 'Labels Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'origin',
                    type: 'text',
                    label: 'Origin',
                    labelMessage: 'ttgamer.ui.sheet.nope',
                },
                {
                    id: 'mood',
                    type: 'text',
                    label: 'Mood',
                    labelMessage: 'catalog:attributes/mood',
                },
            ],
        });
        expect(validateTemplateReferences(template).map(({ key }) => key)).toEqual([
            'ttgamer.ui.sheet.nope',
            'catalog:attributes/mood',
        ]);
    });

    it('drops the reference when an author edits the label or title', () => {
        const withField = updateField(fullSheet, 'trait-strength', { label: 'Might' });
        expect(findNode(withField.children, 'trait-strength')?.labelMessage).toBeUndefined();
        const withTitle = updateNode(fullSheet, 'attributes', { title: 'Stats' });
        expect(findNode(withTitle.children, 'attributes')?.labelMessage).toBeUndefined();
        // Untouched nodes keep their references.
        expect(findNode(withTitle.children, 'trait-strength')?.labelMessage).toBe(
            'catalog:attributes/strength'
        );
    });
});
