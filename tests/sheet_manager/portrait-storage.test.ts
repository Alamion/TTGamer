import {
    getSafePortraitUrl,
    sitePortraitUrl,
} from '@site/src/sheet_manager/persistence/portraitStorage';
import { describe, expect, it } from 'vitest';

describe('portrait URL policy', () => {
    it('allows HTTPS and site-relative assets', () => {
        expect(getSafePortraitUrl('https://example.com/image.png')).toBe(
            'https://example.com/image.png'
        );
        expect(getSafePortraitUrl('/img/preset.png')).toBe('/img/preset.png');
    });

    it.each([
        'http://example.com/image.png',
        'data:image/png;base64,AAAA',
        'javascript:alert(1)',
        'blob:https://example.com/id',
        '//evil.example/image.png',
    ])('rejects unsafe or ambiguous URL %s', (url) => {
        expect(getSafePortraitUrl(url)).toBeUndefined();
    });
});

describe('site paths under the base URL', () => {
    it('puts a site path under a locale or sub-path base, once', () => {
        expect(sitePortraitUrl('/img/mirela_voss.webp', '/')).toBe('/img/mirela_voss.webp');
        expect(sitePortraitUrl('/img/mirela_voss.webp', '/ru/')).toBe('/ru/img/mirela_voss.webp');
        expect(sitePortraitUrl('/ru/img/mirela_voss.webp', '/ru/')).toBe(
            '/ru/img/mirela_voss.webp'
        );
        expect(sitePortraitUrl('/img/a.webp', '/ttgamer/')).toBe('/ttgamer/img/a.webp');
        expect(sitePortraitUrl('https://example.com/a.webp', '/ru/')).toBe(
            'https://example.com/a.webp'
        );
    });
});
