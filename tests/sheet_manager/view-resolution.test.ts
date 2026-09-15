import {
    isTemplateCompatible,
    resolveCustomTemplate,
    resolveEffectiveTemplate,
} from '@site/src/sheet_manager/systems/view';
import { DocumentKindSchema } from '@site/src/sheet_manager/types/document';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

function buildTemplate(id: string, documentKind = 'character', systemId = 'star-wars-wod') {
    return CustomTemplateSchema.parse({
        id,
        name: id,
        systemId,
        documentKind,
        schemaVersion: 3,
        children: [
            {
                id: 'identity',
                type: 'section',
                title: 'Identity',
                children: [
                    {
                        id: 'origin',
                        type: 'text',
                        label: 'Origin',
                        required: false,
                        compact: false,
                        multiline: false,
                    },
                ],
            },
        ],
    });
}

describe('resolveCustomTemplate', () => {
    const library = [buildTemplate('sentient-page'), buildTemplate('vehicle-page', 'vehicle')];
    const characterKind = DocumentKindSchema.parse('character');
    const vehicleKind = DocumentKindSchema.parse('vehicle');

    it('returns undefined when no assignment exists', () => {
        expect(resolveCustomTemplate(undefined, library, characterKind)).toBeUndefined();
    });

    it('resolves a kind-compatible template', () => {
        expect(resolveCustomTemplate('sentient-page', library, characterKind)).toEqual(library[0]);
    });

    it('reports a missing template for stale ids', () => {
        expect(resolveCustomTemplate('deleted-template', library, characterKind)).toEqual({
            reason: 'missing',
        });
    });

    it('reports a kind mismatch separately from a missing template', () => {
        expect(resolveCustomTemplate('vehicle-page', library, characterKind)).toEqual({
            reason: 'kind-mismatch',
        });
    });

    it('resolves the vehicle template for vehicle documents', () => {
        expect(resolveCustomTemplate('vehicle-page', library, vehicleKind)).toEqual(library[1]);
    });
});

describe('resolveEffectiveTemplate (feature 007)', () => {
    const creatureKind = DocumentKindSchema.parse('creature');
    const empty = { templates: [], defaultOverrides: {} };

    it('resolves each entity kind to its own shipped page, including legacy brief ids', () => {
        expect(
            resolveEffectiveTemplate('creature-sheet', empty, 'star-wars-wod', creatureKind)
                ?.template.id
        ).toBe('creature-sheet');
        expect(
            resolveEffectiveTemplate('brief', empty, 'star-wars-wod', creatureKind)?.template.id
        ).toBe('creature-brief');
        expect(
            resolveEffectiveTemplate(
                'brief',
                empty,
                'star-wars-wod',
                DocumentKindSchema.parse('vehicle')
            )?.template.id
        ).toBe('vehicle-brief');
    });

    it('ignores a user template of another kind that shares the id', () => {
        const foreign = buildTemplate('creature-sheet', 'vehicle');
        const resolved = resolveEffectiveTemplate(
            'creature-sheet',
            { templates: [foreign], defaultOverrides: {} },
            'star-wars-wod',
            creatureKind
        );
        expect(resolved?.isDefault).toBe(true);
        expect(resolved?.template.documentKind).toBe('creature');
    });
});

describe('default overrides by canonical page (feature 007)', () => {
    it('does not apply the character brief override to a creature opened via the brief alias', () => {
        const characterBriefOverride = buildTemplate('brief');
        const resolved = resolveEffectiveTemplate(
            'brief',
            { templates: [], defaultOverrides: { brief: characterBriefOverride } },
            'star-wars-wod',
            DocumentKindSchema.parse('creature')
        );
        expect(resolved?.template.id).toBe('creature-brief');
        expect(resolved?.modified).toBe(false);
    });
});

describe('system-aware template matching (feature 008)', () => {
    const characterKind = DocumentKindSchema.parse('character');

    it('does not resolve a template of another system with the same kind', () => {
        const library = [buildTemplate('sentient-page')];
        expect(resolveCustomTemplate('sentient-page', library, characterKind, 'v5')).toEqual({
            reason: 'system-mismatch',
        });
        expect(
            resolveCustomTemplate('sentient-page', library, characterKind, 'star-wars-wod')
        ).toBe(library[0]);
    });

    it('skips a same-id user template of another system when resolving a view', () => {
        const foreign = buildTemplate('full-sheet', 'character', 'v5');
        const resolved = resolveEffectiveTemplate(
            'full-sheet',
            { templates: [foreign], defaultOverrides: {} },
            'star-wars-wod',
            characterKind
        );
        expect(resolved?.isDefault).toBe(true);
        expect(resolved?.template.systemId).toBe('star-wars-wod');
    });

    it('looks shipped defaults up only inside the document system', () => {
        expect(
            resolveEffectiveTemplate(
                'full-sheet',
                { templates: [], defaultOverrides: {} },
                'v5',
                characterKind
            )
        ).toBeUndefined();
    });

    it('treats templates as compatible only with the same system and kind', () => {
        const template = buildTemplate('page');
        expect(
            isTemplateCompatible(template, { systemId: 'star-wars-wod', kind: 'character' })
        ).toBe(true);
        expect(isTemplateCompatible(template, { systemId: 'v5', kind: 'character' })).toBe(false);
        expect(isTemplateCompatible(template, { systemId: 'star-wars-wod', kind: 'vehicle' })).toBe(
            false
        );
    });
});
