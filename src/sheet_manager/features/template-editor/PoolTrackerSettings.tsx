import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';

import { MarkSwatch } from '../../components/stat-fields/Tracker';
import {
    POOL_TRACKER_DISPLAYS,
    type PoolTrackerDisplay,
    type PoolTrackerOverride,
    TEMPLATE_LIMITS,
} from '../../types/template';
import { ToggleRow } from './LayoutControls';
import { MarkColorPicker } from './TrackerSettings';

const text = uiMessages.sheet.templates.tracker;
const editor = uiMessages.sheet.templates.editor;
const tracks = uiMessages.sheet.tracks.tracker;
const t = (descriptor: { message: string }, values?: Record<string, string | number>) =>
    translate(descriptor, values);

const inputClasses =
    'rounded border border-border bg-bgSurface px-2 py-1.5 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary';

const DISPLAY_LABEL: Record<PoolTrackerDisplay, { message: string }> = {
    row: editor.poolRow,
    strip: text.displayStrip,
    line: text.displayLine,
};

type PoolMarkKey = 'current' | 'max';

/**
 * The look of a pool resource drawn as a tracker (spec 020): the display, the two marks' names,
 * symbols, and colors, the legend, and the count. The layers are fixed: current fills, maximum
 * frames.
 */
export function PoolTrackerSettings({
    value,
    onChange,
}: {
    value: PoolTrackerOverride;
    onChange: (next: PoolTrackerOverride) => void;
}) {
    const setMark = (key: PoolMarkKey, patch: Record<string, string | undefined>) => {
        const mark = { ...value.marks?.[key], ...patch };
        for (const field of Object.keys(mark) as (keyof typeof mark)[]) {
            if (mark[field] === undefined || mark[field] === '') delete mark[field];
        }
        onChange({ ...value, marks: { ...value.marks, [key]: mark } });
    };
    const markRow = (key: PoolMarkKey) => {
        const mark = value.marks?.[key];
        const fallback = t(key === 'current' ? tracks.poolPoint : tracks.poolMaximum);
        const title = t(key === 'current' ? editor.poolCurrentMark : editor.poolMaxMark);
        const fill = mark?.fill ?? 'primary';
        const name = mark?.name || fallback;
        return (
            <div key={key} className="grid gap-1">
                <span className="text-[11px] font-semibold text-textSecondary">{title}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                    <MarkSwatch
                        mark={{
                            fill,
                            symbol: mark?.symbol ?? '',
                            layer: key === 'max' ? 'outline' : 'fill',
                        }}
                    />
                    <input
                        value={mark?.name ?? ''}
                        placeholder={fallback}
                        maxLength={TEMPLATE_LIMITS.trackerNameMax}
                        aria-label={`${title}: ${t(text.markName, { n: key === 'current' ? 1 : 2 })}`}
                        onChange={(event) => setMark(key, { name: event.target.value })}
                        className={`${inputClasses} min-w-0 flex-[1_1_7rem]`}
                    />
                    <input
                        value={mark?.symbol ?? ''}
                        aria-label={`${title}: ${t(text.markSymbol, { n: key === 'current' ? 1 : 2 })}`}
                        onChange={(event) =>
                            setMark(key, {
                                symbol: Array.from(event.target.value)
                                    .slice(0, TEMPLATE_LIMITS.trackerSymbolMax)
                                    .join(''),
                            })
                        }
                        className={`${inputClasses} w-11 text-center font-mono font-bold`}
                    />
                    <MarkColorPicker
                        fill={fill}
                        name={name}
                        onChange={(next) => setMark(key, { fill: next })}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="grid min-w-0 gap-3" data-pool-tracker-settings="">
            <div
                role="group"
                aria-label={t(editor.poolLook)}
                className="flex flex-wrap items-center gap-1 text-xs text-textSecondary"
            >
                <span>{t(editor.poolLook)}</span>
                {POOL_TRACKER_DISPLAYS.map((display) => (
                    <button
                        key={display}
                        type="button"
                        aria-pressed={value.display === display}
                        onClick={() => onChange({ ...value, display })}
                        className={clsx(
                            'rounded border px-2.5 py-1 text-xs transition-colors',
                            value.display === display
                                ? 'border-primary bg-primary-muted text-textPrimary'
                                : 'border-border text-textSecondary hover:border-primary/60'
                        )}
                    >
                        {t(DISPLAY_LABEL[display])}
                    </button>
                ))}
            </div>
            <div className="grid gap-2">
                {markRow('current')}
                {markRow('max')}
                <p className="text-[11px] text-textSecondary">{t(editor.poolLayerFixed)}</p>
            </div>
            <ToggleRow
                checked={value.legend}
                hint={t(text.legendHint)}
                label={t(text.legend)}
                onChange={(legend) => onChange({ ...value, legend })}
            />
            <ToggleRow
                checked={value.total}
                label={t(editor.poolCount)}
                onChange={(total) => onChange({ ...value, total })}
            />
        </div>
    );
}
