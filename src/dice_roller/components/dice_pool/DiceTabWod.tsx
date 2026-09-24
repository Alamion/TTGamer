import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { memo, useCallback, useMemo } from 'react';

import { handleDiceNotation, rewriteWodDifficulty } from '../../dice-logic/notation-utils';
import { useDiceRollerStore } from '../../store/diceRollerStore';
import { blendColors } from '../../utils/recolor_svg';
import type { V5Line, WodMode } from '../../utils/rollReader';
import { DiceD6, DiceD10 } from '../2d_dices';
import type { DiceConfig } from '../dice-config';
import DiceButton from './DiceButton';

const CRIMSON = '#DC143C';
const V5_TARGET = 6;
const CLASSIC_THRESHOLD = 6;
const MAX_STEP = 10;

const stepButtonClass = `w-7 h-7 flex items-center justify-center text-sm font-bold
    bg-bgSurface border border-border rounded cursor-pointer
    hover:bg-bgBase/50 transition-colors
    disabled:opacity-30 disabled:cursor-not-allowed`;

const MODES: { id: WodMode; label: () => string }[] = [
    { id: 'classic', label: () => translate(uiMessages.dice.pool.wod.modes.classic) },
    { id: 'v5', label: () => translate(uiMessages.dice.pool.wod.modes.v5) },
];

const LINES: { id: V5Line; name: () => string; game: () => string }[] = [
    {
        id: 'hunger',
        name: () => translate(uiMessages.sheet.v5.dice.hunger.line),
        game: () => translate(uiMessages.sheet.v5.dice.hunger.game),
    },
    {
        id: 'desperation',
        name: () => translate(uiMessages.sheet.v5Hunter.dice.line),
        game: () => translate(uiMessages.sheet.v5Hunter.dice.game),
    },
];

function useNotationButton(notation: string, difficulty?: number) {
    const notationInput = useDiceRollerStore((s) => s.notationInput);
    const setNotationInput = useDiceRollerStore((s) => s.setNotationInput);
    const onAdd = useCallback(
        () => setNotationInput(handleDiceNotation(notationInput, notation, true, difficulty)),
        [notationInput, notation, difficulty, setNotationInput]
    );
    const onRemove = useCallback(
        (_config: DiceConfig, e: React.MouseEvent) => {
            e.preventDefault();
            setNotationInput(handleDiceNotation(notationInput, notation, false, difficulty));
        },
        [notationInput, notation, difficulty, setNotationInput]
    );
    return { onAdd, onRemove };
}

