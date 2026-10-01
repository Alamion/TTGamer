// @vitest-environment jsdom

import RollControls from '@site/src/dice_roller/components/dice_pool/RollControls';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DEFAULT_SETTINGS } from '@site/src/dice_roller/utils/constants';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

/** Service select, per-service addresses, and the sharing button (spec 021 US2, US3). */

const DISCORD_URL = 'https://discord.com/api/webhooks/123456789/valid_token';
const MATRIX_URL = 'https://matrix.example.org/webhook/abc123';

// Read once per key by the session hook: the address a user entered before the update.
sessionStorage.setItem('discord_webhook_url', JSON.stringify(DISCORD_URL));

function openSettings() {
    render(createElement(RollControls));
    fireEvent.click(screen.getByRole('button', { name: 'Open dice roller settings' }));
}

const serviceSelect = () => screen.getByLabelText('Service') as HTMLSelectElement;
const addressField = (service: string) =>
    screen.getByLabelText(`${service} webhook URL`) as HTMLInputElement;
const sharingButton = (service: string) =>
    screen.queryByRole('button', { name: new RegExp(`share rolls to ${service}`) });

describe('roll sharing settings and button', () => {
    afterEach(() => {
        cleanup();
        useDiceRollerStore.setState({ settings: { ...DEFAULT_SETTINGS } });
    });

    it('keeps sharing to Discord with the address entered before the update', () => {
        useDiceRollerStore.setState({ settings: { ...DEFAULT_SETTINGS } });
        openSettings();
        expect(serviceSelect().value).toBe('discord');
        expect(addressField('Discord').value).toBe(DISCORD_URL);
        expect(screen.getByText('Valid Discord webhook')).toBeTruthy();
        expect(
            screen.getByRole('link', { name: 'How to set up sharing' }).getAttribute('href')
        ).toBe('/docs/roll-sharing#discord');
    });

    it('gives Matrix its own address and refuses a Discord one', () => {
        openSettings();
        fireEvent.change(serviceSelect(), { target: { value: 'matrix' } });
        expect(useDiceRollerStore.getState().settings.sharingService).toBe('matrix');
        expect(addressField('Matrix').value).toBe('');
        expect(addressField('Matrix').placeholder).toContain('https://');

        fireEvent.change(addressField('Matrix'), { target: { value: DISCORD_URL } });
        expect(screen.getByText('Invalid Matrix webhook URL')).toBeTruthy();
        fireEvent.change(addressField('Matrix'), { target: { value: 'http://example.org/hook' } });
        expect(screen.getByText('Invalid Matrix webhook URL')).toBeTruthy();
        fireEvent.change(addressField('Matrix'), { target: { value: MATRIX_URL } });
        expect(screen.getByText('Valid Matrix webhook')).toBeTruthy();
        expect(
            screen.getByRole('link', { name: 'How to set up sharing' }).getAttribute('href')
        ).toBe('/docs/roll-sharing#matrix');
    });

    it('keeps both addresses through ten switches', () => {
        openSettings();
        fireEvent.change(serviceSelect(), { target: { value: 'matrix' } });
        fireEvent.change(addressField('Matrix'), { target: { value: MATRIX_URL } });
        for (let i = 0; i < 10; i++) {
            fireEvent.change(serviceSelect(), { target: { value: 'discord' } });
            expect(addressField('Discord').value).toBe(DISCORD_URL);
            fireEvent.change(serviceSelect(), { target: { value: 'matrix' } });
            expect(addressField('Matrix').value).toBe(MATRIX_URL);
        }
    });

    it('shows the chosen service on the button and keeps both clicks', () => {
        useDiceRollerStore.setState({
            settings: { ...DEFAULT_SETTINGS, sharingService: 'matrix' },
        });
        render(createElement(RollControls));
        const button = sharingButton('Matrix')!;
        expect(button.querySelector('svg')?.getAttribute('data-service')).toBe('matrix');
        expect(button.getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(button);
        expect(useDiceRollerStore.getState().settings.enableDiscordWebhook).toBe(false);
        expect(button.getAttribute('aria-pressed')).toBe('false');
        fireEvent.contextMenu(button);
        expect(useDiceRollerStore.getState().settings.includeCharacterName).toBe(false);
        expect(useDiceRollerStore.getState().settings.includeCharacterStats).toBe(false);

        act(() =>
            useDiceRollerStore.setState({
                settings: { ...useDiceRollerStore.getState().settings, sharingService: 'discord' },
            })
        );
        expect(sharingButton('Matrix')).toBeNull();
        expect(sharingButton('Discord')?.querySelector('svg')?.getAttribute('data-service')).toBe(
            'discord'
        );
    });

    it('hides the button while the chosen service has no valid address', () => {
        openSettings();
        fireEvent.change(serviceSelect(), { target: { value: 'matrix' } });
        fireEvent.change(addressField('Matrix'), { target: { value: '' } });
        expect(sharingButton('Matrix')).toBeNull();
    });
});
