// @vitest-environment jsdom
import { CharacterContext } from '@site/src/sheet_manager/context/CharacterContext';
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

/** Built-in trackers with the page's settings (spec 018, US6). */

vi.setConfig({ testTimeout: 20_000 });

interface Target {
    systemId: string;
    definitionId: string;
}

const SW_CHARACTER = { systemId: 'star-wars-wod', definitionId: 'character' };
const SW_DROID = { systemId: 'star-wars-wod', definitionId: 'droid' };
const SW_CREATURE = { systemId: 'star-wars-wod', definitionId: 'creature' };
const SW_VEHICLE = { systemId: 'star-wars-wod', definitionId: 'vehicle' };
const WOD2E = { systemId: 'wod-2e', definitionId: 'wod2e-character' };
const HUNTER = { systemId: 'wod-v5', definitionId: 'hunter' };

function definition(target: Target) {
    return systemRegistry.getDocumentDefinition(target.systemId, target.definitionId)!;
}

function page(target: Target, children: unknown[], id = 'tpl-builtin') {
    return CustomTemplateSchema.parse({
        id,
        name: 'Built-in trackers',
        systemId: target.systemId,
        documentKind: definition(target).kind,
        schemaVersion: 3,
        children,
    });
}

const track = (bindingKey: string, extra: Record<string, unknown> = {}) => ({
    id: 'wounds',
    type: 'primitive',
    bindingKey,
    label: 'Wounds',
    ...extra,
});

function seed(target: Target, patch: Record<string, unknown> = {}, values = {}) {
    const def = definition(target);
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-builtin',
                kind: def.kind,
                systemId: target.systemId,
                definitionId: target.definitionId,
                schemaVersion: def.schemaVersion,
                metadata: { title: 'Kira', tags: [] },
                templateValues: values,
                data: { ...(def.createDefault() as object), ...patch },
            } as never,
        ],
        currentDocumentId: 'doc-builtin',
    });
}

function mount(template: ReturnType<typeof page>, { readOnly = false } = {}) {
    useTemplateStore.setState({ templates: [template], quarantine: [], defaultOverrides: {} });
    const view = createElement(DeclarativeSheetView, { template });
    return render(
        readOnly
            ? createElement(
                  CharacterContext.Provider,
                  { value: { character: null, readOnly: true } },
                  view
              )
            : view
    );
}

/** A built-in tracker that names its marks under it (off by default). */
const named = { tracker: { legend: true } };
const stored = () => useDocumentStore.getState().documents[0]!;
const totalRow = () => document.querySelector('[data-tracker-total]') as HTMLElement | null;
const legend = () =>
    within(screen.getByRole('list'))
        .getAllByRole('listitem')
        .map((item) => item.textContent);
const levelNames = () => screen.getAllByRole('rowheader').map((header) => header.textContent);

beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => undefined;
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
});

afterEach(() => {
    cleanup();
    takeSheetIssues();
});

