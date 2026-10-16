// @vitest-environment happy-dom

import { NotationSandbox } from '@site/src/dice_roller/components/guide/NotationSandbox';
import { RollBreakdown } from '@site/src/dice_roller/components/guide/RollBreakdown';
import { RollExample } from '@site/src/dice_roller/components/guide/RollExample';
import { rollDices } from '@site/src/dice_roller/dice-logic/dice-roller';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(cleanup);

describe('guide roll breakdown', () => {
    it('shows every die with its marks and a legend of only the marks used', () => {
        render(createElement(RollBreakdown, { result: rollDices('4d6dl1@5,2,6,3') }));
        expect(screen.getByRole('img', { name: 'd6: 2, dropped' })).toBeTruthy();
        expect(screen.getByRole('img', { name: 'd6: 6' })).toBeTruthy();
        expect(screen.getByText('14')).toBeTruthy();
        const legend = screen.getByRole('list', { name: 'What the marks mean' });
        expect(within(legend).getByText('dropped')).toBeTruthy();
        expect(within(legend).queryByText('success')).toBeNull();
    });

    it('marks successes and botches of a success count', () => {
        render(createElement(RollBreakdown, { result: rollDices('3d10>=6f=1@7,1,4') }));
        expect(screen.getByRole('img', { name: 'd10: 7, success' })).toBeTruthy();
        expect(screen.getByRole('img', { name: 'd10: 1, takes a success away' })).toBeTruthy();
    });
});

describe('guide roll example', () => {
    it('rolls in place on click and never reaches the history', () => {
        useDiceRollerStore.setState({ history: [] });
        render(createElement(RollExample, { notation: '2d6' }));
        expect(screen.queryAllByRole('img')).toHaveLength(0);
        fireEvent.click(screen.getByRole('button', { name: 'Roll 2d6' }));
        expect(screen.getAllByRole('img', { name: /^d6: / })).toHaveLength(2);
        expect(screen.getByRole('button', { name: 'Roll 2d6 again' })).toBeTruthy();
        expect(useDiceRollerStore.getState().history).toHaveLength(0);
    });
});

describe('guide notation sandbox', () => {
    it('explains an invalid notation with the panel messages and does not roll it', () => {
        render(createElement(NotationSandbox, { initial: '2d6' }));
        const field = screen.getByRole('textbox', { name: 'Try a notation' });
        fireEvent.change(field, { target: { value: '2d6+' } });
        expect(field.getAttribute('aria-invalid')).toBe('true');
        expect((screen.getByRole('button', { name: 'Roll' }) as HTMLButtonElement).disabled).toBe(
            true
        );
        expect(screen.getByRole('status').textContent).not.toBe('');
    });

    it('rolls an example into the field and shows its dice', () => {
        render(createElement(NotationSandbox, { initial: '', examples: ['3d8'] }));
        fireEvent.click(screen.getByRole('button', { name: '3d8' }));
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('3d8');
        expect(screen.getAllByRole('img', { name: /^d8: / })).toHaveLength(3);
    });
});
