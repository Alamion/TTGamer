import { memo } from 'react';
import DiceGrid from './DiceGrid';
import { standardDice } from '../dice-config';

const StandardTab = memo(function StandardTab() {
    return (
        <div className="flex flex-col gap-3">
            <DiceGrid diceConfig={standardDice} />
        </div>
    );
});

export default StandardTab;
