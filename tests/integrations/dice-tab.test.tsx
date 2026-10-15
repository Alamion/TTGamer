// @vitest-environment happy-dom
import DiceRollerPanel from '@site/src/dice_roller/components/DiceRollerPanel';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { useDiceTab } from '@site/src/integrations/sheet-dice/diceTab';
import { openKeys } from '@site/src/sheet_manager/features/sheet/panes/layoutTree';
import { closeTab, usePaneStore } from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { tabKindOf } from '@site/src/sheet_manager/features/sheet/panes/tabKeys';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takeSheetIssues } from '../setup/sheetIssues';
import { resetDocuments, seedDocuments } from '../sheet_manager/helpers/documentsWindow';
import { resetLayout } from '../sheet_manager/helpers/panes';

function SheetPage() {
    useDiceTab();
    return null;
}

const slidePanel = () => screen.queryByRole('complementary', { name: 'Dice Roller' });
const diceOpen = () => openKeys(usePaneStore.getState()).includes('t:dice');

beforeEach(() => {
    resetLayout();
    seedDocuments(['Ana'], { current: 'Ana' });
    useDiceRollerStore.setState({ panelOpen: false, panelHosts: 0 });
});
afterEach(() => {
    cleanup();
    resetDocuments();
});

describe('the dice panel as a tab of the sheet (spec 036, D6)', () => {
    it('slides in as before where no page claims it', () => {
        render(createElement(DiceRollerPanel));
        act(() => useDiceRollerStore.getState().togglePanel());
        expect(slidePanel()).toBeTruthy();
    });

    it('opens and closes as a tab on the sheet page, with no slide-in panel', () => {
        render(
            createElement('div', null, createElement(DiceRollerPanel), createElement(SheetPage))
        );
        act(() => useDiceRollerStore.getState().togglePanel());
        expect(slidePanel()).toBeNull();
        expect(diceOpen()).toBe(true);
        expect(usePaneStore.getState().lastSide['t:dice']).toBe('right');

        act(() => useDiceRollerStore.getState().togglePanel());
        expect(diceOpen()).toBe(false);

        act(() => useDiceRollerStore.getState().togglePanel());
        act(() => closeTab('t:dice'));
        expect(useDiceRollerStore.getState().panelOpen).toBe(false);
    });

    it('opens the panel for a tab kept from the last visit', () => {
        usePaneStore.setState({
            root: {
                type: 'split',
                direction: 'row',
                children: [
                    { type: 'group', id: 'A', tabs: ['d:Ana'], shown: 'd:Ana' },
                    { type: 'group', id: 'B', tabs: ['t:dice'], shown: 't:dice' },
                ],
                weights: [1, 1],
            },
        });
        render(createElement(SheetPage));
        expect(useDiceRollerStore.getState().panelOpen).toBe(true);
    });

    it('gives the panel back when the sheet page goes, and when the tab cannot be drawn', () => {
        const { unmount } = render(
            createElement('div', null, createElement(DiceRollerPanel), createElement(SheetPage))
        );
        expect(useDiceRollerStore.getState().panelHosts).toBe(1);
        unmount();
        expect(useDiceRollerStore.getState().panelHosts).toBe(0);
        expect(tabKindOf('t:dice')).toBeUndefined();

        render(createElement(SheetPage));
        const Broken = () => {
            throw new Error('no dice today');
        };
        const kind = tabKindOf('t:dice')!;
        const view = kind.render({ onClose: () => undefined }) as React.ReactElement<{
            onFail: () => void;
        }>;
        // The boundary of the tab, around something that cannot be drawn.
        render(
            createElement(view.type as never, { onFail: view.props.onFail }, createElement(Broken))
        );
        expect(useDiceRollerStore.getState().panelHosts).toBe(0);
        expect(takeSheetIssues().map(({ code }) => code)).toEqual(['dice-tab-unavailable']);
    });
});
