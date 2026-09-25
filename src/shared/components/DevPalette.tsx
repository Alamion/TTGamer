import { useEffect, useMemo, useState } from 'react';

const GROUP_ORDER: ReadonlyArray<string> = [
    'Primary',
    'Secondary',
    'Semantic',
    'Surfaces & Text',
    'Star Wars',
    'Infima',
    'Core',
];

interface SwatchEntry {
    readonly group: string;
    readonly name: string;
    readonly expr: string;
    readonly code?: string;
}

interface ResolvedSwatch extends SwatchEntry {
    readonly value: string;
}

const TAILWIND_PALETTE: ReadonlyArray<SwatchEntry> = [
    { group: 'Primary', name: 'primary', expr: 'rgb(var(--primary) / 1)' },
    { group: 'Primary', name: 'primary-hover', expr: 'rgb(var(--primary) / 0.8)' },
    { group: 'Primary', name: 'primary-on', expr: 'rgb(var(--on-primary) / 1)' },
    {
        group: 'Primary',
        name: 'primary-dark',
        expr: 'color-mix(in srgb, rgb(var(--primary)), black 25%)',
    },
    {
        group: 'Primary',
        name: 'primary-darker',
        expr: 'color-mix(in srgb, rgb(var(--primary)), black 50%)',
    },
    {
        group: 'Primary',
        name: 'primary-darkest',
        expr: 'color-mix(in srgb, rgb(var(--primary)), black 75%)',
    },
    {
        group: 'Primary',
        name: 'primary-light',
        expr: 'color-mix(in srgb, rgb(var(--primary)), white 25%)',
    },
    {
        group: 'Primary',
        name: 'primary-lighter',
        expr: 'color-mix(in srgb, rgb(var(--primary)), white 50%)',
    },
    {
        group: 'Primary',
        name: 'primary-lightest',
        expr: 'color-mix(in srgb, rgb(var(--primary)), white 75%)',
    },
    { group: 'Secondary', name: 'secondary', expr: 'rgb(var(--secondary) / 1)' },
    { group: 'Secondary', name: 'secondary-hover', expr: 'rgb(var(--secondary) / 0.8)' },
    { group: 'Secondary', name: 'secondary-on', expr: 'rgb(var(--on-secondary) / 1)' },
    {
        group: 'Secondary',
        name: 'secondary-dark',
        expr: 'color-mix(in srgb, rgb(var(--secondary)), black 25%)',
    },
    {
        group: 'Secondary',
        name: 'secondary-darker',
        expr: 'color-mix(in srgb, rgb(var(--secondary)), black 50%)',
    },
    {
        group: 'Secondary',
        name: 'secondary-darkest',
        expr: 'color-mix(in srgb, rgb(var(--secondary)), black 75%)',
    },
    {
        group: 'Secondary',
        name: 'secondary-light',
        expr: 'color-mix(in srgb, rgb(var(--secondary)), white 25%)',
    },
    {
        group: 'Secondary',
        name: 'secondary-lighter',
        expr: 'color-mix(in srgb, rgb(var(--secondary)), white 50%)',
    },
    {
        group: 'Secondary',
        name: 'secondary-lightest',
        expr: 'color-mix(in srgb, rgb(var(--secondary)), white 75%)',
    },
    { group: 'Semantic', name: 'info', expr: 'rgb(var(--info) / 1)' },
    { group: 'Semantic', name: 'error', expr: 'rgb(var(--error) / 1)' },
    { group: 'Semantic', name: 'warning', expr: 'rgb(var(--warning) / 1)' },
    { group: 'Semantic', name: 'success', expr: 'rgb(var(--success) / 1)' },
    { group: 'Surfaces & Text', name: 'bg-base', expr: 'rgb(var(--bg-base) / 1)' },
    { group: 'Surfaces & Text', name: 'bg-surface', expr: 'rgb(var(--bg-surface) / 1)' },
    { group: 'Surfaces & Text', name: 'text-primary', expr: 'rgb(var(--text-primary) / 1)' },
    { group: 'Surfaces & Text', name: 'text-secondary', expr: 'rgb(var(--text-secondary) / 1)' },
    { group: 'Surfaces & Text', name: 'border', expr: 'rgb(var(--border) / 1)' },
    {
        group: 'Surfaces & Text',
        name: 'border-more-contrast',
        expr: 'rgb(var(--border-more-contrast) / 1)',
    },
    { group: 'Star Wars', name: 'jedi-blue', expr: 'rgb(var(--sw-jedi-blue) / 1)' },
    { group: 'Star Wars', name: 'jedi-green', expr: 'rgb(var(--sw-jedi-green) / 1)' },
    { group: 'Star Wars', name: 'jedi-violet', expr: 'rgb(var(--sw-jedi-violet) / 1)' },
    { group: 'Star Wars', name: 'jedi-red', expr: 'rgb(var(--sw-jedi-red) / 1)' },
    { group: 'Star Wars', name: 'empire-grey', expr: 'rgb(var(--sw-empire-grey) / 1)' },
    { group: 'Star Wars', name: 'empire-black', expr: 'rgb(var(--sw-empire-black) / 1)' },
    { group: 'Star Wars', name: 'empire-white', expr: 'rgb(var(--sw-empire-white) / 1)' },
    { group: 'Star Wars', name: 'droid-gold', expr: 'rgb(var(--sw-droid-gold) / 1)' },
    { group: 'Star Wars', name: 'droid-orange', expr: 'rgb(var(--sw-droid-orange) / 1)' },
    { group: 'Star Wars', name: 'droid-rust', expr: 'rgb(var(--sw-droid-rust) / 1)' },
    { group: 'Star Wars', name: 'mandalorian', expr: 'rgb(var(--sw-mandalorian) / 1)' },
    { group: 'Star Wars', name: 'hyperjump', expr: 'rgb(var(--sw-hyperjump) / 1)' },
];

