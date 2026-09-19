// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, Fragment } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useReaderPrefsStore } from '../../src/shared/store/readerPrefsStore';
import {
    GameTermsMenu,
    TermHintNotice,
} from '../../src/sheet_manager/features/sheet/shell/GameTermsMenu';
import { setTestLocale } from '../stubs/testLocale';

const view = () =>
    render(
        createElement(Fragment, null, createElement(GameTermsMenu), createElement(TermHintNotice))
    );
const notice = () => screen.queryByRole('note');

describe('book-term hint notice and game terms menu', () => {
    beforeEach(() => {
        setTestLocale('ru');
        useReaderPrefsStore.setState({ gameTerms: 'ru', termHintNoticeDismissed: false });
    });
    afterEach(() => {
        cleanup();
        setTestLocale('en');
    });

    it('shows the tip once in Russian and remembers the dismissal', () => {
        view();
        expect(notice()).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Понятно' }));
        expect(notice()).toBeNull();
        expect(useReaderPrefsStore.getState().termHintNoticeDismissed).toBe(true);
    });

    it('offers to show the tip again from the menu', () => {
        useReaderPrefsStore.setState({ termHintNoticeDismissed: true });
        view();
        expect(notice()).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Показать подсказку снова' }));
        expect(notice()).not.toBeNull();
    });

    it('switches the game terms mode and hides the tip without hints', () => {
        view();
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ru-plain' } });
        expect(useReaderPrefsStore.getState().gameTerms).toBe('ru-plain');
        expect(notice()).toBeNull();
    });

    it('renders nothing in English', () => {
        setTestLocale('en');
        const { container } = view();
        expect(container.textContent).toBe('');
    });
});
