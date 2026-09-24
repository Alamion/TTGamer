// @vitest-environment jsdom

import { onRollResult } from '@site/src/dice_roller/dice-logic';
import type { RollResult } from '@site/src/dice_roller/dice-logic/types';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DEFAULT_SETTINGS } from '@site/src/dice_roller/utils/constants';
import {
    registerRollReader,
    type RollOrigin,
    type RollSource,
} from '@site/src/dice_roller/utils/rollReader';
import { clearRollSource, setRollSource } from '@site/src/dice_roller/utils/sessionStorage';
import { createRollReader } from '@site/src/integrations/roll-reading';
import { systemRegistry } from '@site/src/sheet_manager/systems';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const HUNTER: RollSource = { systemId: 'wod-v5', definitionId: 'hunter' };
const STAR_WARS: RollSource = { systemId: 'star-wars-wod', definitionId: 'character' };

const WOD_V5 = { mode: 'v5' as const, line: 'desperation' as const, difficulty: null };

let shown: RollSource | null = null;
let unregister: (() => void) | undefined;

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

function panel(tab: '' | 'standard' | 'dnd' | 'wod', extra: Partial<RollOrigin> = {}): RollOrigin {
    return {
        kind: 'panel',
        control: 'roll-button',
        tab,
        ...(tab === 'wod' ? { wod: WOD_V5 } : {}),
        ...extra,
    } as RollOrigin;
}

