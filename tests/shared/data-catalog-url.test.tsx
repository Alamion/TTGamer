// @vitest-environment happy-dom

import type { CatalogColumnDef } from '@site/src/shared/components/catalogTable';
import { DataCatalog } from '@site/src/shared/components/DataCatalog';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ search: '' }));

vi.mock('@docusaurus/router', () => ({
    useLocation: () => ({ pathname: '/', search: router.search, hash: '', state: undefined }),
    useHistory: () => ({ replace: () => undefined, push: () => undefined }),
}));

interface Row {
    id: string;
    name: string;
}

const ROWS: Row[] = Array.from({ length: 40 }, (_, index) => ({
    id: `row-${index}`,
    name: `Row ${index}`,
}));

const COLUMNS: CatalogColumnDef<Row>[] = [
    { id: 'name', header: 'Name', accessorKey: 'name', enableSorting: false },
];

function renderCatalog() {
    return render(
        createElement(DataCatalog<Row>, {
            data: ROWS,
            columns: COLUMNS,
            renderDetail: (row) => row.name,
            pageSize: 10,
        })
    );
}

beforeAll(() => {
    globalThis.matchMedia ??= (() => ({
        matches: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    })) as never;
});

afterEach(() => {
    cleanup();
    router.search = '';
});

describe('DataCatalog state from the URL on the first render', () => {
    it('opens on the page the URL names', () => {
        router.search = '?page=3';
        renderCatalog();
        expect(screen.queryByText('Row 20')).not.toBeNull();
        expect(screen.queryByText('Row 0')).toBeNull();
    });

    it('applies the search the URL carries', () => {
        router.search = '?search=Row%2033';
        renderCatalog();
        expect(screen.queryByText('Row 33')).not.toBeNull();
        expect(screen.queryByText('Row 0')).toBeNull();
    });
});
