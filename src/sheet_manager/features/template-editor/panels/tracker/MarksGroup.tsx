import { clsx } from 'clsx';

import { MarkSwatch } from '../../../../components/stat-fields/Tracker';
import type { TrackerMarkKind } from '../../../../types/template';
import { TEMPLATE_LIMITS, TRACKER_LAYERS } from '../../../../types/template';
import { markSet, type MarkSetId, newTrackerId } from '../../../sheet/data/trackerDefaults';
import { AddButton, Group, inputClasses, move, RowButtons, t, text } from './controls';
import { MarkColorPicker } from './MarkColorPicker';
import type { TrackerSettingsChange, TrackerSettingsGame, TrackerSettingsValue } from './types';

export function MarksGroup({
    value,
    onChange,
    game,
}: {
    value: TrackerSettingsValue;
    onChange: TrackerSettingsChange;
    game?: TrackerSettingsGame;
}) {
    const locked = game !== undefined;
    const setMark = (index: number, patch: Partial<TrackerMarkKind>) =>
        onChange({
            marks: value.marks.map((mark, i) => (i === index ? { ...mark, ...patch } : mark)),
        });
    return (
        <Group title={t(text.marks)} hint={t(locked ? text.marksBuiltIn : text.marksHint)}>
            {!locked && (
                <select
                    value=""
                    aria-label={t(text.startFrom)}
                    onChange={(event) => {
                        const set = event.target.value as MarkSetId | '';
                        if (!set) return;
                        // Points read as a pool: runs from the start, counted.
                        onChange(
                            set === 'points'
                                ? { marks: markSet(set), fromStart: true, totalReads: 'count' }
                                : { marks: markSet(set) }
                        );
                    }}
                    className={`${inputClasses} max-w-full justify-self-start`}
                >
                    <option value="">{t(text.startFrom)}</option>
                    <option value="one">{t(text.setOne)}</option>
                    <option value="two">{t(text.setTwo)}</option>
                    <option value="three">{t(text.setThree)}</option>
                    <option value="points">{t(text.setPoints)}</option>
                </select>
            )}
            {locked && <p className="m-0 text-[11px] text-textSecondary">{t(text.layerLocked)}</p>}
            {value.marks.map((mark, index) => {
                const n = index + 1;
                const placeholder = game?.marks[index];
                const shown = {
                    ...mark,
                    symbol: mark.symbol || placeholder?.symbol || '',
                };
                const name = mark.name || placeholder?.name || t(text.newMark, { n });
                return (
                    <div key={mark.id} className="flex flex-wrap items-center gap-1.5">
                        <MarkSwatch mark={shown} />
                        <input
                            value={mark.name}
                            placeholder={placeholder?.name}
                            maxLength={TEMPLATE_LIMITS.trackerNameMax}
                            aria-label={t(text.markName, { n })}
                            onChange={(event) => setMark(index, { name: event.target.value })}
                            className={`${inputClasses} min-w-0 flex-[1_1_7rem]`}
                        />
                        <input
                            value={mark.symbol}
                            placeholder={placeholder?.symbol}
                            aria-label={t(text.markSymbol, { n })}
                            onChange={(event) =>
                                setMark(index, {
                                    symbol: Array.from(event.target.value)
                                        .slice(0, TEMPLATE_LIMITS.trackerSymbolMax)
                                        .join(''),
                                })
                            }
                            className={`${inputClasses} w-11 text-center font-mono font-bold`}
                        />
                        <MarkColorPicker
                            fill={mark.fill}
                            name={name}
                            onChange={(fill) => setMark(index, { fill })}
                        />
                        <span
                            role="group"
                            aria-label={t(text.markLayer, { n })}
                            className="flex items-center gap-1"
                        >
                            {TRACKER_LAYERS.map((layer) => (
                                <button
                                    key={layer}
                                    type="button"
                                    aria-pressed={mark.layer === layer}
                                    disabled={locked}
                                    onClick={() => setMark(index, { layer })}
                                    className={clsx(
                                        'rounded-sm border px-1.5 py-0.5 text-[11px] transition-colors disabled:opacity-60',
                                        mark.layer === layer
                                            ? 'border-primary bg-primary-muted text-textPrimary'
                                            : 'border-border text-textSecondary hover:border-primary/60'
                                    )}
                                >
                                    {t(layer === 'fill' ? text.layerFill : text.layerOutline)}
                                </button>
                            ))}
                        </span>
                        <RowButtons
                            index={index}
                            count={value.marks.length}
                            locked={locked}
                            labels={{
                                up: t(text.moveMarkUp, { n }),
                                down: t(text.moveMarkDown, { n }),
                                remove: t(text.removeMark, { n }),
                            }}
                            onMove={(step) => onChange({ marks: move(value.marks, index, step) })}
                            onRemove={() =>
                                onChange({ marks: value.marks.filter((_, i) => i !== index) })
                            }
                        />
                    </div>
                );
            })}
            {!locked && (
                <AddButton
                    label={t(text.addMark)}
                    disabled={value.marks.length >= TEMPLATE_LIMITS.trackerMarksMax}
                    onClick={() =>
                        onChange({
                            marks: [
                                ...value.marks,
                                {
                                    id: newTrackerId('mk'),
                                    name: t(text.newMark, { n: value.marks.length + 1 }),
                                    symbol: '•',
                                    fill: 'text',
                                    layer: 'fill',
                                },
                            ],
                        })
                    }
                />
            )}
        </Group>
    );
}
