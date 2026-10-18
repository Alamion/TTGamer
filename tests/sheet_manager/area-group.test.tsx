// @vitest-environment happy-dom

import {
    CustomTemplateSchema,
    TEMPLATE_SCHEMA_VERSION,
} from '@site/src/sheet_manager/types/template';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { mountSheet } from './helpers/sheet';

function rating(id: string, label: string, column: number) {
    return {
        id,
        type: 'rating',
        label,
        required: false,
        min: 0,
        max: 5,
        presentation: 'dots',
        column,
    };
}

function group(id: string, type: 'group' | 'brief') {
    return {
        id,
        type,
        title: id,
        collapsible: false,
        columns: 3,
        children: [rating(`${id}-a`, 'Alpha', 1), rating(`${id}-b`, 'Beta', 2)],
    };
}

/** A full page with a card and a brief with a block (spec 041): the same content. */
const page = (brief: boolean) =>
    CustomTemplateSchema.parse({
        id: brief ? 'area-brief' : 'area-full',
        name: 'Area kit',
        documentKind: 'character',
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        ...(brief ? { pageKind: 'brief' } : {}),
        children: [group(brief ? 'areal' : 'plain', brief ? 'brief' : 'group')],
    });

/** The column stacks of a card on a full page and of a block on a brief. */
function stacks() {
    const plain = mountSheet(page(false)).container.querySelector('[data-column="1"]')!;
    const area = mountSheet(page(true)).container.querySelectorAll('[data-column="1"]');
    return [plain, area[area.length - 1]!];
}

describe('area layout of a brief block (spec 033, 041)', () => {
    afterEach(cleanup);

    it('draws a brief block from the width of the sheet area and leaves cards alone', () => {
        const [plain, area] = stacks().map((stack) => stack.parentElement?.className ?? '');
        expect(plain).toBe('grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3');
        expect(area).toContain('grid-cols-3');
        expect(area).toContain('@max-[259px]/brief:grid-cols-1');
        expect(area).not.toContain('md:');
        expect(area).not.toContain('xl:');
    });

    it('names the sheet root as the area every query measures', () => {
        const { container } = mountSheet(page(true));
        const root = container.querySelector('[data-template-root]');
        expect(root?.className).toContain('@container/brief');
    });

    it('flows a brief block column in rows when narrow and as wrapping chips when wide', () => {
        const [plain, area] = stacks();
        expect(plain.className).toBe('grid grid-cols-1 content-start gap-4');
        expect(area.className).toContain('gap-0.5');
        expect(area.className).toContain('@md/brief:flex');
        expect(area.className).toContain('@md/brief:flex-wrap');
    });
});
