export function blendColors(color1: string, color2: string, ratio: number): string {
    // ratio: 0 → color1, 1 → color2
    const parse = (c: string): { r: number; g: number; b: number; a: number } => {
        if (c.startsWith('rgba')) {
            const [r, g, b, a] = c.match(/[\d.]+/g)!.map(Number);
            return { r: r || 0, g: g || 0, b: b || 0, a: a || 1 };
        }
        if (c.startsWith('#')) {
            const hex = c.slice(1);
            const expand =
                hex.length === 3
                    ? hex
                          .split('')
                          .map((x) => x + x)
                          .join('')
                    : hex;
            return {
                r: parseInt(expand.slice(0, 2), 16),
                g: parseInt(expand.slice(2, 4), 16),
                b: parseInt(expand.slice(4, 6), 16),
                a: 1,
            };
        }
        return { r: 0, g: 0, b: 0, a: 1 }; // fallback
    };

    const c1 = parse(color1);
    const c2 = parse(color2);

    const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
    const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
    const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);
    const a = c1.a * (1 - ratio) + c2.a * ratio;

    if (a >= 1)
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return `rgba(${r},${g},${b},${a})`;
}

export function fixBrightness(hex: string, magnitude: number): string {
    hex = hex.replace(/^#/, '');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // 2. Переводим RGB в HSL
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    let h = 0,
        s: number,
        l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    l += magnitude / 100;

    let rFinal, gFinal, bFinal;
    if (s === 0) {
        rFinal = gFinal = bFinal = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        rFinal = hue2rgb(p, q, h + 1 / 3);
        gFinal = hue2rgb(p, q, h);
        bFinal = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
        const hexVal = Math.round(x * 255).toString(16);
        return hexVal.length === 1 ? '0' + hexVal : hexVal;
    };
    return `#${toHex(rFinal)}${toHex(gFinal)}${toHex(bFinal)}`;
}
