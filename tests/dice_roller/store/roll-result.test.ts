// @vitest-environment happy-dom
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DEFAULT_SETTINGS } from '@site/src/dice_roller/utils/constants';
import { beforeEach, describe, expect, it } from 'vitest';

/** `roll` resolves with what was rolled, so a sheet action can act on it (spec 037 D6). */
describe('diceRollerStore.roll result', () => {
    beforeEach(() => {
        useDiceRollerStore.setState({
            settings: { ...DEFAULT_SETTINGS, enable3dDicePanel: false },
            history: [],
        });
    });

    it('resolves with the final result, the one the history keeps', async () => {
        const result = await useDiceRollerStore.getState().roll('3d10@6,2,9>=6');
        expect(result).toMatchObject({ total: 2 });
        expect(useDiceRollerStore.getState().history[0]?.result.total).toBe(2);
    });

    it('resolves with null when nothing was rolled', async () => {
        expect(await useDiceRollerStore.getState().roll('   ')).toBeNull();
    });
});
