import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { SlidePanel } from '@site/src/shared/components/SlidePanel';

import { useDiceRollerStore } from '../store/diceRollerStore';
import DicePool from './dice_pool/DicePool';
import RollHistory from './RollHistory';

export default function DiceRollerPanel() {
    const panelOpen = useDiceRollerStore((s) => s.panelOpen);
    const togglePanel = useDiceRollerStore((s) => s.togglePanel);

    return (
        <SlidePanel
            open={panelOpen}
            onClose={togglePanel}
            title={translate(uiMessages.dice.panel.title)}
            className="w-full sm:max-w-sm"
            closeAriaLabel={translate(uiMessages.dice.panel.close)}
        >
            <div className="flex flex-col gap-4 px-4 py-3">
                <DicePool />
                <div className="h-px bg-border flex-shrink-0" />
                <RollHistory />
            </div>
        </SlidePanel>
    );
}
