import { memo, useCallback, useMemo, useState } from 'react';

import { handleDiceNotation, rewriteWodDifficulty } from '../../dice-logic/notation-utils';
import { useDiceRollerStore } from '../../store/diceRollerStore';
import { blendColors } from '../../utils/recolor_svg';
import { DiceD6, DiceD10 } from '../2d_dices';
import type { DiceConfig } from '../dice-config';
import DiceButton from './DiceButton';

const CRIMSON = '#DC143C';

const WodTab = memo(function WodTab() {
    const [wodDifficulty, setWodDifficulty] = useState(6);
    const settings = useDiceRollerStore((s) => s.settings);
    const notationInput = useDiceRollerStore((s) => s.notationInput);
    const setNotationInput = useDiceRollerStore((s) => s.setNotationInput);

    const wodConfig: DiceConfig = useMemo(
        () => ({
            notation: `d10>=${wodDifficulty}`,
            Component: DiceD10,
            faceLabel: 'd10',
        }),
        [wodDifficulty]
    );

    const botchConfig: DiceConfig = useMemo(
        () => ({
            notation: `d10>=${wodDifficulty}f=1`,
            Component: DiceD10,
            faceLabel: 'd10',
        }),
        [wodDifficulty]
    );

    const botchPrimaryColor = useMemo(
        () => blendColors(settings.primaryDiceColor, CRIMSON, 0.5),
        [settings.primaryDiceColor]
    );

    const onAdd = useCallback(() => {
        setNotationInput(
            handleDiceNotation(notationInput, `d10>=${wodDifficulty}`, true, wodDifficulty)
        );
    }, [notationInput, wodDifficulty, setNotationInput]);

    const onRemove = useCallback(
        (_config: DiceConfig, e: React.MouseEvent) => {
            e.preventDefault();
            setNotationInput(
                handleDiceNotation(notationInput, `d10>=${wodDifficulty}`, false, wodDifficulty)
            );
        },
        [notationInput, wodDifficulty, setNotationInput]
    );

    const onAddBotch = useCallback(() => {
        setNotationInput(
            handleDiceNotation(notationInput, `d10>=${wodDifficulty}f=1`, true, wodDifficulty)
        );
    }, [notationInput, wodDifficulty, setNotationInput]);

    const onRemoveBotch = useCallback(
        (_config: DiceConfig, e: React.MouseEvent) => {
            e.preventDefault();
            setNotationInput(
                handleDiceNotation(notationInput, `d10>=${wodDifficulty}f=1`, false, wodDifficulty)
            );
        },
        [notationInput, wodDifficulty, setNotationInput]
    );

    const setDifficulty = useCallback(
        (difficulty: number) => {
            const next = Math.max(1, Math.min(10, difficulty));
            setWodDifficulty(next);
            setNotationInput(rewriteWodDifficulty(notationInput, next));
        },
        [notationInput, setNotationInput]
    );
    const decrement = useCallback(
        () => setDifficulty(wodDifficulty - 1),
        [setDifficulty, wodDifficulty]
    );
    const increment = useCallback(
        () => setDifficulty(wodDifficulty + 1),
        [setDifficulty, wodDifficulty]
    );

    const d6Config: DiceConfig = useMemo(
        () => ({ notation: 'd6', Component: DiceD6, faceLabel: 'd6' }),
        []
    );
    const onAddD6 = useCallback(() => {
        setNotationInput(handleDiceNotation(notationInput, 'd6', true));
    }, [notationInput, setNotationInput]);
    const onRemoveD6 = useCallback(
        (_config: DiceConfig, e: React.MouseEvent) => {
            e.preventDefault();
            setNotationInput(handleDiceNotation(notationInput, 'd6', false));
        },
        [notationInput, setNotationInput]
    );

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-bgBase/60">
                <span className="text-xs font-semibold text-textPrimary">Difficulty:</span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={decrement}
                        disabled={wodDifficulty <= 1}
                        className="w-7 h-7 flex items-center justify-center text-sm font-bold
                            bg-bgSurface border border-border rounded cursor-pointer
                            hover:bg-bgBase/50 transition-colors
                            disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        -
                    </button>
                    <span className="text-xl font-bold text-textSecondary min-w-[24px] text-center">
                        {wodDifficulty}
                    </span>
                    <button
                        type="button"
                        onClick={increment}
                        disabled={wodDifficulty >= 10}
                        className="w-7 h-7 flex items-center justify-center text-sm font-bold
                            bg-bgSurface border border-border rounded cursor-pointer
                            hover:bg-bgBase/50 transition-colors
                            disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        +
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-3 justify-items-center">
                <DiceButton
                    config={wodConfig}
                    primaryColor={settings.primaryDiceColor}
                    secondaryColor={settings.secondaryDiceColor}
                    onAdd={onAdd}
                    onRemove={onRemove}
                />
                <DiceButton
                    config={botchConfig}
                    primaryColor={botchPrimaryColor}
                    secondaryColor={settings.secondaryDiceColor}
                    onAdd={onAddBotch}
                    onRemove={onRemoveBotch}
                />
                <DiceButton
                    key="d6"
                    config={d6Config}
                    primaryColor={settings.primaryDiceColor}
                    secondaryColor={settings.secondaryDiceColor}
                    onAdd={onAddD6}
                    onRemove={onRemoveD6}
                />
            </div>
        </div>
    );
});

export default WodTab;
