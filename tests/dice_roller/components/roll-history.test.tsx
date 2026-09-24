// @vitest-environment jsdom

import RollHistory from '@site/src/dice_roller/components/RollHistory';
import type { RollResult } from '@site/src/dice_roller/dice-logic/types';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DEFAULT_SETTINGS } from '@site/src/dice_roller/utils/constants';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { evaluate } from '../helpers';

function showRoll(result: RollResult) {
    useDiceRollerStore.setState({
        settings: { ...DEFAULT_SETTINGS },
        history: [{ id: 'roll-1', timestamp: 0, result }],
    });
    render(createElement(RollHistory));
    fireEvent.click(screen.getByText(result.notation));
}

const outcome = (id: string, message: string, conditional = false) => ({
    id,
    title: { id: `${id}.title`, message },
    detail: { id: `${id}.detail`, message: `${message} — detail` },
    conditional,
});

describe('roll history with a verdict', () => {
    afterEach(cleanup);

    it('shows a short verdict when collapsed and the full one when expanded', () => {
        const rolled = evaluate('3d10@7,8,2>=6');
        useDiceRollerStore.setState({
            settings: { ...DEFAULT_SETTINGS },
            history: [
                {
                    id: 'roll-1',
                    timestamp: 0,
                    result: { ...rolled, verdict: { difficulty: 3, succeeded: false, margin: -1 } },
                },
            ],
        });
        render(createElement(RollHistory));
        expect(screen.getByText('Failure')).toBeTruthy();
        fireEvent.click(screen.getByText(rolled.notation));
        expect(screen.getByText('Failure (needed 3, short by 1)')).toBeTruthy();
        expect(screen.queryByText('Failure')).toBeNull();
    });
});

describe('roll history with special dice', () => {
    afterEach(cleanup);

    it('lists the special dice by line and every outcome with its detail', () => {
        const rolled = evaluate('(2d10@7,3+2d10:h@6,1)>=6');
        showRoll({
            ...rolled,
            reading: {
                readingId: 'v5',
                line: 'desperation',
                lineLabel: { id: 'line', message: 'Desperation' },
                difficulty: null,
                outcomes: [outcome('desperation-one', 'A Desperation die shows 1')],
            },
        });
        expect(screen.getByText('Special dice (Desperation): 6, 1')).toBeTruthy();
        expect(screen.getByText('A Desperation die shows 1')).toBeTruthy();
        expect(screen.getByText('A Desperation die shows 1 — detail')).toBeTruthy();
    });

    it('shows conditional wording as given', () => {
        const rolled = evaluate('(2d10@3,3+1d10:h@1)>=6');
        showRoll({
            ...rolled,
            reading: {
                readingId: 'v5',
                line: 'hunger',
                lineLabel: { id: 'line', message: 'Hunger' },
                difficulty: null,
                outcomes: [
                    outcome(
                        'bestial-failure',
                        'Bestial failure if the roll misses the Difficulty',
                        true
                    ),
                ],
            },
        });
        expect(screen.getByText('Bestial failure if the roll misses the Difficulty')).toBeTruthy();
    });

    it('names labelled dice without a reading, and shows no outcome block', () => {
        showRoll(evaluate('(2d10@7,3+1d10:h@6)>=6'));
        expect(screen.getByText('Special dice: 6')).toBeTruthy();
        expect(screen.queryByRole('list')).toBeNull();
    });

    it('shows nothing extra for ordinary rolls', () => {
        showRoll(evaluate('2d6@3,4'));
        expect(screen.queryByText(/Special dice/)).toBeNull();
    });
});
