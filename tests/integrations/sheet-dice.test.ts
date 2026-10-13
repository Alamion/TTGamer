// @vitest-environment happy-dom

import { onRollResult } from '@site/src/dice_roller/dice-logic';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DEFAULT_SETTINGS } from '@site/src/dice_roller/utils/constants';
import type { RollOptions } from '@site/src/dice_roller/utils/events';
import { getCharacterName, getRollSource } from '@site/src/dice_roller/utils/sessionStorage';
import {
    getShownDocument,
    useShownDocumentPublisher,
} from '@site/src/integrations/sheet-dice/shownDocument';
import { useSheetDiceActions } from '@site/src/integrations/sheet-dice/useSheetDiceActions';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const HUNTER = { systemId: 'wod-v5', definitionId: 'hunter' };
const realRoll = useDiceRollerStore.getState().roll;

describe('sheet → dice handoff', () => {
    beforeEach(() => {
        sessionStorage.clear();
        useDiceRollerStore.setState({ settings: { ...DEFAULT_SETTINGS }, notationInput: '' });
    });
    afterEach(cleanup);

    it('queues the stat with its document as the roll source', () => {
        const { result } = renderHook(() =>
            useSheetDiceActions({ characterName: 'Ada', statLabel: 'Wits', rollSource: HUNTER })
        );
        act(() => result.current.queueNotation('3d10>=6'));
        expect(useDiceRollerStore.getState().notationInput).toBe('3d10>=6');
        expect(getRollSource()).toEqual(HUNTER);
    });

    it('rolls immediately with a sheet origin', async () => {
        const roll = vi.fn<(notation: string, options?: RollOptions) => Promise<void>>(
            async () => undefined
        );
        useDiceRollerStore.setState({ roll });
        const { result } = renderHook(() =>
            useSheetDiceActions({ statLabel: 'Wits', rollSource: HUNTER })
        );
        await act(() => result.current.rollImmediately('3d10>=6'));
        expect(roll).toHaveBeenCalledWith(
            '3d10>=6',
            expect.objectContaining({ origin: { kind: 'sheet', source: HUNTER } })
        );
    });

    it('forgets the queued source when the input is erased by hand', () => {
        const { result } = renderHook(() => useSheetDiceActions({ rollSource: HUNTER }));
        act(() => result.current.queueNotation('3d10>=6'));
        act(() => useDiceRollerStore.getState().setNotationInput(''));
        expect(getRollSource()).toBeUndefined();
    });

    it('labels a roll only with stats queued after the input was erased (F-006)', async () => {
        useDiceRollerStore.setState({
            roll: realRoll,
            settings: { ...DEFAULT_SETTINGS, enable3dDicePanel: false },
        });
        const brawl = renderHook(() => useSheetDiceActions({ statLabel: 'Brawl' }));
        act(() => brawl.result.current.queueNotation('3d10>=6'));
        act(() => useDiceRollerStore.getState().setNotationInput(''));
        const firearms = renderHook(() => useSheetDiceActions({ statLabel: 'Firearms' }));
        act(() => firearms.result.current.queueNotation('2d10>=6'));

        let labels: string[] | undefined;
        const off = onRollResult((rolled) => {
            labels = rolled.statLabels;
        });
        const { notationInput, roll } = useDiceRollerStore.getState();
        await act(() => roll(notationInput));
        off();
        expect(labels).toEqual(['Firearms']);
    });

    it('forgets the queued character name when the input is erased by hand', () => {
        const { result } = renderHook(() => useSheetDiceActions({ characterName: 'Jax' }));
        act(() => result.current.queueNotation('3d10>=6'));
        expect(getCharacterName()).toBe('Jax');
        act(() => useDiceRollerStore.getState().setNotationInput(''));
        expect(getCharacterName()).toBe('');
    });

    it("does not keep another document's name when a nameless stat is queued", () => {
        const named = renderHook(() => useSheetDiceActions({ characterName: 'Jax' }));
        act(() => named.result.current.queueNotation('3d10>=6'));
        const nameless = renderHook(() => useSheetDiceActions({}));
        act(() => nameless.result.current.queueNotation('2d10>=6'));
        expect(getCharacterName()).toBe('');
    });

    it('rolls a nameless stat at once without a leftover name', async () => {
        useDiceRollerStore.setState({
            roll: realRoll,
            settings: { ...DEFAULT_SETTINGS, enable3dDicePanel: false },
        });
        const named = renderHook(() => useSheetDiceActions({ characterName: 'Jax' }));
        act(() => named.result.current.queueNotation('3d10>=6'));

        const nameless = renderHook(() => useSheetDiceActions({ rollSource: HUNTER }));
        const names: Array<string | undefined> = [];
        const off = onRollResult((rolled) => names.push(rolled.characterName));
        await act(() => nameless.result.current.rollImmediately('2d10>=6'));
        off();
        expect(names.map((name) => name || undefined)).toEqual([undefined]);
        expect(useDiceRollerStore.getState().history[0]?.result.characterName || undefined).toBe(
            undefined
        );
    });

    it('rolls a named stat at once under its own name', async () => {
        useDiceRollerStore.setState({
            roll: realRoll,
            settings: { ...DEFAULT_SETTINGS, enable3dDicePanel: false },
        });
        const named = renderHook(() => useSheetDiceActions({ characterName: 'Mara' }));
        await act(() => named.result.current.rollImmediately('2d10>=6'));
        expect(useDiceRollerStore.getState().history[0]?.result.characterName).toBe('Mara');
    });

    it('publishes the shown document only while mounted', () => {
        const view = renderHook(({ source }) => useShownDocumentPublisher(source), {
            initialProps: { source: HUNTER as typeof HUNTER | null },
        });
        expect(getShownDocument()).toEqual(HUNTER);
        view.rerender({ source: null });
        expect(getShownDocument()).toBeNull();
        view.rerender({ source: HUNTER });
        view.unmount();
        expect(getShownDocument()).toBeNull();
    });
});
