// @vitest-environment happy-dom

import {
    CustomTemplateSchema,
    TEMPLATE_SCHEMA_VERSION,
} from '@site/src/sheet_manager/types/template';
import { upgradeTemplate } from '@site/src/sheet_manager/types/templateUpgrade';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { mountSheet } from './helpers/sheet';

/** The look of a field follows its page (spec 041, FR-012). */

afterEach(() => {
    cleanup();
    localStorage.clear();
});

const rating = (id: string, label: string, extra: object = {}) => ({
    id,
    type: 'rating',
    label,
    min: 0,
    max: 5,
    required: false,
    ...extra,
});

const ratings = [rating('luck', 'Luck'), rating('grit', 'Grit', { fullLabel: true })];

function page(brief: boolean, extra: object = {}) {
    return CustomTemplateSchema.parse({
        id: brief ? 'look-brief' : 'look-full',
        name: 'Look',
        documentKind: 'character',
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        ...(brief ? { pageKind: 'brief' } : {}),
        children: [
            {
                id: 'traits',
                type: brief ? 'brief' : 'group',
                title: 'Traits',
                collapsible: false,
                children: ratings,
                ...extra,
            },
        ],
    });
}

const shortCells = (container: HTMLElement) =>
    [...container.querySelectorAll('label[data-term-hint]')].map(
        (cell) => cell.firstElementChild?.textContent
    );

describe('a field drawn on a brief and on a full page', () => {
    it('shows a short label on a brief, unless the rating keeps its full name', () => {
        const { container } = mountSheet(page(true));
        expect(shortCells(container)).toEqual(['LUC']);
        expect(screen.getByText('Grit')).toBeTruthy();
    });

    it('shows every name full size on a full page', () => {
        const { container } = mountSheet(page(false));
        expect(shortCells(container)).toEqual([]);
        expect(screen.getByText('Luck')).toBeTruthy();
        expect(screen.getAllByRole('radiogroup').length).toBeGreaterThanOrEqual(2);
    });

    it('draws a card turned into a block in the brief look with no field changed', () => {
        const { template } = upgradeTemplate(
            {
                id: 'user-card',
                name: 'Card',
                documentKind: 'character',
                schemaVersion: 3,
                children: [
                    {
                        id: 'traits',
                        type: 'group',
                        title: 'Traits',
                        collapsible: false,
                        layout: 'area',
                        children: [rating('luck', 'Luck', { shortForm: true })],
                    },
                ],
            },
            () => undefined
        );
        const { container } = mountSheet(CustomTemplateSchema.parse(template));
        expect(shortCells(container)).toEqual(['LUC']);
    });

    it('keeps the fold state a card had when it becomes a block', () => {
        localStorage.setItem('template-look-brief-traits', 'false');
        mountSheet(page(true, { collapsible: true }));
        expect(screen.getByRole('button', { name: /Traits/ }).getAttribute('aria-expanded')).toBe(
            'false'
        );
        expect(screen.queryByText('Grit')).toBeNull();
    });
});
