const HEX = Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, '0'));

const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => HEX[byte]).join('');

/**
 * A UUIDv7 (RFC 9562): 48 bits of millisecond time, then random bits. Ids made on the device keep
 * their value when a document moves to the cloud (spec 030). `getRandomValues` also works on
 * plain-HTTP addresses, where `randomUUID` does not.
 */
export function generateId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    let time = Date.now();
    for (let index = 5; index >= 0; index--) {
        bytes[index] = time % 256;
        time = Math.floor(time / 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = toHex(bytes);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The 32 hex digits of a UUIDv7, for ids that must stay kebab-case identifiers. */
export const compactId = () => generateId().replaceAll('-', '');

/**
 * Random lowercase hex for ids unique only inside one document or template. Never a slice of
 * `generateId()`: its first digits are the time, equal for ids made in one millisecond.
 */
export function randomToken(length: number): string {
    return toHex(crypto.getRandomValues(new Uint8Array(Math.ceil(length / 2)))).slice(0, length);
}
