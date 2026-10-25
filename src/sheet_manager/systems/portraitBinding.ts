import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import type { VisibleWhen } from '../types/template';
import type { FieldBinding } from './templateBindings';

type PortraitMetadata = { portraitId?: string; imageUrl?: string; showPortrait?: boolean };

const metadataOf = (data: unknown): PortraitMetadata | undefined =>
    (data as { metadata?: PortraitMetadata } | null)?.metadata;

/**
 * The document portrait: `data.metadata.portraitId` (a device blob) or `data.metadata.imageUrl`
 * (a URL), never both. Every system stores it there, so export stripping and blob cleanup in the
 * document store work without knowing the system.
 */
const portraitAdapter: NonNullable<FieldBinding['adapter']> = {
    read: (data) => {
        const metadata = metadataOf(data);
        if (metadata?.portraitId) return { source: 'device', blobId: metadata.portraitId };
        if (metadata?.imageUrl) return { source: 'url', url: metadata.imageUrl };
        return undefined;
    },
    update: (data, value) => {
        const metadata = { ...((data as { metadata?: Record<string, unknown> }).metadata ?? {}) };
        delete metadata.portraitId;
        delete metadata.imageUrl;
        // The card was shown to take the image: a document that never chose keeps showing it.
        metadata.showPortrait ??= true;
        const image = value as { source?: string; blobId?: string; url?: string } | undefined;
        if (image?.source === 'device' && image.blobId) metadata.portraitId = image.blobId;
        if (image?.source === 'url' && image.url) metadata.imageUrl = image.url;
        return { metadata };
    },
};

export function portraitFieldBinding(documentKinds: ReadonlySet<string>): FieldBinding {
    return {
        key: 'field:portrait',
        kind: 'field',
        label: 'Portrait',
        documentKinds,
        path: ['metadata'],
        valueType: 'image',
        coordinate: 'portrait',
        adapter: portraitAdapter,
    };
}

/**
 * Whether the page shows the portrait card (`data.metadata.showPortrait`). A document that never
 * chose shows it only when it has a portrait, so documents from before the switch keep theirs.
 */
export function showPortraitFieldBinding(documentKinds: ReadonlySet<string>): FieldBinding {
    return {
        key: 'field:show-portrait',
        kind: 'field',
        label: uiMessages.sheet.templates.defaults.showPortrait.message,
        documentKinds,
        path: ['metadata'],
        valueType: 'boolean',
        coordinate: 'show-portrait',
        adapter: {
            read: (data) => {
                const metadata = metadataOf(data);
                return metadata?.showPortrait ?? !!(metadata?.portraitId || metadata?.imageUrl);
            },
            update: (data, value) => ({
                metadata: { ...metadataOf(data), showPortrait: value === true },
            }),
        },
    };
}

/** The portrait card's condition on character pages (spec 042 follow-up). */
export const PORTRAIT_SHOWN: VisibleWhen = { coordinate: 'show-portrait', equals: true };
