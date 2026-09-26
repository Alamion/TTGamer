// @vitest-environment jsdom

import { DeclarativeSheetView } from '@site/src/sheet_manager/features/sheet/declarative/DeclarativeSheetView';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import type { CustomTemplate, TemplateNode } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { currentHunter, hunterData, seedHunter } from './hunterFixtures';

// A full Hunter sheet renders in ~4 s alone; a loaded full-suite run can take several times that.
const RENDER_TIMEOUT = 40_000;

afterEach(cleanup);

beforeAll(() => {
    // Suggestion popovers (Radix + cmdk) need browser APIs jsdom lacks.
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => undefined;
});

function template(id: string): CustomTemplate {
    return systemRegistry.getSystem('wod-v5')!.defaultTemplates!.find((t) => t.id === id)!;
}

function addresses(nodes: readonly TemplateNode[]): string[] {
    return nodes.flatMap((node) => [
        ...(node.type === 'primitive' || (node.type === 'list' && node.bindingKey)
            ? [node.bindingKey!]
            : []),
        ...('valueKey' in node && node.valueKey ? [node.valueKey] : []),
        ...(node.type === 'section' || node.type === 'group' ? addresses(node.children) : []),
    ]);
}

/** Every field of the printed sheet (pp. 282–283) as a storage address of the full sheet. */
const PRINTED_SHEET: Record<string, string> = {
    Name: 'name',
    Concept: 'concept',
    Creed: 'creed',
    'Cell (Desperation)': 'resource:desperation',
    'Cell (Danger)': 'resource:danger',
    Ambition: 'ambition',
    Desire: 'desire',
    Drive: 'drive',
    Redemption: 'redemption',
    Strength: 'trait:attributes:strength',
    Dexterity: 'trait:attributes:dexterity',
    Stamina: 'trait:attributes:stamina',
    Charisma: 'trait:attributes:charisma',
    Manipulation: 'trait:attributes:manipulation',
    Composure: 'trait:attributes:composure',
    Intelligence: 'trait:attributes:intelligence',
    Wits: 'trait:attributes:wits',
    Resolve: 'trait:attributes:resolve',
    Health: 'track:health',
    Willpower: 'track:willpower',
    Despair: 'despair',
    Edges: 'rows:edges',
    Perks: 'rows:perks',
    'Total Experience': 'experience-total',
    'Spent Experience': 'experience-spent',
    'Chronicle Tenets': 'chronicle-tenets',
    Touchstones: 'rows:touchstones',
    'Creed Fields': 'creed-fields',
    Advantages: 'list:advantages',
    Flaws: 'list:flaws',
    Weapons: 'equipment:weapons',
    Equipment: 'equipment:inventory',
    Portrait: 'portrait',
    Notes: 'notes',
    Age: 'biography-age',
    'Date of birth': 'biography-date-of-birth',
    Appearance: 'biography-appearance',
    'Distinguishing features': 'biography-distinguishing-features',
    History: 'biography-history',
};

const SKILLS = [
    'athletics',
    'brawl',
    'craft',
    'driving',
    'firearms',
    'larceny',
    'melee',
    'stealth',
    'survival',
    'animal-ken',
    'etiquette',
    'insight',
    'intimidation',
    'leadership',
    'performance',
    'persuasion',
    'streetwise',
    'subterfuge',
    'academics',
    'awareness',
    'finance',
    'investigation',
    'medicine',
    'occult',
    'politics',
    'science',
    'technology',
];

