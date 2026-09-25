import { resolveDocumentPolicies, systemRegistry } from '@site/src/sheet_manager/systems';
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

import { captureStarWarsParity, type StarWarsParitySnapshot, withStableIds } from './parityInputs';

/**
 * Spec 012 (US7): Star Wars moved onto the WoD 2e ruleset with every identity frozen. The fixture
 * was captured before the split; documents, shipped pages, and dice pools must stay identical.
 */
const fixture = JSON.parse(
    readFileSync('tests/sheet_manager/fixtures/star-wars-parity.json', 'utf8')
) as StarWarsParitySnapshot;

describe('Star Wars parity across the WoD 2e ruleset split', () => {
    const current = captureStarWarsParity();

    it('parses every stored document shape to the same data', () => {
        expect(current.documents).toEqual(fixture.documents);
        expect(withStableIds(current.defaults)).toEqual(withStableIds(fixture.defaults));
    });

    it('ships byte-identical pages', () => {
        expect(JSON.stringify(current.templates)).toBe(JSON.stringify(fixture.templates));
    });

    it('builds the same dice pools', () => {
        expect(current.traitPools).toEqual(fixture.traitPools);
    });

    it('keeps Star Wars free of publisher notices', () => {
        for (const definition of systemRegistry.getSystem('star-wars-wod')!.documents) {
            expect(
                resolveDocumentPolicies(systemRegistry, {
                    systemId: 'star-wars-wod',
                    definitionId: definition.id,
                })
            ).toEqual([]);
        }
    });
});
