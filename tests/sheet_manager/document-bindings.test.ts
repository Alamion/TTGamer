import { starWarsWodProfile } from '@site/src/sheet_manager/systems/star-wars-wod';
import type { CharacterLike } from '@site/src/sheet_manager/systems/star-wars-wod/documentBindings';
import {
    listDocumentBindings,
    listNumericCoordinates,
    resolveDataBindingByCoordinate,
    resolveDocumentBinding,
    systemListDataKey,
    writeList,
    writeTraitValue,
} from '@site/src/sheet_manager/systems/star-wars-wod/documentBindings';
import { describe, expect, it } from 'vitest';

describe('document binding registry (feature 005, T007)', () => {
    it('derives a binding for every profile trait with profile bounds', () => {
        const bindings = listDocumentBindings('star-wars-wod', 'character');
        for (const group of starWarsWodProfile.traitGroups) {
            for (const trait of group.traits) {
                const binding = bindings.find(
                    (candidate) => candidate.key === `trait:${group.id}:${trait.key}`
                );
                expect(binding, `missing binding for ${group.id}/${trait.key}`).toBeDefined();
                if (binding?.kind === 'trait') {
                    expect(binding.label).toBe(trait.label);
                    expect(binding.minimum).toBe(trait.minimum);
                    expect(binding.maximum).toBe(trait.maximum);
                }
            }
        }
        // Resources and tracks derived from the profile too.
        expect(
            resolveDocumentBinding('star-wars-wod', 'character', 'resource:willpower')?.kind
        ).toBe('resource');
        expect(resolveDocumentBinding('star-wars-wod', 'character', 'track:health')?.kind).toBe(
            'track'
        );
        expect(
            resolveDocumentBinding('star-wars-wod', 'character', 'list:customSkills')?.kind
        ).toBe('list');
        expect(resolveDocumentBinding('star-wars-wod', 'character', 'field:name')?.kind).toBe(
            'field'
        );
    });

    it('scopes bindings by document kind', () => {
        const vehicleBindings = listDocumentBindings('star-wars-wod', 'vehicle');
        // Phase 1: trait/list/track/resource bindings are character-scoped.
        expect(vehicleBindings.filter((binding) => binding.kind === 'trait')).toHaveLength(0);
        // Unknown system → empty (no cross-system leakage).
        expect(listDocumentBindings('other-system', 'character')).toHaveLength(0);
    });

    it('resolves unknown keys to undefined', () => {
        expect(
            resolveDocumentBinding('star-wars-wod', 'character', 'trait:physical:Nope')
        ).toBeUndefined();
        expect(resolveDocumentBinding('star-wars-wod', 'character', 'garbage')).toBeUndefined();
    });

    it('resolves shared value-key coordinates into document data bindings (review 2026-09-05)', () => {
        // Kebab-case coordinates bridge into profile traits (label casing normalized).
        expect(resolveDataBindingByCoordinate('star-wars-wod', 'character', 'strength')?.key).toBe(
            'trait:physical:Strength'
        );
        expect(
            resolveDataBindingByCoordinate('star-wars-wod', 'character', 'self-control')?.key
        ).toBe('trait:virtues:Self Control');
        // Resources and identity fields bridge too.
        expect(
            resolveDataBindingByCoordinate('star-wars-wod', 'character', 'willpower')?.kind
        ).toBe('resource');
        expect(resolveDataBindingByCoordinate('star-wars-wod', 'character', 'name')?.kind).toBe(
            'field'
        );
        // Lists and tracks are NOT coordinate-bridged (explicit primitives only).
        expect(
            resolveDataBindingByCoordinate('star-wars-wod', 'character', 'custom-skills')
        ).toBeUndefined();
        expect(
            resolveDataBindingByCoordinate('star-wars-wod', 'character', 'health')
        ).toBeUndefined();
        // Unknown coordinates stay in the value bag.
        expect(
            resolveDataBindingByCoordinate('star-wars-wod', 'character', 'origin')
        ).toBeUndefined();
    });

    it('write transforms are pure and shape-correct', () => {
        const data = {
            metadata: { name: '' },
            attributes: {},
            skills: { Athletics: { value: 2 } },
            customSkills: [],
        } as unknown as CharacterLike;

        const traitPatch = writeTraitValue(data, 'attributes', 'Strength', { value: 3 });
        expect(traitPatch.attributes['Strength']?.value).toBe(3);
        expect(data.attributes['Strength']).toBeUndefined(); // input untouched

        const listPatch = writeList(data, 'customSkills', [
            { id: 'preset-t1-occultism', label: 'Occultism', value: 2 },
        ]);
        expect(listPatch.customSkills).toHaveLength(1);
        expect(data.customSkills).toHaveLength(0);
    });

    it('declares the new-kind system lists with catalog metadata (feature 006, T009/T010)', () => {
        const bindings = listDocumentBindings('star-wars-wod', 'character');
        for (const listId of [
            'customTalents',
            'customSkills',
            'customKnowledges',
            'forcePowers',
            'merits',
            'flaws',
            'backgrounds',
        ]) {
            const binding = bindings.find(
                (candidate) => candidate.kind === 'list' && candidate.listId === listId
            );
            expect(binding, listId).toBeDefined();
        }
        // Catalog-backed lists declare their catalog id (and filters where split).
        const forcePowers = bindings.find(
            (candidate) => candidate.kind === 'list' && candidate.listId === 'forcePowers'
        );
        expect(
            forcePowers?.kind === 'list' && forcePowers.catalog?.catalogId === 'force-powers'
        ).toBe(true);
        const merits = bindings.find(
            (candidate) => candidate.kind === 'list' && candidate.listId === 'merits'
        );
        expect(
            merits?.kind === 'list' &&
                merits.catalog?.catalogId === 'merits-flaws' &&
                merits.catalog?.catalogFilter?.value === 'Merit'
        ).toBe(true);
        const flaws = bindings.find(
            (candidate) => candidate.kind === 'list' && candidate.listId === 'flaws'
        );
        expect(flaws?.kind === 'list' && flaws.catalog?.catalogFilter?.value === 'Flaw').toBe(true);
        const backgrounds = bindings.find(
            (candidate) => candidate.kind === 'list' && candidate.listId === 'backgrounds'
        );
        expect(
            backgrounds?.kind === 'list' && backgrounds.catalog?.catalogId === 'backgrounds'
        ).toBe(true);
    });

    it('maps force powers to the forcePowerItems data key (single representation)', () => {
        expect(systemListDataKey('forcePowers')).toBe('forcePowerItems');
        expect(systemListDataKey('customSkills')).toBe('customSkills');
        expect(systemListDataKey('merits')).toBe('merits');
    });

    it('declares catalog-backed equipment bindings (feature 006)', () => {
        const bindings = listDocumentBindings('star-wars-wod', 'character');
        for (const sectionId of ['inventory', 'armor', 'weapons', 'implants']) {
            const binding = bindings.find(
                (candidate) => candidate.kind === 'equipment' && candidate.sectionId === sectionId
            );
            expect(binding, sectionId).toBeDefined();
        }
        // Equipment is character-scoped: no vehicle/creature equipment bindings.
        expect(
            listDocumentBindings('star-wars-wod', 'vehicle').filter(
                (binding) => binding.kind === 'equipment'
            )
        ).toHaveLength(0);
    });

    it('enumerates numeric coordinates with pool suffixes for formulas (feature 006)', () => {
        const coordinates = listNumericCoordinates('star-wars-wod', 'character');
        const byCoordinate = new Map(coordinates.map((entry) => [entry.coordinate, entry.label]));
        // Traits expose their value.
        expect(byCoordinate.get('strength')).toBeDefined();
        expect(byCoordinate.get('wits')).toBeDefined();
        // Pools expose .current and .max forms.
        expect(byCoordinate.get('willpower.current')).toBeDefined();
        expect(byCoordinate.get('willpower.max')).toBeDefined();
        expect(byCoordinate.get('force-points.max')).toBeDefined();
        // Non-numeric bindings stay out of the formula space.
        expect(byCoordinate.has('custom-skills')).toBe(false);
        expect(byCoordinate.has('health')).toBe(false);
        // Foreign systems enumerate nothing.
        expect(listNumericCoordinates('other-system', 'character')).toHaveLength(0);
    });
});
