// @vitest-environment happy-dom

import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { LayoutSketch } from '@site/src/sheet_manager/docsEmbeds';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(cleanup);

const strips = () => screen.getAllByRole('tablist');
const tabsOf = (strip: HTMLElement) =>
    within(strip)
        .getAllByRole('tab')
        .map((tab) => tab.textContent);

const dataTransfer = { setData: () => {}, getData: () => '', effectAllowed: 'move' };
const DICE = uiMessages.dice.panel.title.message;

/** A drag event at a point: happy-dom's DragEvent drops the coordinates. */
function dragAt(type: 'dragover' | 'drop', target: HTMLElement, clientX: number, clientY: number) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
    fireEvent(target, event);
}

describe('guide layout sketch', () => {
    it('splits and moves the picked tab with the tab menu buttons', () => {
        render(createElement(LayoutSketch));
        expect(strips().map(tabsOf)).toEqual([
            ['Jax Vorn', 'Lena Varga'],
            ['Wampa', DICE],
        ]);
        fireEvent.click(screen.getByRole('button', { name: 'Split down' }));
        expect(strips().map(tabsOf)).toEqual([['Jax Vorn'], ['Lena Varga'], ['Wampa', DICE]]);

        fireEvent.click(screen.getByRole('button', { name: 'Move to next group' }));
        expect(strips().map(tabsOf)).toEqual([['Jax Vorn'], ['Wampa', 'Lena Varga', DICE]]);

        fireEvent.click(screen.getByRole('button', { name: 'Start again' }));
        expect(strips()).toHaveLength(2);
    });

    it('splits a group when a tab is dropped near its edge, and moves it in the middle', () => {
        render(createElement(LayoutSketch));
        const target = strips()[1]!.parentElement!;
        target.getBoundingClientRect = () =>
            ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }) as DOMRect;

        fireEvent.dragStart(screen.getByRole('tab', { name: 'Jax Vorn' }), { dataTransfer });
        dragAt('dragover', target, 195, 100);
        dragAt('drop', target, 195, 100);
        expect(strips().map(tabsOf)).toEqual([['Lena Varga'], ['Wampa', DICE], ['Jax Vorn']]);

        const middle = strips()[1]!.parentElement!;
        middle.getBoundingClientRect = target.getBoundingClientRect;
        fireEvent.dragStart(screen.getByRole('tab', { name: 'Lena Varga' }), { dataTransfer });
        dragAt('dragover', middle, 100, 100);
        dragAt('drop', middle, 100, 100);
        expect(strips().map(tabsOf)).toEqual([['Wampa', 'Lena Varga', DICE], ['Jax Vorn']]);
    });
});
