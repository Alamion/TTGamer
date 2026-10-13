import { X } from 'lucide-react';

import { TEMPLATE_LIMITS } from '../../../../types/template';
import { ToggleRow } from '../LayoutControls';
import { AddButton, Group, t, text } from './controls';
import type { TrackerSettingsChange, TrackerSettingsValue } from './types';

export function LengthsGroup({
    value,
    onChange,
}: {
    value: TrackerSettingsValue;
    onChange: TrackerSettingsChange;
}) {
    const enabled = value.lengths.length > 0;
    const allLevels = () => ({ levels: value.levels.map(({ id }) => id) });
    const toggle = (lengthIndex: number, levelId: string, checked: boolean) =>
        onChange({
            lengths: value.lengths.map((length, i) =>
                i !== lengthIndex
                    ? length
                    : {
                          levels: checked
                              ? [...length.levels, levelId]
                              : length.levels.filter((id) => id !== levelId),
                      }
            ),
        });
    return (
        <Group title={t(text.lengths)} hint={t(text.lengthsHint)}>
            <ToggleRow
                checked={enabled}
                label={t(text.lengths)}
                onChange={(checked) => onChange({ lengths: checked ? [allLevels()] : [] })}
            />
            {enabled && (
                <>
                    <div className="overflow-x-auto">
                        <div
                            role="table"
                            className="grid w-max gap-x-2 gap-y-1 text-xs text-textSecondary"
                            style={{
                                gridTemplateColumns: `minmax(6rem,auto) repeat(${value.lengths.length}, auto)`,
                            }}
                        >
                            <div role="row" className="contents">
                                <span role="columnheader" />
                                {value.lengths.map((_, i) => (
                                    <span
                                        key={i}
                                        role="columnheader"
                                        className="flex items-center gap-0.5 font-semibold"
                                    >
                                        {t(text.lengthColumn, { n: i + 1 })}
                                        <button
                                            type="button"
                                            aria-label={t(text.removeLength, { n: i + 1 })}
                                            title={t(text.removeLength, { n: i + 1 })}
                                            disabled={value.lengths.length === 1}
                                            onClick={() =>
                                                onChange({
                                                    lengths: value.lengths.filter(
                                                        (_, j) => j !== i
                                                    ),
                                                })
                                            }
                                            className="rounded-sm p-0.5 hover:text-error disabled:opacity-30"
                                        >
                                            <X className="h-3 w-3" aria-hidden="true" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            {value.levels.map((level) => (
                                <div role="row" key={level.id} className="contents">
                                    <span role="rowheader" className="text-textPrimary">
                                        {level.name}
                                    </span>
                                    {value.lengths.map((length, i) => (
                                        <span role="cell" key={i} className="text-center">
                                            <input
                                                type="checkbox"
                                                checked={length.levels.includes(level.id)}
                                                aria-label={t(text.lengthLevel, {
                                                    level: level.name,
                                                    n: i + 1,
                                                })}
                                                onChange={(event) =>
                                                    toggle(i, level.id, event.target.checked)
                                                }
                                            />
                                        </span>
                                    ))}
                                </div>
                            ))}
                            <div role="row" className="contents">
                                <span role="rowheader">{t(text.lengthShows)}</span>
                                {value.lengths.map((length, i) => (
                                    <span role="cell" key={i} className="text-center font-mono">
                                        {
                                            length.levels.filter((id) =>
                                                value.levels.some((level) => level.id === id)
                                            ).length
                                        }
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <AddButton
                        label={t(text.addLength)}
                        disabled={value.lengths.length >= TEMPLATE_LIMITS.trackerLengthsMax}
                        onClick={() => onChange({ lengths: [...value.lengths, allLevels()] })}
                    />
                </>
            )}
        </Group>
    );
}
