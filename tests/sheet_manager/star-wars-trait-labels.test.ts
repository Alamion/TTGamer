import { localizeTemplate } from '@site/src/sheet_manager/features/sheet/declarative/localizeTemplate';
import { starWarsWodDefaultTemplates } from '@site/src/sheet_manager/systems/star-wars-wod/defaultTemplates';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import { walkTemplateNodes } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

const fullSheet = starWarsWodDefaultTemplates.find(({ id }) => id === 'full-sheet')!;

function node(children: readonly TemplateNode[], id: string) {
    let found: (TemplateNode & { label?: string; labelMessage?: string }) | undefined;
    walkTemplateNodes(children, (candidate) => {
        if (candidate.id === id) found = candidate;
    });
    return found;
}

describe('Star Wars trait labels', () => {
    it.each([
        ['trait-blaster', 'catalog:abilities/blaster', 'Бластер'],
        ['trait-alertness', 'catalog:abilities/alertness', 'Бдительность'],
        ['trait-control', 'catalog:force-skills/control', 'Контроль'],
        ['trait-conscience', 'catalog:virtues/conscience', 'Совесть'],
        ['trait-wits', 'catalog:attributes/wits', 'Смекалка'],
    ])('%s is a catalog term and reads Russian in the ru locale', (id, reference, russian) => {
        expect(node(fullSheet.children, id)?.labelMessage).toBe(reference);
        const localized = localizeTemplate(fullSheet, 'ru');
        expect(node(localized.children, id)?.label).toBe(russian);
    });
});
