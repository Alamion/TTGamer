import { memo } from 'react';

import { standardDice } from '../dice-config';
import DiceGrid from './DiceGrid';

const StandardTab = memo(function StandardTab() {
    return (
        <div className="flex flex-col gap-3">
            <DiceGrid diceConfig={standardDice} />
        </div>
    );
});

export default StandardTab;
