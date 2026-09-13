// @vitest-environment jsdom

import { ReferenceFieldControl } from '@site/src/sheet_manager/features/sheet/declarative/fieldControls';
import type { TemplateField } from '@site/src/sheet_manager/types/template';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';

function referenceField(multiple = false) {
    return {
        id: 'crew-gunners',
        type: 'reference',
        label: 'Gunners',
        targetKinds: ['character'],
        multiple,
        required: false,
        compact: false,
    } as TemplateField;
}

/** A campaign-sized roster: 100 characters plus a creature that must never be offered. */
const roster = [
    ...Array.from({ length: 100 }, (_, index) => ({
        value: `char-${index}`,
        label: `Trooper ${String(index).padStart(3, '0')}`,
        kind: 'character',
    })),
    { value: 'luke', label: 'Luke Skywalker', kind: 'character' },
    { value: 'rancor', label: 'Rancor', kind: 'creature' },
];

beforeAll(() => {
    // jsdom lacks the layout APIs the command palette uses.
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    Element.prototype.scrollIntoView ??= () => undefined;
});

describe('reference controls (feature 007)', () => {
    afterEach(cleanup);

    it('lists nothing until the reader searches, then at most eight target-kind matches', () => {
        render(
            createElement(ReferenceFieldControl, {
                field: referenceField(true),
                value: [],
                onChange: () => undefined,
                disabled: false,
                documentOptions: roster,
            })
        );
        expect(screen.queryAllByRole('option')).toHaveLength(0);
        const search = screen.getByRole('searchbox', { name: 'Gunners' });

        fireEvent.change(search, { target: { value: 'trooper' } });
        expect(screen.getAllByRole('option')).toHaveLength(8);

        fireEvent.change(search, { target: { value: 'ranc' } });
        expect(screen.queryAllByRole('option')).toHaveLength(0);
        expect(screen.getByText('No matching documents')).toBeTruthy();
    });

    it('adds several gunners, removes one, and opens a linked document', () => {
        const onChange = vi.fn();
        const open = vi.fn();
        const { rerender } = render(
            createElement(ReferenceFieldControl, {
                field: referenceField(true),
                value: ['luke'],
                onChange,
                disabled: false,
                documentOptions: roster,
                onOpenDocument: open,
            })
        );
        const search = screen.getByRole('searchbox', { name: 'Gunners' });
        fireEvent.change(search, { target: { value: 'Trooper 042' } });
        fireEvent.click(screen.getByRole('option', { name: 'Trooper 042' }));
        expect(onChange).toHaveBeenLastCalledWith(['luke', 'char-42']);

        rerender(
            createElement(ReferenceFieldControl, {
                field: referenceField(true),
                value: ['luke', 'char-42'],
                onChange,
                disabled: false,
                documentOptions: roster,
                onOpenDocument: open,
            })
        );
        fireEvent.click(screen.getByRole('button', { name: 'Remove Trooper 042' }));
        expect(onChange).toHaveBeenLastCalledWith(['luke']);
        fireEvent.click(screen.getByRole('button', { name: 'Open Luke Skywalker' }));
        expect(open).toHaveBeenCalledWith('luke');
    });

    it('keeps a single reference to one document and picks with Enter', () => {
        const onChange = vi.fn();
        const { rerender } = render(
            createElement(ReferenceFieldControl, {
                field: referenceField(false),
                value: undefined,
                onChange,
                disabled: false,
                documentOptions: roster,
            })
        );
        const search = screen.getByRole('searchbox', { name: 'Gunners' });
        fireEvent.change(search, { target: { value: 'luke' } });
        fireEvent.keyDown(search, { key: 'Enter' });
        expect(onChange).toHaveBeenLastCalledWith('luke');

        rerender(
            createElement(ReferenceFieldControl, {
                field: referenceField(false),
                value: 'luke',
                onChange,
                disabled: false,
                documentOptions: roster,
            })
        );
        // A chosen single reference is changed by removing it first.
        expect(screen.queryByRole('searchbox')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Remove Luke Skywalker' }));
        expect(onChange).toHaveBeenLastCalledWith(undefined);
    });

    it('keeps a deleted target visible as a placeholder and reports it once', () => {
        const props = {
            field: referenceField(false),
            value: 'gone',
            onChange: () => undefined,
            disabled: false,
            documentOptions: roster,
        };
        const { rerender } = render(createElement(ReferenceFieldControl, props));
        rerender(createElement(ReferenceFieldControl, props));
        expect(screen.getByRole('alert').textContent).toContain('no longer exists');
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['reference-target-missing']);
    });

    it('does not report missing targets inside fixed previews', () => {
        render(
            createElement(ReferenceFieldControl, {
                field: referenceField(false),
                value: 'gone',
                onChange: () => undefined,
                disabled: true,
                documentOptions: [],
                previewSource: true,
            })
        );
        expect(screen.queryByRole('searchbox')).toBeNull();
        expect(takeSheetIssues()).toEqual([]);
    });
});
