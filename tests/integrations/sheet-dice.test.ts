// @vitest-environment jsdom

import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { DEFAULT_SETTINGS } from '@site/src/dice_roller/utils/constants';
import type { RollOptions } from '@site/src/dice_roller/utils/events';
import { getRollSource } from '@site/src/dice_roller/utils/sessionStorage';
import {
    getShownDocument,
    useShownDocumentPublisher,
} from '@site/src/integrations/sheet-dice/shownDocument';
import { useSheetDiceActions } from '@site/src/integrations/sheet-dice/useSheetDiceActions';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const HUNTER = { systemId: 'wod-v5', definitionId: 'hunter' };

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
