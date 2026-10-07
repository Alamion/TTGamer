// @vitest-environment happy-dom

import { useDocumentTypeStore } from '@site/src/sheet_manager/store/documentTypeStore';
import { useTemplateStore } from '@site/src/sheet_manager/store/templateStore';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    ASHEN_ID,
    CULT_ID,
    CULT_PAGE_ID,
    resetLibraryStores,
    seedLibrary,
} from './helpers/library';
import {
    action,
    jsonFile,
    libraryPageLike,
    mustRow,
    openLibrary,
    row,
    select,
    tick,
} from './helpers/libraryDialog';

// The editor opens from the library; full renders are slow under a loaded run.
vi.setConfig({ testTimeout: 30_000 });

describe('library dialog — export (spec 013, US4)', () => {
    beforeEach(seedLibrary);
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    it('ticks branches with partial states and adds parents in tertiary', () => {
        openLibrary();
        fireEvent.click(screen.getByRole('button', { name: 'Export' }));
        expect(screen.getByRole('button', { name: 'Save file' })).toHaveProperty('disabled', true);
        fireEvent.click(within(mustRow(`s:user:${ASHEN_ID}`)).getByLabelText(/Expand/));
        fireEvent.click(within(mustRow(`t:user:${CULT_ID}`)).getByLabelText(/Expand/));
        fireEvent.click(tick(`p:user:${CULT_PAGE_ID}`));

        expect(tick(`p:user:${CULT_PAGE_ID}`).getAttribute('aria-checked')).toBe('true');
        const settingBox = tick(`s:user:${ASHEN_ID}`);
        expect(settingBox.getAttribute('data-auto')).toBe('true');
        expect(settingBox.className).toContain('bg-tertiary');
        expect(
            within(mustRow(`t:user:${CULT_ID}`)).getByText('added for "Cult card"')
        ).toBeTruthy();
        expect(tick('r:wod-v5').getAttribute('aria-checked')).toBe('mixed');
        expect(row('r:wod-2e')!.querySelector('[role="checkbox"]')).not.toBeNull();
        fireEvent.click(within(mustRow('r:wod-2e')).getByLabelText(/Collapse/));
        expect(screen.getByTestId('library-export-counts').textContent).toBe(
            'In the file: 1 setting, 1 type, 1 page, 0 catalogs.'
        );
        const preview = JSON.parse(screen.getByTestId('library-export-preview').textContent!);
        expect(preview.format).toBe('ttgamer-library');
        expect(preview.included[ASHEN_ID]).toBe('auto');
        expect(screen.getByRole('button', { name: 'Save file' })).toHaveProperty('disabled', false);
    });

    it('opens export with the item of the Export action picked', () => {
        openLibrary();
        select(`s:user:${ASHEN_ID}`);
        fireEvent.click(action('export')!);
        expect(screen.getByRole('button', { name: 'Export', pressed: true })).toBeTruthy();
        expect(tick(`s:user:${ASHEN_ID}`).getAttribute('aria-checked')).toBe('true');
        // Tertiary appears only for parts added automatically.
        expect(document.querySelectorAll('.bg-tertiary')).toHaveLength(0);
    });
});

describe('library dialog — import (spec 013, US5)', () => {
    beforeEach(seedLibrary);
    afterEach(() => {
        cleanup();
        resetLibraryStores();
    });

    const chooseFile = async (content: string) => {
        fireEvent.click(screen.getByRole('button', { name: 'Import' }));
        fireEvent.change(screen.getByLabelText('Library file'), {
            target: { files: [jsonFile(content)] },
        });
    };

    it('rejects a broken file without changing anything', async () => {
        openLibrary();
        const before = JSON.stringify(useDocumentTypeStore.getState().types);
        await chooseFile('{"format":"x"}');
        expect((await screen.findByRole('alert')).textContent).toBe(
            'This is not a library, type, or page file.'
        );
        expect(JSON.stringify(useDocumentTypeStore.getState().types)).toBe(before);
    });

    it('previews conflicts and keeps both on request', async () => {
        const cultPage = useTemplateStore
            .getState()
            .templates.find(({ id }) => id === CULT_PAGE_ID)!;
        const content = JSON.stringify({
            format: 'ttgamer-library',
            version: 1,
            templates: [{ ...cultPage, name: 'Cult card v2' }],
        });
        openLibrary();
        await chooseFile(content);
        const conflict = await screen.findByText('conflict');
        const pageRow = conflict.closest('[data-import-row]') as HTMLElement;
        fireEvent.click(within(pageRow).getByRole('button', { name: 'Keep both' }));
        fireEvent.click(screen.getByRole('button', { name: 'Import selected' }));
        const pages = useTemplateStore
            .getState()
            .templates.filter(({ documentKind }) => documentKind === CULT_ID);
        expect(pages.map(({ name }) => name).sort()).toEqual([
            'Cult card',
            'Cult card v2 (imported)',
        ]);
        expect(screen.getByRole('button', { name: 'Browse', pressed: true })).toBeTruthy();
    });

    it('imports a page file named like a shipped view under a fresh id', async () => {
        const content = JSON.stringify({
            format: 'ttgamer-template',
            formatVersion: 3,
            template: libraryPageLike('full-sheet', 'Look-alike'),
        });
        openLibrary();
        await chooseFile(content);
        await screen.findByText('new');
        fireEvent.click(screen.getByRole('button', { name: 'Import selected' }));
        const imported = useTemplateStore
            .getState()
            .templates.find(({ name }) => name === 'Look-alike')!;
        expect(imported.id).not.toBe('full-sheet');
        expect(imported.id).toMatch(/^tpl-/);
    });
});
