// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, Fragment } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@site/src/i18n/generated/bookTerms', () => ({
    bookTerms: {
        'ttgamer.ui.sheet.v5.skills.larceny': { en: 'Larceny' },
        'ttgamer.ui.sheet.v5.skills.stealth': { en: 'Stealth' },
        'ttgamer.ui.sheet.v5.skills.animalKen': { en: 'Animal Ken', ruShort: 'Животные' },
    },
}));

import { useReaderPrefsStore } from '../../src/shared/store/readerPrefsStore';
import { TermHintProvider } from '../../src/sheet_manager/components/terms/TermHintProvider';
import { TermLabel } from '../../src/sheet_manager/components/terms/TermLabel';
import { setTestLocale } from '../stubs/testLocale';

function sheet() {
    return render(
        createElement(
            TermHintProvider,
            null,
            createElement(
                Fragment,
                null,
                createElement(TermLabel, {
                    text: 'Воровство',
                    termRef: 'ttgamer.ui.sheet.v5.skills.larceny',
                }),
                createElement(TermLabel, {
                    text: 'Скрытность',
                    termRef: 'ttgamer.ui.sheet.v5.skills.stealth',
                }),
                createElement(TermLabel, {
                    text: 'Обращение с животными',
                    termRef: 'ttgamer.ui.sheet.v5.skills.animalKen',
                }),
                createElement(TermLabel, { text: 'Кулинария' }),
                createElement('input', { 'aria-label': 'Специализация' }),
                createElement('button', { type: 'button' }, 'dots')
            )
        )
    );
}

const label = (text: string) => {
    const element = screen.getByText(text);
    return element.closest<HTMLElement>('.term-label') ?? element;
};
const tooltips = () => document.querySelectorAll('[role="tooltip"]');

describe('TermHintProvider', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setTestLocale('ru');
        useReaderPrefsStore.setState({ gameTerms: 'ru' });
    });
    afterEach(() => {
        vi.useRealTimers();
        cleanup();
        setTestLocale('en');
    });

    it('opens on hover after a delay and shows the English name', () => {
        sheet();
        fireEvent.pointerOver(label('Воровство'), { pointerType: 'mouse' });
        expect(tooltips()).toHaveLength(0);
        act(() => vi.advanceTimersByTime(300));
        expect(screen.getByRole('tooltip').textContent).toBe('Larceny');
    });

    it('opens on focus and closes on Escape', () => {
        sheet();
        act(() => label('Воровство').focus());
        act(() => vi.advanceTimersByTime(0));
        expect(screen.getByRole('tooltip').textContent).toBe('Larceny');
        fireEvent.keyDown(label('Воровство'), { key: 'Escape' });
        act(() => vi.advanceTimersByTime(0));
        expect(tooltips()).toHaveLength(0);
    });

    it('toggles on tap and never opens from inputs or buttons', () => {
        sheet();
        fireEvent.pointerDown(screen.getByRole('textbox'), { pointerType: 'touch' });
        fireEvent.click(screen.getByRole('textbox'));
        fireEvent.click(screen.getByText('dots'));
        act(() => vi.advanceTimersByTime(500));
        expect(tooltips()).toHaveLength(0);
        fireEvent.pointerDown(label('Воровство'), { pointerType: 'touch' });
        fireEvent.click(label('Воровство'));
        act(() => vi.advanceTimersByTime(0));
        expect(screen.getByRole('tooltip').textContent).toBe('Larceny');
        fireEvent.pointerDown(label('Воровство'), { pointerType: 'touch' });
        fireEvent.click(label('Воровство'));
        act(() => vi.advanceTimersByTime(0));
        expect(tooltips()).toHaveLength(0);
    });

    it('keeps a single popover across labels', () => {
        sheet();
        for (const text of ['Воровство', 'Скрытность', 'Обращение с животными']) {
            act(() => label(text).focus());
            act(() => vi.advanceTimersByTime(0));
        }
        expect(tooltips()).toHaveLength(1);
        expect(tooltips()[0].textContent).toBe('Animal KenОбращение с животными');
    });

    it('marks only hint-bearing labels as focusable with a description', () => {
        sheet();
        const larceny = label('Воровство');
        expect(larceny.getAttribute('tabindex')).toBe('0');
        const description = document.getElementById(larceny.getAttribute('aria-describedby')!);
        expect(description?.textContent).toBe('Larceny');
        const custom = screen.getByText('Кулинария');
        expect(custom.hasAttribute('tabindex')).toBe(false);
        expect(custom.hasAttribute('data-term-ref')).toBe(false);
    });

    it('swaps label and hint in the English terms mode, and drops hints in plain mode', () => {
        useReaderPrefsStore.setState({ gameTerms: 'en' });
        const view = sheet();
        expect(screen.getByText('Larceny')).toBeTruthy();
        act(() => label('Larceny').focus());
        act(() => vi.advanceTimersByTime(0));
        expect(screen.getByRole('tooltip').textContent).toBe('Воровство');
        view.unmount();
        useReaderPrefsStore.setState({ gameTerms: 'ru-plain' });
        sheet();
        expect(label('Воровство').hasAttribute('tabindex')).toBe(false);
    });

    it('renders plain labels in English', () => {
        setTestLocale('en');
        sheet();
        expect(label('Воровство').hasAttribute('data-term-ref')).toBe(false);
    });
});
