// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@site/src/i18n/generated/bookTerms', () => ({
    bookTerms: {
        'ttgamer.ui.sheet.v5.skills.animalKen': { en: 'Animal Ken', ruShort: 'Обр. с живот.' },
        'ttgamer.ui.sheet.v5.skills.larceny': { en: 'Larceny' },
    },
}));

import { useReaderPrefsStore } from '../../src/shared/store/readerPrefsStore';
import { TermHintProvider } from '../../src/sheet_manager/components/terms/TermHintProvider';
import { TermLabel } from '../../src/sheet_manager/components/terms/TermLabel';
import { setTestLocale } from '../stubs/testLocale';

const renderLabel = (text: string, termRef: string) =>
    render(createElement(TermHintProvider, null, createElement(TermLabel, { text, termRef })));

describe('glossary short forms', () => {
    afterEach(() => {
        cleanup();
        setTestLocale('en');
    });

    it('renders the full and the hidden-from-readers short form, and hints the full name', () => {
        setTestLocale('ru');
        useReaderPrefsStore.setState({ gameTerms: 'ru' });
        const { container } = renderLabel(
            'Обращение с животными',
            'ttgamer.ui.sheet.v5.skills.animalKen'
        );
        const label = container.querySelector('.term-label')!;
        expect(label.classList.contains('term-has-short')).toBe(true);
        expect(label.querySelector('.term-short')?.getAttribute('aria-hidden')).toBe('true');
        expect(label.getAttribute('data-term-detail')).toBe('Обращение с животными');
        const description = screen.getByText('Animal Ken, Обращение с животными', {
            ignore: false,
        });
        // Hidden, so the English name is announced as the description only, never as part of
        // the label's accessible name.
        expect(description.hasAttribute('hidden')).toBe(true);
        expect(label.getAttribute('aria-describedby')).toBe(description.id);
    });

    it('announces the English name once: as the description, not inside the label name', () => {
        setTestLocale('ru');
        useReaderPrefsStore.setState({ gameTerms: 'ru' });
        const { container } = renderLabel('Воровство', 'ttgamer.ui.sheet.v5.skills.larceny');
        const label = container.querySelector('.term-label') as HTMLElement;
        const description = document.getElementById(label.getAttribute('aria-describedby')!)!;
        // The description carries the English name. It must stay hidden: a visible (even sr-only)
        // copy joins the label's own accessible name, and the reader says "Larceny" twice.
        expect(description.textContent).toBe('Larceny');
        expect(description.hasAttribute('hidden')).toBe(true);
        const readable = [...label.children]
            .filter((child) => !child.hasAttribute('hidden') && child.ariaHidden !== 'true')
            .map((child) => child.textContent);
        expect(readable).toEqual(['Воровство']);
    });

    it('adds no short form when the term has none', () => {
        setTestLocale('ru');
        const { container } = renderLabel('Воровство', 'ttgamer.ui.sheet.v5.skills.larceny');
        expect(container.querySelector('.term-short')).toBeNull();
        expect(container.querySelector('.term-has-short')).toBeNull();
    });
});
