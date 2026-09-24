// @vitest-environment jsdom

import { onRollResult } from '@site/src/dice_roller/dice-logic';
import type { RollResult } from '@site/src/dice_roller/dice-logic/types';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DEFAULT_SETTINGS } from '@site/src/dice_roller/utils/constants';
import { buildPanelOrigin, type RollOrigin } from '@site/src/dice_roller/utils/rollReader';
import { describe, expect, it } from 'vitest';

type Settings = typeof DEFAULT_SETTINGS;

async function roll(notation: string, origin: RollOrigin): Promise<RollResult> {
    let captured: RollResult | undefined;
    const off = onRollResult((result) => {
        captured = result;
    });
    await useDiceRollerStore.getState().roll(notation, { origin });
    off();
    if (!captured) throw new Error('no roll result emitted');
    return captured;
}

function wodRoll(notation: string, settings: Partial<Settings>, tab: 'wod' | 'standard' = 'wod') {
    const all = { ...DEFAULT_SETTINGS, enable3dDicePanel: false, ...settings };
    useDiceRollerStore.setState({ settings: all });
    return roll(notation, buildPanelOrigin('roll-button', tab, all));
}

describe('roll verdict against the successes needed', () => {
    it('reports success and margin in Classic mode', async () => {
        const result = await wodRoll('4d10@7,8,9,2>=6', { wodSuccesses: 2 });
        expect(result.verdict).toEqual({ difficulty: 2, succeeded: true, margin: 1 });
    });

    it('reports failure and shortfall in V5 mode', async () => {
        const result = await wodRoll('3d10@7,2,2>=6', { wodMode: 'v5', v5Difficulty: 3 });
        expect(result.verdict).toEqual({ difficulty: 3, succeeded: false, margin: -2 });
    });

    it('counts an exact hit as a success', async () => {
        const result = await wodRoll('2d10@6,6>=6', { wodSuccesses: 2 });
        expect(result.verdict?.succeeded).toBe(true);
        expect(result.verdict?.margin).toBe(0);
    });

    it('uses the Difficulty of the current mode only', async () => {
        const classic = await wodRoll('2d10@6,6>=6', { wodSuccesses: null, v5Difficulty: 1 });
        expect(classic.verdict).toBeUndefined();
        const v5 = await wodRoll('2d10@6,6>=6', { wodMode: 'v5', wodSuccesses: 1 });
        expect(v5.verdict).toBeUndefined();
    });

    it('gives no verdict when nothing is set, for sums, or outside the WoD tab', async () => {
        expect((await wodRoll('2d10@6,6>=6', {})).verdict).toBeUndefined();
        expect((await wodRoll('2d10@6,6', { wodSuccesses: 2 })).verdict).toBeUndefined();
        expect(
            (await wodRoll('2d10@6,6>=6', { wodSuccesses: 2 }, 'standard')).verdict
        ).toBeUndefined();
    });

    it('gives no verdict to sheet rolls', async () => {
        useDiceRollerStore.setState({
            settings: { ...DEFAULT_SETTINGS, enable3dDicePanel: false, wodSuccesses: 1 },
        });
        const result = await roll('2d10@6,6>=6', {
            kind: 'sheet',
            source: { systemId: 'wod-v5', definitionId: 'hunter' },
        });
        expect(result.verdict).toBeUndefined();
    });
});
