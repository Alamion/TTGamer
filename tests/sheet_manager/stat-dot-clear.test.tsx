// @vitest-environment jsdom

import { StatDot } from '@site/src/sheet_manager/components/stat-fields/StatDot';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => cleanup());

describe('StatDot clear control', () => {
    it('names the removal for assistive technology, not just as a tooltip', () => {
        render(createElement(StatDot, { value: 2, onRemove: vi.fn() }));

        const clear = screen.getByRole('button', { name: 'Remove' });
        expect(clear.getAttribute('aria-label')).toBe('Remove');
        // Destructive at rest, intensified under pointer and keyboard focus.
        expect(clear.className).toContain('text-error');
        expect(clear.className).toContain('opacity-50');
        expect(clear.className).toContain('hover:opacity-100');
        expect(clear.className).toContain('focus-visible:opacity-100');
        expect(clear.className).toContain('focus-visible:ring-error');
    });

    it('renders no clear control when removal is not offered', () => {
        render(createElement(StatDot, { value: 2 }));

        expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
    });
});
