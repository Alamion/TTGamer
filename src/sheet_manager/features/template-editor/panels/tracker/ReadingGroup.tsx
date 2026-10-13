import { clsx } from 'clsx';

import { TRACKER_TOTAL_READS } from '../../../../types/template';
import { ToggleRow } from '../LayoutControls';
import { Group, t, text } from './controls';
import type { TrackerSettingsChange, TrackerSettingsGame, TrackerSettingsValue } from './types';

export function ReadingGroup({
    value,
    onChange,
    game,
}: {
    value: TrackerSettingsValue;
    onChange: TrackerSettingsChange;
    game?: TrackerSettingsGame;
}) {
    const locked = game !== undefined;
    const valueTitle = value.valueColumn.title || t(text.defaultValueTitle);
    return (
        <Group title={t(text.reading)}>
            {!locked && (
                <ToggleRow
                    checked={value.fromStart ?? false}
                    hint={t(text.fromStartHint)}
                    label={t(text.fromStart)}
                    onChange={(fromStart) => onChange({ fromStart })}
                />
            )}
            {!locked && value.fromStart && (
                <ToggleRow
                    checked={value.fillInside ?? false}
                    hint={t(text.fillInsideHint)}
                    label={t(text.fillInside)}
                    onChange={(fillInside) => onChange({ fillInside })}
                />
            )}
            <ToggleRow
                checked={value.total}
                label={locked ? t(text.total, { value: valueTitle }) : t(text.totalRow)}
                onChange={(total) => onChange({ total })}
            />
            {!locked && value.total && (
                <div className="grid gap-1 pl-5">
                    <div
                        role="group"
                        aria-label={t(text.totalReads)}
                        className="flex flex-wrap items-center gap-1 text-xs text-textSecondary"
                    >
                        <span>{t(text.totalReads)}</span>
                        {TRACKER_TOTAL_READS.map((reads) => (
                            <button
                                key={reads}
                                type="button"
                                aria-pressed={(value.totalReads ?? 'deepest') === reads}
                                onClick={() => onChange({ totalReads: reads })}
                                className={clsx(
                                    'rounded-sm border px-2 py-0.5 text-xs transition-colors',
                                    (value.totalReads ?? 'deepest') === reads
                                        ? 'border-primary bg-primary-muted text-textPrimary'
                                        : 'border-border text-textSecondary hover:border-primary/60'
                                )}
                            >
                                {reads === 'count'
                                    ? t(text.totalCount)
                                    : `${t(text.totalDeepest)} (${valueTitle})`}
                            </button>
                        ))}
                    </div>
                    {value.totalReads === 'count' && (
                        <p className="text-[11px] text-textSecondary">{t(text.totalCountHint)}</p>
                    )}
                </div>
            )}
            {!locked && (
                <ToggleRow
                    checked={value.out}
                    label={t(text.out)}
                    onChange={(out) => onChange({ out })}
                />
            )}
            <ToggleRow
                checked={value.legend}
                hint={t(text.legendHint)}
                label={t(text.legend)}
                onChange={(legend) => onChange({ legend })}
            />
        </Group>
    );
}
