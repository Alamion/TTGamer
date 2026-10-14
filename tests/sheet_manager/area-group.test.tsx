// @vitest-environment happy-dom

import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { mountSheet } from './helpers/sheet';

function rating(id: string, label: string, column: number) {
    return {
        id,
        type: 'rating',
        label,
        required: false,
        compact: true,
        min: 0,
        max: 5,
        presentation: 'dots',
        column,
    };
}

function group(id: string, layout?: 'area') {
    return {
        id,
        type: 'group',
        title: id,
        collapsible: false,
        columns: 3,
        ...(layout ? { layout } : {}),
        children: [rating(`${id}-a`, 'Alpha', 1), rating(`${id}-b`, 'Beta', 2)],
    };
}

const page = () =>
    CustomTemplateSchema.parse({
        id: 'area-kit',
        name: 'Area kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [group('plain'), group('areal', 'area')],
    });

describe('area layout of a group (spec 033)', () => {
    afterEach(cleanup);

    it('draws an area group from the width of the sheet area and leaves window groups alone', () => {
        const { container } = mountSheet(page());
        const grids = [...container.querySelectorAll('[data-column="1"]')].map(
            (stack) => stack.parentElement?.className ?? ''
        );
        const [plain, area] = grids;
        expect(plain).toBe('grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3');
        expect(area).toContain('grid-cols-3');
        expect(area).toContain('@max-[259px]/brief:grid-cols-1');
        expect(area).not.toContain('md:');
        expect(area).not.toContain('xl:');
    });

    it('names the sheet root as the area every query measures', () => {
        const { container } = mountSheet(page());
        const root = container.querySelector('[data-template-root]');
        expect(root?.className).toContain('@container/brief');
    });

    it('flows an area group column in rows when narrow and as wrapping chips when wide', () => {
        const { container } = mountSheet(page());
        const stacks = [...container.querySelectorAll('[data-column="1"]')];
        expect(stacks[0]?.className).toBe('grid grid-cols-1 content-start gap-4');
        expect(stacks[1]?.className).toContain('gap-0.5');
        expect(stacks[1]?.className).toContain('@md/brief:flex');
        expect(stacks[1]?.className).toContain('@md/brief:flex-wrap');
    });
});
