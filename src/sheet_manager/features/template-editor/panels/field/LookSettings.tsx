import { TEMPLATE_LIMITS, type TemplateField } from '../../../../types/template';
import { inputClasses } from '../../settings/inputClasses';
import { settingLabel } from '../../settings/registry';
import { SettingField } from '../../settings/SettingField';
import { ToggleRow } from '../LayoutControls';
import { PoolTrackerSettings } from '../PoolTrackerSettings';
import { TrackerSettings } from '../TrackerSettings';
import { RatingSwitches } from './RatingSwitches';
import { ResourceDisplay } from './ResourceDisplay';
import { editor, optionalText, t } from './shared';
import type { FieldContext } from './types';

export function lookSettings({ field, prefix, several, key, isTraitSource, update }: FieldContext) {
    return (
        <>
            {!isTraitSource && field.type === 'rating' && (
                <>
                    <SettingField
                        label={settingLabel('presentation')}
                        help="rating"
                        setting={key('presentation')}
                    >
                        {(control) => (
                            <select
                                {...control}
                                value={field.presentation}
                                onChange={(event) => {
                                    const presentation = event.target
                                        .value as typeof field.presentation;
                                    update({
                                        presentation,
                                        poolTracker:
                                            presentation === 'tracker'
                                                ? (field.poolTracker ?? {
                                                      display: 'row',
                                                      legend: false,
                                                      total: true,
                                                  })
                                                : undefined,
                                    });
                                }}
                                className={inputClasses}
                            >
                                <option value="dots">{t(editor.ratingDots)}</option>
                                <option value="number">{t(editor.ratingNumber)}</option>
                                {!several && field.max <= TEMPLATE_LIMITS.trackerLevelsMax && (
                                    <option value="tracker">{t(editor.displayTracker)}</option>
                                )}
                            </select>
                        )}
                    </SettingField>
                    {field.presentation === 'tracker' && field.poolTracker && (
                        <div data-setting-list="" data-setting={key('tracker')} tabIndex={-1}>
                            <PoolTrackerSettings
                                single
                                value={field.poolTracker}
                                onChange={(poolTracker) => update({ poolTracker })}
                            />
                        </div>
                    )}
                    <RatingSwitches
                        field={field}
                        onUpdate={update}
                        prefix={prefix}
                        several={several}
                    />
                </>
            )}
            {field.type === 'text' && (
                <ToggleRow
                    checked={field.multiline}
                    label={settingLabel('multiline')}
                    setting={key('multiline')}
                    onChange={(checked) => update({ multiline: checked })}
                />
            )}
            {field.type === 'select' && field.multiple && (
                <ToggleRow
                    checked={field.hideUnselected === true}
                    label={settingLabel('hideUnselected')}
                    setting={key('hideUnselected')}
                    onChange={(checked) => update({ hideUnselected: checked || undefined })}
                />
            )}
            {field.type === 'formula' && (
                <div className="grid grid-cols-2 gap-2">
                    <SettingField label={settingLabel('prefix')} setting={key('prefix')}>
                        {(control) => (
                            <input
                                {...control}
                                value={field.prefix ?? ''}
                                maxLength={8}
                                onChange={(event) =>
                                    update({ prefix: optionalText(event.target.value) })
                                }
                                className={`${inputClasses} w-full`}
                            />
                        )}
                    </SettingField>
                    <SettingField label={settingLabel('suffix')} setting={key('suffix')}>
                        {(control) => (
                            <input
                                {...control}
                                value={field.suffix ?? ''}
                                maxLength={8}
                                onChange={(event) =>
                                    update({ suffix: optionalText(event.target.value) })
                                }
                                className={`${inputClasses} w-full`}
                            />
                        )}
                    </SettingField>
                </div>
            )}
            {field.type === 'resource' && (
                <ResourceDisplay
                    field={field}
                    setting={key('tracker')}
                    onChange={(poolTracker) => update({ poolTracker })}
                />
            )}
            {field.type === 'tracker' && (
                <div data-setting-list="" data-setting={key('tracker')} tabIndex={-1}>
                    <TrackerSettings
                        value={field}
                        onChange={(updates) => update(updates as Partial<TemplateField>)}
                    />
                </div>
            )}
        </>
    );
}
