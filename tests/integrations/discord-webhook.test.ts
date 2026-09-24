import { buildDiscordHistoryMessage, queueDiscordMessage } from '@site/src/integrations/discord';
import { afterEach, describe, expect, it, vi } from 'vitest';

const webhookUrl = 'https://discord.com/api/webhooks/123456789/valid_token';

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('Discord webhook integration', () => {
    it('escapes user markdown while preserving generated result formatting', () => {
        const message = buildDiscordHistoryMessage({
            notation: '@everyone 2d6',
            diceGroups: [],
            total: 7,
            details: '3, 4',
            formatted: '3+4',
            characterName: '**Admin**',
            statLabels: ['Strength'],
        });

        expect(message).toContain('**\\*\\*Admin\\*\\***');
        expect(message).toContain('= **7**');
        expect(message.length).toBeLessThanOrEqual(2_000);
    });

    it('adds special dice and outcome lines, even without roll context', () => {
        const result = {
            notation: '(3d10+2d10:h)>=6x2=10',
            diceGroups: [],
            total: 3,
            details: '',
            formatted: '',
        };
        const message = buildDiscordHistoryMessage(result, {
            specialDice: 'Special dice (Desperation): 6, 1',
            outcomes: ['A Desperation die shows 1'],
        });
        expect(message).toContain('Special dice \\(Desperation\\): 6, 1');
        expect(message).toContain('> **A Desperation die shows 1**');
        expect(message).not.toContain('```');
    });

    it('puts the verdict right after the total', () => {
        const message = buildDiscordHistoryMessage(
            { notation: '3d10>=6', diceGroups: [], total: 2, details: '', formatted: '' },
            { verdict: 'Success (needed 2, margin 0)' }
        );
        expect(message.split('\n').slice(0, 2)).toEqual([
            '3d10\\>=6 = **2**',
            '**Success \\(needed 2, margin 0\\)**',
        ]);
    });

    it('leaves the message unchanged without a reading', () => {
        const result = {
            notation: '2d6',
            diceGroups: [],
            total: 7,
            details: '3, 4',
            formatted: '3+4',
        };
        expect(buildDiscordHistoryMessage(result, undefined)).toBe(
            buildDiscordHistoryMessage(result)
        );
    });

    it('coalesces nearby messages and disables mentions', async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);

        const first = queueDiscordMessage('first', webhookUrl);
        const second = queueDiscordMessage('second', webhookUrl);
        await vi.advanceTimersByTimeAsync(251);

        await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const request = fetchMock.mock.calls[0][1] as RequestInit;
        expect(JSON.parse(String(request.body))).toEqual({
            allowed_mentions: { parse: [] },
            content: 'first\n\nsecond',
        });
    });

    it('splits a coalesced burst without dropping messages over the content limit', async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);

        const first = queueDiscordMessage('a'.repeat(1_200), webhookUrl);
        const second = queueDiscordMessage('b'.repeat(1_200), webhookUrl);
        await vi.advanceTimersByTimeAsync(251);
        await vi.runAllTimersAsync();

        await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const contents = fetchMock.mock.calls.map(
            ([, request]) => JSON.parse(String((request as RequestInit).body)).content
        );
        expect(contents).toEqual(['a'.repeat(1_200), 'b'.repeat(1_200)]);
        expect(contents.every((content) => content.length <= 2_000)).toBe(true);
    });

    it('returns a structured rate-limit result without reading or logging response content', async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response('sensitive upstream body', {
                    status: 429,
                    headers: { 'retry-after': '2.5' },
                })
            )
        );

        const delivery = queueDiscordMessage('roll content', webhookUrl);
        await vi.advanceTimersByTimeAsync(251);
        await vi.runAllTimersAsync();

        await expect(delivery).resolves.toEqual({
            ok: false,
            reason: 'rate-limited',
            status: 429,
            retryAfterMs: 2_500,
        });
        expect(console.error).not.toHaveBeenCalledWith(
            expect.stringContaining('sensitive upstream body')
        );
    });
});
