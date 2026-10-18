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

describe('a user brief with short labels (spec 033, US4; spec 041)', () => {
    afterEach(cleanup);

    it('derives the letters, honours the author’s, and falls back on a clash', () => {
        const { container, getByRole, getByText } = mountSheet(template);
        const cells = [...container.querySelectorAll('label[data-term-hint]')];
        // The third derives the same letters as the first, so it keeps its full label.
        expect(cells.map((cell) => cell.firstElementChild?.textContent)).toEqual(['LUC', 'GRT']);
        expect(getByText('Lucky break')).toBeTruthy();
        expect(getByRole('spinbutton', { name: 'Luck' })).toBeTruthy();
    });

    it('shows full names on a full page (spec 041)', () => {
        const { pageKind: _pageKind, ...full } = template;
        void _pageKind;
        const plain = CustomTemplateSchema.parse({
            ...full,
            children: [
                {
                    id: 'luck',
                    type: 'rating',
                    label: 'Luck',
                    min: 0,
                    max: 5,
                    required: false,
                },
            ],
        });
        const { container } = mountSheet(plain);
        expect(container.querySelector('label[data-term-hint]')).toBeNull();
    });
});
