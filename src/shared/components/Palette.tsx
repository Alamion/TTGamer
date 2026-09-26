import tailwindConfig from '@site/tailwind.config.cjs';
import { useEffect, useState } from 'react';

interface Swatch {
    group: string;
    /** Tailwind color name (`primary-dark`) or CSS custom property (`--primary`). */
    name: string;
    expression: string;
    value: string;
}

/** Tailwind theme colors, flattened the way Tailwind names their classes (`primary-dark`). */
export function tailwindColors(): Array<{ group: string; name: string; expression: string }> {
    return Object.entries(tailwindConfig.theme.extend.colors).flatMap(([key, value]) => {
        const entries = typeof value === 'string' ? { DEFAULT: value } : value;
        return Object.entries(entries).map(([shade, expression]) => ({
            group: typeof value === 'string' ? 'Single colors' : key,
            name: shade === 'DEFAULT' ? key : `${key}-${shade}`,
            expression: expression.replace('<alpha-value>', '1'),
        }));
    });
}

function resolveColor(raw: string): string | undefined {
    const probe = document.createElement('span');
    probe.style.backgroundColor = raw;
    if (!probe.style.backgroundColor) return undefined;
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return resolved && resolved !== 'rgba(0, 0, 0, 0)' ? resolved : undefined;
}

/** A custom property's color: a CSS color, or the project's `r g b` channel triples. */
function resolveVariable(raw: string): string | undefined {
    if (/^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/.test(raw)) return resolveColor(`rgb(${raw})`);
    return resolveColor(raw);
}

function toHex(color: string): string {
    const match = color.match(/^rgba?\((.+)\)$/);
    if (!match) return color;
    const [r = 0, g = 0, b = 0, a] = match[1]!.split(/[\s,/]+/).map(Number);
    const hex = [r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0'));
    const alpha =
        a !== undefined && a < 1
            ? Math.round(a * 255)
                  .toString(16)
                  .padStart(2, '0')
            : '';
    return `#${hex.join('')}${alpha}`.toUpperCase();
}

function customProperties(): Set<string> {
    const names = new Set<string>();
    const walk = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
            if (rule instanceof CSSStyleRule) {
                for (const property of Array.from(rule.style)) {
                    if (property.startsWith('--')) names.add(property);
                }
            } else if ('cssRules' in rule) {
                walk((rule as CSSGroupingRule).cssRules);
            }
        }
    };
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            walk(sheet.cssRules);
        } catch {
            // Cross-origin sheets cannot be read.
        }
    }
    return names;
}

function variableGroup(name: string): string {
    if (name.startsWith('--ifm-')) return 'Infima variables';
    if (name.startsWith('--sw-')) return 'Star Wars variables';
    return 'Project variables';
}

function collectSwatches(): Swatch[] {
    const theme = tailwindColors().flatMap(({ group, name, expression }) => {
        const value = resolveColor(expression);
        return value ? [{ group, name, expression, value }] : [];
    });
    const computed = getComputedStyle(document.documentElement);
    const variables = [...customProperties()].sort().flatMap((name) => {
        const expression = computed.getPropertyValue(name).trim();
        const value = expression ? resolveVariable(expression) : undefined;
        return value ? [{ group: variableGroup(name), name, expression, value }] : [];
    });
    return [...theme, ...variables];
}

function SwatchCard({ swatch }: { swatch: Swatch }) {
    const utility = swatch.name.startsWith('--') ? undefined : `bg-${swatch.name}`;
    return (
        <figure
            className="m-0 overflow-hidden rounded border border-border bg-bgSurface"
            title={swatch.expression}
        >
            <div className="h-14" style={{ backgroundColor: swatch.value }} />
            <figcaption className="grid gap-0.5 px-2 py-1.5 font-mono text-[11px] leading-tight">
                <span className="truncate font-semibold text-textPrimary">{swatch.name}</span>
                {utility && <span className="truncate text-textSecondary">{utility}</span>}
                <span className="truncate text-textSecondary">{toHex(swatch.value)}</span>
            </figcaption>
        </figure>
    );
}

/**
 * Every color the app defines (constitution VI): the Tailwind theme colors from
 * `tailwind.config.cjs` and every color-valued CSS custom property, resolved in the current
 * theme and recomputed when the site theme switches.
 */
export function Palette() {
    const [swatches, setSwatches] = useState<Swatch[]>([]);
    useEffect(() => {
        const compute = () => setSwatches(collectSwatches());
        compute();
        const observer = new MutationObserver(compute);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        return () => observer.disconnect();
    }, []);

    const groups = new Map<string, Swatch[]>();
    for (const swatch of swatches) {
        groups.set(swatch.group, [...(groups.get(swatch.group) ?? []), swatch]);
    }
    return (
        <div className="grid gap-6">
            <p className="text-sm text-textSecondary">
                {swatches.length} colors. Switch the site theme to see the dark values.
            </p>
            {[...groups.entries()].map(([group, entries]) => (
                <section key={group} className="grid gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-textSecondary">
                        {group} ({entries.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {entries.map((swatch) => (
                            <SwatchCard key={swatch.name} swatch={swatch} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
