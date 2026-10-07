// @vitest-environment happy-dom

import { notifyRollResult } from '@site/src/dice_roller/dice-logic/dice-roller';
import type { RollResult } from '@site/src/dice_roller/dice-logic/types';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DEFAULT_SETTINGS } from '@site/src/dice_roller/utils/constants';
import { act, cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const queued = vi.hoisted(() => ({
    messages: [] as string[],
    targets: [] as unknown[],
    result: { ok: true } as unknown,
}));
vi.mock('@site/src/integrations/roll-sharing', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@site/src/integrations/roll-sharing')>()),
    queueRollShare: vi.fn(async (message: string, target: unknown) => {
        queued.messages.push(message);
        queued.targets.push(target);
        return queued.result;
    }),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));

const { default: toast } = await import('react-hot-toast');
const { default: RollSharingSubscription } =
    await import('@site/src/dice_roller/components/RollSharingSubscription');

const DISCORD_URL = 'https://discord.com/api/webhooks/123456789/valid_token';
const MATRIX_URL = 'https://matrix.example.org/webhook/abc123';

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

describe('Roll sharing subscription with special dice', () => {
    afterEach(() => {
        cleanup();
        queued.messages = [];
        queued.targets = [];
        queued.result = { ok: true };
        sessionStorage.clear();
        vi.mocked(toast.error).mockClear();
    });

    it('names the special dice and outcomes when roll context is off', async () => {
        sessionStorage.setItem(
            'discord_webhook_url',
            JSON.stringify('https://discord.com/api/webhooks/123456789/valid_token')
        );
        useDiceRollerStore.setState({
            settings: { ...DEFAULT_SETTINGS, includeRollContext: false },
        });
        render(createElement(RollSharingSubscription));
        await act(async () => notifyRollResult({ ...result }));

        expect(queued.messages).toHaveLength(1);
        expect(queued.messages[0]).toContain('Special dice \\(Desperation\\): 6, 1');
        expect(queued.messages[0]).toContain('A Desperation die shows 1');
        expect(queued.messages[0]).not.toContain('(7*)');
    });

    it('shares to the chosen service only', async () => {
        sessionStorage.setItem('discord_webhook_url', JSON.stringify(DISCORD_URL));
        sessionStorage.setItem('matrix_webhook_url', JSON.stringify(MATRIX_URL));
        useDiceRollerStore.setState({
            settings: { ...DEFAULT_SETTINGS, sharingService: 'matrix' },
        });
        render(createElement(RollSharingSubscription));
        await act(async () => notifyRollResult({ ...result }));

        expect(queued.targets).toEqual([{ service: 'matrix', address: MATRIX_URL }]);
    });

    it('links the Matrix "could not reach" notice to the guide', async () => {
        sessionStorage.setItem('matrix_webhook_url', JSON.stringify(MATRIX_URL));
        queued.result = { ok: false, reason: 'network' };
        useDiceRollerStore.setState({
            settings: { ...DEFAULT_SETTINGS, sharingService: 'matrix' },
        });
        render(createElement(RollSharingSubscription));
        await act(async () => notifyRollResult({ ...result }));

        const [content] = vi.mocked(toast.error).mock.calls[0]!;
        const notice = render(content as ReactElement);
        expect(notice.container.textContent).toContain('Matrix');
        expect(notice.container.querySelector('a')?.getAttribute('href')).toBe(
            '/docs/roll-sharing#site-permission'
        );
    });

    it('names Discord in its plain failure notice', async () => {
        sessionStorage.setItem('discord_webhook_url', JSON.stringify(DISCORD_URL));
        queued.result = { ok: false, reason: 'network' };
        useDiceRollerStore.setState({ settings: { ...DEFAULT_SETTINGS } });
        render(createElement(RollSharingSubscription));
        await act(async () => notifyRollResult({ ...result }));

        expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
            'Discord could not be reached. Check your connection.'
        );
    });
});
