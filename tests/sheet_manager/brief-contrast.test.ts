import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

type Rgb = [number, number, number];

const css = readFileSync('src/css/custom.css', 'utf8');

/** The `--name: r g b;` triplets of the block that starts with `selector`. */
function palette(selector: string): Record<string, Rgb> {
    const start = css.indexOf(selector + ' {');
    const block = css.slice(start, css.indexOf('}', start));
    const found: Record<string, Rgb> = {};
    for (const [, name, r, g, b] of block.matchAll(/--([a-z-]+):\s*(\d+) (\d+) (\d+);/g)) {
        found[name!] = [Number(r), Number(g), Number(b)];
    }
    return found;
}

const light = palette(':root');
const dark = { ...light, ...palette("[data-theme='dark']") };

const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: Rgb) =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: Rgb, b: Rgb) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (high! + 0.05) / (low! + 0.05);
};
const over = (top: Rgb, bottom: Rgb, share: number): Rgb =>
    top.map((value, index) => Math.round(value * share + bottom[index]! * (1 - share))) as Rgb;

/** The heading is the primary red, darkened in the light theme and lightened in the dark one. */
const headingColor = (theme: Record<string, Rgb>): Rgb => {
    const primary = theme['primary']!;
    const dark = theme['bg-base']![0]! < 128;
    return over(dark ? [255, 255, 255] : [0, 0, 0], primary, 0.25);
};

describe('brief colors keep a readable contrast in both themes (spec 033, SC-005)', () => {
    for (const [name, theme] of [
        ['light', light],
        ['dark', dark],
    ] as const) {
        const page = theme['bg-base']!;
        const surface = theme['bg-surface']!;
        const pairs: Array<[string, Rgb, Rgb]> = [
            ['value on the page', theme['text-primary']!, page],
            ['value on the surface', theme['text-primary']!, surface],
            ['label on the page', theme['text-secondary']!, page],
            ['label on the surface', theme['text-secondary']!, surface],
            ['label on its chip cell', theme['text-secondary']!, over(theme['border']!, page, 0.7)],
            ['value on its chip cell', theme['text-primary']!, over(theme['border']!, page, 0.3)],
            ['heading on the page', headingColor(theme), page],
        ];
        for (const [what, text, background] of pairs) {
            it(`${name}: ${what} is at least 4.5:1`, () => {
                expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
            });
        }
    }
});

describe('brief styles use only palette tokens (spec 033, SC-005)', () => {
    const files = [
        'src/sheet_manager/features/sheet/declarative/briefRhythm.ts',
        'src/sheet_manager/features/sheet/declarative/shortLabels.ts',
        'src/sheet_manager/components/stat-fields/CompactSheetFields.tsx',
        'src/sheet_manager/components/sections/SectionCard.tsx',
    ];
    for (const file of files) {
        it(`${file} names no literal color`, () => {
            const source = readFileSync(file, 'utf8');
            expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
            expect(source).not.toMatch(/\brgba?\(/);
            expect(source).not.toMatch(
                /\b(?:bg|text|border|ring|outline)-(?:red|green|blue|gray|slate)-?\d*\b/
            );
        });
    }
});
