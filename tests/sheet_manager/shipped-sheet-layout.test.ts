import { readFileSync } from 'node:fs';

import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { CustomTemplate } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

import { leafContracts } from './helpers/leafContracts';
import { withoutHelpMetadata } from './helpers/withoutHelpMetadata';

/**
 * Spec 042: the shipped full sheets change their layout only. Every field keeps what it binds,
 * computes, and rolls (the fixture was taken from the trees before the change), and the three
 * WoD 2e engine character sheets share one section layout (FR-011). Spec 047 amends the droid
 * equipment bindings; spec 049 amends only Star Wars resource contracts. The fixture retains
 * every other contract, including formulas and stored field identities.
 */

const before = JSON.parse(
    readFileSync('tests/sheet_manager/fixtures/sheet-bindings-042.json', 'utf8')
) as Record<string, Record<string, unknown>>;

const shipped = (id: string): CustomTemplate =>
    systemRegistry
        .getSystems()
        .flatMap((system) => system.defaultTemplates ?? [])
        .find((template) => template.id === id)!;

const sectionTitles = (id: string) =>
    shipped(id).children.map((node) => ('title' in node ? node.title : node.id));

describe('the layout of the shipped full sheets (spec 042)', () => {
    for (const id of Object.keys(before)) {
        it(`${id} keeps every field's binding, formula, and roll`, () => {
            expect(withoutHelpMetadata(leafContracts(shipped(id)))).toEqual(
                withoutHelpMetadata(before[id])
            );
        });
    }

    it('gives the Star Wars character, the droid, and the WoD 2e character one layout', () => {
        const shared = [
            'Base',
            'Condition',
            'Attributes',
            'Skills',
            'Advantages',
            'Equipment',
            'Experience and Notes',
        ];
        expect(sectionTitles('full-sheet')).toEqual([
            ...shared.slice(0, 4),
            'Force',
            ...shared.slice(4),
        ]);
        expect(sectionTitles('droid-sheet')).toEqual(shared);
        expect(sectionTitles('wod2e-sheet')).toEqual(shared);
    });
});
