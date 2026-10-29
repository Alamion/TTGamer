/**
 * A user's own SVG picture cut down to drawing only (spec 046): the result is rebuilt from an
 * allowlist, so nothing in it can run or load, wherever the picture is later opened.
 */

export const SVG_PICTURE_LIMITS = {
    /** After cleaning. */
    bytes: 8192,
    /** After cleaning, the root included. */
    elements: 200,
    /** Refused before parsing. */
    inputBytes: 256 * 1024,
} as const;

/** What was taken out, by kind, for the form to say. */
export type SvgRemovedKind = 'scripts' | 'external' | 'styles' | 'other';

export type SvgPictureResult =
    | { ok: true; svg: string; removed: Partial<Record<SvgRemovedKind, number>> }
    | { ok: false; reason: 'not-svg' | 'empty' | 'too-large' | 'too-complex' };

const SVG_NS = 'http://www.w3.org/2000/svg';

const ELEMENTS = new Set([
    'svg',
    'g',
    'path',
    'rect',
    'circle',
    'ellipse',
    'line',
    'polyline',
    'polygon',
    'text',
    'tspan',
    'defs',
    'linearGradient',
    'radialGradient',
    'stop',
    'clipPath',
    'title',
]);
const DRAWING = new Set([
    'path',
    'rect',
    'circle',
    'ellipse',
    'line',
    'polyline',
    'polygon',
    'text',
]);
const WITH_TEXT = new Set(['text', 'tspan', 'title']);
/** Elements that fetch, embed, or link: dropped with their content and counted as external. */
const EXTERNAL = new Set(['image', 'use', 'foreignObject', 'a', 'feImage', 'iframe', 'object']);

const PRESENTATION = [
    'fill',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-dasharray',
    'opacity',
    'fill-opacity',
    'stroke-opacity',
    'fill-rule',
    'clip-rule',
    'clip-path',
    'stop-color',
    'stop-opacity',
    'font-size',
    'font-weight',
    'font-family',
    'text-anchor',
];
const STYLE_PROPERTIES = new Set(PRESENTATION);
const ATTRIBUTES = new Set([
    ...PRESENTATION,
    'id',
    'd',
    'points',
    'x',
    'y',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'x1',
    'y1',
    'x2',
    'y2',
    'fx',
    'fy',
    'dx',
    'dy',
    'width',
    'height',
    'viewBox',
    'preserveAspectRatio',
    'transform',
    'offset',
    'gradientUnits',
    'gradientTransform',
    'spreadMethod',
    'clipPathUnits',
]);

/** Any `url(...)` that is not a reference inside the file. */
const outsideUrl = (value: string) =>
    [...value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/giu)].some(
        ([, , target]) => !target!.startsWith('#')
    );

const escapeText = (text: string) =>
    text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
const escapeAttribute = (text: string) => escapeText(text).replace(/"/gu, '&quot;');

/** Cleans an uploaded or imported SVG; see `SVG_PICTURE_LIMITS` for what is refused. */
export function cleanSvgPicture(text: string): SvgPictureResult {
    if (new TextEncoder().encode(text).length > SVG_PICTURE_LIMITS.inputBytes)
        return { ok: false, reason: 'too-large' };
    if (typeof DOMParser === 'undefined') return { ok: false, reason: 'not-svg' };
    const document = new DOMParser().parseFromString(text, 'image/svg+xml');
    const root = document.documentElement;
    if (
        !root ||
        root.localName !== 'svg' ||
        root.namespaceURI !== SVG_NS ||
        document.getElementsByTagName('parsererror').length > 0
    )
        return { ok: false, reason: 'not-svg' };

    const removed: Partial<Record<SvgRemovedKind, number>> = {};
    const count = (kind: SvgRemovedKind) => (removed[kind] = (removed[kind] ?? 0) + 1);
    let elements = 0;
    let drawing = false;

    function attributesOf(element: Element): string {
        let out = '';
        for (const { name, value } of Array.from(element.attributes)) {
            if (name === 'xmlns') continue;
            if (/^on/iu.test(name)) count('scripts');
            else if (name === 'href' || name.endsWith(':href')) count('external');
            else if (name === 'style') {
                const kept: string[] = [];
                for (const declaration of value.split(';')) {
                    const at = declaration.indexOf(':');
                    if (at < 0) continue;
                    const property = declaration.slice(0, at).trim().toLowerCase();
                    const propertyValue = declaration.slice(at + 1).trim();
                    if (!property) continue;
                    if (
                        STYLE_PROPERTIES.has(property) &&
                        !outsideUrl(propertyValue) &&
                        !/expression|@import|javascript:/iu.test(propertyValue)
                    )
                        kept.push(`${property}: ${propertyValue}`);
                    else count('styles');
                }
                if (kept.length > 0) out += ` style="${escapeAttribute(kept.join('; '))}"`;
            } else if (!ATTRIBUTES.has(name)) count('other');
            else if (outsideUrl(value)) count('external');
            else out += ` ${name}="${escapeAttribute(value)}"`;
        }
        return out;
    }

    function build(element: Element): string {
        const name = element.localName;
        if (element.namespaceURI !== SVG_NS || !ELEMENTS.has(name)) {
            if (name === 'script') count('scripts');
            else if (name === 'style') count('styles');
            else if (EXTERNAL.has(name)) count('external');
            else count('other');
            return '';
        }
        elements += 1;
        if (DRAWING.has(name)) drawing = true;
        let children = '';
        for (const child of Array.from(element.childNodes)) {
            if (child.nodeType === 1) children += build(child as Element);
            else if (child.nodeType === 3 && WITH_TEXT.has(name))
                children += escapeText(child.textContent ?? '');
        }
        const open = name === 'svg' ? `svg xmlns="${SVG_NS}"` : name;
        return children
            ? `<${open}${attributesOf(element)}>${children}</${name}>`
            : `<${open}${attributesOf(element)}/>`;
    }

    const svg = build(root);
    if (!drawing) return { ok: false, reason: 'empty' };
    if (elements > SVG_PICTURE_LIMITS.elements) return { ok: false, reason: 'too-complex' };
    if (new TextEncoder().encode(svg).length > SVG_PICTURE_LIMITS.bytes)
        return { ok: false, reason: 'too-large' };
    return { ok: true, svg, removed };
}
