// @vitest-environment happy-dom
import { MarkdownView } from '@site/src/shared/components/markdown/MarkdownView';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

/** Every element the view may produce (spec 043 FR-009, SC-005). */
const ALLOWED = new Set([
    'DIV',
    'P',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'STRONG',
    'EM',
    'DEL',
    'MARK',
    'CODE',
    'PRE',
    'A',
    'IMG',
    'SPAN',
    'UL',
    'OL',
    'LI',
    'LABEL',
    'INPUT',
    'BLOCKQUOTE',
    'HR',
    'TABLE',
    'THEAD',
    'TBODY',
    'TR',
    'TH',
    'TD',
    'BUTTON',
]);

const HOSTILE = [
    '<script>alert(1)</script>',
    '<img src=x onerror="alert(1)">',
    '<details open><summary>x</summary>y</details>',
    '<iframe src="https://e.org"></iframe>',
    '[click](javascript:alert(1))',
    '[click](JaVaScRiPt:alert(1))',
    '[click](java\tscript:alert(1))',
    '[click](data:text/html;base64,PHNjcmlwdD4=)',
    '[click](vbscript:msgbox(1))',
    '[click](&#106;avascript:alert(1))',
    '<javascript:alert(1)>',
    '![x](javascript:alert(1))',
    '![x](data:image/svg+xml,<svg onload=alert(1)>)',
    '> [!note]- <b onmouseover=alert(1)>title</b>',
    '| <script>x</script> | a |\n|---|---|\n| <style>*{}</style> | b |',
    '- [ ] <svg onload=alert(1)>',
    '**<img src=x onerror=alert(1)>**',
    '`<script>`',
    '```html\n<script>alert(1)</script>\n```',
    '[[<script>alert(1)</script>]]',
    '![[x" onerror="alert(1)]]',
];

afterEach(cleanup);

describe('MarkdownView safety', () => {
    it.each(HOSTILE)('renders %j without executable markup', (source) => {
        const { container } = render(<MarkdownView source={source} />);
        for (const element of container.querySelectorAll('*')) {
            expect(ALLOWED.has(element.tagName), element.tagName).toBe(true);
            for (const attribute of element.attributes) {
                expect(attribute.name.startsWith('on'), attribute.name).toBe(false);
            }
        }
        for (const link of container.querySelectorAll('a')) {
            expect(link.getAttribute('href') ?? '').toMatch(/^(https?:|mailto:|#|[^:]*$)/i);
        }
        for (const image of container.querySelectorAll('img')) {
            expect(image.getAttribute('src') ?? '').toMatch(/^https:/i);
        }
    });

    it('shows raw HTML as the text that was written', () => {
        const { container } = render(<MarkdownView source="<b>bold?</b>" />);
        expect(container.textContent).toBe('<b>bold?</b>');
    });
});
