// @vitest-environment happy-dom

import {
    fitPaneWidths,
    PANE_STORAGE_KEY,
    readPaneWidths,
} from '@site/src/sheet_manager/features/template-editor/components/usePaneWidths';
import { CustomTemplateSchema } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderEditor, resetEditorStores } from './helpers/editor';

vi.setConfig({ testTimeout: 20_000 });

const template = () =>
    CustomTemplateSchema.parse({
        id: 'tpl-panes',
        name: 'Panes Kit',
        documentKind: 'character',
        schemaVersion: 3,
        children: [{ id: 'motto', type: 'text', label: 'Motto' }],
    });

const open = () => renderEditor(template());

const divider = (name: string) => screen.getByRole('separator', { name });
const stored = () => JSON.parse(localStorage.getItem(PANE_STORAGE_KEY) ?? 'null');

describe('resizable editor areas (spec 022, US3)', () => {
    beforeEach(() => {
        resetEditorStores();
        localStorage.clear();
    });
    afterEach(cleanup);

    it('names both dividers as separators with their widths', () => {
        open();
        const outline = divider('Resize outline');
        expect(outline.getAttribute('aria-orientation')).toBe('vertical');
        expect(outline.getAttribute('aria-valuenow')).toBe('240');
        expect(outline.getAttribute('aria-valuemin')).toBe('160');
        expect(outline.getAttribute('aria-valuemax')).toBe('420');
        expect(divider('Resize settings').getAttribute('aria-valuenow')).toBe('320');
    });

    it('moves with arrows, clamps, and resets with Home and a double click', () => {
        open();
        fireEvent.keyDown(divider('Resize outline'), { key: 'ArrowRight' });
        expect(divider('Resize outline').getAttribute('aria-valuenow')).toBe('250');
        fireEvent.keyDown(divider('Resize outline'), { key: 'ArrowLeft', shiftKey: true });
        expect(divider('Resize outline').getAttribute('aria-valuenow')).toBe('210');
        for (let step = 0; step < 10; step++) {
            fireEvent.keyDown(divider('Resize outline'), { key: 'ArrowLeft', shiftKey: true });
        }
        expect(divider('Resize outline').getAttribute('aria-valuenow')).toBe('160');
        fireEvent.keyDown(divider('Resize outline'), { key: 'Home' });
        expect(divider('Resize outline').getAttribute('aria-valuenow')).toBe('240');

        // The settings divider sits left of its area: moving it right narrows the area.
        fireEvent.keyDown(divider('Resize settings'), { key: 'ArrowLeft', shiftKey: true });
        expect(divider('Resize settings').getAttribute('aria-valuenow')).toBe('360');
        fireEvent.doubleClick(divider('Resize settings'));
        expect(divider('Resize settings').getAttribute('aria-valuenow')).toBe('320');
    });

    it('stores the widths and reads them back in the next editor', () => {
        open();
        fireEvent.keyDown(divider('Resize settings'), { key: 'ArrowLeft', shiftKey: true });
        expect(stored()).toEqual({ outline: 240, settings: 360 });
        cleanup();
        open();
        expect(divider('Resize settings').getAttribute('aria-valuenow')).toBe('360');
    });

    it('falls back to the defaults for broken stored widths', () => {
        localStorage.setItem(PANE_STORAGE_KEY, '{not json');
        open();
        expect(divider('Resize outline').getAttribute('aria-valuenow')).toBe('240');
        expect(readPaneWidths({ outline: 'wide', settings: 9999 })).toEqual({
            outline: 240,
            settings: 560,
        });
    });

    it('narrows the side areas so the page keeps its minimum width', () => {
        const widths = { outline: 400, settings: 500 };
        expect(fitPaneWidths(widths, 2000)).toEqual(widths);
        const fitted = fitPaneWidths(widths, 1000);
        expect(fitted.outline + fitted.settings + 12 + 360).toBeLessThanOrEqual(1000);
        expect(fitted.outline).toBeGreaterThanOrEqual(160);
        expect(fitPaneWidths(widths, 500)).toEqual({ outline: 160, settings: 260 });
    });
});
