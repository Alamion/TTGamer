import { memo, useCallback } from 'react';

import { handleDiceNotation } from '../../dice-logic/notation-utils';
import { useDiceRollerStore } from '../../store/diceRollerStore';
import type { DiceConfig } from '../dice-config';
import DiceButton from './DiceButton';

interface DiceGridProps {
    diceConfig: readonly DiceConfig[];
}

const DiceGrid = memo(function DiceGrid({ diceConfig }: DiceGridProps) {
    const settings = useDiceRollerStore((s) => s.settings);
    const notationInput = useDiceRollerStore((s) => s.notationInput);
    const setNotationInput = useDiceRollerStore((s) => s.setNotationInput);

    const onAdd = useCallback(
        (config: DiceConfig) => {
            setNotationInput(handleDiceNotation(notationInput, config.notation, true));
        },
        [notationInput, setNotationInput]
    );

    const onRemove = useCallback(
        (config: DiceConfig, e: React.MouseEvent) => {
            e.preventDefault();
            setNotationInput(handleDiceNotation(notationInput, config.notation, false));
        },
        [notationInput, setNotationInput]
    );

    return (
        <div className="grid grid-cols-4 gap-3 justify-items-center">
            {diceConfig.map((config) => (
                <DiceButton
                    key={config.notation}
                    config={config}
                    primaryColor={settings.primaryDiceColor}
                    secondaryColor={settings.secondaryDiceColor}
                    onAdd={onAdd}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
});

export default DiceGrid;
