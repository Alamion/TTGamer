import type { RollResult } from '../../dice_roller/dice-logic/types';

const DISCORD_WEBHOOK_PATTERN =
    /^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;
const DISCORD_CONTENT_LIMIT = 2_000;
const COALESCE_WINDOW_MS = 250;
const MIN_REQUEST_INTERVAL_MS = 1_100;

interface PendingMessage {
    resolve: (result: DiscordDeliveryResult) => void;
    text: string;
    webhookUrl: string;
}

export type DiscordDeliveryResult =
    | { ok: true }
    | {
          ok: false;
          reason: 'invalid-webhook' | 'network' | 'rate-limited' | 'rejected';
          retryAfterMs?: number;
          status?: number;
      };

let pendingMessages: PendingMessage[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let sendChain = Promise.resolve();
let lastRequestAt = 0;

export function isValidDiscordWebhook(url: string): boolean {
    return DISCORD_WEBHOOK_PATTERN.test(url);
}

function truncate(value: string, limit: number) {
    if (value.length <= limit) return value;
    return `${value.slice(0, Math.max(0, limit - 1))}…`;
}

function escapeMarkdown(value: string) {
    return value.replace(/([\\`*_{}[\]()<>#+\-.!|>~])/g, '\\$1');
}

function escapeCode(value: string) {
    return value.replace(/```/g, '``\u200b`');
}

function fitDiscordContent(messages: string[]) {
    return messages.join('\n\n');
}

function splitMessageBatches(messages: PendingMessage[]) {
    const batches: PendingMessage[][] = [];
    let current: PendingMessage[] = [];

    for (const message of messages) {
        const candidate = [...current, message];
        if (
            current.length > 0 &&
            fitDiscordContent(candidate.map(({ text }) => text)).length > DISCORD_CONTENT_LIMIT
        ) {
            batches.push(current);
            current = [message];
        } else {
            current = candidate;
        }
    }

    if (current.length > 0) batches.push(current);
    return batches;
}

async function waitForRateLimit() {
    const delay = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
}

async function deliver(messages: PendingMessage[], webhookUrl: string) {
    for (const batch of splitMessageBatches(messages)) {
        await waitForRateLimit();
        lastRequestAt = Date.now();

        let result: DiscordDeliveryResult;
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    allowed_mentions: { parse: [] },
                    content: fitDiscordContent(batch.map(({ text }) => text)),
                }),
            });
            if (response.ok) {
                result = { ok: true };
            } else if (response.status === 429) {
                const retryAfterSeconds = Number.parseFloat(
                    response.headers.get('retry-after') ??
                        response.headers.get('x-ratelimit-reset-after') ??
                        ''
                );
                result = {
                    ok: false,
                    reason: 'rate-limited',
                    status: response.status,
                    ...(Number.isFinite(retryAfterSeconds)
                        ? { retryAfterMs: Math.ceil(retryAfterSeconds * 1_000) }
                        : {}),
                };
            } else {
                result = { ok: false, reason: 'rejected', status: response.status };
            }
        } catch {
            result = { ok: false, reason: 'network' };
        }

        if (!result.ok) {
            // Never log webhook URLs, message contents, or upstream response bodies.
            console.error('[Discord Webhook] Delivery failed', {
                reason: result.reason,
                status: result.status,
            });
        }
        batch.forEach(({ resolve }) => resolve(result));
    }
}

function scheduleFlush() {
    if (flushTimer !== undefined) return;
    flushTimer = setTimeout(() => {
        flushTimer = undefined;
        const batch = pendingMessages;
        pendingMessages = [];
        const batchesByWebhook = new Map<string, PendingMessage[]>();
        for (const message of batch) {
            const messages = batchesByWebhook.get(message.webhookUrl) ?? [];
            messages.push(message);
            batchesByWebhook.set(message.webhookUrl, messages);
        }
        for (const [webhookUrl, messages] of batchesByWebhook) {
            sendChain = sendChain.then(() => deliver(messages, webhookUrl));
        }
    }, COALESCE_WINDOW_MS);
}

export function queueDiscordMessage(
    text: string,
    webhookUrl: string
): Promise<DiscordDeliveryResult> {
    if (!isValidDiscordWebhook(webhookUrl)) {
        return Promise.resolve({ ok: false, reason: 'invalid-webhook' });
    }

    const result = new Promise<DiscordDeliveryResult>((resolve) => {
        pendingMessages.push({
            resolve,
            text: truncate(text, DISCORD_CONTENT_LIMIT),
            webhookUrl,
        });
    });
    scheduleFlush();
    return result;
}

export function buildDiscordHistoryMessage(result: RollResult): string {
    const lines: string[] = [];

    if (result.characterName) {
        lines.push(`**${escapeMarkdown(truncate(result.characterName, 80))}**`);
    }

    const notation = escapeMarkdown(truncate(result.notation, 300));
    lines.push(`${notation} = **${result.total}**`);

    if (result.statLabels && result.statLabels.length > 0) {
        const labels = result.statLabels
            .slice(0, 12)
            .map((label) => escapeMarkdown(truncate(label, 80)))
            .join(', ');
        lines.push(`Stats: ${truncate(labels, 500)}`);
    }

    const details = result.details ? truncate(escapeCode(result.details), 700) : '';
    const formatted = result.formatted ? truncate(escapeCode(result.formatted), 700) : '';
    if (details || formatted) {
        lines.push('```');
        if (details) lines.push(`Rolls: ${details}`);
        if (formatted) lines.push(`Formatted: ${formatted}`);
        lines.push('```');
    }

    if (result.manuallyRerolled) {
        lines.push('> Manually Rerolled');
    }

    return truncate(lines.join('\n'), DISCORD_CONTENT_LIMIT);
}

export const SESSION_STORAGE_KEY = 'discord_webhook_url';
