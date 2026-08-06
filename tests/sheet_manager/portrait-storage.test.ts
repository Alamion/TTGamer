import { getSafePortraitUrl } from '@site/src/sheet_manager/persistence/portraitStorage';
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
