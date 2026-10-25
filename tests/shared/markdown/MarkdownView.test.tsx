// @vitest-environment happy-dom
import { MarkdownView } from '@site/src/shared/components/markdown/MarkdownView';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Folding callouts and the view's slots (spec 043, US2). */

afterEach(cleanup);

const SOURCE = [
    '> [!info]- History',
    '> Built a century ago.',
    '',
    '> [!warning]+ What the players see',
    '> Two guards.',
    '',
    '> [!note] Always open',
    '> Plain body.',
].join('\n');

const toggle = (title: string) => screen.getByRole('button', { name: new RegExp(title) });

describe('foldable callouts', () => {
    it('starts `-` folded, `+` open, and a plain callout without a fold control', () => {
        render(<MarkdownView source={SOURCE} />);
        expect(toggle('History').getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText('Built a century ago.')).toBeNull();
        expect(toggle('What the players see').getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText('Two guards.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Always open/ })).toBeNull();
        expect(screen.getByText('Plain body.')).toBeTruthy();
    });

    it('unfolds and folds by click and keyboard, telling its state', () => {
        render(<MarkdownView source={SOURCE} />);
        fireEvent.click(toggle('History'));
        expect(toggle('History').getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText('Built a century ago.')).toBeTruthy();
        const body = document.getElementById(toggle('History').getAttribute('aria-controls')!);
        expect(body?.textContent).toBe('Built a century ago.');
        // A native button answers Enter and Space with a click.
        fireEvent.click(toggle('History'));
        expect(screen.queryByText('Built a century ago.')).toBeNull();
    });

    it('keeps the fold state per view and never changes the text', () => {
        const onToggleTask = vi.fn();
        const first = render(<MarkdownView source={SOURCE} onToggleTask={onToggleTask} />);
        render(<MarkdownView source={SOURCE} />);
        const [history] = screen.getAllByRole('button', { name: /History/ });
        fireEvent.click(history!);
        expect(
            screen
                .getAllByRole('button', { name: /History/ })
                .map((button) => button.getAttribute('aria-expanded'))
        ).toEqual(['true', 'false']);
        first.rerender(<MarkdownView source={SOURCE} onToggleTask={onToggleTask} />);
        expect(history!.getAttribute('aria-expanded')).toBe('true');
        expect(onToggleTask).not.toHaveBeenCalled();
    });
});

describe('slots', () => {
    it('reports the task line, replaces code spans, and resolves embeds', () => {
        const onToggleTask = vi.fn();
        const onIssue = vi.fn();
        render(
            <MarkdownView
                source={'intro\n- [ ] one\n`dice: 2d10`\n![[map.png]] ![[gone.png]]\n> [!weird] x'}
                onToggleTask={onToggleTask}
                onIssue={onIssue}
                renderCode={(code) => (code.startsWith('dice:') ? <b>roll</b> : undefined)}
                resolveEmbed={(name) => (name === 'map.png' ? 'blob:map' : undefined)}
            />
        );
        fireEvent.click(screen.getByRole('checkbox'));
        expect(onToggleTask).toHaveBeenCalledWith(1);
        expect(screen.getByText('roll').tagName).toBe('B');
        expect(screen.getByRole('img').getAttribute('src')).toBe('blob:map');
        expect(screen.getByText('![[gone.png]]')).toBeTruthy();
        expect(onIssue).toHaveBeenCalledWith({ code: 'unknown-callout', kind: 'weird' });
    });
});
