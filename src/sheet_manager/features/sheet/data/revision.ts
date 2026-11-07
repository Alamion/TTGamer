import type { CustomTemplate } from '../../../types/template';

const revisions = new WeakMap<CustomTemplate, string>();

/** Content identity for immutable pages; object key order does not affect the revision. */
export function revisionOf(template: CustomTemplate): string {
    const cached = revisions.get(template);
    if (cached !== undefined) return cached;

    const canonical = JSON.stringify(template, (_key, value: unknown) => {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            return Object.fromEntries(
                Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            );
        }
        return value;
    });

    // cyrb53 retains 53 bits, so the result is exact in a JavaScript number.
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let index = 0; index < canonical.length; index++) {
        const code = canonical.charCodeAt(index);
        h1 = Math.imul(h1 ^ code, 2654435761);
        h2 = Math.imul(h2 ^ code, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const revision = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    revisions.set(template, revision);
    return revision;
}