function resolveColor(raw: string): string | null {
    const probe = document.createElement('span');
    probe.style.backgroundColor = raw;
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).backgroundColor;
    probe.remove();
    if (!resolved || resolved === 'rgba(0, 0, 0, 0)' || resolved === 'transparent') {
        return null;
    }
    return resolved;
}

function rgbToHex(color: string): string {
    const match = color.match(/^rgba?\((.+)\)$/);
    if (!match) {
        return color;
    }
    const [r, g, b, a] = match[1]!.split(',').map((part) => parseFloat(part.trim()));
    const hex = [r, g, b]
        .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    if (a !== undefined && a < 1) {
        return `#${hex}${Math.round(a * 255)
            .toString(16)
            .padStart(2, '0')
            .toUpperCase()}`;
    }
    return `#${hex}`;
}

function walkRules(ruleList: CSSRuleList, out: Set<string>): void {
    for (const rule of Array.from(ruleList)) {
        if (rule instanceof CSSStyleRule) {
            for (let i = 0; i < rule.style.length; i += 1) {
                const prop = rule.style[i];
                if (prop.startsWith('--')) {
                    out.add(prop);
                }
            }
        } else if ('cssRules' in rule && rule.cssRules.length > 0) {
            walkRules(rule.cssRules, out);
        }
    }
}

function groupOf(name: string): string {
    if (name.startsWith('--ifm-')) {
        return 'Infima';
    }
    if (name.startsWith('--sw-')) {
        return 'Star Wars';
    }
    return 'Core';
}

function collectColorVars(): ReadonlyArray<ResolvedSwatch> {
    const names = new Set<string>();
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            walkRules(sheet.cssRules, names);
        } catch {
            continue;
        }
    }
    const computed = getComputedStyle(document.documentElement);
    const result: ResolvedSwatch[] = [];
    for (const name of names) {
        const raw = computed.getPropertyValue(name).trim();
        const value = raw ? resolveColor(raw) : null;
        if (value) {
            result.push({ group: groupOf(name), name, expr: raw, value });
        }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
}

