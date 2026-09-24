// @vitest-environment jsdom

import { notifyRollResult } from '@site/src/dice_roller/dice-logic/dice-roller';
import type { RollResult } from '@site/src/dice_roller/dice-logic/types';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DEFAULT_SETTINGS } from '@site/src/dice_roller/utils/constants';
import { act, cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const queued = vi.hoisted(() => ({ messages: [] as string[] }));
vi.mock('@site/src/integrations/discord', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@site/src/integrations/discord')>()),
    queueDiscordMessage: vi.fn(async (message: string) => {
        queued.messages.push(message);
        return { ok: true };
    }),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));

const { default: DiscordWebhookSubscription } =
    await import('@site/src/dice_roller/components/DiscordWebhookSubscription');

const result: RollResult = {
    notation: '(1d10+2d10:h)>=6',
    diceGroups: [
        {
            notation: '1d10>=6',
            sides: 10,
            rolls: [],
            keptRolls: [{ sides: 10, value: 7, dropped: false }],
            droppedRolls: [],
            sum: 1,
            operation: '+',
        },
        {
            notation: '2d10:h>=6',
            sides: 10,
            rolls: [],
            keptRolls: [
                { sides: 10, value: 6, dropped: false, label: 'h' },
                { sides: 10, value: 1, dropped: false, label: 'h' },
            ],
            droppedRolls: [],
            sum: 1,
            operation: '+',
            label: 'h',
        },
    ],
    total: 2,
    details: '(7*) (6*, 1)',
    formatted: '(1)+(1+0)',
    reading: {
        readingId: 'v5',
        line: 'desperation',
        lineLabel: { id: 'line', message: 'Desperation' },
        difficulty: null,
        outcomes: [
            {
                id: 'desperation-one',
                title: { id: 'one', message: 'A Desperation die shows 1' },
                conditional: false,
            },
        ],
    },
};

describe('Discord subscription with special dice', () => {
    afterEach(() => {
        cleanup();
        queued.messages = [];
        sessionStorage.clear();
    });

    it('names the special dice and outcomes when roll context is off', async () => {
        sessionStorage.setItem(
            'discord_webhook_url',
            JSON.stringify('https://discord.com/api/webhooks/123456789/valid_token')
        );
        useDiceRollerStore.setState({
            settings: { ...DEFAULT_SETTINGS, includeRollContext: false },
        });
        render(createElement(DiscordWebhookSubscription));
        await act(async () => notifyRollResult({ ...result }));

        expect(queued.messages).toHaveLength(1);
        expect(queued.messages[0]).toContain('Special dice \\(Desperation\\): 6, 1');
        expect(queued.messages[0]).toContain('A Desperation die shows 1');
        expect(queued.messages[0]).not.toContain('(7*)');
    });
});
