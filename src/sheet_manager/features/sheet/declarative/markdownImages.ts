import { embedNames } from '@site/src/shared/markdown/parse';

import {
    TEMPLATE_VALUES_LIMITS,
    type TemplateImageValue,
    type TemplateMarkdownValue,
} from '../../../types/templateValues';

/** Pictures stored with a markdown text (spec 043, D5): larger than a portrait, for maps. */
export const MARKDOWN_IMAGE_LIMITS = { maxEdge: 2048, maxBytes: 1536 * 1024 } as const;

/**
 * A name for a new picture that `![[name]]` can carry: no brackets, pipes, or line breaks, unique
 * among the text's pictures (`map.png`, `map-2.png`).
 */
export function uniqueImageName(wanted: string, taken: Readonly<Record<string, unknown>>): string {
    const max = TEMPLATE_VALUES_LIMITS.markdownImageNameMax;
    const clean =
        wanted
            .replace(/[[\]|#^\\\n\r]/g, '')
            .trim()
            .slice(0, max - 8) || 'image.png';
    if (!(clean in taken)) return clean;
    const dot = clean.lastIndexOf('.');
    const [stem, extension] = dot > 0 ? [clean.slice(0, dot), clean.slice(dot)] : [clean, ''];
    for (let index = 2; ; index += 1) {
        const candidate = `${stem}-${String(index)}${extension}`;
        if (!(candidate in taken)) return candidate;
    }
}

/** The value with a new picture and its `![[name]]` at `at`; `undefined` past the image limit. */
export function withImage(
    value: TemplateMarkdownValue,
    at: number,
    wanted: string,
    image: TemplateImageValue
): TemplateMarkdownValue | undefined {
    const images = value.images ?? {};
    if (Object.keys(images).length >= TEMPLATE_VALUES_LIMITS.markdownImagesMax) return undefined;
    const name = uniqueImageName(wanted, images);
    const position = Math.max(0, Math.min(at, value.text.length));
    const embed = `![[${name}]]`;
    return {
        text: `${value.text.slice(0, position)}${embed}${value.text.slice(position)}`,
        images: { ...images, [name]: image },
    };
}

/** The value without pictures the text no longer names, or `undefined` when nothing changes. */
export function withoutUnusedImages(
    value: TemplateMarkdownValue
): TemplateMarkdownValue | undefined {
    if (!value.images) return undefined;
    const used = embedNames(value.text);
    const kept = Object.entries(value.images).filter(([name]) => used.has(name));
    if (kept.length === Object.keys(value.images).length) return undefined;
    return kept.length === 0
        ? { text: value.text }
        : { text: value.text, images: Object.fromEntries(kept) };
}