function groupBy<T extends SwatchEntry>(
    items: ReadonlyArray<T>
): ReadonlyArray<readonly [string, ReadonlyArray<T>]> {
    const map = new Map<string, T[]>();
    for (const item of items) {
        const list = map.get(item.group);
        if (list) {
            list.push(item);
        } else {
            map.set(item.group, [item]);
        }
    }
    return [...map.entries()]
        .sort((a, b) => {
            const ia = GROUP_ORDER.indexOf(a[0]);
            const ib = GROUP_ORDER.indexOf(b[0]);
            const na = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
            const nb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
            return na - nb;
        })
        .map(([group, list]) => [group, list] as const);
}

function SwatchCard({ swatch }: { swatch: ResolvedSwatch }) {
    return (
        <div
            className="overflow-hidden rounded border border-border bg-bgSurface shadow-sm"
            title={`${swatch.expr}${swatch.code ? `\nclass: ${swatch.code}` : ''}`}
        >
            <div className="h-16 w-full" style={{ backgroundColor: swatch.value }} />
            <div className="space-y-0.5 px-2 py-1.5 font-mono text-[11px] leading-tight">
                <div className="truncate font-semibold text-textPrimary">{swatch.name}</div>
                <div className="truncate text-textSecondary">{swatch.value}</div>
                <div className="truncate text-textSecondary">{rgbToHex(swatch.value)}</div>
            </div>
        </div>
    );
}

export function DevPalette() {
    const [tailwind, setTailwind] = useState<ReadonlyArray<ResolvedSwatch>>([]);
    const [vars, setVars] = useState<ReadonlyArray<ResolvedSwatch>>([]);

    useEffect(() => {
        const compute = () => {
            setTailwind(
                TAILWIND_PALETTE.map((entry) => ({
                    ...entry,
                    code: `bg-${entry.name}`,
                    value: resolveColor(entry.expr) ?? 'transparent',
                }))
            );
            setVars(collectColorVars());
        };
        compute();
        const observer = new MutationObserver(compute);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        return () => observer.disconnect();
    }, []);

    const tailwindGroups = useMemo(() => groupBy(tailwind), [tailwind]);
    const varGroups = useMemo(() => groupBy(vars), [vars]);

    return (
        <div className="tailwind-root">
            <div className="mb-2 inline-flex items-center gap-2 rounded border border-droid-gold/40 bg-droid-gold/10 px-3 py-1 text-xs font-mono uppercase tracking-widest text-droid-gold">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-droid-gold" />
                Dev only — draft page, not shipped in production
            </div>
            <p className="mt-2 text-textSecondary">
                {tailwind.length} Tailwind swatches · {vars.length} CSS variables detected. Toggle
                the site theme to see dark-mode values.
            </p>

            <h2 className="mt-8 text-xl font-bold uppercase tracking-wide text-textPrimary">
                Tailwind Theme Colors
            </h2>
            <p className="mb-4 text-sm text-textSecondary">
                From{' '}
                <code className="rounded bg-bgSurface px-1.5 py-0.5 font-mono text-xs">
                    tailwind.config.cjs
                </code>
            </p>
            {tailwindGroups.map(([group, entries]) => (
                <div key={group} className="mb-6">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-textSecondary">
                        {group} <span className="font-mono text-xs">({entries.length})</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {entries.map((entry) => (
                            <SwatchCard key={entry.name} swatch={entry} />
                        ))}
                    </div>
                </div>
            ))}

            <h2 className="mt-10 text-xl font-bold uppercase tracking-wide text-textPrimary">
                CSS Variables
            </h2>
            <p className="mb-4 text-sm text-textSecondary">
                All color-valued custom properties detected in the stylesheets (Infima + project
                variables), resolved against the current theme
            </p>
            {varGroups.map(([group, entries]) => (
                <div key={group} className="mb-6">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-textSecondary">
                        {group} <span className="font-mono text-xs">({entries.length})</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {entries.map((entry) => (
                            <SwatchCard key={entry.name} swatch={entry} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
