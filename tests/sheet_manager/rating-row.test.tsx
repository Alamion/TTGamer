// @vitest-environment jsdom
import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { RatingFlag } from '@site/src/sheet_manager/types/template';
import { CustomTemplateSchema, RATING_FLAGS } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rolls = vi.hoisted(() => ({
    queued: [] as Array<{ notation: string; statLabel?: string; characterName?: string }>,
}));

vi.mock('@site/src/integrations/sheet-dice/useSheetDiceActions', () => ({
    useSheetDiceActions: ({
        statLabel,
        characterName,
    }: {
        statLabel?: string;
        characterName?: string;
    }) => ({
        queueNotation: (notation: string) =>
            rolls.queued.push({ notation, statLabel, characterName }),
        rollImmediately: async () => undefined,
    }),
}));

function rating(id: string, label: string, extra: Record<string, unknown> = {}) {
    return { id, label, type: 'rating', max: 5, ...extra };
}

function page(children: unknown[], systemId = 'star-wars-wod') {
    return CustomTemplateSchema.parse({
        id: 'rating-kit',
        name: 'Rating Kit',
        systemId,
        documentKind: 'character',
        schemaVersion: 3,
        children,
    });
}

function seed(systemId = 'star-wars-wod', templateValues: Record<string, unknown> = {}) {
    useDocumentStore.setState({
        documents: [
            {
                id: 'doc-rating',
                kind: 'character',
                systemId,
                definitionId: systemId === 'wod-v5' ? 'v5-character' : 'character',
                schemaVersion: 1,
                metadata: { title: 'Kira', tags: [] },
                templateValues,
                data: {},
            } as never,
        ],
        currentDocumentId: 'doc-rating',
    });
}

function mount(template: ReturnType<typeof page>) {
    useTemplateStore.setState({ templates: [template], quarantine: [] });
    return render(createElement(DeclarativeSheetView, { template }));
}

const values = () => useDocumentStore.getState().documents[0]!.templateValues ?? {};
const dots = (label: string) =>
    screen.getAllByRole('radio', { name: new RegExp(`^${label}: \\d+$`) });

beforeEach(() => {
    rolls.queued.length = 0;
    seed();
});

afterEach(cleanup);

describe('rating row layout (spec 014, US1)', () => {
    it('puts the label beside the dots on one trait row, without numbers by default', () => {
        mount(page([rating('renown', 'Renown')]));
        const row = screen.getByText('Renown').closest('.term-row')!;
        expect(within(row as HTMLElement).getAllByRole('radio')).toHaveLength(5);
        expect(row.textContent).not.toMatch(/\d+ \/ 5/);
    });

    it('hides the label visually but keeps it for assistive technology', () => {
        mount(page([rating('renown', 'Renown', { hideLabel: true })]));
        expect(screen.getByText('Renown').closest('.sr-only')).not.toBeNull();
        expect(dots('Renown')).toHaveLength(5);
    });

    it('stores the text input beside the number', () => {
        seed('star-wars-wod', { renown: 3 });
        mount(page([rating('renown', 'Renown', { textInput: true })]));
        const input = screen.getByRole('textbox', { name: 'Renown: text' });
        fireEvent.change(input, { target: { value: 'Politics' } });
        expect(values()).toEqual({ renown: 3, 'renown#detail': { text: 'Politics' } });
        expect((input as HTMLInputElement).value).toBe('Politics');
        expect(input.closest('.term-row-specialty')).not.toBeNull();
    });

    it('shows current and maximum only when asked', () => {
        seed('star-wars-wod', { renown: 3 });
        mount(page([rating('renown', 'Renown', { showNumbers: true })]));
        expect(screen.getByText('3 / 5')).not.toBeNull();
    });

    it('bounds the number style by the effective maximum', () => {
        mount(page([rating('renown', 'Renown', { presentation: 'number', max: 7 })]));
        const input = screen.getByLabelText('Renown') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '9' } });
        fireEvent.blur(input);
        expect(values().renown).toBe(7);
    });
});

