import { trackerChangeReport } from '@site/src/sheet_manager/features/sheet/data/trackerChanges';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { describe, expect, it } from 'vitest';

/** What a tracker settings change stops showing, confirmed before saving (spec 018, FR-026). */

const LEVELS = [
    { id: 'hurt', name: 'Hurt', value: '-1' },
    { id: 'injured', name: 'Injured', value: '-1' },
    { id: 'down', name: 'Down', value: '' },
];
const MARKS = [
    { id: 'bashing', name: 'Bashing', symbol: '╱', fill: 'secondary' },
    { id: 'lethal', name: 'Lethal', symbol: '×', fill: 'error' },
];
const COLUMNS = [
    { id: 'damage', kind: 'marks', title: 'Damage', copies: { max: 3 } },
    { id: 'source', kind: 'text', title: 'Source' },
];

function page(tracker: Record<string, unknown> = {}) {
    return CustomTemplateSchema.parse({
        id: 'tpl-changes',
        name: 'Changes',
        systemId: 'wod-2e',
        documentKind: 'character',
        schemaVersion: 3,
        children: [
            {
                id: 'wounds',
                type: 'tracker',
                label: 'Wounds',
                marks: MARKS,
                levels: LEVELS,
                columns: COLUMNS,
                ...tracker,
            },
        ],
    });
}

const document = (value: unknown, kind = 'character') => ({
    systemId: 'wod-2e',
    kind,
    templateValues: { wounds: value },
});

const VALUE = {
    tracker: 1,
    columns: {
        damage: [
            { id: 'a', marks: { hurt: 'bashing', injured: 'lethal' } },
            { id: 'b', marks: { hurt: 'lethal' } },
            { id: 'c' },
        ],
        source: [{ id: 'a', texts: { hurt: 'Blaster' } }],
    },
};

describe('tracker change report', () => {
    it('reports nothing for reordering or unchanged trackers', () => {
        const before = page();
        const reordered = page({
            marks: [...MARKS].reverse(),
            levels: [...LEVELS].reverse(),
            columns: [...COLUMNS].reverse(),
        });
        expect(trackerChangeReport(before, before, [document(VALUE)])).toEqual([]);
        expect(trackerChangeReport(before, reordered, [document(VALUE)])).toEqual([]);
        expect(trackerChangeReport(undefined, reordered, [document(VALUE)])).toEqual([]);
    });

    it('counts marks of a removed level and of a removed kind', () => {
        expect(
            trackerChangeReport(page(), page({ levels: LEVELS.slice(1) }), [document(VALUE)])
        ).toEqual([
            expect.objectContaining({ lostMarks: 2, lostTexts: 1, lostCopies: 2, documents: 1 }),
        ]);
        expect(
            trackerChangeReport(page(), page({ marks: MARKS.slice(0, 1) }), [document(VALUE)])
        ).toEqual([expect.objectContaining({ lostMarks: 2, lostCopies: 1 })]);
    });

    it('counts a removed column, a lower maximum, and copies turned off', () => {
        expect(
            trackerChangeReport(page(), page({ columns: [COLUMNS[0]] }), [document(VALUE)])
        ).toEqual([expect.objectContaining({ lostTexts: 1, lostMarks: 0 })]);
        expect(
            trackerChangeReport(
                page(),
                page({ columns: [{ ...COLUMNS[0], copies: undefined }, COLUMNS[1]] }),
                [document(VALUE)]
            )
        ).toEqual([expect.objectContaining({ lostMarks: 1, lostCopies: 1 })]);
    });

    it('counts every document the page can render, and only those', () => {
        const report = trackerChangeReport(page(), page({ levels: LEVELS.slice(1) }), [
            document(VALUE),
            document(VALUE),
            document(VALUE, 'creature'),
            document('not a tracker value'),
        ]);
        expect(report).toEqual([
            expect.objectContaining({ documents: 2, lostMarks: 4, title: 'Wounds' }),
        ]);
    });
});
