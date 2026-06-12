export function generateId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
}

export function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
    try {
        return crypto.getRandomValues(array);
    } catch {
        if (array) {
            const view = new Uint32Array(array.buffer, array.byteOffset, array.byteLength / 4);
            for (let i = 0; i < view.length; i++) {
                view[i] = (Math.random() * 0x100000000) >>> 0;
            }
        }
        return array;
    }
}
