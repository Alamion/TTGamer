import { validateTemplateReferences } from '@site/src/sheet_manager/features/sheet/data/templateReferences';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

function template(children: unknown[]) {
    return CustomTemplateSchema.parse({
        id: 'refs-kit',
        name: 'Refs Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children,
    });
}

describe('template reference validation', () => {
    it('accepts every shipped default template of every system', () => {
        for (const system of systemRegistry.getSystems()) {
            for (const shipped of system.defaultTemplates ?? []) {
                expect(validateTemplateReferences(shipped), `${system.id}/${shipped.id}`).toEqual(
                    []
                );
            }
        }
    });

    it('flags unknown and mismatched binding keys', () => {
        const issues = validateTemplateReferences(
            template([
                { id: 'ghost', type: 'primitive', bindingKey: 'trait:physical:Strenght' },
                { id: 'not-a-list', type: 'list', bindingKey: 'trait:physical:Strength' },
                { id: 'fine', type: 'list', bindingKey: 'list:merits' },
            ])
        );
        expect(issues).toEqual([
            { code: 'unknown-binding', nodeId: 'ghost', key: 'trait:physical:Strenght' },
            {
                code: 'binding-kind-mismatch',
                nodeId: 'not-a-list',
                key: 'trait:physical:Strength',
                expected: 'list',
            },
        ]);
    });

    it('flags catalogs, fill details, and fill targets that do not resolve', () => {
        const issues = validateTemplateReferences(
            template([
                { id: 'damage', type: 'text', label: 'Damage' },
                {
                    id: 'weapon',
                    type: 'select',
                    label: 'Weapon',
                    options: [{ id: 'none', label: 'None' }],
                    binding: {
                        catalogId: 'melee-weapons',
                        fills: {
                            name: { targetFieldId: 'damage' },
                            sparkle: { targetFieldId: 'damage' },
                            description: { targetFieldId: 'gone' },
                        },
                    },
                },
                {
                    id: 'ship',
                    type: 'select',
                    label: 'Ship',
                    options: [{ id: 'none', label: 'None' }],
                    binding: { catalogId: 'starships', fills: {} },
                },
            ])
        );
        expect(issues).toEqual([
            { code: 'unknown-fill-detail', nodeId: 'weapon', key: 'sparkle' },
            { code: 'unknown-fill-target', nodeId: 'weapon', key: 'gone' },
            { code: 'unknown-catalog', nodeId: 'ship', key: 'starships' },
        ]);
    });

    it('flags formula and maxFrom coordinates outside the numeric space', () => {
        const issues = validateTemplateReferences(
            template([
                { id: 'luck', type: 'number', label: 'Luck' },
                { id: 'total', type: 'formula', label: 'Total', formula: 'luck + wits + mana' },
                {
                    id: 'pool',
                    type: 'primitive',
                    bindingKey: 'resource:willpower',
                    maxFrom: 'self-control + fate',
                },
            ])
        );
        expect(issues).toEqual([
            { code: 'unknown-coordinate', nodeId: 'total', key: 'mana' },
            { code: 'unknown-coordinate', nodeId: 'pool', key: 'fate' },
        ]);
    });
});
