// @vitest-environment happy-dom
import registry from '@generated/registry';
import routes from '@generated/routesChunkNames';
import { CollapsibleBlock } from '@site/src/sheet_manager/components/sections/CollapsibleBlock';
import { SectionCard } from '@site/src/sheet_manager/components/sections/SectionCard';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as never;
    Object.assign(routes, { '/docs/help-test-hash': { content: 'section-help' } });
    Object.assign(registry, {
        'section-help': [() => Promise.resolve({ default: () => <p>Section explanation.</p> })],
    });
});
afterEach(() => {
    cleanup();
    localStorage.clear();
});

describe.each(['section', 'group', 'dense group'] as const)('%s help', (kind) => {
    it('is a named link outside the fold button and opens without folding', async () => {
        const props = {
            title: 'Attributes',
            storageKey: `help-${kind}`,
            docsPath: '/docs/help-test',
        };
        render(
            kind === 'section' ? (
                <CollapsibleBlock {...props}>
                    <p>Sheet content</p>
                </CollapsibleBlock>
            ) : (
                <SectionCard {...props} dense={kind === 'dense group'}>
                    <p>Sheet content</p>
                </SectionCard>
            )
        );
        const help = screen.getByRole('link', { name: 'Documentation for Attributes' });
        const fold = screen.getByRole('button', { name: 'Toggle Attributes section' });
        expect(help.closest('button')).toBeNull();
        const row = fold.parentElement!;
        expect(row.classList.contains('justify-between')).toBe(true);
        expect(row.lastElementChild?.contains(help)).toBe(true);
        expect(fold.nextElementSibling?.contains(help)).toBe(true);
        expect(fold.lastElementChild?.classList.contains('lucide-chevron-down')).toBe(true);
        fireEvent.click(help);
        await act(() => Promise.resolve());
        expect(
            screen.getByRole('dialog', { name: 'Documentation: Attributes' }).textContent
        ).toContain('Section explanation.');
        expect(fold.getAttribute('aria-expanded')).toBe('true');
        fireEvent.keyDown(document.activeElement ?? help, { key: 'Escape' });
        fireEvent.click(fold);
        expect(screen.queryByText('Sheet content')).toBeNull();
        // Native buttons synthesize a click for Enter; browser coverage checks that activation.
        expect(fold.tagName).toBe('BUTTON');
        fireEvent.click(fold, { detail: 0 });
        expect(screen.getByText('Sheet content')).toBeTruthy();
    });
});

it.each([false, true])('a non-folding card (dense: %s) puts help at the right end', (dense) => {
    render(
        <SectionCard title="Attributes" docsPath="/docs/help-test" dense={dense}>
            <p>Sheet content</p>
        </SectionCard>
    );
    const help = screen.getByRole('link', { name: 'Documentation for Attributes' });
    const heading = screen.getByRole('heading', { name: /Attributes/ });
    expect(heading.classList.contains('flex')).toBe(true);
    expect(heading.classList.contains('justify-between')).toBe(true);
    expect(heading.lastElementChild?.contains(help)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Toggle Attributes section' })).toBeNull();
});