describe('page settings of a built-in tracker', () => {
    it('renames one level and keeps the game values of the others', () => {
        seed(SW_CHARACTER);
        mount(
            page(SW_CHARACTER, [
                track('track:health', {
                    tracker: { levels: [null, { name: 'Grazed' }], total: true },
                }),
            ])
        );
        expect(levelNames().slice(0, 3)).toEqual(['Bruised', 'Grazed', 'Injured']);
        fireEvent.click(screen.getByRole('button', { name: 'Grazed: empty' }));
        expect(totalRow()!.textContent).toContain('-1');
        fireEvent.click(screen.getByRole('button', { name: 'Injured: empty' }));
        expect(totalRow()!.textContent).toContain('-2');
        fireEvent.click(screen.getByRole('button', { name: 'Wounded: empty' }));
        expect(totalRow()!.textContent).toContain('-3');
    });

    it('keeps extra column values in the page and marks in the document', () => {
        seed(SW_CHARACTER);
        const withSource = page(SW_CHARACTER, [
            track('track:health', {
                tracker: { columns: [{ id: 'source', kind: 'text', title: 'Source' }] },
            }),
        ]);
        mount(withSource);
        fireEvent.click(screen.getByRole('button', { name: 'Hurt: empty' }));
        fireEvent.change(screen.getByLabelText('Source — Hurt'), { target: { value: 'Blaster' } });
        expect(stored().templateValues?.wounds).toEqual({
            tracker: 1,
            columns: { source: [{ id: 'a', texts: { hurt: 'Blaster' } }] },
        });
        const health = (stored().data as { health: { levels: string[] } }).health.levels;
        expect(health[1]).toBe('slash');

        // Another page of the same document shares the marks, not the page's column.
        cleanup();
        mount(page(SW_CHARACTER, [track('track:health')], 'tpl-plain'));
        expect(screen.getByRole('button', { name: 'Hurt: Bashing' })).toBeTruthy();
        expect(screen.queryByLabelText('Source — Hurt')).toBeNull();
    });

    it('shows renamed and recolored marks in the legend', () => {
        seed(SW_CHARACTER, {
            health: { levels: ['cross', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'] },
        });
        mount(
            page(SW_CHARACTER, [
                track('track:health', {
                    tracker: { legend: true, marks: { cross: { name: 'Wound', fill: '#aa0000' } } },
                }),
            ])
        );
        expect(legend()).toEqual(['╱Bashing', '×Wound']);
        expect(screen.getByRole('button', { name: 'Bruised: Wound' }).style.backgroundColor).toBe(
            'rgb(170, 0, 0)'
        );
    });

    it('reports stored values of extra columns the page lost', () => {
        seed(
            SW_CHARACTER,
            {},
            { wounds: { tracker: 1, columns: { gone: [{ id: 'a', texts: { hurt: 'x' } }] } } }
        );
        mount(page(SW_CHARACTER, [track('track:health', { tracker: { columns: [] } })]));
        const hidden = takeSheetIssues().filter(({ code }) => code === 'template-value-hidden');
        expect(hidden).toHaveLength(1);
    });

    it('changes nothing on a read-only sheet', () => {
        seed(SW_CHARACTER);
        mount(page(SW_CHARACTER, [track('track:health')]), { readOnly: true });
        expect(
            (screen.getByRole('button', { name: 'Hurt: empty' }) as HTMLButtonElement).disabled
        ).toBe(true);
    });
});

describe('shipped pages and game marks', () => {
    it('shows the total penalty row on the Star Wars character page', () => {
        seed(SW_CHARACTER, {
            health: { levels: ['slash', 'slash', 'empty', 'empty', 'empty', 'empty', 'empty'] },
        });
        const shipped = systemRegistry
            .getSystem('star-wars-wod')!
            .defaultTemplates!.find(({ id }) => id === 'full-sheet')!;
        mount(shipped);
        expect(totalRow()!.textContent).toContain('-1');
        // The divider takes the table's border color, with no background.
        expect(totalRow()!.className).not.toMatch(/\bbg-/);
    });

    it('names bashing and lethal on WoD 2e health, with no total row or legend by default', () => {
        seed(WOD2E);
        mount(page(WOD2E, [track('track:health')]));
        expect(totalRow()).toBeNull();
        expect(screen.queryByRole('list')).toBeNull();
        cleanup();
        mount(page(WOD2E, [track('track:health', named)]));
        expect(legend()).toEqual(['╱Bashing', '×Lethal']);
    });

    it('uses the generic names on droid and vehicle damage', () => {
        seed(SW_DROID);
        mount(page(SW_DROID, [track('track:droid-damage', named)]));
        expect(legend()).toEqual(['╱Slash', '×Cross']);
        cleanup();
        seed(SW_VEHICLE);
        mount(page(SW_VEHICLE, [track('track:members-damage', named)]));
        expect(legend()).toEqual(['╱Slash', '×Cross']);
    });

    it('names superficial and aggravated on V5 tracks and keeps the length switch', () => {
        seed(HUNTER);
        mount(page(HUNTER, [track('track:health', { ...named, label: 'Health' })]));
        expect(legend()).toEqual(['╱Superficial', '×Aggravated']);
        const before = screen.getAllByRole('button', { name: /^Health \d+:/ }).length;
        fireEvent.click(screen.getByRole('button', { name: 'Extend Health' }));
        expect(screen.getAllByRole('button', { name: /^Health \d+:/ })).toHaveLength(before + 1);
    });

    it('adds the total row to a member track once it has two members', () => {
        seed(SW_CREATURE);
        mount(page(SW_CREATURE, [track('track:members-health')]));
        expect(totalRow()).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Add member' }));
        expect(totalRow()).not.toBeNull();
    });
});

describe('the brush on built-in trackers (spec 019)', () => {
    it('puts the brush mark in the game data and takes it off again', () => {
        seed(SW_CHARACTER);
        mount(page(SW_CHARACTER, [track('track:health', named)]));
        fireEvent.click(screen.getByRole('button', { name: 'Lethal' }));
        fireEvent.click(screen.getByRole('button', { name: 'Hurt: empty' }));
        const health = () => (stored().data as { health: { levels: string[] } }).health.levels;
        expect(health()[1]).toBe('cross');
        fireEvent.click(screen.getByRole('button', { name: 'Hurt: Lethal' }));
        expect(health()[1]).toBe('empty');
    });

    it('marks each member of a member track on its own', () => {
        seed(SW_CREATURE);
        mount(page(SW_CREATURE, [track('track:members-health', named)]));
        fireEvent.click(screen.getByRole('button', { name: 'Add member' }));
        fireEvent.click(screen.getByRole('button', { name: 'Lethal' }));
        const [first, second] = screen.getAllByRole('button', { name: /Hurt: empty$/ });
        fireEvent.click(second!);
        expect(screen.getAllByRole('button', { name: /Hurt: Lethal$/ })).toHaveLength(1);
        fireEvent.click(first!);
        expect(screen.getAllByRole('button', { name: /Hurt: Lethal$/ })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: /Member/ }).length).toBeGreaterThan(0);
    });
});

describe('templates saved before one display setting', () => {
    it('draws a compact track as one small line', () => {
        seed(SW_CHARACTER);
        mount(page(SW_CHARACTER, [track('track:health', { compact: true })]));
        expect(screen.queryByRole('table')).toBeNull();
        expect(screen.getByRole('button', { name: 'Hurt: empty' }).className).toContain('h-6');
    });

    it('keeps a stored view, and draws a computed track as a strip by default', () => {
        seed(HUNTER);
        mount(page(HUNTER, [track('track:health', { trackLayout: 'table' })]));
        expect(screen.getByRole('table')).toBeTruthy();
        cleanup();
        mount(page(HUNTER, [track('track:health')]));
        expect(screen.queryByRole('table')).toBeNull();
    });

    it('keeps a legacy level count override', () => {
        seed(SW_CHARACTER);
        mount(
            page(SW_CHARACTER, [
                track('track:health', {
                    track: { levels: 3, names: ['Scratched', 'Cut', 'Down'] },
                }),
            ])
        );
        expect(levelNames()).toEqual(['Scratched', 'Cut', 'Down']);
    });
});
