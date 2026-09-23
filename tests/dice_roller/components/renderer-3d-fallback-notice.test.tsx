// @vitest-environment jsdom

import { notifyRollResult } from '@site/src/dice_roller/dice-logic/dice-roller';
import type { RollResult } from '@site/src/dice_roller/dice-logic/types';
import { cleanup, render } from '@testing-library/react';
import { act, createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('react-hot-toast', () => ({ default: { error: toastError } }));

const { default: Renderer3DFallbackNotice } =
    await import('@site/src/dice_roller/components/Renderer3DFallbackNotice');

function rollResult(overrides: Partial<RollResult> = {}): RollResult {
    return {
        notation: '1d6',
        diceGroups: [],
        total: 4,
        details: '4',
        formatted: '4',
        ...overrides,
    };
}

afterEach(() => {
    cleanup();
    toastError.mockClear();
});

describe('Renderer3DFallbackNotice', () => {
    it('warns once when a roll fell back because the 3D renderer failed to load', () => {
        render(createElement(Renderer3DFallbackNotice));

        act(() => notifyRollResult(rollResult({ renderer3dUnavailable: true })));
        act(() => notifyRollResult(rollResult({ renderer3dUnavailable: true })));

        expect(toastError).toHaveBeenCalledTimes(1);
    });

    it('stays silent for ordinary rolls', () => {
        render(createElement(Renderer3DFallbackNotice));

        act(() => notifyRollResult(rollResult()));

        expect(toastError).not.toHaveBeenCalled();
    });
});
