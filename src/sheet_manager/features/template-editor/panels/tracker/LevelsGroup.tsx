import type { TrackerLevel } from '../../../../types/template';
import { TEMPLATE_LIMITS } from '../../../../types/template';
import { newTrackerId } from '../../../sheet/data/trackerDefaults';
import { ToggleRow } from '../LayoutControls';
import { AddButton, Group, inputClasses, move, RowButtons, t, text } from './controls';
import type { TrackerSettingsChange, TrackerSettingsGame, TrackerSettingsValue } from './types';

export function LevelsGroup({
    value,
    onChange,
    game,
}: {
    value: TrackerSettingsValue;
    onChange: TrackerSettingsChange;
    game?: TrackerSettingsGame;
}) {
    const locked = game !== undefined;
    const setLevel = (index: number, patch: Partial<TrackerLevel>) =>
        onChange({
            levels: value.levels.map((level, i) => (i === index ? { ...level, ...patch } : level)),
        });
    return (
        <Group title={t(text.levels)} hint={locked ? t(text.levelsBuiltIn) : undefined}>
            {!locked && (
                <span className="text-[11px] text-textSecondary">
                    {t(text.levelCount, {
                        count: value.levels.length,
                        max: TEMPLATE_LIMITS.trackerLevelsMax,
                    })}
                </span>
            )}
            {game?.legacyLevels && (
                <p className="m-0 flex flex-wrap items-center gap-2 text-[11px] text-textSecondary">
                    {t(text.levelsLegacy)}
                    <button
                        type="button"
                        onClick={game.legacyLevels.onUseGame}
                        className="rounded-sm border border-border px-2 py-0.5 text-xs text-primary hover:border-primary"
                    >
                        {t(text.levelsUseGame)}
                    </button>
                </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
                <input
                    value={value.valueColumn.title ?? ''}
                    placeholder={t(text.defaultValueTitle)}
                    maxLength={TEMPLATE_LIMITS.trackerNameMax}
                    aria-label={t(text.valueTitle)}
                    onChange={(event) =>
                        onChange({
                            valueColumn: {
                                ...value.valueColumn,
                                title: event.target.value || undefined,
                            },
                        })
                    }
                    className={`${inputClasses} min-w-0 flex-[1_1_8rem]`}
                />
                <ToggleRow
                    checked={value.valueColumn.show}
                    label={t(text.valueShow)}
                    onChange={(show) => onChange({ valueColumn: { ...value.valueColumn, show } })}
                />
            </div>
            {value.levels.map((level, index) => {
                const n = index + 1;
                const placeholder = game?.levels[index];
                return (
                    <div key={level.id} className="flex items-center gap-1.5">
                        <span className="w-4 shrink-0 text-right font-mono text-xs text-textSecondary">
                            {n}
                        </span>
                        <input
                            value={level.name}
                            placeholder={placeholder?.name}
                            maxLength={TEMPLATE_LIMITS.trackerNameMax}
                            aria-label={t(text.levelName, { n })}
                            onChange={(event) => setLevel(index, { name: event.target.value })}
                            className={`${inputClasses} min-w-0 flex-1`}
                        />
                        <input
                            value={level.value}
                            placeholder={placeholder?.value || '—'}
                            maxLength={TEMPLATE_LIMITS.trackerLevelValueMax}
                            disabled={!value.valueColumn.show}
                            aria-label={t(text.levelValue, { n })}
                            onChange={(event) => setLevel(index, { value: event.target.value })}
                            className={`${inputClasses} w-14 shrink-0 font-mono`}
                        />
                        <RowButtons
                            index={index}
                            count={value.levels.length}
                            locked={locked}
                            labels={{
                                up: t(text.moveLevelUp, { n }),
                                down: t(text.moveLevelDown, { n }),
                                remove: t(text.removeLevel, { n }),
                            }}
                            onMove={(step) => onChange({ levels: move(value.levels, index, step) })}
                            onRemove={() =>
                                onChange({
                                    levels: value.levels.filter((_, i) => i !== index),
                                    // A length never keeps a removed level.
                                    lengths: value.lengths.map((length) => ({
                                        levels: length.levels.filter((id) => id !== level.id),
                                    })),
                                })
                            }
                        />
                    </div>
                );
            })}
            {!locked && (
                <AddButton
                    label={t(text.addLevel)}
                    disabled={value.levels.length >= TEMPLATE_LIMITS.trackerLevelsMax}
                    onClick={() =>
                        onChange({
                            levels: [
                                ...value.levels,
                                {
                                    id: newTrackerId('lv'),
                                    name: t(text.newLevel, { n: value.levels.length + 1 }),
                                    value: '',
                                },
                            ],
                        })
                    }
                />
            )}
        </Group>
    );
}
