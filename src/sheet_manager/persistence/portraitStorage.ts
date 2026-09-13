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

async function compressPortrait(file: File): Promise<Blob> {
    if (!file.type.startsWith('image/')) throw new Error('Select an image file.');
    if (file.size > MAX_SOURCE_BYTES) throw new Error('Portrait source must be 10 MB or smaller.');

    const image = await decodeImage(file);
    try {
        const initialScale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
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
                if (blob.size <= MAX_PORTRAIT_BYTES) return blob;
            }

            width = Math.max(1, Math.round(width * 0.75));
            height = Math.max(1, Math.round(height * 0.75));
        }
    } finally {
        image.close();
    }

    throw new Error('Portrait could not be compressed below 512 KB.');
}

export async function savePortrait(file: File): Promise<string> {
    const blob = await compressPortrait(file);
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