function ModeSwitch() {
    const mode = useDiceRollerStore((s) => s.settings.wodMode);
    const updateSettings = useDiceRollerStore((s) => s.updateSettings);
    return (
        <fieldset className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-bgBase/60 border-0 m-0">
            <legend className="sr-only">{translate(uiMessages.dice.pool.wod.mode)}</legend>
            <span aria-hidden="true" className="text-xs font-semibold text-textPrimary">
                {translate(uiMessages.dice.pool.wod.mode)}
            </span>
            <div className="flex gap-1">
                {MODES.map((option) => (
                    <label
                        key={option.id}
                        className={clsx(
                            'px-2 py-1 text-xs font-semibold rounded cursor-pointer border',
                            mode === option.id
                                ? 'border-primary text-textPrimary'
                                : 'border-transparent opacity-60 hover:opacity-90'
                        )}
                    >
                        <input
                            type="radio"
                            name="wod-mode"
                            value={option.id}
                            checked={mode === option.id}
                            onChange={() => updateSettings({ wodMode: option.id })}
                            className="sr-only"
                        />
                        {option.label()}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

interface NullableStepperProps {
    label: string;
    value: number | null;
    onChange: (next: number | null) => void;
    /** The value `+` sets when nothing is set yet. */
    start: number;
    notSet: string;
    labels: { decrease: string; increase: string; clear: string };
}

/** A 1–10 stepper that can also be cleared; a cleared value leaves rolls untouched. */
function NullableStepper({ label, value, onChange, start, notSet, labels }: NullableStepperProps) {
    const set = (next: number | null) =>
        onChange(next === null ? null : Math.max(1, Math.min(MAX_STEP, next)));
    return (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-bgBase/60">
            <span className="text-xs font-semibold text-textPrimary">{label}</span>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => set(value === null ? null : value - 1)}
                    disabled={value === null || value <= 1}
                    aria-label={labels.decrease}
                    className={stepButtonClass}
                >
                    -
                </button>
                <span className="text-sm font-bold text-textSecondary min-w-[48px] text-center">
                    {value ?? notSet}
                </span>
                <button
                    type="button"
                    onClick={() => set(value === null ? start : value + 1)}
                    disabled={value !== null && value >= MAX_STEP}
                    aria-label={labels.increase}
                    className={stepButtonClass}
                >
                    +
                </button>
                <button
                    type="button"
                    onClick={() => set(null)}
                    disabled={value === null}
                    aria-label={labels.clear}
                    className={stepButtonClass}
                >
                    ×
                </button>
            </div>
        </div>
    );
}

const difficultyLabels = () => ({
    decrease: translate(uiMessages.dice.pool.wod.decreaseDifficulty),
    increase: translate(uiMessages.dice.pool.wod.increaseDifficulty),
    clear: translate(uiMessages.dice.pool.wod.clearDifficulty),
});

function SuccessesStepper({
    label,
    value,
    onChange,
}: Pick<NullableStepperProps, 'label' | 'value' | 'onChange'>) {
    return (
        <NullableStepper
            label={label}
            value={value}
            onChange={onChange}
            start={1}
            notSet={translate(uiMessages.dice.pool.wod.successesNotSet)}
            labels={{
                decrease: translate(uiMessages.dice.pool.wod.decreaseSuccesses),
                increase: translate(uiMessages.dice.pool.wod.increaseSuccesses),
                clear: translate(uiMessages.dice.pool.wod.clearSuccesses),
            }}
        />
    );
}

function ClassicControls() {
    const settings = useDiceRollerStore((s) => s.settings);
    const updateSettings = useDiceRollerStore((s) => s.updateSettings);
    const notationInput = useDiceRollerStore((s) => s.notationInput);
    const setNotationInput = useDiceRollerStore((s) => s.setNotationInput);
    const threshold = settings.wodThreshold;
    const target = threshold === null ? '' : `>=${threshold}`;

    const wodConfig: DiceConfig = useMemo(
        () => ({ notation: `d10${target}`, Component: DiceD10, faceLabel: 'd10' }),
        [target]
    );
    const botchConfig: DiceConfig = useMemo(
        () => ({ notation: `d10${target}f=1`, Component: DiceD10, faceLabel: 'd10' }),
        [target]
    );
    const d6Config: DiceConfig = useMemo(
        () => ({ notation: 'd6', Component: DiceD6, faceLabel: 'd6' }),
        []
    );
    const botchPrimaryColor = useMemo(
        () => blendColors(settings.primaryDiceColor, CRIMSON, 0.5),
        [settings.primaryDiceColor]
    );

    const regular = useNotationButton(`d10${target}`, threshold ?? undefined);
    const botch = useNotationButton(`d10${target}f=1`, threshold ?? undefined);
    const d6 = useNotationButton('d6');

    const setThreshold = (next: number | null) => {
        updateSettings({ wodThreshold: next });
        if (next !== null) setNotationInput(rewriteWodDifficulty(notationInput, next));
    };

    return (
        <>
            <NullableStepper
                label={translate(uiMessages.dice.pool.wod.difficulty)}
                value={threshold}
                onChange={setThreshold}
                start={CLASSIC_THRESHOLD}
                notSet={translate(uiMessages.dice.pool.wod.difficultyNotSet)}
                labels={difficultyLabels()}
            />
            <SuccessesStepper
                label={translate(uiMessages.dice.pool.wod.successes)}
                value={settings.wodSuccesses}
                onChange={(next) => updateSettings({ wodSuccesses: next })}
            />
            <div className="grid grid-cols-4 gap-3 justify-items-center">
                <DiceButton
                    config={wodConfig}
                    primaryColor={settings.primaryDiceColor}
                    secondaryColor={settings.secondaryDiceColor}
                    {...regular}
                />
                {threshold !== null && (
                    <DiceButton
                        config={botchConfig}
                        primaryColor={botchPrimaryColor}
                        secondaryColor={settings.secondaryDiceColor}
                        {...botch}
                    />
                )}
                <DiceButton
                    key="d6"
                    config={d6Config}
                    primaryColor={settings.primaryDiceColor}
                    secondaryColor={settings.secondaryDiceColor}
                    {...d6}
                />
            </div>
        </>
    );
}

function V5Controls() {
    const settings = useDiceRollerStore((s) => s.settings);
    const updateSettings = useDiceRollerStore((s) => s.updateSettings);

    const v5Config: DiceConfig = useMemo(
        () => ({ notation: `d10>=${V5_TARGET}`, Component: DiceD10, faceLabel: 'd10' }),
        []
    );
    const specialConfig: DiceConfig = useMemo(
        () => ({ notation: `d10:h>=${V5_TARGET}`, Component: DiceD10, faceLabel: 'd10' }),
        []
    );
    const regular = useNotationButton(`d10>=${V5_TARGET}`, V5_TARGET);
    const special = useNotationButton(`d10:h>=${V5_TARGET}`, V5_TARGET);

    return (
        <>
            <fieldset className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-bgBase/60 border-0 m-0">
                <legend className="sr-only">{translate(uiMessages.dice.pool.wod.line)}</legend>
                <span aria-hidden="true" className="text-xs font-semibold text-textPrimary">
                    {translate(uiMessages.dice.pool.wod.line)}
                </span>
                <div className="flex gap-1">
                    {LINES.map((line) => (
                        <label
                            key={line.id}
                            title={line.game()}
                            className={clsx(
                                'px-2 py-1 text-xs font-semibold rounded cursor-pointer border',
                                settings.v5Line === line.id
                                    ? 'border-primary text-textPrimary'
                                    : 'border-transparent opacity-60 hover:opacity-90'
                            )}
                        >
                            <input
                                type="radio"
                                name="v5-line"
                                value={line.id}
                                checked={settings.v5Line === line.id}
                                onChange={() => updateSettings({ v5Line: line.id })}
                                className="sr-only"
                            />
                            {line.name()}
                            <span className="sr-only"> ({line.game()})</span>
                        </label>
                    ))}
                </div>
            </fieldset>
            <NullableStepper
                label={translate(uiMessages.dice.pool.wod.v5Difficulty)}
                value={settings.v5Difficulty}
                onChange={(next) => updateSettings({ v5Difficulty: next })}
                start={1}
                notSet={translate(uiMessages.dice.pool.wod.difficultyNotSet)}
                labels={difficultyLabels()}
            />
            <div className="grid grid-cols-4 gap-3 justify-items-center">
                <DiceButton
                    config={v5Config}
                    primaryColor={settings.primaryDiceColor}
                    secondaryColor={settings.secondaryDiceColor}
                    {...regular}
                />
                <DiceButton
                    config={specialConfig}
                    primaryColor={settings.specialDiceColor}
                    secondaryColor={settings.secondaryDiceColor}
                    label={translate(uiMessages.dice.pool.wod.specialDie)}
                    {...special}
                />
            </div>
            <div className="flex flex-col gap-1 px-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={settings.v5CriticalPairs}
                        onChange={(e) => updateSettings({ v5CriticalPairs: e.target.checked })}
                    />
                    {translate(uiMessages.dice.pool.wod.criticalPairs)}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={settings.v5SpecialOutcomes}
                        onChange={(e) => updateSettings({ v5SpecialOutcomes: e.target.checked })}
                    />
                    {translate(uiMessages.dice.pool.wod.specialOutcomes)}
                </label>
            </div>
        </>
    );
}

const WodTab = memo(function WodTab() {
    const mode = useDiceRollerStore((s) => s.settings.wodMode);
    return (
        <div className="flex flex-col gap-3">
            <ModeSwitch />
            {mode === 'v5' ? <V5Controls /> : <ClassicControls />}
        </div>
    );
});

export default WodTab;
