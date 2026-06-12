import { useCallback } from 'react';
import { useDiceRollerStore } from '../../store/diceRollerStore';
import DiceRollerSettingsModal from '../DiceRollerSettingsModal';

export default function RollControls() {
    const notationInput = useDiceRollerStore((s) => s.notationInput);
    const setNotationInput = useDiceRollerStore((s) => s.setNotationInput);
    const roll = useDiceRollerStore((s) => s.roll);

    const canClear = notationInput.trim().length > 0;
    const canRoll = notationInput.trim().length > 0;

    const clearNotation = useCallback(() => {
        setNotationInput('');
    }, [setNotationInput]);

    const rollNotation = useCallback(() => {
        const toRoll = notationInput.trim();
        if (!toRoll) return;
        roll(toRoll);
        setNotationInput('');
    }, [notationInput, roll, setNotationInput]);

    return (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
            <DiceRollerSettingsModal />
            <button
                type="button"
                onClick={clearNotation}
                disabled={!canClear}
                className="flex-1 py-1.5 px-3 text-xs font-semibold rounded border border-border
                    bg-bgSurface text-textPrimary cursor-pointer
                    hover:bg-bgBase/50 transition-colors
                    disabled:opacity-40 disabled:cursor-not-allowed"
            >
                Clear
            </button>
            <button
                type="button"
                onClick={rollNotation}
                disabled={!canRoll}
                className="flex-[2] py-1.5 px-3 text-xs font-semibold rounded border border-border
                    bg-primary text-primary-on cursor-pointer
                    hover:bg-primary-hover transition-colors
                    disabled:opacity-40 disabled:cursor-not-allowed"
            >
                Roll
            </button>
        </div>
    );
}
