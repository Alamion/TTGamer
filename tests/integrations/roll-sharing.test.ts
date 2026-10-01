import {
    buildRollShareMessage,
    queueRollShare,
    sharingServiceOf,
} from '@site/src/integrations/roll-sharing';
import { afterEach, describe, expect, it, vi } from 'vitest';

const webhookUrl = 'https://discord.com/api/webhooks/123456789/valid_token';
const discord = { service: 'discord', address: webhookUrl } as const;

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('Roll sharing: Discord', () => {
    it('escapes user markdown while preserving generated result formatting', () => {
        const message = buildRollShareMessage({
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
        const message = buildRollShareMessage(result, {
            specialDice: 'Special dice (Desperation): 6, 1',
            outcomes: ['A Desperation die shows 1'],
        });
        expect(message).toContain('Special dice \\(Desperation\\): 6, 1');
        expect(message).toContain('> **A Desperation die shows 1**');
        expect(message).not.toContain('```');
    });

    it('puts the verdict right after the total', () => {
        const message = buildRollShareMessage(
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
        expect(buildRollShareMessage(result, undefined)).toBe(buildRollShareMessage(result));
    });

    it('coalesces nearby messages and disables mentions', async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);

        const first = queueRollShare('first', discord);
        const second = queueRollShare('second', discord);
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

        const first = queueRollShare('a'.repeat(1_200), discord);
        const second = queueRollShare('b'.repeat(1_200), discord);
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

        const delivery = queueRollShare('roll content', discord);
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

describe('Roll sharing: Matrix', () => {
    const matrixUrl = 'https://matrix.example.org/webhook/abc123';
    const matrix = { service: 'matrix', address: matrixUrl } as const;

    it('accepts any https address that is not a Discord webhook', () => {
        const { isValidAddress } = sharingServiceOf('matrix');
        expect(isValidAddress(matrixUrl)).toBe(true);
        expect(isValidAddress('http://matrix.example.org/webhook/abc123')).toBe(false);
        expect(isValidAddress('not a url')).toBe(false);
        expect(isValidAddress('')).toBe(false);
        expect(isValidAddress(webhookUrl)).toBe(false);
    });

    it('refuses an address of the other service', async () => {
        await expect(
            queueRollShare('roll', { service: 'matrix', address: webhookUrl })
        ).resolves.toEqual({ ok: false, reason: 'invalid-webhook' });
        await expect(
            queueRollShare('roll', { service: 'discord', address: matrixUrl })
        ).resolves.toEqual({ ok: false, reason: 'invalid-webhook' });
    });

    it('posts a form body with the text and no headers, so the browser sends no preflight', async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);

        const first = queueRollShare('**Han**\n2d6 = **7**', matrix);
        const second = queueRollShare('1d20 = **12**', matrix);
        await vi.advanceTimersByTimeAsync(251);
        await vi.runAllTimersAsync();

        await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe(matrixUrl);
        expect(request.method).toBe('POST');
        expect(request.headers).toBeUndefined();
        expect(request.body).toBeInstanceOf(URLSearchParams);
        expect((request.body as URLSearchParams).get('text')).toBe(
            '**Han**\n2d6 = **7**\n\n1d20 = **12**'
        );
    });

    it('breaks @room for Matrix only', async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        const message = buildRollShareMessage({
            notation: '2d6',
            diceGroups: [],
            total: 7,
            details: '',
            formatted: '',
            characterName: '@room @ROOM',
        });

        void queueRollShare(message, matrix);
        void queueRollShare(message, discord);
        await vi.advanceTimersByTimeAsync(251);
        await vi.runAllTimersAsync();

        const bodies = fetchMock.mock.calls.map(([url, request]) =>
            url === matrixUrl
                ? ((request as RequestInit).body as URLSearchParams).get('text')
                : JSON.parse(String((request as RequestInit).body)).content
        );
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(bodies[0]).toContain('@​room @​ROOM');
        expect(bodies[0]).not.toMatch(/@room/i);
        expect(bodies[1]).toContain('@room @ROOM');
    });

    it.each([
        [
            { ok: false, status: 404, headers: new Headers() },
            { ok: false, reason: 'rejected', status: 404 },
        ],
        [
            { ok: false, status: 429, headers: new Headers({ 'retry-after': '2' }) },
            { ok: false, reason: 'rate-limited', status: 429, retryAfterMs: 2_000 },
        ],
    ])('maps the answer %# to the shared failure kinds', async (response, expected) => {
        vi.useFakeTimers();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

        const delivery = queueRollShare('roll', matrix);
        await vi.advanceTimersByTimeAsync(251);
        await vi.runAllTimersAsync();
        await expect(delivery).resolves.toEqual(expected);
    });

    it('reports a blocked answer as unreachable without logging the address or text', async () => {
        vi.useFakeTimers();
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

        const delivery = queueRollShare('secret roll text', matrix);
        await vi.advanceTimersByTimeAsync(251);
        await vi.runAllTimersAsync();

        await expect(delivery).resolves.toEqual({ ok: false, reason: 'network' });
        expect(errorSpy).toHaveBeenCalledWith('[Roll sharing] Delivery failed', {
            service: 'matrix',
            reason: 'network',
            status: undefined,
        });
        const logged = JSON.stringify(errorSpy.mock.calls);
        expect(logged).not.toContain(matrixUrl);
        expect(logged).not.toContain('secret roll text');
    });

    it('falls back to Discord for an unknown service and says so', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(sharingServiceOf('teams').id).toBe('discord');
        expect(warnSpy).toHaveBeenCalledOnce();
        expect(sharingServiceOf('matrix').id).toBe('matrix');
        expect(warnSpy).toHaveBeenCalledOnce();
    });
});
