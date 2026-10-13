import { clsx } from 'clsx';

import type { TemplateField } from '../../../../types/template';
import { TEMPLATE_LIMITS } from '../../../../types/template';
import { PoolTrackerSettings } from '../PoolTrackerSettings';
import { editor, t } from './shared';

/** A resource field's look (spec 020): two numbers, or one tracker of up to 20 boxes. */
export function ResourceDisplay({
    field,
    onChange,
    setting,
}: {
    field: Extract<TemplateField, { type: 'resource' }>;
    onChange: (poolTracker: Extract<TemplateField, { type: 'resource' }>['poolTracker']) => void;
    setting: string;
}) {
    const tooMany = field.max > TEMPLATE_LIMITS.trackerLevelsMax;
    const asTracker = field.poolTracker !== undefined;
    return (
        <div className="grid gap-2">
            <div
                role="group"
                aria-label={t(editor.primitiveDisplay)}
                className="flex flex-wrap items-center gap-1 text-xs text-textSecondary"
            >
                <span className="font-semibold text-textPrimary">{t(editor.primitiveDisplay)}</span>
                {([false, true] as const).map((tracker) => (
                    <button
                        key={String(tracker)}
                        type="button"
                        aria-pressed={asTracker === tracker}
                        disabled={tracker && !asTracker && tooMany}
                        onClick={() => {
                            if (asTracker === tracker) return;
                            onChange(
                                tracker ? { display: 'row', legend: false, total: true } : undefined
                            );
                        }}
                        className={clsx(
                            'rounded-sm border px-2.5 py-1 text-xs transition-colors disabled:opacity-50',
                            asTracker === tracker
                                ? 'border-primary bg-primary-muted text-textPrimary'
                                : 'border-border text-textSecondary hover:border-primary/60'
                        )}
                    >
                        {t(tracker ? editor.displayTracker : editor.displayNumbers)}
                    </button>
                ))}
            </div>
            {tooMany && !asTracker && (
                <p className="text-[11px] text-textSecondary">
                    {t(editor.poolTrackerLimit, { max: TEMPLATE_LIMITS.trackerLevelsMax })}
                </p>
            )}
            {field.poolTracker && (
                <div data-setting-list="" data-setting={setting} tabIndex={-1}>
                    <PoolTrackerSettings value={field.poolTracker} onChange={onChange} />
                </div>
            )}
        </div>
    );
}
