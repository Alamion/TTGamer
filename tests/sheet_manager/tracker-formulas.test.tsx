// @vitest-environment happy-dom
import { listTemplateNumericCoordinates } from '@site/src/sheet_manager/features/sheet/data/templateReferences';
import { trackerReading } from '@site/src/sheet_manager/features/sheet/data/trackerModel';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import {
    listDocumentBindings,
    listNumericCoordinates,
    readBoundNumber,
    readTrackNumber,
    type TrackBinding,
} from '@site/src/sheet_manager/systems/templateBindings';
import {
    type CustomTemplate,
    CustomTemplateSchema,
    type TemplateField,
} from '@site/src/sheet_manager/types/template';
import type { TrackerValue } from '@site/src/sheet_manager/types/templateValues';
import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { mountSheet } from './helpers/sheet';

/** Formulas read trackers (spec 045, US4). */

const TRACKER = {
    id: 'wounds',
    type: 'tracker',
    label: 'Wounds',
    marks: [
        { id: 'bashing', name: 'Bashing', symbol: '╱', fill: 'secondary' },
        { id: 'lethal', name: 'Lethal', symbol: '×', fill: 'error' },
    ],
    levels: [
        { id: 'hurt', name: 'Hurt', value: '-1' },
        { id: 'injured', name: 'Injured', value: '-2' },
        { id: 'blessed', name: 'Blessed', value: '+3' },
        { id: 'out', name: 'Out', value: 'Out' },
    ],
    columns: [{ id: 'damage', kind: 'marks', title: 'Damage', copies: { max: 4 } }],
};

const template = (extra: Record<string, unknown> = {}): CustomTemplate =>
    CustomTemplateSchema.parse({
        id: 'tracker-formulas',
        name: 'Tracker formulas',
        documentKind: 'character',
        schemaVersion: 4,
        children: [
            { ...TRACKER, ...extra },
            { id: 'pool', type: 'formula', label: 'Pool', formula: 'max(1, 3 + wounds)' },
        ],
    });

const field = (extra: Record<string, unknown> = {}) =>
    template(extra).children[0] as Extract<TemplateField, { type: 'tracker' }>;

const value = (...copies: Record<string, string>[]): TrackerValue => ({
    tracker: 1,
    columns: { damage: copies.map((marks, index) => ({ id: `c${String(index)}`, marks })) },
});

afterEach(() => {
    cleanup();
    takeSheetIssues();
});

describe('an own tracker in formulas', () => {
    it('reads the deepest marked level, 0 when nothing is marked, and not a number for a word', () => {
        expect(trackerReading(field(), undefined)).toBe(0);
        expect(trackerReading(field(), value({ hurt: 'bashing', injured: 'lethal' }))).toBe(-2);
        expect(trackerReading(field(), value({ blessed: 'bashing' }))).toBe(3);
        expect(trackerReading(field(), value({ out: 'lethal' }))).toBeNaN();
    });

    it('reads the count of marked boxes when its total counts', () => {
        const counting = field({ totalReads: 'count' });
        expect(trackerReading(counting, value({ hurt: 'bashing', injured: 'lethal' }))).toBe(2);
    });

    it('of several copies, reads the one marked deepest, whatever the sign, or the most marked', () => {
        const copies = value({ hurt: 'bashing', injured: 'bashing' }, { blessed: 'lethal' });
        expect(trackerReading(field(), copies)).toBe(3);
        const counting = value({ hurt: 'bashing', injured: 'bashing' }, { blessed: 'lethal' });
        expect(trackerReading(field({ totalReads: 'count' }), counting)).toBe(2);
    });

    it('is offered among the numeric values', () => {
        const coordinates = listTemplateNumericCoordinates(template()).map(
            ({ coordinate }) => coordinate
        );
        expect(coordinates).toContain('wounds');
    });

    it('changes a pool on the page once a box is marked', () => {
        const page = template();
        const document = (values: Record<string, unknown>) =>
            ({
                id: 'doc-wounds',
                kind: 'character',
                systemId: 'star-wars-wod',
                definitionId: 'star-wars-wod-character',
                schemaVersion: 1,
                metadata: { title: 'Kira', tags: [] },
                templateValues: values,
                data: { metadata: { name: '', type: 'sentient' } },
            }) as never;
        useDocumentStore.setState({ documents: [document({})], currentDocumentId: 'doc-wounds' });
        mountSheet(page);
        const pool = () =>
            screen.getByText('Pool', { selector: 'span' }).parentElement!.lastElementChild!
                .textContent;
        expect(pool()).toBe('3');
        act(() =>
            useDocumentStore.setState({
                documents: [document({ wounds: value({ hurt: 'bashing', injured: 'lethal' }) })],
            })
        );
        expect(pool()).toBe('1');
    });
});

describe('a built-in track in formulas', () => {
    const health = listDocumentBindings('star-wars-wod', 'character').find(
        (binding): binding is TrackBinding => binding.kind === 'track'
    )!;

    it("reads a Star Wars character's wound penalty by the track's id", () => {
        const penalties = health.levels.map(({ penalty }) => penalty);
        const deepest = penalties.findIndex((penalty) => penalty !== null && penalty < 0);
        const levels = health.levels.map((_, index) => (index <= deepest ? 'slash' : 'empty'));
        const data = { [health.dataKey]: { levels } };
        expect(readTrackNumber(health, data)).toBe(penalties[deepest]);
        expect(readTrackNumber(health, { [health.dataKey]: { levels: [] } })).toBe(0);
        const coordinates = listNumericCoordinates('star-wars-wod', 'character');
        expect(coordinates.map(({ coordinate }) => coordinate)).toContain(health.trackId);
        expect(readBoundNumber('star-wars-wod', 'character', data, health.trackId)).toEqual({
            bound: true,
            value: penalties[deepest],
        });
    });

    it('reads V5 Health and Willpower as marked boxes', () => {
        const v5 = listDocumentBindings('wod-v5', 'vampire').filter(
            (binding): binding is TrackBinding => binding.kind === 'track'
        );
        expect(v5.map(({ trackId }) => trackId)).toEqual(['health', 'willpower']);
        const data = { health: { levels: ['slash', 'cross', 'empty', 'slash'] } };
        expect(readTrackNumber(v5[0]!, data)).toBe(3);
    });

    it('of several members, reads the one marked deepest', () => {
        const pack: TrackBinding = {
            ...health,
            dataKey: 'members',
            members: { trackKey: 'health', maxMembers: 4 },
        };
        const levels = (count: number) =>
            health.levels.map((_, index) => (index < count ? 'slash' : 'empty'));
        const data = {
            members: [{ health: { levels: levels(1) } }, { health: { levels: levels(3) } }],
        };
        expect(readTrackNumber(pack, data)).toBe(health.levels[2]!.penalty ?? 0);
    });
});
