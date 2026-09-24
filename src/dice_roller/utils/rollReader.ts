import type { UiMessageDescriptor } from '@site/src/i18n/generated/uiMessages';

import { isSuccessPool } from '../dice-logic/notation-utils';
import type { RollResult } from '../dice-logic/types';
import type { DiceRollerSettings } from '../store/diceRollerStore';

/** The document a roll came from; the dice roller treats both ids as opaque strings. */
export interface RollSource {
    systemId: string;
    definitionId: string;
}

export type DicePanelTab = 'standard' | 'dnd' | 'wod' | '';
export type WodMode = 'classic' | 'v5';
export type V5Line = 'hunger' | 'desperation';

export interface WodTabState {
    mode: WodMode;
    line: V5Line;
    /** Successes the roll needs in the current mode; `null` when not set. */
    difficulty: number | null;
}

export type PanelRollControl = 'roll-button' | 'enter' | 'header' | 'history';

/** Where a roll was started; decides whether a system reading applies to it. */
export type RollOrigin =
    | { kind: 'sheet'; source: RollSource }
    | {
          kind: 'panel';
          control: PanelRollControl;
          tab: DicePanelTab;
          wod?: WodTabState;
          source?: RollSource;
      };

export interface RollOutcome {
    id: string;
    title: UiMessageDescriptor;
    detail?: UiMessageDescriptor;
    /** True when the outcome depends on a Difficulty that was not given. */
    conditional: boolean;
}

/** What a system reading concluded about a roll; stored with the roll in history. */
export interface RollReadingSummary {
    readingId: string;
    line: string;
    lineLabel: UiMessageDescriptor;
    difficulty: number | null;
    outcomes: RollOutcome[];
}

/** Whether a success pool reached the successes it needed; set only when that number is. */
export interface RollVerdict {
    difficulty: number;
    succeeded: boolean;
    /** Successes over the Difficulty; negative when short. */
    margin: number;
}

export interface PreparedRoll {
    notation: string;
    /** Opaque to the dice roller; handed back to `interpret` unchanged. */
    context?: unknown;
}

/**
 * Implemented outside the dice roller (an integration) so the dice roller never learns about
 * game systems. `prepare` may rewrite the notation; `interpret` summarizes the result.
 */
export interface RollReader {
    prepare(
        notation: string,
        origin: RollOrigin,
        settings: DiceRollerSettings
    ): PreparedRoll | null;
    interpret(result: RollResult, context: unknown): RollReadingSummary | undefined;
}

let activeReader: RollReader | null = null;

export function registerRollReader(reader: RollReader): () => void {
    activeReader = reader;
    return () => {
        if (activeReader === reader) activeReader = null;
    };
}

export function getRollReader(): RollReader | null {
    return activeReader;
}

/** Builds the origin of a roll made through the panel's controls or the header button. */
export function buildPanelOrigin(
    control: PanelRollControl,
    tab: DicePanelTab,
    settings: Pick<DiceRollerSettings, 'wodMode' | 'v5Line' | 'v5Difficulty' | 'wodSuccesses'>
): RollOrigin {
    return {
        kind: 'panel',
        control,
        tab,
        wod:
            tab === 'wod'
                ? {
                      mode: settings.wodMode,
                      line: settings.v5Line,
                      difficulty:
                          settings.wodMode === 'v5' ? settings.v5Difficulty : settings.wodSuccesses,
                  }
                : undefined,
    };
}

/**
 * Compares a success pool with the Difficulty set in the WoD tab. Sheet rolls and rolls from
 * other tabs carry no Difficulty, and a roll that does not count successes gets no verdict.
 */
export function rollVerdict(
    origin: RollOrigin | undefined,
    notation: string,
    total: number
): RollVerdict | undefined {
    const difficulty = origin?.kind === 'panel' ? origin.wod?.difficulty : null;
    if (difficulty == null || !isSuccessPool(notation)) return undefined;
    return { difficulty, succeeded: total >= difficulty, margin: total - difficulty };
}
