import {
    CATALOG_BINDINGS,
    readDetailValue,
    validateBindingFills,
} from '@site/src/sheet_manager/features/sheet/data/catalogBindings';
import { describe, expect, it } from 'vitest';

describe('catalog binding registry', () => {
    it('registers the declared catalogs with stable kebab ids', () => {
        expect([...CATALOG_BINDINGS.keys()].sort()).toEqual(
            [
                'armor',
                'backgrounds',
                'creatures',
                'force-powers',
                'force-skills',
                'melee-weapons',
                'merits-flaws',
                'ranged-weapons',
                'species',
                'tools-gear',
                'v5-hunter-creeds',
                'v5-hunter-drives',
                'v5-hunter-edges',
                'v5-hunter-perks',
                'v5-hunter-advantages',
                'v5-hunter-weapons',
                'v5-hunter-armor',
                'v5-hunter-gear',
                'vehicles',
            ].sort()
        );
    });

    it('keeps default mappings inside the closed fillable set', () => {
        for (const binding of CATALOG_BINDINGS.values()) {
            const allowed = new Set(binding.fillableDetails.map((detail) => detail.key));
            for (const key of Object.keys(binding.defaultMapping)) {
                expect(allowed.has(key), `${binding.catalogId}:${key}`).toBe(true);
            }
        }
    });

    it('declares only the supported fill kinds', () => {
        for (const binding of CATALOG_BINDINGS.values()) {
            for (const detail of binding.fillableDetails) {
                expect(['text', 'number', 'boolean', 'rows']).toContain(detail.kind);
            }
        }
    });

    it('labels entries through the localization adapter with English fallback', () => {
        const binding = CATALOG_BINDINGS.get('melee-weapons')!;
        const first = binding.entries[0]!;
        expect(binding.entryLabel(first, 'en')).toBe(first.name);
        expect(binding.entryLabel(first, 'ru')).toBe('Нож');
        // A locale without a translation keeps the English name.
        expect(binding.entryLabel(first, 'de')).toBe(first.name);
    });

    it('extracts detail values for the copy runtime', () => {
        const binding = CATALOG_BINDINGS.get('melee-weapons')!;
        const entry = binding.entries.find((candidate) => candidate.id === 'knife')!;
        expect(readDetailValue(entry, 'name')).toBe('Knife');
        expect(readDetailValue(entry, 'damage')).toBe('Str +1');
        expect(readDetailValue(entry, 'nonexistent')).toBeUndefined();
    });

    it('validates fill mappings against the closed set', () => {
        expect(validateBindingFills('melee-weapons', { name: { targetFieldId: 'a' } })).toEqual({
            ok: true,
        });
        const result = validateBindingFills('melee-weapons', {
            nope: { targetFieldId: 'a' },
        });
        expect(result).toEqual({ ok: false, unknownKeys: ['nope'] });
        expect(validateBindingFills('missing-catalog', {})).toEqual({
            ok: false,
            unknownKeys: [],
        });
    });
});
