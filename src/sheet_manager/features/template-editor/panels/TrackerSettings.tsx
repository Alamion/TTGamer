import { clsx } from 'clsx';

import type { TrackerDisplay } from '../../../types/template';
import { TRACKER_DISPLAYS } from '../../../types/template';
import { ColumnsGroup } from './tracker/ColumnsGroup';
import { Group, t, text } from './tracker/controls';
import { LengthsGroup } from './tracker/LengthsGroup';
import { LevelsGroup } from './tracker/LevelsGroup';
import { MarksGroup } from './tracker/MarksGroup';
import { ReadingGroup } from './tracker/ReadingGroup';
import type {
    TrackerSettingsChange,
    TrackerSettingsGame,
    TrackerSettingsValue,
} from './tracker/types';

const DISPLAY_LABEL: Record<TrackerDisplay, { message: string }> = {
    table: text.displayTable,
    strip: text.displayStrip,
    line: text.displayLine,
};

/**
 * Tracker settings (spec 018, contract "Editor: settings groups"), the same for own and built-in
 * trackers; with `game`, the parts the game fixes are disabled and its text shows as placeholders.
 */
export function TrackerSettings({
    value,
    onChange,
    game,
}: {
    value: TrackerSettingsValue;
    onChange: TrackerSettingsChange;
    game?: TrackerSettingsGame;
}) {
    return (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3" data-tracker-settings="">
            <Group title={t(text.display)} hint={t(text.displayHint)}>
                <div role="group" aria-label={t(text.display)} className="flex flex-wrap gap-1">
                    {TRACKER_DISPLAYS.map((display) => (
                        <button
                            key={display}
                            type="button"
                            aria-pressed={value.display === display}
                            onClick={() => onChange({ display })}
                            className={clsx(
                                'rounded-sm border px-2.5 py-1 text-xs transition-colors',
                                value.display === display
                                    ? 'border-primary bg-primary-muted text-textPrimary'
                                    : 'border-border text-textSecondary hover:border-primary/60'
                            )}
                        >
                            {t(DISPLAY_LABEL[display])}
                        </button>
                    ))}
                </div>
            </Group>

            <MarksGroup value={value} onChange={onChange} game={game} />
            <LevelsGroup value={value} onChange={onChange} game={game} />
            <ColumnsGroup value={value} onChange={onChange} game={game} />
            {game === undefined && <LengthsGroup value={value} onChange={onChange} />}
            <ReadingGroup value={value} onChange={onChange} game={game} />
        </div>
    );
}