describe('roll reading integration', () => {
    beforeEach(() => {
        shown = null;
        useDiceRollerStore.setState({
            settings: { ...DEFAULT_SETTINGS, enable3dDicePanel: false },
        });
        unregister = registerRollReader(createRollReader(systemRegistry, () => shown));
    });

    afterEach(() => {
        unregister?.();
        clearRollSource();
    });

    it('adds critical pairs and records the reading for the WoD tab in V5 mode', async () => {
        const result = await roll('6d10@6,7,10,10,4,2>=6', panel('wod'));
        expect(result.notation).toBe('6d10@6,7,10,10,4,2>=6x2=10');
        expect(result.total).toBe(6);
        expect(result.reading).toMatchObject({ readingId: 'v5', line: 'desperation' });
    });

    it('re-rolls an already prepared notation without a second bonus', async () => {
        const result = await roll('6d10@6,7,10,10,4,2>=6x2=10', panel('wod'));
        expect(result.notation).toBe('6d10@6,7,10,10,4,2>=6x2=10');
        expect(result.total).toBe(6);
    });

    it('wraps several top-level terms into one pool so pairs span them', async () => {
        const result = await roll('3d10@10,3,3>=6 + 2d10:h@10,4>=6', panel('wod'));
        expect(result.notation).toBe('(3d10@10,3,3>=6 + 2d10:h@10,4>=6)x2=10');
        expect(result.total).toBe(4);
    });

    it('records the reading without a bonus when critical pairs are off', async () => {
        useDiceRollerStore.setState({
            settings: { ...DEFAULT_SETTINGS, enable3dDicePanel: false, v5CriticalPairs: false },
        });
        const result = await roll('6d10@6,7,10,10,4,2>=6', panel('wod'));
        expect(result.notation).toBe('6d10@6,7,10,10,4,2>=6');
        expect(result.total).toBe(4);
        expect(result.reading?.readingId).toBe('v5');
    });

    it('leaves a roll that is not a success count unread', async () => {
        const result = await roll('2d6@3,4+3', panel('wod'));
        expect(result.total).toBe(10);
        expect(result.reading).toBeUndefined();
    });

    it.each([
        ['WoD Classic', panel('wod', { wod: { ...WOD_V5, mode: 'classic' } })],
        ['Standard', panel('standard')],
        ['D&D', panel('dnd')],
    ])('does not read rolls from the %s tab', async (_name, origin) => {
        const result = await roll('6d10@6,7,10,10,4,2>=6', origin);
        expect(result.total).toBe(4);
        expect(result.reading).toBeUndefined();
    });

    describe('the ten roll contexts of spec 011 US3 (SC-003)', () => {
        const POOL = '6d10@6,7,10,10,4,2>=6';
        const read = async (origin: RollOrigin) => (await roll(POOL, origin)).reading;

        it('reads the WoD tab in V5 mode', async () => {
            expect(await read(panel('wod'))).toMatchObject({ line: 'desperation' });
        });
        it('does not read the WoD tab in Classic mode', async () => {
            expect(
                await read(panel('wod', { wod: { ...WOD_V5, mode: 'classic' } }))
            ).toBeUndefined();
        });
        it('does not read the Standard tab', async () => {
            expect(await read(panel('standard'))).toBeUndefined();
        });
        it('does not read the D&D tab', async () => {
            expect(await read(panel('dnd'))).toBeUndefined();
        });
        it('does not read documentation inline rolls (they bypass the store)', async () => {
            const { rollDices } = await import('@site/src/dice_roller/dice-logic');
            const result = rollDices(POOL);
            expect(result.total).toBe(4);
            expect((result as RollResult).reading).toBeUndefined();
        });
        it('does not read an immediate roll from a Star Wars sheet', async () => {
            expect(await read({ kind: 'sheet', source: STAR_WARS })).toBeUndefined();
        });
        it('reads an immediate roll from a hunter sheet, whatever tab is selected', async () => {
            const result = await roll(POOL, { kind: 'sheet', source: HUNTER });
            expect(result.reading).toMatchObject({ line: 'desperation', difficulty: null });
            expect(result.total).toBe(6);
        });
        it('does not read a queued hunter stat rolled from the panel with the Standard tab', async () => {
            setRollSource(HUNTER);
            expect(await read(panel('standard', { control: 'roll-button' }))).toBeUndefined();
        });
        it('reads a queued hunter stat rolled from the header, whatever tab is selected', async () => {
            for (const tab of ['standard', 'dnd'] as const) {
                setRollSource(HUNTER);
                expect(await read(panel(tab, { control: 'header' }))).toMatchObject({
                    line: 'desperation',
                });
            }
            setRollSource(HUNTER);
            expect(
                await read(
                    panel('wod', {
                        control: 'header',
                        wod: { ...WOD_V5, mode: 'classic' },
                    })
                )
            ).toMatchObject({ line: 'desperation' });
        });
        it('reads a queued hunter stat rolled with no tab selected', async () => {
            setRollSource(HUNTER);
            expect(await read(panel('', { control: 'header' }))).toMatchObject({
                line: 'desperation',
            });
            setRollSource(HUNTER);
            expect(await read(panel('', { control: 'roll-button' }))).toMatchObject({
                line: 'desperation',
            });
        });
        it('does not read a queued Star Wars stat rolled with no tab selected', async () => {
            setRollSource(STAR_WARS);
            expect(await read(panel(''))).toBeUndefined();
        });
    });

    describe('no-tab rolls without a queued stat', () => {
        it('fall back to the document shown in the sheet workspace', async () => {
            shown = HUNTER;
            expect((await roll('3d10@1,6,7>=6', panel(''))).reading?.line).toBe('desperation');
            shown = STAR_WARS;
            expect((await roll('3d10@1,6,7>=6', panel(''))).reading).toBeUndefined();
            shown = null;
            expect((await roll('3d10@1,6,7>=6', panel(''))).reading).toBeUndefined();
        });

        it('forget a queued stat once the input is erased', async () => {
            setRollSource(HUNTER);
            useDiceRollerStore.getState().setNotationInput('');
            expect((await roll('3d10@1,6,7>=6', panel(''))).reading).toBeUndefined();
        });

        it('treat an unknown system as no source', async () => {
            setRollSource({ systemId: 'deleted-system', definitionId: 'x' });
            expect((await roll('3d10@1,6,7>=6', panel(''))).reading).toBeUndefined();
        });
    });

    describe('which line applies', () => {
        const hungerTab = { ...WOD_V5, line: 'hunger' as const };

        it('uses the panel line for rolls made in the panel, even with a hunter queued', async () => {
            setRollSource(HUNTER);
            const result = await roll('2d10@6,1>=6', panel('wod', { wod: hungerTab }));
            expect(result.reading?.line).toBe('hunger');
        });

        it("uses the character's line for header rolls, over the panel line", async () => {
            setRollSource(HUNTER);
            const result = await roll(
                '2d10@6,1>=6',
                panel('wod', { control: 'header', wod: hungerTab })
            );
            expect(result.reading?.line).toBe('desperation');
        });

        it('falls back to the shown document for header rolls of hand-typed notation', async () => {
            shown = HUNTER;
            const result = await roll('2d10@6,1>=6', panel('standard', { control: 'header' }));
            expect(result.reading?.line).toBe('desperation');
        });

        it('falls back to the tab for header rolls without a V5 character', async () => {
            setRollSource(STAR_WARS);
            const header = { control: 'header' as const };
            expect((await roll('2d10@6,1>=6', panel('standard', header))).reading).toBeUndefined();
            setRollSource(STAR_WARS);
            expect(
                (await roll('2d10@6,1>=6', panel('wod', { ...header, wod: hungerTab }))).reading
                    ?.line
            ).toBe('hunger');
        });
    });
});
