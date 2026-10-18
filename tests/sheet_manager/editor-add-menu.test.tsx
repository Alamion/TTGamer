// @vitest-environment happy-dom

import {
    CustomTemplateSchema,
    TEMPLATE_SCHEMA_VERSION,
} from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { pressShortcut, renderEditor, resetEditorStores } from './helpers/editor';

/** The "+" menu follows the page kind (spec 041, SC-004). */

vi.setConfig({ testTimeout: 60_000 });

const text = (id: string) => ({ id, type: 'text', label: id, required: false });

const fullPage = () =>
    CustomTemplateSchema.parse({
        id: 'tpl-full',
        name: 'Full',
        documentKind: 'character',
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        children: [
            {
                id: 'sec',
                type: 'section',
                title: 'Section',
                children: [
                    {
                        id: 'card',
                        type: 'group',
                        title: 'Card',
                        collapsible: false,
                        children: [text('a')],
                    },
                ],
            },
        ],
    });

const briefPage = () =>
    CustomTemplateSchema.parse({
        id: 'tpl-brief',
        name: 'Brief',
        documentKind: 'character',
        schemaVersion: TEMPLATE_SCHEMA_VERSION,
        pageKind: 'brief',
        children: [
            {
                id: 'block',
                type: 'brief',
                title: 'Block',
                collapsible: false,
                children: [text('b')],
            },
        ],
    });

/** The "+" menu's options at every insertion slot of the open page. */
function offeredEverywhere(): Map<string, string[]> {
    const offered = new Map<string, string[]>();
    for (const slot of [...document.querySelectorAll<HTMLElement>('[data-insert-slot]')]) {
        fireEvent.click(slot);
        offered.set(
            slot.dataset.insertSlot!,
            [...document.querySelectorAll<HTMLElement>('[data-palette-option]')].map(
                (option) => option.dataset.paletteOption!
            )
        );
        fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    }
    return offered;
}

describe('the "+" menu on each kind of page', () => {
    beforeEach(resetEditorStores);
    afterEach(() => {
        cleanup();
        takeSheetIssues();
    });

    it('offers sections and cards on a full page and never a brief block', () => {
        renderEditor(fullPage());
        const offered = offeredEverywhere();
        expect(offered.size).toBeGreaterThanOrEqual(3);
        for (const [slot, options] of offered) {
            expect(options, slot).toContain('group');
            expect(options, slot).not.toContain('brief');
        }
    });

    it('offers brief blocks on a brief, on the page itself only, and never a section or card', () => {
        renderEditor(briefPage());
        const offered = offeredEverywhere();
        expect(offered.size).toBeGreaterThanOrEqual(2);
        for (const [slot, options] of offered) {
            expect(options, slot).not.toContain('group');
            const atRoot = slot.startsWith('root:');
            expect(options.includes('brief'), slot).toBe(atRoot);
            expect(options, slot).toContain('field');
        }
    });
});

describe('switching the page kind (spec 041, US2/US3)', () => {
    beforeEach(resetEditorStores);
    afterEach(() => {
        cleanup();
        takeSheetIssues();
    });

    it('converts the containers, says so, and one undo restores the page', () => {
        renderEditor(fullPage());
        const kind = screen.getByRole('combobox', { name: 'Page kind' }) as HTMLSelectElement;
        fireEvent.change(kind, { target: { value: 'brief' } });
        expect(kind.value).toBe('brief');
        expect(document.querySelector('[data-palette-option]')).toBeNull();
        expect(screen.getByText(/The page is a brief now/)).toBeTruthy();
        const offered = offeredEverywhere();
        expect([...offered.values()].some((options) => options.includes('brief'))).toBe(true);
        pressShortcut(screen.getByRole('dialog'), 'KeyZ', { ctrl: true });
        expect(
            (screen.getByRole('combobox', { name: 'Page kind' }) as HTMLSelectElement).value
        ).toBe('full');
    });
});
