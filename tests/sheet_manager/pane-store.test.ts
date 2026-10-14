// @vitest-environment happy-dom
import {
    closePane,
    focusPane,
    openBeside,
    reconcilePanes,
    usePaneStore,
} from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { useDocumentStore } from '@site/src/sheet_manager/store/documentStore';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetDocuments, seedDocuments } from './helpers/documentsWindow';

const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ids = () => usePaneStore.getState().ids;
const current = () => useDocumentStore.getState().currentDocumentId;
const entryIds = (list: readonly string[] = names) => new Set(list);

beforeEach(() => {
    resetDocuments();
    usePaneStore.setState({ ids: [], recent: [] });
    seedDocuments(names, { current: 'a' });
});

describe('opening documents beside each other (spec 034, US1)', () => {
    it('adds the document next to the current one and makes it current', () => {
        openBeside('c');
        expect(ids()).toEqual(['a', 'c']);
        expect(current()).toBe('c');
        openBeside('b');
        expect(ids()).toEqual(['a', 'c', 'b']);
    });

    it('focuses the pane that already shows the document instead of adding another', () => {
        openBeside('b');
        openBeside('a');
        expect(ids()).toEqual(['a', 'b']);
        expect(current()).toBe('a');
    });

    it('at the limit replaces the least recently focused pane, never the current one', () => {
        for (const id of ['b', 'c', 'd', 'e', 'f']) openBeside(id);
        usePaneStore.setState({ recent: ['f', 'e', 'd', 'c', 'b', 'a'] });
        expect(ids()).toHaveLength(6);

        expect(openBeside('g')).toBe('a');
        expect(ids()).toEqual(['g', 'b', 'c', 'd', 'e', 'f']);
        expect(current()).toBe('g');
    });

    it('keeps the document when its pane is closed, and focuses the neighbour', () => {
        openBeside('b');
        openBeside('c');
        closePane('c');
        expect(ids()).toEqual(['a', 'b']);
        expect(current()).toBe('b');
        expect(useDocumentStore.getState().entries.some(({ id }) => id === 'c')).toBe(true);
    });

    it('closing a pane that is not current leaves the focus where it was', () => {
        openBeside('b');
        closePane('a');
        expect(ids()).toEqual(['b']);
        expect(current()).toBe('b');
    });

    it('does not close the last pane', () => {
        usePaneStore.setState({ ids: ['a'] });
        closePane('a');
        expect(ids()).toEqual(['a']);
    });

    it('focusing a pane makes its document current', () => {
        openBeside('b');
        focusPane('a');
        expect(current()).toBe('a');
    });
});

describe('the arrangement that is true now', () => {
    it('shows the current document alone when nothing was arranged', () => {
        expect(reconcilePanes({ ids: [], recent: [] }, 'a', entryIds())).toEqual({
            ids: ['a'],
            recent: ['a'],
        });
    });

    it('lets Open take the place of the pane that was focused last', () => {
        const state = { ids: ['a', 'b'], recent: ['b', 'a'] };
        expect(reconcilePanes(state, 'c', entryIds())).toEqual({
            ids: ['a', 'c'],
            recent: ['c', 'a'],
        });
    });

    it('moves the focus history when a pane is focused, without changing the panes', () => {
        const state = { ids: ['a', 'b'], recent: ['b', 'a'] };
        expect(reconcilePanes(state, 'a', entryIds())).toEqual({
            ids: ['a', 'b'],
            recent: ['a', 'b'],
        });
    });

    it('drops documents that no longer exist and returns the same object when unchanged', () => {
        const state = { ids: ['a', 'b', 'c'], recent: ['a', 'b', 'c'] };
        expect(reconcilePanes(state, 'a', entryIds(['a', 'c']))).toEqual({
            ids: ['a', 'c'],
            recent: ['a', 'c'],
        });
        expect(reconcilePanes(state, 'a', entryIds())).toBe(state);
    });
});
