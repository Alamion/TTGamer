import { parseDocsLink } from '@site/src/shared/utils/docsLink';
import { describe, expect, it } from 'vitest';

describe('parseDocsLink', () => {
    it('accepts site docs paths with an optional anchor', () => {
        expect(parseDocsLink('/docs/wod-v5/rules/dice-pools#reading-the-dice')).toEqual({
            kind: 'site',
            path: '/docs/wod-v5/rules/dice-pools#reading-the-dice',
        });
        expect(parseDocsLink(' /docs/template-editor ')).toEqual({
            kind: 'site',
            path: '/docs/template-editor',
        });
    });

    it('accepts external https addresses', () => {
        expect(parseDocsLink('https://example.org/wiki/Hunter?x=1#top')).toEqual({
            kind: 'external',
            url: 'https://example.org/wiki/Hunter?x=1#top',
        });
    });

    it.each([
        'javascript:alert(1)',
        'http://example.org',
        'docs/wod-v5',
        '/blog/post',
        '/docs/../admin',
        '//evil.example/docs',
        'data:text/html,hi',
        'https://',
        '',
    ])('rejects %j', (value) => {
        expect(parseDocsLink(value)).toBeUndefined();
    });
});
