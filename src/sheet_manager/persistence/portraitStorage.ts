import { generateId } from '@site/src/shared/utils/random';

const STORE_NAME = 'character-portraits';
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_PORTRAIT_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_EDGE = 768;

interface PortraitRecord {
    blob: Blob;
    createdAt: number;
}

async function getStore() {
    const localforage = await import('localforage');
    return localforage.default.createInstance({
        name: 'ttgamer',
        storeName: STORE_NAME,
    });
}

/**
 * A site path (`/img/…`, as shipped examples store it) under the site's base URL: the Russian site
 * and a deployment under a sub-path serve static files below their base (`/ru/img/…`).
 */
export function sitePortraitUrl(safe: string, baseUrl: string): string {
    const base = baseUrl.replace(/\/$/, '');
    if (!safe.startsWith('/') || !base || safe.startsWith(`${base}/`)) return safe;
    return `${base}${safe}`;
}

export function getSafePortraitUrl(value?: string): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;

    try {
        const url = new URL(trimmed);
        return url.protocol === 'https:' ? url.toString() : undefined;
    } catch {
        return undefined;
    }
}

async function decodeImage(file: Blob): Promise<ImageBitmap> {
    if (!globalThis.createImageBitmap) {
        throw new Error('This browser cannot process local portraits.');
    }
    return createImageBitmap(file);
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Portrait encoding failed.'))),
            'image/webp',
            quality
        );
    });
}

/** How large a stored picture may be: a portrait by default, a map in a markdown text (spec 043). */
export interface ImageLimits {
    maxEdge: number;
    maxBytes: number;
}

const PORTRAIT_LIMITS: ImageLimits = { maxEdge: MAX_EDGE, maxBytes: MAX_PORTRAIT_BYTES };

/** Pictures in a markdown text (spec 043, D5): larger than a portrait, for maps. */
export const MARKDOWN_IMAGE_LIMITS: ImageLimits = { maxEdge: 2048, maxBytes: 1536 * 1024 };

async function compressPortrait(file: File, limits: ImageLimits): Promise<Blob> {
    if (!file.type.startsWith('image/')) throw new Error('Select an image file.');
    if (file.size > MAX_SOURCE_BYTES) throw new Error('Portrait source must be 10 MB or smaller.');

    const image = await decodeImage(file);
    try {
        const initialScale = Math.min(1, limits.maxEdge / Math.max(image.width, image.height));
        let width = Math.max(1, Math.round(image.width * initialScale));
        let height = Math.max(1, Math.round(image.height * initialScale));

        for (let pass = 0; pass < 4; pass += 1) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Portrait processing is unavailable.');
            context.drawImage(image, 0, 0, width, height);

            for (const quality of [0.82, 0.68, 0.54]) {
                const blob = await canvasToBlob(canvas, quality);
                if (blob.size <= limits.maxBytes) return blob;
            }

            width = Math.max(1, Math.round(width * 0.75));
            height = Math.max(1, Math.round(height * 0.75));
        }
    } finally {
        image.close();
    }

    throw new Error(
        `Image could not be compressed below ${Math.round(limits.maxBytes / 1024)} KB.`
    );
}

export async function savePortrait(
    file: File,
    limits: ImageLimits = PORTRAIT_LIMITS
): Promise<string> {
    const blob = await compressPortrait(file, limits);
    const store = await getStore();
    const keys = await store.keys();
    let usedBytes = 0;
    for (const key of keys) {
        const record = await store.getItem<PortraitRecord>(key);
        usedBytes += record?.blob.size ?? 0;
    }
    if (usedBytes + blob.size > MAX_TOTAL_BYTES) {
        throw new Error('Local portrait storage is full (50 MB limit).');
    }

    const id = generateId();
    await store.setItem<PortraitRecord>(id, { blob, createdAt: Date.now() });
    return id;
}

export async function loadPortrait(portraitId: string): Promise<Blob | null> {
    const store = await getStore();
    return (await store.getItem<PortraitRecord>(portraitId))?.blob ?? null;
}

export async function deletePortrait(portraitId?: string): Promise<void> {
    if (!portraitId) return;
    const store = await getStore();
    await store.removeItem(portraitId);
}

/** Every stored picture with when it was stored (the picture sweep, spec 045). */
export async function listStoredPictures(): Promise<Array<{ id: string; createdAt: number }>> {
    const store = await getStore();
    const pictures: Array<{ id: string; createdAt: number }> = [];
    await store.iterate<PortraitRecord, void>((record, id) => {
        pictures.push({ id, createdAt: record?.createdAt ?? 0 });
    });
    return pictures;
}
