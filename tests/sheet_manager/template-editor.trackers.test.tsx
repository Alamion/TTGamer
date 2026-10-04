// @vitest-environment jsdom

import { TemplateEditorDialog } from '@site/src/sheet_manager/components/dialogs/TemplateEditorDialog';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import type { TemplateNode } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { outlineRow, selectInOutline, settings } from './helpers/templateEditor';

// Full editor renders are slow under a loaded test run.
vi.setConfig({ testTimeout: 20_000 });

describe('tracker settings (spec 018)', () => {
    afterEach(cleanup);

    const TRACKER = {
        id: 'wounds',
        type: 'tracker',
        label: 'Wounds',
        marks: [
            { id: 'bashing', name: 'Bashing', symbol: '╱', fill: 'secondary' },
            { id: 'lethal', name: 'Lethal', symbol: '×', fill: 'error' },
        ],
        levels: [
            { id: 'hurt', name: 'Hurt', value: '-1' },
            { id: 'injured', name: 'Injured', value: '-1' },
            { id: 'down', name: 'Down', value: '' },
        ],
        columns: [{ id: 'damage', kind: 'marks', title: 'Damage' }],
    };

    function openTracker(extra: Record<string, unknown> = {}) {
        const template = CustomTemplateSchema.parse({
            id: 'tracker-kit',
            name: 'Tracker Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [{ ...TRACKER, ...extra }],
        });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
        selectInOutline('wounds');
        return settings('wounds');
    }

    const levelNames = (panel: HTMLElement) =>
        within(panel)
            .getAllByLabelText(/^Level \d+ name$/)
            .map((input) => (input as HTMLInputElement).value);

    it('moves levels up and down, adds, and removes them', () => {
        const panel = openTracker();
        fireEvent.click(within(panel).getByRole('button', { name: 'Move level 1 down' }));
        expect(levelNames(settings('wounds'))).toEqual(['Injured', 'Hurt', 'Down']);
        fireEvent.click(
            within(settings('wounds')).getByRole('button', { name: 'Move level 3 up' })
        );
        expect(levelNames(settings('wounds'))).toEqual(['Injured', 'Down', 'Hurt']);
        expect(
            (
                within(settings('wounds')).getByRole('button', {
                    name: 'Move level 1 up',
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);
        fireEvent.click(within(settings('wounds')).getByRole('button', { name: 'Add level' }));
        expect(levelNames(settings('wounds'))).toHaveLength(4);
        fireEvent.click(within(settings('wounds')).getByRole('button', { name: 'Remove level 4' }));
        expect(levelNames(settings('wounds'))).toHaveLength(3);
    });

    it('renames and hides the value column, and the sheet follows', () => {
        const panel = openTracker();
        fireEvent.change(within(panel).getByLabelText('Value column title'), {
            target: { value: 'Bonus' },
        });
        expect(screen.getAllByText('Bonus').length).toBeGreaterThan(0);
        fireEvent.click(within(settings('wounds')).getByLabelText('Show'));
        expect(
            (within(settings('wounds')).getByLabelText('Level 1 value') as HTMLInputElement)
                .disabled
        ).toBe(true);
    });

    it('starts marks from a ready set and moves a mark down', () => {
        const panel = openTracker();
        fireEvent.change(within(panel).getByLabelText('Start from…'), {
            target: { value: 'three' },
        });
        const names = () =>
            within(settings('wounds'))
                .getAllByLabelText(/^Mark \d+ name$/)
                .map((input) => (input as HTMLInputElement).value);
        expect(names()).toEqual(['Bashing', 'Lethal', 'Aggravated']);
        fireEvent.click(
            within(settings('wounds')).getByRole('button', { name: 'Move mark 1 down' })
        );
        expect(names()).toEqual(['Lethal', 'Bashing', 'Aggravated']);
        expect(
            (
                within(settings('wounds')).getByRole('button', {
                    name: 'Add mark',
                }) as HTMLButtonElement
            ).disabled
        ).toBe(false);
    });

    it('switches the display with one setting', () => {
        const panel = openTracker();
        const strip = within(panel).getByRole('button', { name: 'Strip' });
        fireEvent.click(strip);
        expect(
            within(settings('wounds'))
                .getByRole('button', { name: 'Strip' })
                .getAttribute('aria-pressed')
        ).toBe('true');
    });

    it('asks before a save hides stored marks, and keeps the draft on cancel', () => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
        useDocumentStore.setState({
            documents: [
                {
                    id: 'doc-wounds',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'character',
                    schemaVersion: 1,
                    metadata: { title: 'Kira', tags: [] },
                    templateValues: {
                        wounds: {
                            tracker: 1,
                            columns: { damage: [{ id: 'a', marks: { hurt: 'lethal' } }] },
                        },
                    },
                    data: {},
                } as never,
            ],
        });
        const panel = openTracker();
        fireEvent.click(within(panel).getByRole('button', { name: 'Remove mark 2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const dialog = screen.getByRole('dialog', { name: 'Hide stored tracker values?' });
        expect(dialog.textContent).toContain(
            'Wounds: 1 stored mark in 1 sheet will no longer be shown.'
        );
        fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cancel' })[0]!);
        expect(useTemplateStore.getState().templates).toHaveLength(0);
        expect(within(settings('wounds')).getAllByLabelText(/^Mark \d+ name$/)).toHaveLength(1);
        useDocumentStore.setState({ documents: [] });
    });

    function openBuiltIn(tracker: Record<string, unknown> = {}) {
        const template = CustomTemplateSchema.parse({
            id: 'builtin-kit',
            name: 'Built-in Kit',
            documentKind: 'character',
            schemaVersion: 3,
            children: [
                {
                    id: 'wounds',
                    type: 'primitive',
                    bindingKey: 'track:health',
                    label: 'Wounds',
                    tracker,
                },
            ],
        });
        render(
            createElement(TemplateEditorDialog, {
                base: { kind: 'edit', template },
                onClose: () => {},
            })
        );
        selectInOutline('wounds');
        return settings('wounds');
    }

    it('names the marks under the tracker only when the author turns it on', () => {
        const panel = openTracker();
        const legend = () =>
            screen.queryAllByRole('listitem').find((item) => item.textContent === '×Lethal') ??
            null;
        const toggle = within(panel).getByLabelText(
            'Name the marks under the tracker'
        ) as HTMLInputElement;
        expect(toggle.checked).toBe(false);
        expect(legend()).toBeNull();
        fireEvent.click(toggle);
        expect(legend()).not.toBeNull();
        cleanup();

        const builtIn = openBuiltIn();
        fireEvent.click(within(builtIn).getByLabelText('Name the marks under the tracker'));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates[0]!.children[0] as TemplateNode & {
            tracker?: unknown;
        };
        expect(saved.tracker).toEqual({ legend: true });
    });

    it('puts a mark on the outline layer and starts from points (spec 019)', () => {
        openTracker();
        const layer = (n: number) =>
            within(settings('wounds')).getByRole('group', { name: `Mark ${n} layer` });
        fireEvent.click(within(layer(2)).getByRole('button', { name: 'Outline' }));
        expect(
            within(layer(2)).getByRole('button', { name: 'Outline' }).getAttribute('aria-pressed')
        ).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates.find(({ id }) => id === 'tracker-kit')!
            .children[0] as TemplateNode & {
            marks: { id: string; layer: string }[];
        };
        expect(saved.marks.map(({ id, layer }) => [id, layer])).toEqual([
            ['bashing', 'fill'],
            ['lethal', 'outline'],
        ]);
        cleanup();

        openTracker();
        fireEvent.change(within(settings('wounds')).getByLabelText('Start from…'), {
            target: { value: 'points' },
        });
        expect(
            within(layer(1)).getByRole('button', { name: 'Fill' }).getAttribute('aria-pressed')
        ).toBe('true');
        expect(
            within(layer(2)).getByRole('button', { name: 'Outline' }).getAttribute('aria-pressed')
        ).toBe('true');
    });

    it('reads marks from the start and counts them (spec 020)', () => {
        const panel = openTracker();
        const fromStart = () =>
            within(settings('wounds')).getByLabelText(
                'Marks fill from the start'
            ) as HTMLInputElement;
        const inside = () =>
            within(settings('wounds')).queryByLabelText('Fills stay inside the outline');
        const reads = () =>
            within(settings('wounds')).getByRole('group', { name: 'The total reads' });
        expect(fromStart().checked).toBe(false);
        expect(inside()).toBeNull();
        expect(
            within(reads())
                .getByRole('button', { name: /Deepest level/ })
                .getAttribute('aria-pressed')
        ).toBe('true');
        fireEvent.click(fromStart());
        fireEvent.click(inside()!);
        fireEvent.click(within(reads()).getByRole('button', { name: 'Count' }));
        expect(within(panel).getByText(/how many are framed/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates.find(({ id }) => id === 'tracker-kit')!
            .children[0] as TemplateNode & Record<string, unknown>;
        expect(saved).toMatchObject({ fromStart: true, fillInside: true, totalReads: 'count' });
        cleanup();

        openTracker();
        fireEvent.change(within(settings('wounds')).getByLabelText('Start from…'), {
            target: { value: 'points' },
        });
        expect(fromStart().checked).toBe(true);
        expect(
            within(reads()).getByRole('button', { name: 'Count' }).getAttribute('aria-pressed')
        ).toBe('true');
    });

    it('draws a resource field as a tracker of at most twenty boxes (spec 020)', () => {
        const open = (max: number) => {
            render(
                createElement(TemplateEditorDialog, {
                    base: {
                        kind: 'edit',
                        template: CustomTemplateSchema.parse({
                            id: 'resource-kit',
                            name: 'Resource Kit',
                            documentKind: 'character',
                            schemaVersion: 3,
                            children: [{ id: 'luck', type: 'resource', label: 'Luck', max }],
                        }),
                    },
                    onClose: () => {},
                })
            );
            selectInOutline('luck');
            return within(settings('luck')).getByRole('group', { name: 'Display' });
        };
        let display = open(30);
        const tracker = within(display).getByRole('button', { name: 'Tracker' });
        expect((tracker as HTMLButtonElement).disabled).toBe(true);
        expect(within(settings('luck')).getByText(/up to 20 boxes/)).toBeTruthy();
        cleanup();

        display = open(8);
        expect(
            within(display).getByRole('button', { name: 'Numbers' }).getAttribute('aria-pressed')
        ).toBe('true');
        fireEvent.click(within(display).getByRole('button', { name: 'Tracker' }));
        const look = within(settings('luck')).getByRole('group', { name: 'Look' });
        fireEvent.click(within(look).getByRole('button', { name: 'One line' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates.find(({ id }) => id === 'resource-kit')!
            .children[0] as TemplateNode & Record<string, unknown>;
        expect(saved).toMatchObject({
            poolTracker: { display: 'line', legend: false, total: true },
        });
    });

    it('offers no point-reading settings on built-in trackers', () => {
        const panel = openBuiltIn();
        expect(within(panel).queryByLabelText('Marks fill from the start')).toBeNull();
        expect(within(panel).queryByRole('group', { name: 'The total reads' })).toBeNull();
    });

    it('keeps the layer of built-in marks locked to fill', () => {
        const panel = openBuiltIn();
        const layer = within(panel).getByRole('group', { name: 'Mark 2 layer' });
        const outline = within(layer).getByRole('button', { name: 'Outline' }) as HTMLButtonElement;
        expect(outline.disabled).toBe(true);
        expect(within(panel).getByText(/keeps one mark per box/)).toBeTruthy();
    });

    it('lets a built-in tracker rename its marks but not add or reorder them', () => {
        const panel = openBuiltIn();
        expect(within(panel).queryByRole('button', { name: 'Add mark' })).toBeNull();
        expect(
            (within(panel).getByRole('button', { name: 'Move mark 1 down' }) as HTMLButtonElement)
                .disabled
        ).toBe(true);
        const name = within(panel).getByLabelText('Mark 1 name') as HTMLInputElement;
        expect(name.placeholder).toBe('Bashing');
        fireEvent.change(name, { target: { value: 'Graze' } });
        fireEvent.change(within(settings('wounds')).getByLabelText('Level 2 value'), {
            target: { value: '-4' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const saved = useTemplateStore.getState().templates[0]!.children[0] as TemplateNode & {
            tracker?: unknown;
        };
        expect(saved.tracker).toEqual({
            marks: { slash: { name: 'Graze' } },
            levels: [null, { value: '-4' }],
        });
    });

    it('asks before a save hides values of a built-in tracker extra column', () => {
        useTemplateStore.setState({ templates: [], quarantine: [] });
        useDocumentStore.setState({
            documents: [
                {
                    id: 'doc-source',
                    kind: 'character',
                    systemId: 'star-wars-wod',
                    definitionId: 'character',
                    schemaVersion: 1,
                    metadata: { title: 'Kira', tags: [] },
                    templateValues: {
                        wounds: {
                            tracker: 1,
                            columns: { source: [{ id: 'a', texts: { hurt: 'Blaster' } }] },
                        },
                    },
                    data: {},
                } as never,
            ],
        });
        const panel = openBuiltIn({
            columns: [{ id: 'source', kind: 'text', title: 'Source' }],
        });
        fireEvent.click(within(panel).getByRole('button', { name: 'Remove column 1' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const dialog = screen.getByRole('dialog', { name: 'Hide stored tracker values?' });
        expect(dialog.textContent).toContain('1 stored note in 1 sheet');
        useDocumentStore.setState({ documents: [] });
    });

    it('switches the source to a built-in track and back', () => {
        const panel = openTracker({ display: 'strip' });
        fireEvent.change(within(panel).getByLabelText('Source'), {
            target: { value: 'track:health' },
        });
        expect(outlineRow('wounds').getAttribute('data-node-type')).toBe('primitive');
        selectInOutline('wounds');
        fireEvent.change(within(settings('wounds')).getByLabelText('Source'), {
            target: { value: 'custom' },
        });
        expect(outlineRow('wounds').getAttribute('data-node-type')).toBe('tracker');
        selectInOutline('wounds');
        expect(
            within(settings('wounds'))
                .getByRole('button', { name: 'Strip' })
                .getAttribute('aria-pressed')
        ).toBe('true');
    });

    it('turns every taken-over mark into a fill when a built-in tracker gets own values', () => {
        openTracker({
            marks: [
                { id: 'bashing', name: 'Bashing', symbol: '╱', fill: 'secondary' },
                { id: 'bleed', name: 'Bleed', symbol: '!', fill: 'error', layer: 'outline' },
            ],
        });
        fireEvent.change(within(settings('wounds')).getByLabelText('Source'), {
            target: { value: 'track:health' },
        });
        selectInOutline('wounds');
        fireEvent.change(within(settings('wounds')).getByLabelText('Source'), {
            target: { value: 'custom' },
        });
        selectInOutline('wounds');
        const panel = settings('wounds');
        for (const n of [1, 2]) {
            const group = within(panel).getByRole('group', { name: `Mark ${n} layer` });
            expect(
                within(group).getByRole('button', { name: 'Fill' }).getAttribute('aria-pressed')
            ).toBe('true');
        }
    });
});
