import { clsx } from 'clsx';

import { MarkSwatch } from '../../../../components/stat-fields/Tracker';
import { TRACKER_PALETTE_FILLS } from '../../../../types/template';
import { t, text } from './controls';

const COLOR_LABEL = {
    secondary: text.colorSecondary,
    error: text.colorError,
    tertiary: text.colorTertiary,
    success: text.colorSuccess,
    text: text.colorText,
    primary: text.colorPrimary,
} as const;

/** A mark's color: the palette (theme colors) or an own color. */
export function MarkColorPicker({
    fill,
    name,
    onChange,
}: {
    fill: string;
    name: string;
    onChange: (fill: string) => void;
}) {
    return (
        <span
            role="group"
            aria-label={t(text.markColors, { name })}
            className="flex items-center gap-2.5 px-1"
        >
            {TRACKER_PALETTE_FILLS.map((palette) => (
                <button
                    key={palette}
                    type="button"
                    aria-pressed={fill === palette}
                    aria-label={t(COLOR_LABEL[palette])}
                    title={t(COLOR_LABEL[palette])}
                    onClick={() => onChange(palette)}
                    className={clsx(
                        // The picked color gets a bright frame with a gap, as the brush does.
                        'grid h-3.5 w-3.5 place-items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                        fill === palette && 'outline-2 outline-offset-2 outline-textPrimary'
                    )}
                >
                    <MarkSwatch mark={{ fill: palette, symbol: '' }} size="xs" />
                </button>
            ))}
            <input
                type="color"
                value={fill.startsWith('#') ? fill : '#0e7490'}
                aria-label={t(text.markOwnColor, { name })}
                title={t(text.markOwnColor, { name })}
                onChange={(event) => onChange(event.target.value.toLowerCase())}
                className={clsx(
                    'h-6 w-7 cursor-pointer rounded-sm border border-border bg-transparent p-0',
                    fill.startsWith('#') && 'outline-2 outline-offset-2 outline-textPrimary'
                )}
            />
        </span>
    );
}
