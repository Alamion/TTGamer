// @vitest-environment jsdom

import { onRollResult } from '@site/src/dice_roller/dice-logic/dice-roller';
import type { RollResult } from '@site/src/dice_roller/dice-logic/types';
import {
    mergeStoredSettings,
    useDiceRollerStore,
} from '@site/src/dice_roller/store/diceRollerStore';
import { DEFAULT_SETTINGS } from '@site/src/dice_roller/utils/constants';
import {
    registerRollReader,
    type RollOrigin,
    type RollReader,
} from '@site/src/dice_roller/utils/rollReader';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGIN: RollOrigin = { kind: 'panel', control: 'roll-button', tab: 'wod' };

async function rollAndCapture(notation: string, origin?: RollOrigin): Promise<RollResult> {
    let captured: RollResult | undefined;
    const off = onRollResult((result) => {
        captured = result;
    });
    await useDiceRollerStore.getState().roll(notation, origin ? { origin } : undefined);
    off();
    if (!captured) throw new Error('no roll result emitted');
    return captured;
}

describe('dice roller store', () => {
    let unregister: (() => void) | undefined;

    beforeEach(() => {
        useDiceRollerStore.setState({
            settings: { ...DEFAULT_SETTINGS, enable3dDicePanel: false },
            history: [],
            panelTab: '',
        });
    });

    afterEach(() => {
        unregister?.();
        unregister = undefined;
    });

    describe('persisted settings', () => {
        it('gives new keys their defaults when stored settings predate them', () => {
            const merged = mergeStoredSettings({ primaryDiceColor: '#123456', enableSound: false });
            expect(merged.primaryDiceColor).toBe('#123456');
            expect(merged.enableSound).toBe(false);
            expect(merged.wodMode).toBe('classic');
            expect(merged.v5CriticalPairs).toBe(true);
            expect(merged.v5SpecialOutcomes).toBe(true);
            expect(merged.v5Difficulty).toBeNull();
            expect(merged.specialDiceColor).toBe(DEFAULT_SETTINGS.specialDiceColor);
        });

        it('drops unknown keys and survives garbage', () => {
            expect(mergeStoredSettings({ removedSetting: 1 })).toEqual(DEFAULT_SETTINGS);
            expect(mergeStoredSettings(null)).toEqual(DEFAULT_SETTINGS);
            expect(mergeStoredSettings('nope')).toEqual(DEFAULT_SETTINGS);
        });

        it('rehydrates a v0 payload with defaults and the stored tab', async () => {
            localStorage.setItem(
                'dice-roller-storage',
                JSON.stringify({
                    version: 0,
                    state: {
                        settings: { primaryDiceColor: '#abcdef' },
                        history: [],
                        favorites: [],
                        recentNotations: [],
                    },
                })
            );
            // The browser build wraps the store in `persist`; its union type hides the API.
            const persisted = useDiceRollerStore as unknown as {
                persist: { rehydrate: () => Promise<void> };
            };
            await persisted.persist.rehydrate();
            const state = useDiceRollerStore.getState();
            expect(state.settings.primaryDiceColor).toBe('#abcdef');
            expect(state.settings.wodMode).toBe('classic');
            expect(state.panelTab).toBe('');
        });

        it('persists the selected panel tab', () => {
            useDiceRollerStore.getState().setPanelTab('wod');
            const stored = JSON.parse(localStorage.getItem('dice-roller-storage') ?? '{}');
            expect(stored.state.panelTab).toBe('wod');
            expect(stored.version).toBe(1);
        });
    });

    describe('roll reader hook', () => {
        it('prepares and interprets rolls that carry an origin', async () => {
            const reader: RollReader = {
                prepare: vi.fn((notation: string) => ({
                    notation: `${notation}+1`,
                    context: 'ctx',
                })),
                interpret: vi.fn(() => ({
                    readingId: 'test',
                    line: 'line',
                    lineLabel: { id: 'x', message: 'Line' },
                    difficulty: null,
                    outcomes: [],
                })),
            };
            unregister = registerRollReader(reader);

            const result = await rollAndCapture('2d6@3,4', ORIGIN);

            expect(reader.prepare).toHaveBeenCalledWith(
                '2d6@3,4',
                ORIGIN,
                expect.objectContaining({ wodMode: 'classic' })
            );
            expect(reader.interpret).toHaveBeenCalledWith(expect.anything(), 'ctx');
            expect(result.total).toBe(8);
            expect(result.origin).toEqual(ORIGIN);
            expect(result.reading?.readingId).toBe('test');
        });

        it('rolls unread when the reader throws', async () => {
            unregister = registerRollReader({
                prepare: () => {
                    throw new Error('boom');
                },
                interpret: vi.fn(),
            });
            const result = await rollAndCapture('2d6@3,4', ORIGIN);
            expect(result.total).toBe(7);
            expect(result.reading).toBeUndefined();
        });

        it('keeps a roll without origin untouched', async () => {
            const reader: RollReader = { prepare: vi.fn(), interpret: vi.fn() };
            unregister = registerRollReader(reader);
            const result = await rollAndCapture('2d6@3,4');
            expect(reader.prepare).not.toHaveBeenCalled();
            expect(result.total).toBe(7);
            expect(result.origin).toBeUndefined();
        });

        it('rolls unchanged when no reader is registered', async () => {
            const result = await rollAndCapture('2d6@3,4', ORIGIN);
            expect(result.total).toBe(7);
            expect(result.reading).toBeUndefined();
        });
    });
});
