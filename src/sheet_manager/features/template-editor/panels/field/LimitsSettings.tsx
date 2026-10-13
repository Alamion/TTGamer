import { TEMPLATE_LIMITS } from '../../../../types/template';
import { FormulaField } from '../../settings/FormulaField';
import { settingLabel } from '../../settings/registry';
import { NumberSetting } from './NumberSetting';
import { editor, t } from './shared';
import type { FieldContext } from './types';

export function limitsSettings({ field, key, isTraitSource, update }: FieldContext) {
    const bounds =
        field.type === 'number' ? (
            <div className="grid grid-cols-3 gap-2">
                <NumberSetting
                    label={settingLabel('min')}
                    setting={key('min')}
                    value={field.min}
                    max={field.max}
                    onChange={(min) => update({ min })}
                />
                <NumberSetting
                    label={settingLabel('max')}
                    setting={key('max')}
                    value={field.max}
                    min={field.min}
                    onChange={(max) => update({ max })}
                />
                <NumberSetting
                    label={settingLabel('step')}
                    setting={key('step')}
                    value={field.step}
                    min={0}
                    onChange={(step) => update({ step: step === 0 ? undefined : step })}
                />
            </div>
        ) : (field.type === 'rating' && !isTraitSource) || field.type === 'resource' ? (
            <div className="grid grid-cols-2 gap-2">
                <NumberSetting
                    label={settingLabel('min')}
                    setting={key('min')}
                    value={field.min}
                    min={0}
                    max={field.max}
                    step={1}
                    required
                    onChange={(min) => update({ min: min ?? 0 })}
                />
                <NumberSetting
                    label={settingLabel('max')}
                    setting={key('max')}
                    value={field.max}
                    min={Math.max(1, field.min)}
                    max={
                        field.type === 'rating'
                            ? TEMPLATE_LIMITS.ratingMax
                            : field.poolTracker
                              ? TEMPLATE_LIMITS.trackerLevelsMax
                              : TEMPLATE_LIMITS.resourceMax
                    }
                    step={1}
                    required
                    onChange={(max) => update({ max: max ?? field.max })}
                />
            </div>
        ) : null;

    return (
        <>
            {bounds}
            {field.type === 'formula' && (
                <FormulaField
                    label={settingLabel('formula')}
                    help="formulas"
                    setting={key('formula')}
                    placeholder={t(editor.formulaPlaceholder)}
                    value={field.formula}
                    onChange={(formula) => update({ formula: formula ?? '' })}
                />
            )}
            {!isTraitSource && (field.type === 'number' || field.type === 'rating') && (
                <FormulaField
                    label={settingLabel('maxFrom')}
                    setting={key('maxFrom')}
                    placeholder={t(editor.maxFromPlaceholder)}
                    value={field.maxFrom}
                    onChange={(maxFrom) => update({ maxFrom })}
                />
            )}
        </>
    );
}
