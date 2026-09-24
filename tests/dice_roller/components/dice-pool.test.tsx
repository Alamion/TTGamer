// @vitest-environment jsdom

import DicePool from '@site/src/dice_roller/components/dice_pool/DicePool';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DEFAULT_SETTINGS } from '@site/src/dice_roller/utils/constants';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

describe('dice pool tabs', () => {
    afterEach(cleanup);

    it('opens with no tab selected on a first visit', () => {
        useDiceRollerStore.setState({ settings: { ...DEFAULT_SETTINGS }, panelTab: '' });
        render(createElement(DicePool));
        expect(screen.queryByText('Difficulty:')).toBeNull();
        expect(screen.queryByRole('radio')).toBeNull();
    });

    it('keeps the selected tab, WoD mode, and line in the persisted store', () => {
        useDiceRollerStore.setState({ settings: { ...DEFAULT_SETTINGS }, panelTab: '' });
        const first = render(createElement(DicePool));
        fireEvent.click(screen.getByRole('button', { name: 'WoD' }));
        fireEvent.click(screen.getByRole('radio', { name: 'V5' }));
        fireEvent.click(screen.getByRole('radio', { name: /Hunger/ }));
        first.unmount();

        const state = useDiceRollerStore.getState();
        expect(state.panelTab).toBe('wod');
        expect(state.settings.wodMode).toBe('v5');
        expect(state.settings.v5Line).toBe('hunger');

        render(createElement(DicePool));
        expect(screen.getByRole('radio', { name: /Hunger/ })).toHaveProperty('checked', true);
    });

    it('deselects the active tab when it is clicked again', () => {
        useDiceRollerStore.setState({ panelTab: 'standard' });
        render(createElement(DicePool));
        fireEvent.click(screen.getByRole('button', { name: 'Standard' }));
        expect(useDiceRollerStore.getState().panelTab).toBe('');
    });
});
