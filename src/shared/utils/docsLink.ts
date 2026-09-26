/**
 * A documentation link a template author may write: a page of this site's docs
 * (`/docs/<path>` with an optional `#anchor`, resolved against the reader's locale) or an
 * external `https://` page. Anything else — relative paths, other schemes such as
 * `javascript:` — is not a link.
 */
export type DocsLink = { kind: 'site'; path: string } | { kind: 'external'; url: string };

const SITE_DOCS_PATH = /^\/docs(?:\/[A-Za-z0-9._~-]+)*\/?(?:#[A-Za-z0-9._~-]*)?$/;

export function parseDocsLink(value: string): DocsLink | undefined {
    const trimmed = value.trim();
    if (SITE_DOCS_PATH.test(trimmed) && !trimmed.split('#')[0]!.includes('..')) {
        return { kind: 'site', path: trimmed };
    }
    if (!trimmed.toLowerCase().startsWith('https://')) return undefined;
    try {
        const url = new URL(trimmed);
        return url.protocol === 'https:' && url.hostname
            ? { kind: 'external', url: url.href }
            : undefined;
    } catch {
        return undefined;
    }
}
