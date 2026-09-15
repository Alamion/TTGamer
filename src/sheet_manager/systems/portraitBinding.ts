import type { FieldBinding } from './templateBindings';

/**
 * The document portrait: `data.metadata.portraitId` (a device blob) or `data.metadata.imageUrl`
 * (a URL), never both. Every system stores it there, so export stripping and blob cleanup in the
 * document store work without knowing the system.
 */
const portraitAdapter: NonNullable<FieldBinding['adapter']> = {
    read: (data) => {
        const metadata = (data as { metadata?: { portraitId?: string; imageUrl?: string } })
            .metadata;
        if (metadata?.portraitId) return { source: 'device', blobId: metadata.portraitId };
        if (metadata?.imageUrl) return { source: 'url', url: metadata.imageUrl };
        return undefined;
    },
    update: (data, value) => {
        const metadata = { ...((data as { metadata?: Record<string, unknown> }).metadata ?? {}) };
        delete metadata.portraitId;
        delete metadata.imageUrl;
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
