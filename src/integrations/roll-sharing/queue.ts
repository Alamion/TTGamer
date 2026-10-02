import { truncate } from './message';
import type { SharingServiceId } from './services';
import { sharingServiceOf } from './services';

const COALESCE_WINDOW_MS = 250;
const MIN_REQUEST_INTERVAL_MS = 1_100;

export type RollShareResult =
    | { ok: true }
    | {
          ok: false;
          reason: 'invalid-webhook' | 'network' | 'rate-limited' | 'rejected';
          retryAfterMs?: number;
          status?: number;
      };

export interface RollShareTarget {
    service: SharingServiceId;
    address: string;
}

interface PendingShare extends RollShareTarget {
    resolve: (result: RollShareResult) => void;
    text: string;
}

let pendingShares: PendingShare[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let sendChain = Promise.resolve();
// One spacing clock for every service keeps the queue simple and within both services' limits.
let lastRequestAt = 0;

function joinContent(texts: string[]) {
    return texts.join('\n\n');
}

function splitBatches(shares: PendingShare[], limit: number) {
    const batches: PendingShare[][] = [];
    let current: PendingShare[] = [];

    for (const share of shares) {
        const candidate = [...current, share];
        if (current.length > 0 && joinContent(candidate.map(({ text }) => text)).length > limit) {
            batches.push(current);
            current = [share];
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

async function send(content: string, target: RollShareTarget): Promise<RollShareResult> {
    try {
        const response = await fetch(
            target.address,
            sharingServiceOf(target.service).request(content)
        );
        if (response.ok) return { ok: true };
        if (response.status === 429) {
            const retryAfterSeconds = Number.parseFloat(
                response.headers.get('retry-after') ??
                    response.headers.get('x-ratelimit-reset-after') ??
                    ''
            );
            return {
                ok: false,
                reason: 'rate-limited',
                status: response.status,
                ...(Number.isFinite(retryAfterSeconds)
                    ? { retryAfterMs: Math.ceil(retryAfterSeconds * 1_000) }
                    : {}),
            };
        }
        return { ok: false, reason: 'rejected', status: response.status };
    } catch {
        return { ok: false, reason: 'network' };
    }
}

async function deliver(shares: PendingShare[], target: RollShareTarget) {
    const { contentLimit } = sharingServiceOf(target.service);
    for (const batch of splitBatches(shares, contentLimit)) {
        await waitForRateLimit();
        lastRequestAt = Date.now();

        const result = await send(joinContent(batch.map(({ text }) => text)), target);
        if (!result.ok) {
            // Never log addresses, message contents, or upstream response bodies.
            console.error('[Roll sharing] Delivery failed', {
                service: target.service,
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
        const batch = pendingShares;
        pendingShares = [];
        const byTarget = new Map<string, PendingShare[]>();
        for (const share of batch) {
            const key = `${share.service}\n${share.address}`;
            const shares = byTarget.get(key) ?? [];
            shares.push(share);
            byTarget.set(key, shares);
        }
        for (const shares of byTarget.values()) {
            const { service, address } = shares[0]!;
            sendChain = sendChain.then(() => deliver(shares, { service, address }));
        }
    }, COALESCE_WINDOW_MS);
}

/** Queues a roll message for the target it was made for; switching services later does not move it. */
export function queueRollShare(text: string, target: RollShareTarget): Promise<RollShareResult> {
    const service = sharingServiceOf(target.service);
    if (!service.isValidAddress(target.address)) {
        return Promise.resolve({ ok: false, reason: 'invalid-webhook' });
    }

    const result = new Promise<RollShareResult>((resolve) => {
        pendingShares.push({
            resolve,
            text: service.prepare(truncate(text, service.contentLimit)),
            service: service.id,
            address: target.address,
        });
    });
    scheduleFlush();
    return result;
}