describe('hunter full sheet (SC-002)', () => {
    it('has a place for every field of the printed sheet', () => {
        const used = new Set(addresses(template('v5-hunter-sheet').children));
        for (const [field, address] of Object.entries(PRINTED_SHEET)) {
            expect(used.has(address), field).toBe(true);
        }
        for (const skill of SKILLS) expect(used.has(`trait:skills:${skill}`), skill).toBe(true);
    });

    it(
        'derives Health and Willpower length from attributes and the adjustment, keeping marks',
        () => {
            seedHunter(
                hunterData({
                    attributes: {
                        stamina: { value: 3 },
                        composure: { value: 2 },
                        resolve: { value: 3 },
                    },
                })
            );
            render(createElement(DeclarativeSheetView, { template: template('v5-hunter-sheet') }));
            const boxes = (name: string) =>
                within(screen.getByRole('group', { name })).getAllByRole('button', {
                    name: new RegExp(`^${name} \\d+:`),
                });
            expect(boxes('Health')).toHaveLength(6);
            expect(boxes('Willpower')).toHaveLength(5);

            // Clicking a box cycles empty → Superficial (slash) → Aggravated (cross).
            fireEvent.click(screen.getByRole('button', { name: 'Health 1: empty' }));
            fireEvent.click(screen.getByRole('button', { name: 'Health 1: slash' }));
            fireEvent.click(screen.getByRole('button', { name: 'Health 2: empty' }));
            expect(currentHunter().health.levels).toEqual([
                'cross',
                'slash',
                'empty',
                'empty',
                'empty',
                'empty',
            ]);

            fireEvent.click(screen.getByRole('button', { name: 'Extend Health' }));
            expect(currentHunter().health.bonus).toBe(1);
            expect(boxes('Health')).toHaveLength(7);

            fireEvent.click(screen.getByRole('button', { name: 'Shorten Health' }));
            fireEvent.click(screen.getByRole('button', { name: 'Shorten Health' }));
            expect(currentHunter().health.bonus).toBe(-1);
            expect(boxes('Health')).toHaveLength(5);
            expect(currentHunter().health.levels.slice(0, 2)).toEqual(['cross', 'slash']);
        },
        RENDER_TIMEOUT
    );

    it(
        'rates Desperation and Danger with dots and skills without WoD flags',
        () => {
            seedHunter(
                hunterData({ skills: { medicine: { value: 3, specializationText: 'Trauma' } } })
            );
            const { container } = render(
                createElement(DeclarativeSheetView, { template: template('v5-hunter-sheet') })
            );
            expect(screen.getByText('Desperation')).toBeTruthy();
            const specialization = screen.getByDisplayValue('Trauma');
            fireEvent.change(specialization, { target: { value: 'Trauma, Triage' } });
            expect(currentHunter().skills.medicine).toEqual({
                value: 3,
                specializationText: 'Trauma, Triage',
            });
            // No specialization/experienced/practiced flags on V5 traits.
            expect(container.textContent).not.toMatch(/\bS\s*P\s*E\b/);
        },
        RENDER_TIMEOUT
    );

    it(
        'fills a Perk and its Edge from the catalog, and reorders rows',
        () => {
            seedHunter(
                hunterData({
                    edges: [
                        { id: 'e1', name: 'Sense the Unnatural', note: '' },
                        { id: 'e2', name: 'My own thing', note: '' },
                    ],
                    perks: [{ id: 'p1', name: '', edge: '', note: '' }],
                })
            );
            render(createElement(DeclarativeSheetView, { template: template('v5-hunter-sheet') }));
            const perk = screen.getByRole('textbox', { name: 'Perk 1' });
            fireEvent.change(perk, { target: { value: 'Precis' } });
            fireEvent.click(screen.getByRole('option', { name: /^Precision/ }));
            expect(currentHunter().perks[0]).toMatchObject({
                name: 'Precision',
                edge: 'Sense the Unnatural',
            });

            fireEvent.click(screen.getByRole('button', { name: 'Move row 1 down' }));
            expect(currentHunter().edges.map(({ id }) => id)).toEqual(['e2', 'e1']);
        },
        RENDER_TIMEOUT
    );

    it(
        'keeps weapons and inventory as item cards in the hunter data',
        () => {
            seedHunter();
            render(createElement(DeclarativeSheetView, { template: template('v5-hunter-sheet') }));
            fireEvent.click(screen.getByRole('button', { name: 'Add weapon' }));
            expect(currentHunter().weapons).toHaveLength(1);
            expect(currentHunter().weapons[0]).toMatchObject({ name: '', ammo: 0, maxAmmo: 0 });
            expect(currentHunter().inventory).toEqual([]);

            fireEvent.click(screen.getByText('New Weapon'));
            const name = screen.getByRole('textbox', { name: 'Weapon name' });
            fireEvent.change(name, { target: { value: 'Heavy g' } });
            fireEvent.click(screen.getByRole('option', { name: /^Heavy gunshot/ }));
            expect(currentHunter().weapons[0]).toMatchObject({
                name: 'Heavy gunshot',
                damage: '+4',
            });
        },
        RENDER_TIMEOUT
    );

    it(
        'writes creed and cell values through their fields',
        () => {
            seedHunter();
            render(createElement(DeclarativeSheetView, { template: template('v5-hunter-sheet') }));
            const creed = screen.getByRole('textbox', { name: 'Creed' });
            fireEvent.change(creed, { target: { value: 'Faith' } });
            fireEvent.click(screen.getByRole('option', { name: 'Faithful' }));
            expect(currentHunter().creed).toBe('Faithful');
            fireEvent.change(screen.getByRole('textbox', { name: 'Drive' }), {
                target: { value: 'Duty' },
            });
            expect(currentHunter().drive).toBe('Duty');
        },
        RENDER_TIMEOUT
    );
});
