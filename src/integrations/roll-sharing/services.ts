import { warn } from '../../shared/utils/logging';
import { MESSAGE_LIMIT } from './message';

/**
 * The chat services rolls can be shared to (spec 021). Everything that differs between services
 * lives on its entry; the queue, settings, button, and notices read only these fields.
 */

export type SharingServiceId = 'discord' | 'matrix';

export interface SharingService {
    id: SharingServiceId;
    /** Brand name, never translated. */
    name: string;
    /** Logo fill while sharing is on. */
    color: string;
    /** Session storage key of this service's address. */
    addressKey: string;
    placeholder: string;
    contentLimit: number;
    isValidAddress: (url: string) => boolean;
    /** Service-specific escaping of an already built message. */
    prepare: (text: string) => string;
    request: (content: string) => RequestInit;
    /** Anchor of this service's section in the roll-sharing guide. */
    guideAnchor: string;
    /** Network failures most likely mean the server does not allow this site yet. */
    networkHint?: 'site-permission';
}

const DISCORD_WEBHOOK_PATTERN =
    /^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;

const DISCORD: SharingService = {
    id: 'discord',
    name: 'Discord',
    color: '#5865F2',
    // Kept from before spec 021 so addresses entered in an open session survive the update.
    addressKey: 'discord_webhook_url',
    placeholder: 'https://discord.com/api/webhooks/...',
    contentLimit: MESSAGE_LIMIT,
    isValidAddress: (url) => DISCORD_WEBHOOK_PATTERN.test(url),
    prepare: (text) => text,
    request: (content) => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed_mentions: { parse: [] }, content }),
    }),
    guideAnchor: 'discord',
};

function isMatrixAddress(url: string) {
    try {
        return new URL(url).protocol === 'https:' && !DISCORD_WEBHOOK_PATTERN.test(url);
    } catch {
        return false;
    }
}

/** A matrix-hookshot generic webhook; its path follows the homeserver admin's `urlPrefix`. */
const MATRIX: SharingService = {
    id: 'matrix',
    name: 'Matrix',
    // The brand mark is black; the theme's text color keeps it readable on both themes.
    color: 'currentColor',
    addressKey: 'matrix_webhook_url',
    placeholder: 'https://matrix.example.org/webhook/...',
    contentLimit: MESSAGE_LIMIT,
    isValidAddress: isMatrixAddress,
    // Hookshot sends no `m.mentions`, so @room (matched case-insensitively) would notify the room.
    prepare: (text) => text.replace(/@(room)/gi, '@\u200b$1'),
    // A form body is CORS-safelisted: no preflight, which hookshot would refuse.
    request: (content) => ({ method: 'POST', body: new URLSearchParams({ text: content }) }),
    guideAnchor: 'matrix',
    networkHint: 'site-permission',
};

/** In the order of the settings select; the first entry is the default. */
export const SHARING_SERVICES: readonly SharingService[] = [DISCORD, MATRIX];

export function sharingServiceOf(id: unknown): SharingService {
    const service = SHARING_SERVICES.find((entry) => entry.id === id);
    if (service) return service;
    warn(`Unknown roll sharing service ${String(id)}; using ${DISCORD.name}`, 'Roll sharing');
    return DISCORD;
}
