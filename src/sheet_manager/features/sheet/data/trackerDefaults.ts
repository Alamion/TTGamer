import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';

import { randomToken } from '../../../../shared/utils/random';
import type {
    TrackerColumn,
    TrackerField,
    TrackerLevel,
    TrackerMarkKind,
} from '../../../types/template';

const text = uiMessages.sheet.templates.tracker;
const healthLevels = uiMessages.sheet.documents.fields.healthLevels;

/** A tracker-local identifier: kebab-safe, starting with a letter. */
export function newTrackerId(prefix: 'lv' | 'mk' | 'col'): string {
    return `${prefix}-${randomToken(8)}`;
}

export type MarkSetId = 'one' | 'two' | 'three' | 'points';

/** Ready sets of marks (spec 018 FR-007, spec 019 points), named in the editor's language. */
export function markSet(set: MarkSetId): TrackerMarkKind[] {
    const mark = (
        name: string,
        symbol: string,
        fill: TrackerMarkKind['fill'],
        layer: TrackerMarkKind['layer'] = 'fill'
    ): TrackerMarkKind => ({ id: newTrackerId('mk'), name, symbol, fill, layer });
    if (set === 'points') {
        return [
            mark(translate(text.markPoint), '●', 'secondary'),
            mark(translate(text.markMaximum), '', 'secondary', 'outline'),
        ];
    }
    if (set === 'one') return [mark(translate(text.markMarked), '×', 'error')];
    const two = [
        mark(translate(text.markBashing), '╱', 'secondary'),
        mark(translate(text.markLethal), '×', 'error'),
    ];
    return set === 'two' ? two : [...two, mark(translate(text.markAggravated), '✱', 'tertiary')];
}

/** The seven health levels with their penalties: a new tracker is useful at once. */
function healthTrack(): TrackerLevel[] {
    const levels: [keyof typeof healthLevels, string][] = [
        ['bruised', '0'],
        ['hurt', '-1'],
        ['injured', '-1'],
        ['wounded', '-2'],
        ['mauled', '-2'],
        ['crippled', '-5'],
        ['incapacitated', ''],
    ];
    return levels.map(([key, value]) => ({
        id: newTrackerId('lv'),
        name: translate(healthLevels[key]),
        value,
    }));
}

export function newTrackerColumn(kind: TrackerColumn['kind']): TrackerColumn {
    return {
        id: newTrackerId('col'),
        kind,
        title: translate(kind === 'marks' ? text.defaultMarksTitle : text.defaultTextTitle),
    };
}

/** Everything a new own tracker starts with (contract "Editor: palette and source"). */
export function defaultTrackerSettings(): Pick<
    TrackerField,
    | 'display'
    | 'marks'
    | 'levels'
    | 'valueColumn'
    | 'columns'
    | 'total'
    | 'totalReads'
    | 'fromStart'
    | 'fillInside'
    | 'lengths'
    | 'out'
    | 'legend'
> {
    return {
        display: 'table',
        marks: markSet('two'),
        levels: healthTrack(),
        valueColumn: { title: translate(text.defaultValueTitle), show: true },
        columns: [newTrackerColumn('marks')],
        total: true,
        totalReads: 'deepest',
        fromStart: false,
        fillInside: false,
        lengths: [],
        out: false,
        legend: false,
    };
}
