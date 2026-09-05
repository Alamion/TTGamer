import { resolveCustomTemplate } from '@site/src/sheet_manager/systems/view';
import { DocumentKindSchema } from '@site/src/sheet_manager/types/document';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

function buildTemplate(id: string, documentKind = 'character') {
    return CustomTemplateSchema.parse({
        id,
        name: id,
        documentKind,
        schemaVersion: 1,
        sections: [
            {
                id: 'identity',
                title: 'Identity',
                blocks: [
                    {
                        id: 'identity-fields',
                        type: 'fields',
                        fields: [{ id: 'origin', label: 'Origin', type: 'text' }],
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

    it('reports a missing template on kind mismatch', () => {
        expect(resolveCustomTemplate('vehicle-page', library, characterKind)).toEqual({
            reason: 'missing',
        });
    });

    it('resolves the vehicle template for vehicle documents', () => {
        expect(resolveCustomTemplate('vehicle-page', library, vehicleKind)).toEqual(library[1]);
    });
});