describe('rolling a rating (spec 014, US2)', () => {
    const flagSets: RatingFlag[][] = [
        [],
        ['specialization'],
        ['practiced'],
        ['experienced'],
        ['specialization', 'experienced'],
        [...RATING_FLAGS],
    ];

    for (const systemId of ['star-wars-wod', 'wod-v5']) {
        it(`queues the ${systemId} trait pool for every value and flag set (SC-002)`, () => {
            const traitPool = systemRegistry.getSystem(systemId)!.dice!.traitPool!;
            for (const on of flagSets) {
                cleanup();
                const detail = Object.fromEntries(on.map((flag) => [flag, true]));
                seed(systemId, { 'renown#detail': detail });
                mount(
                    page([rating('renown', 'Renown', { max: 10, dice: true, flags: on })], systemId)
                );
                for (let value = 0; value <= 10; value += 1) {
                    // Dot 1..10 sets the value; value 0 is the unset start.
                    if (value > 0) {
                        fireEvent.click(screen.getByRole('radio', { name: `Renown: ${value}` }));
                    }
                    rolls.queued.length = 0;
                    fireEvent.click(screen.getByRole('button', { name: 'Roll Renown' }));
                    const expected = traitPool(value, {
                        specialization: on.includes('specialization'),
                        experienced: on.includes('experienced'),
                        practiced: on.includes('practiced'),
                    });
                    expect(rolls.queued.map(({ notation }) => notation)).toEqual(
                        expected ? [expected] : []
                    );
                }
            }
        }, 30_000);
    }

    it('names the rating and the document in the roll', () => {
        seed('star-wars-wod', { renown: 4 });
        mount(page([rating('renown', 'Renown', { dice: true })]));
        fireEvent.click(screen.getByRole('button', { name: 'Roll Renown' }));
        expect(rolls.queued).toEqual([
            { notation: '4d10>=6f=1', statLabel: 'Renown', characterName: 'Kira' },
        ]);
    });

    it('rolls the typed value of the number style, which has no flags', () => {
        seed('star-wars-wod', { renown: 6 });
        mount(
            page([
                rating('renown', 'Renown', {
                    presentation: 'number',
                    max: 10,
                    dice: true,
                    flags: ['specialization'],
                }),
            ])
        );
        expect(screen.queryByTitle('Specialization')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Roll Renown' }));
        expect(rolls.queued.map(({ notation }) => notation)).toEqual(['6d10>=6f=1']);
    });

    it('shows only the enabled flags and stores their toggles', () => {
        mount(page([rating('renown', 'Renown', { flags: ['practiced'] })]));
        expect(screen.queryByText('S')).toBeNull();
        expect(screen.queryByText('E')).toBeNull();
        fireEvent.click(screen.getByText('P'));
        expect(values()['renown#detail']).toEqual({
            specialization: false,
            practiced: true,
            experienced: false,
        });
    });

    it('shows no die for a system without a dice rule', () => {
        seed('no-such-system');
        mount(page([rating('renown', 'Renown', { dice: true })]));
        expect(screen.queryByRole('button', { name: 'Roll Renown' })).toBeNull();
    });
});

describe('computed maximum (spec 014, US3)', () => {
    const capped = (extra: Record<string, unknown> = {}) =>
        page([
            { id: 'cap', label: 'Cap', type: 'number' },
            rating('capped', 'Capped', { max: 10, maxFrom: 'cap', ...extra }),
        ]);

    it('lets every shown dot be set when the computed maximum is above the static one', () => {
        seed('star-wars-wod', { cap: 30 });
        mount(capped());
        expect(dots('Capped')).toHaveLength(30);
        fireEvent.click(screen.getByRole('radio', { name: 'Capped: 25' }));
        expect(values().capped).toBe(25);
    });

    it('marks a stored value hidden by a lower maximum, even without numbers', () => {
        seed('star-wars-wod', { cap: 12, capped: 25 });
        mount(capped());
        expect(dots('Capped')).toHaveLength(12);
        expect(
            dots('Capped').filter((dot) => dot.getAttribute('aria-checked') === 'true')
        ).toHaveLength(1);
        expect(screen.getByText('(25)')).not.toBeNull();
        expect(values().capped).toBe(25);
    });

    it('stops at the schema limit of 100', () => {
        seed('star-wars-wod', { cap: 250 });
        mount(capped());
        expect(dots('Capped')).toHaveLength(100);
    });

    it('falls back to the static maximum when the source is unavailable', () => {
        mount(page([rating('capped', 'Capped', { max: 10, maxFrom: 'no-such-value' })]));
        expect(dots('Capped')).toHaveLength(10);
        expect(screen.getByRole('alert')).not.toBeNull();
    });
});

describe('dot hitboxes (spec 014, US4)', () => {
    it('makes each dot a gapless cell that holds the visible dot', () => {
        mount(page([rating('many', 'Many', { max: 30 })]));
        const cells = dots('Many');
        expect(cells).toHaveLength(30);
        const row = cells[0]!.parentElement!;
        expect(row.className).not.toMatch(/\bgap-/);
        for (const cell of cells) {
            expect(cell.className).toMatch(/\bmin-w-0\b/);
            expect(cell.className).toMatch(/\bpx-0\.5\b/);
            expect(cell.querySelectorAll('span.rounded-full')).toHaveLength(1);
        }
        fireEvent.click(cells[6]!);
        expect(values().many).toBe(7);
    });
});

describe('number frame and label position (spec 014 review)', () => {
    it('frames the maximum inside the number box instead of writing it after', () => {
        seed('star-wars-wod', { renown: 3 });
        mount(
            page([
                rating('renown', 'Renown', { presentation: 'number', max: 7, showNumbers: true }),
            ])
        );
        const input = screen.getByLabelText('Renown') as HTMLInputElement;
        expect(input.value).toBe('3');
        const frame = input.parentElement!;
        expect(frame.textContent).toBe('/ 7');
        expect(screen.queryByText('3 / 7')).toBeNull();
    });

    it('puts a rating label above the dots in the stacked caption style', () => {
        mount(page([rating('renown', 'Renown', { labelPosition: 'top' })]));
        const caption = screen.getByText('Renown').closest('span.text-xs');
        expect(caption).not.toBeNull();
        expect(dots('Renown')).toHaveLength(5);
    });

    it('puts any field label beside its control in the trait-row style', () => {
        mount(
            page([
                { id: 'motto', type: 'text', label: 'Motto', labelPosition: 'left' },
                { id: 'origin', type: 'text', label: 'Origin' },
            ])
        );
        const beside = screen.getByText('Motto').closest('span.text-sm');
        expect(beside?.parentElement?.className).toMatch(/\bflex\b/);
        expect(screen.getByText('Origin').closest('span.text-xs')).not.toBeNull();
    });
});
