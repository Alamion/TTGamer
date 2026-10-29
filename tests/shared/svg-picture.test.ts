// @vitest-environment happy-dom
import {
    cleanSvgPicture,
    SVG_PICTURE_LIMITS,
    type SvgPictureResult,
} from '@site/src/shared/utils/svgPicture';
import { describe, expect, it } from 'vitest';

/** A user's own SVG is cut down to drawing only before it is stored (spec 046, FR-011). */

const svg = (body: string, attributes = 'viewBox="0 0 24 24"') =>
    `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}>${body}</svg>`;

function cleaned(result: SvgPictureResult) {
    if (!result.ok) throw new Error(`refused: ${result.reason}`);
    return result;
}

describe('cleanSvgPicture keeps drawing', () => {
    it('keeps shapes, groups, gradients, internal references, and safe styles', () => {
        const input = svg(
            '<defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/></linearGradient></defs>' +
                '<g transform="rotate(10 12 12)"><path d="M0 0h10v10z" fill="url(#g)"/>' +
                '<circle cx="12" cy="12" r="4" style="fill: #00f; opacity: 0.5"/></g>' +
                '<text x="2" y="20" font-size="4">Ash</text>'
        );
        const { svg: out, removed } = cleaned(cleanSvgPicture(input));
        expect(removed).toEqual({});
        expect(out).toContain('<linearGradient id="g">');
        expect(out).toContain('fill="url(#g)"');
        expect(out).toContain('style="fill: #00f; opacity: 0.5"');
        expect(out).toContain('<text x="2" y="20" font-size="4">Ash</text>');
        expect(out.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">')).toBe(
            true
        );
    });

    it('gives the same picture when cleaned twice', () => {
        const first = cleaned(
            cleanSvgPicture(svg('<rect width="4" height="4" onclick="x()"/><script>x()</script>'))
        );
        const second = cleaned(cleanSvgPicture(first.svg));
        expect(second.svg).toBe(first.svg);
        expect(second.removed).toEqual({});
    });
});

describe('cleanSvgPicture removes what could run or load', () => {
    it('drops scripts and event handlers', () => {
        const { svg: out, removed } = cleaned(
            cleanSvgPicture(
                svg(
                    '<script>alert(1)</script><rect width="4" height="4" onload="alert(2)"/>',
                    'onload="alert(3)"'
                )
            )
        );
        expect(out).not.toMatch(/script|onload|alert/);
        expect(removed.scripts).toBe(3);
    });

    it('drops foreign objects, images, uses, links, and external references', () => {
        const { svg: out, removed } = cleaned(
            cleanSvgPicture(
                svg(
                    '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject>' +
                        '<image href="https://example.com/a.png"/><use href="#p"/>' +
                        '<path id="p" d="M0 0h4v4z" fill="url(https://example.com/x.svg#a)"/>' +
                        '<a href="https://example.com"><rect width="2" height="2"/></a>'
                )
            )
        );
        expect(out).not.toMatch(/foreignObject|image|<use|example\.com|<a /);
        expect(out).toContain('<path id="p" d="M0 0h4v4z"/>');
        expect(removed.external).toBe(5);
    });

    it('drops style sheets and style properties that load or are not drawing', () => {
        const { svg: out, removed } = cleaned(
            cleanSvgPicture(
                svg(
                    '<style>@import url(https://example.com/a.css);</style>' +
                        '<rect width="4" height="4" style="fill: red; background: url(https://example.com/b.png); position: fixed"/>'
                )
            )
        );
        expect(out).toContain('style="fill: red"');
        expect(out).not.toMatch(/example\.com|position|<style/);
        expect(removed.styles).toBe(3);
    });

    it('drops unknown elements and attributes with their content', () => {
        const { svg: out, removed } = cleaned(
            cleanSvgPicture(
                svg(
                    '<metadata><rdf>me</rdf></metadata><rect width="4" height="4" data-x="1" inkscape:label="r" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"/>'
                )
            )
        );
        expect(out).toBe(svg('<rect width="4" height="4"/>'));
        expect(removed.other).toBeGreaterThanOrEqual(3);
    });
});

describe('cleanSvgPicture refuses', () => {
    it('a file that is not an SVG', () => {
        expect(cleanSvgPicture('\x89PNG\r\n')).toEqual({ ok: false, reason: 'not-svg' });
        expect(cleanSvgPicture('<html><body/></html>')).toEqual({ ok: false, reason: 'not-svg' });
        expect(cleanSvgPicture('<svg><path')).toEqual({ ok: false, reason: 'not-svg' });
    });

    it('a picture with nothing left to draw', () => {
        expect(cleanSvgPicture(svg('<script>x()</script>'))).toEqual({
            ok: false,
            reason: 'empty',
        });
    });

    it('a picture over the size or element limits after cleaning, and a huge file before', () => {
        const long = 'M0 0' + 'l1 1'.repeat(SVG_PICTURE_LIMITS.bytes / 4);
        expect(cleanSvgPicture(svg(`<path d="${long}"/>`))).toEqual({
            ok: false,
            reason: 'too-large',
        });
        const many = '<rect width="1" height="1"/>'.repeat(SVG_PICTURE_LIMITS.elements);
        expect(cleanSvgPicture(svg(many))).toEqual({ ok: false, reason: 'too-complex' });
        const huge = svg(
            `<!--${'x'.repeat(SVG_PICTURE_LIMITS.inputBytes)}--><rect width="1" height="1"/>`
        );
        expect(cleanSvgPicture(huge)).toEqual({ ok: false, reason: 'too-large' });
    });

    it('but keeps a picture just within the limits', () => {
        const fits = '<rect width="1" height="1"/>'.repeat(SVG_PICTURE_LIMITS.elements - 1);
        expect(cleanSvgPicture(svg(fits)).ok).toBe(true);
    });
});
