import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { SlidePanel } from '@site/src/shared/components/SlidePanel';

import { useDiceRollerStore } from '../store/diceRollerStore';
import DicePool from './dice_pool/DicePool';
import RollHistory from './RollHistory';

/** The panel's content: the pool over the history, wherever the panel is drawn. */
export function DicePanelContent() {
    return (
        <div className="flex flex-col gap-4 px-4 py-3">
            <DicePool />
            <div className="h-px bg-border shrink-0" />
            <RollHistory />
        </div>
    );
}

/**
 * The dice panel sliding in from the right, on every page; a page that shows the panel in a place
 * of its own claims it (`claimPanelHost`), and the slide-in panel then gives way.
 */
export default function DiceRollerPanel() {
    const panelOpen = useDiceRollerStore((s) => s.panelOpen);
    const togglePanel = useDiceRollerStore((s) => s.togglePanel);
    const hosted = useDiceRollerStore((s) => s.panelHosts > 0);
    if (hosted) return null;

    return (
        <SlidePanel
            open={panelOpen}
            onClose={togglePanel}
            title={translate(uiMessages.dice.panel.title)}
            className="w-full sm:max-w-sm"
            closeAriaLabel={translate(uiMessages.dice.panel.close)}
        >
            <DicePanelContent />
        </SlidePanel>
    );
}
