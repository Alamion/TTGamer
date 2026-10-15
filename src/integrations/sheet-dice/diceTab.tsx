import { translate } from '@docusaurus/Translate';
import { DicePanelContent } from '@site/src/dice_roller/components/DiceRollerPanel';
import { useDiceRollerStore } from '@site/src/dice_roller/store/diceRollerStore';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { reportSheetIssue } from '@site/src/sheet_manager/diagnostics';
import {
    closeTab,
    isToolOpen,
    openTool,
    usePaneStore,
} from '@site/src/sheet_manager/features/sheet/panes/paneStore';
import { registerTabKind, toolKey } from '@site/src/sheet_manager/features/sheet/panes/tabKeys';
import { Component, type ReactNode, useEffect } from 'react';

/** Gives the panel back to its slide-in place when it cannot be drawn as a tab. */
class DiceTabBoundary extends Component<{ children: ReactNode; onFail: () => void }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: unknown) {
        reportSheetIssue({
            code: 'dice-tab-unavailable',
            message: `The dice panel could not be drawn as a tab: ${String(error)}`,
        });
        this.props.onFail();
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}

/**
 * The dice panel as a tool of the sheet's layout (spec 036, D6). It connects the dice module and
 * the sheet: while the sheet page is mounted it claims the panel from the slide-in host
 * (`claimPanelHost`) and registers the `t:dice` tab; the navbar's toggle (`panelOpen`) opens and
 * closes the tab, and closing the tab closes the panel. Off the sheet page nothing claims it, so
 * the panel slides in as before. A tab that cannot be drawn gives the panel back and reports
 * `dice-tab-unavailable`.
 */
export function useDiceTab(): void {
    useEffect(() => {
        const dice = useDiceRollerStore;
        let release: (() => void) | null = dice.getState().claimPanelHost();
        const giveBack = () => {
            release?.();
            release = null;
        };
        const unregister = registerTabKind('dice', {
            title: () => translate(uiMessages.dice.panel.title),
            closeLabel: () => translate(uiMessages.dice.panel.close),
            render: () => (
                <DiceTabBoundary onFail={giveBack}>
                    <DicePanelContent />
                </DiceTabBoundary>
            ),
            onClose: () => dice.setState({ panelOpen: false }),
        });
        const openNow = () => isToolOpen(usePaneStore.getState(), 'dice');
        // A tab kept from the last visit opens the panel; an open panel opens the tab.
        if (openNow()) dice.setState({ panelOpen: true });
        else if (dice.getState().panelOpen) openTool('dice');
        const unsubscribe = dice.subscribe((state, previous) => {
            if (state.panelOpen === previous.panelOpen || !release) return;
            if (state.panelOpen) openTool('dice');
            else if (openNow()) closeTab(toolKey('dice'));
        });
        return () => {
            unsubscribe();
            unregister();
            giveBack();
        };
    }, []);
}
