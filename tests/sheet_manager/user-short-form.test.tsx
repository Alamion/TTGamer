// @vitest-environment happy-dom

import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { mountSheet } from './helpers/sheet';

const template = CustomTemplateSchema.parse({
    id: 'user-short',
    name: 'User short',
    documentKind: 'character',
    schemaVersion: 3,
    children: [
        {
            id: 'traits',
            type: 'group',
            title: 'Traits',
            layout: 'area',
            children: [
                {
                    id: 'luck',
                    type: 'rating',
                    label: 'Luck',
                    min: 0,
                    max: 5,
                    required: false,
                    compact: true,
                    shortForm: true,
                },
                {
                    id: 'grit',
                    type: 'rating',
                    label: 'Grit',
                    min: 0,
                    max: 5,
                    required: false,
                    compact: true,
                    shortForm: true,
                    shortLabel: 'GRT',
                },
                {
                    id: 'lucky-break',
                    type: 'rating',
                    label: 'Lucky break',
                    min: 0,
                    max: 5,
                    required: false,
                    compact: true,
                    shortForm: true,
                },
            ],
        },
    ],
});

describe('a user page with short-form ratings (spec 033, US4)', () => {
    afterEach(cleanup);

    it('derives the letters, honours the author’s, and falls back on a clash', () => {
        const { container, getByRole, getByText } = mountSheet(template);
        const cells = [...container.querySelectorAll('label[data-term-hint]')];
        // The third derives the same letters as the first, so it keeps its full label.
        expect(cells.map((cell) => cell.firstElementChild?.textContent)).toEqual(['LUC', 'GRT']);
        expect(getByText('Lucky break')).toBeTruthy();
        expect(getByRole('spinbutton', { name: 'Luck' })).toBeTruthy();
    });

    it('keeps a page without the short form as it was', () => {
        const plain = CustomTemplateSchema.parse({
            ...template,
            children: [
                {
                    id: 'luck',
                    type: 'rating',
                    label: 'Luck',
                    min: 0,
                    max: 5,
                    required: false,
                    compact: true,
                },
            ],
        });
        const { container } = mountSheet(plain);
        expect(container.querySelector('label[data-term-hint]')).toBeNull();
    });
});
