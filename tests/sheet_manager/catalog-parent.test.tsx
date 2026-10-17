// @vitest-environment happy-dom
import { CatalogTable } from '@site/src/sheet_manager/components/dialogs/library/CatalogTable';
import { setColumnCatalog } from '@site/src/sheet_manager/features/sheet/data/catalogEdit';
import type { CatalogNode } from '@site/src/sheet_manager/features/sheet/data/libraryTree';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { UserCatalogSchema } from '@site/src/sheet_manager/systems/userCatalogs';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** User catalogs with parents, and table rows limited by the parent's rating (spec 038, US5). */

const SCHOOL = 'c-school01';
const LEVEL = 'c-level001';
const owner = { rulesetId: 'wod-2e' };
const stamp = { createdAt: '2026-10-17T00:00:00.000Z', updatedAt: '2026-10-17T00:00:00.000Z' };

const schools = UserCatalogSchema.parse({
    id: 'user-catalog-schools1',
    name: 'Schools',
    owner,
    columns: [],
    entries: [
        { id: 'e-fire0001', name: 'Fire', values: {} },
        { id: 'e-frost001', name: 'Frost', values: {} },
    ],
    ...stamp,
});

const spells = UserCatalogSchema.parse({
    id: 'user-catalog-spells01',
    name: 'Spells',
    owner,
    columns: [
        { id: SCHOOL, name: 'School', type: 'entry', catalogId: schools.id },
        { id: LEVEL, name: 'Level', type: 'number' },
    ],
    entries: [
        { id: 'e-spark001', name: 'Spark', values: { [SCHOOL]: 'e-fire0001', [LEVEL]: 1 } },
        { id: 'e-blaze001', name: 'Blaze', values: { [SCHOOL]: 'e-fire0001', [LEVEL]: 3 } },
        { id: 'e-chill001', name: 'Chill', values: { [SCHOOL]: 'e-frost001', [LEVEL]: 1 } },
        { id: 'e-gone0001', name: 'Orphan', values: { [SCHOOL]: 'e-missing1', [LEVEL]: 1 } },
    ],
    ...stamp,
});

describe('entry columns', () => {
    afterEach(cleanup);

    it('choose an entry of the parent catalog and mark a parent that is gone', () => {
        useDocumentTypeStore.setState({
            catalogs: { [schools.id]: schools, [spells.id]: spells },
        });
        render(
            createElement(CatalogTable, {
                node: {
                    level: 'catalog',
                    ref: { kind: 'user', catalogId: spells.id },
                    name: 'Spells',
                    entryCount: spells.entries.length,
                } as unknown as CatalogNode,
            })
        );
        const spark = screen.getByLabelText('School of Spark') as HTMLSelectElement;
        expect(spark.value).toBe('e-fire0001');
        expect([...spark.options].map(({ textContent }) => textContent)).toEqual([
            '—',
            'Fire',
            'Frost',
        ]);
        expect(screen.getByText('No entry "e-missing1" in Schools')).not.toBeNull();
    });

    it('keep the parent catalog and entry ids, and can point elsewhere', () => {
        expect(spells.columns[0]).toMatchObject({ type: 'entry', catalogId: schools.id });
        expect(spells.entries[0]!.values[SCHOOL]).toBe('e-fire0001');
        const result = setColumnCatalog(spells, SCHOOL, undefined, stamp.updatedAt);
        expect(result.ok && result.catalog.columns[0]).not.toHaveProperty('catalogId');
    });
});

function mount(values: Record<string, unknown>) {
    const template = CustomTemplateSchema.parse({
        id: 'parent-kit',
        name: 'Parent Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'schools',
                type: 'list',
                title: 'Schools',
                valueKey: 'schools',
                catalog: { catalogId: schools.id },
                item: { id: 'school-item', type: 'rating', label: 'School', min: 0, max: 5 },
            },
            {
                id: 'spells',
                type: 'table',
                title: 'Spells',
                columns: [
                    {
                        id: 'spell',
                        type: 'select',
                        label: 'Spell',
                        options: [{ id: 'placeholder', label: 'Placeholder' }],
                        binding: {
                            catalogId: spells.id,
                            parent: { list: 'schools', via: SCHOOL, level: LEVEL },
                        },
                    },
                ],
            },
        ],
    });
    useDocumentTypeStore.setState({
        catalogs: { [schools.id]: schools, [spells.id]: spells },
    });
    useTemplateStore.setState({ templates: [template], quarantine: [] });
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-parent',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'star-wars-wod-character',
                schemaVersion: 1,
                metadata: { title: 'Kira', tags: [] },
                templateValues: values,
                data: { metadata: { name: '', type: 'sentient' } },
            } as never,
        ],
        currentDocumentId: 'doc-parent',
    });
    render(createElement(DeclarativeSheetView, { template }));
}

const offered = () =>
    within(screen.getByRole('table'))
        .getAllByRole('option')
        .map((option) => option.textContent)
        .filter((name) => name && name !== '—');

describe('rows limited by their parent', () => {
    afterEach(() => {
        cleanup();
        takeSheetIssues();
    });

    it('offers the entries of the parents on the page up to their rating', () => {
        mount({
            schools: [{ id: 's1', label: 'Fire', value: 2 }],
            spells: { '0': {} },
        });
        expect(offered()).toEqual(['Spark']);
    });

    it('offers everything while no parent is on the page', () => {
        mount({ schools: [], spells: { '0': {} } });
        expect(offered()).toEqual(['Spark', 'Blaze', 'Chill', 'Orphan']);
    });

    it('keeps a row above its parent and marks it', () => {
        mount({
            schools: [{ id: 's1', label: 'Fire', value: 2 }],
            spells: { '0': { spell: 'e-blaze001' } },
        });
        expect(screen.getByText('above Fire 2')).not.toBeNull();
    });
});
