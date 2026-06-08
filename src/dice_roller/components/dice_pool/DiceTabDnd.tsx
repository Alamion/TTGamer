import { memo, useCallback } from 'react';
import { useDiceRollerStore } from '../../store/diceRollerStore';
import { applyAdvantage, applyDisadvantage } from '../../dice-logic';
import DiceGrid from './DiceGrid';
import { dndDice } from '../dice-config';

const DndTab = memo(function DndTab() {
    const notationInput = useDiceRollerStore((s) => s.notationInput);
    const setNotationInput = useDiceRollerStore((s) => s.setNotationInput);

    const handleAdv = useCallback(() => {
        setNotationInput(applyAdvantage(notationInput));
    }, [notationInput, setNotationInput]);

    const handleDis = useCallback(() => {
        setNotationInput(applyDisadvantage(notationInput));
    }, [notationInput, setNotationInput]);

    return (
        <div className="flex flex-col gap-3">
            <DiceGrid diceConfig={dndDice} />
            <div className="pt-2 border-t border-border">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleAdv}
                        className="flex-1 py-1.5 px-3 text-xs font-semibold rounded border border-border
                            bg-bgSurface text-textPrimary cursor-pointer
                            hover:bg-bgBase/50 transition-colors"
                    >
                        ADV
                    </button>
                    <button
                        type="button"
                        onClick={handleDis}
                        className="flex-1 py-1.5 px-3 text-xs font-semibold rounded border border-border
                            bg-bgSurface text-textPrimary cursor-pointer
                            hover:bg-bgBase/50 transition-colors"
                    >
                        DIS
                    </button>
                </div>
            </div>
        </div>
    );
});

export default DndTab;
