// @vitest-environment jsdom

import WodTab from '@site/src/dice_roller/components/dice_pool/DiceTabWod';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DEFAULT_SETTINGS } from '@site/src/dice_roller/utils/constants';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const input = () => useDiceRollerStore.getState().notationInput;
const addButton = (name: RegExp) => screen.getByRole('button', { name });

describe('WoD dice tab', () => {
    beforeEach(() => {
        useDiceRollerStore.setState({ settings: { ...DEFAULT_SETTINGS }, notationInput: '' });
    });
    afterEach(cleanup);

    it('starts in Classic mode with the classic controls and notations', () => {
        render(createElement(WodTab));
        expect(screen.getByRole('radio', { name: 'Classic' })).toHaveProperty('checked', true);
        expect(screen.getByText('Difficulty:')).toBeTruthy();

        fireEvent.click(addButton(/Add d10>=6 \|/));
        fireEvent.click(addButton(/Add d10>=6 \|/));
        expect(input()).toBe('2d10>=6');

        fireEvent.click(screen.getByRole('button', { name: 'Raise the Difficulty' }));
        expect(input()).toBe('2d10>=7');
        expect(screen.queryByText(/Count pairs of 10s/)).toBeNull();
    });

    it('lets Classic leave the threshold and the successes needed unset', () => {
        useDiceRollerStore.setState({ notationInput: '2d10>=7' });
        render(createElement(WodTab));

        fireEvent.click(screen.getByRole('button', { name: 'Clear the Difficulty' }));
        expect(useDiceRollerStore.getState().settings.wodThreshold).toBeNull();
        expect(input()).toBe('2d10>=7');

        act(() => useDiceRollerStore.setState({ notationInput: '' }));
        fireEvent.click(addButton(/^Left-click: Add d10 \|/));
        expect(input()).toBe('d10');
        act(() => useDiceRollerStore.setState({ notationInput: '' }));
        fireEvent.click(addButton(/^Left-click: Add d10f=1 \|/));
        expect(input()).toBe('d10f=1');

        fireEvent.click(screen.getByRole('button', { name: 'Raise the Difficulty' }));
        expect(useDiceRollerStore.getState().settings.wodThreshold).toBe(6);
        expect(input()).toBe('d10>=6f=1');

        expect(useDiceRollerStore.getState().settings.wodSuccesses).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Need more successes' }));
        fireEvent.click(screen.getByRole('button', { name: 'Need more successes' }));
        expect(useDiceRollerStore.getState().settings.wodSuccesses).toBe(2);
        fireEvent.click(screen.getByRole('button', { name: 'Clear the successes needed' }));
        expect(useDiceRollerStore.getState().settings.wodSuccesses).toBeNull();
    });

    it('switches to V5 mode, persists the mode, and shows the V5 controls', () => {
        render(createElement(WodTab));
        fireEvent.click(screen.getByRole('radio', { name: 'V5' }));

        expect(useDiceRollerStore.getState().settings.wodMode).toBe('v5');
        expect(screen.queryByText('Difficulty:')).toBeNull();
        expect(screen.getByRole('checkbox', { name: /Count pairs of 10s/ })).toHaveProperty(
            'checked',
            true
        );
        expect(
            screen.getByRole('checkbox', { name: /Report special dice outcomes/ })
        ).toHaveProperty('checked', true);
        expect(screen.getByText('not set')).toBeTruthy();
    });

    it('builds regular and labelled V5 dice as separate parts', () => {
        useDiceRollerStore.setState({ settings: { ...DEFAULT_SETTINGS, wodMode: 'v5' } });
        render(createElement(WodTab));

        const regular = addButton(/^Left-click: Add d10>=6 \|/);
        const special = addButton(/^Special die\./);
        fireEvent.click(regular);
        fireEvent.click(regular);
        fireEvent.click(regular);
        fireEvent.click(special);
        fireEvent.click(special);
        expect(input()).toBe('3d10>=6 + 2d10:h>=6');

        fireEvent.contextMenu(special);
        expect(input()).toBe('3d10>=6 + d10:h>=6');
    });

    it('stores the line, Difficulty, and toggles in settings', () => {
        useDiceRollerStore.setState({ settings: { ...DEFAULT_SETTINGS, wodMode: 'v5' } });
        render(createElement(WodTab));

        fireEvent.click(screen.getByRole('radio', { name: /Hunger/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Raise the Difficulty' }));
        fireEvent.click(screen.getByRole('button', { name: 'Raise the Difficulty' }));
        fireEvent.click(screen.getByRole('checkbox', { name: /Count pairs of 10s/ }));

        let settings = useDiceRollerStore.getState().settings;
        expect(settings.v5Line).toBe('hunger');
        expect(settings.v5Difficulty).toBe(2);
        expect(settings.v5CriticalPairs).toBe(false);

        fireEvent.click(screen.getByRole('button', { name: 'Clear the Difficulty' }));
        settings = useDiceRollerStore.getState().settings;
        expect(settings.v5Difficulty).toBeNull();
    });
});
