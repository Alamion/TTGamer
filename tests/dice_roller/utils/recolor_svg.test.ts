import { describe, it, expect } from 'vitest';
import { blendColors, fixBrightness } from '@site/src/dice_roller/utils/recolor_svg';

describe('blendColors', () => {
    it('returns color1 when ratio is 0', () => {
        expect(blendColors('#ff0000', '#0000ff', 0)).toBe('#ff0000');
    });

    it('returns color2 when ratio is 1', () => {
        expect(blendColors('#ff0000', '#0000ff', 1)).toBe('#0000ff');
    });

    it('returns midpoint color at ratio 0.5', () => {
        const result = blendColors('#000000', '#ffffff', 0.5);
        expect(result).toBe('#808080');
    });

    it('handles 3-digit hex shorthand', () => {
        const result = blendColors('#fff', '#000', 0);
        expect(result).toBe('#ffffff');
    });

    it('blends with 3-digit hex shorthand at full ratio', () => {
        const result = blendColors('#fff', '#000', 1);
        expect(result).toBe('#000000');
    });

    it('blends 3-digit hex correctly at midpoint', () => {
        const result = blendColors('#f00', '#00f', 0.5);
        expect(result).toBe('#800080');
    });

    it('handles rgba input returning hex when alpha >= 1', () => {
        const result = blendColors('rgba(255,0,0,1)', 'rgba(0,0,255,1)', 0.5);
        expect(result).toBe('#800080');
    });

    it('returns rgba when alpha < 1', () => {
        const result = blendColors('rgba(255,0,0,0.5)', 'rgba(0,0,255,0.5)', 0.5);
        expect(result).toMatch(/^rgba\(\d+,\d+,\d+,[\d.]+\)$/);
    });

    it('treats zero alpha from rgba input as 1 due to parser fallback', () => {
        const result = blendColors('rgba(255,0,0,1)', 'rgba(0,0,255,0)', 0.5);
        expect(result).toBe('#800080');
    });

    it('blends primary dice color with secondary', () => {
        const result = blendColors('#ff8040', '#ffffff', 0.5);
        expect(result).toBe('#ffc0a0');
    });

    it('returns fallback black for invalid color input', () => {
        const result = blendColors('invalid', '#ffffff', 0);
        expect(result).toBe('#000000');
    });
});

describe('fixBrightness', () => {
    it('returns the same color when magnitude is 0', () => {
        expect(fixBrightness('#ff8040', 0)).toBe('#ff8040');
    });

    it('lightens color with positive magnitude', () => {
        const result = fixBrightness('#ff8040', 20);
        const [, r, g, b] = result.match(/^#(..)(..)(..)$/)!.map((x) => parseInt(x, 16));
        expect(r).toBeGreaterThan(0x80);
        expect(g).toBeGreaterThan(0x40);
        expect(b).toBeGreaterThan(0x40);
    });

    it('darkens color with negative magnitude', () => {
        const result = fixBrightness('#ff8040', -20);
        const [, r, g, b] = result.match(/^#(..)(..)(..)$/)!.map((x) => parseInt(x, 16));
        expect(r).toBeLessThan(0xff);
        expect(g).toBeLessThan(0x80);
        expect(b).toBeLessThan(0x40);
    });

    it('returns a valid hex color', () => {
        const result = fixBrightness('#ff8040', 30);
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('clamps lightness at upper bound', () => {
        const result = fixBrightness('#000000', 100);
        expect(result).toBe('#ffffff');
    });

    it('clamps lightness at lower bound', () => {
        const result = fixBrightness('#ffffff', -100);
        expect(result).toBe('#000000');
    });

    it('handles near-black colors', () => {
        const result = fixBrightness('#0a0a0a', 50);
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('handles near-white colors', () => {
        const result = fixBrightness('#f5f5f5', -50);
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('works with hashless input', () => {
        const withHash = fixBrightness('#ff8040', 10);
        const withoutHash = fixBrightness('ff8040', 10);
        expect(withHash).toBe(withoutHash);
    });
});
