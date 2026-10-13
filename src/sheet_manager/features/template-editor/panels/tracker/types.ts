import type {
    TrackerColumn,
    TrackerDisplay,
    TrackerLength,
    TrackerLevel,
    TrackerMarkKind,
    TrackerTotalReads,
    TrackerValueColumn,
} from '../../../../types/template';

/** What the author sets; own trackers store it, built-in ones map it onto their override. */
export interface TrackerSettingsValue {
    display: TrackerDisplay;
    marks: TrackerMarkKind[];
    levels: TrackerLevel[];
    valueColumn: TrackerValueColumn;
    columns: TrackerColumn[];
    total: boolean;
    lengths: TrackerLength[];
    out: boolean;
    legend: boolean;
    /** Own trackers only (spec 020). */
    fromStart?: boolean;
    fillInside?: boolean;
    totalReads?: TrackerTotalReads;
}

/** A built-in tracker: the game fixes counts and order; its own text shows as placeholders. */
export interface TrackerSettingsGame {
    levels: readonly { name: string; value: string }[];
    marks: readonly { name: string; symbol: string }[];
    /** Title of the game's marks column, shown locked before the extra columns. */
    marksColumn: string;
    /** Level count set by an older page (legacy `track`), with the action that drops it. */
    legacyLevels?: { onUseGame: () => void };
}

export type TrackerSettingsChange = (next: Partial<TrackerSettingsValue>) => void;
