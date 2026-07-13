import { SlidePanel } from '../../shared/components/SlidePanel';
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
            title="Dice Roller"
            className="w-full sm:max-w-sm"
            closeAriaLabel="Close dice roller"
        >
            <div className="flex flex-col gap-4 px-4 py-3">
                <DicePool />
                <div className="h-px bg-border flex-shrink-0" />
                <RollHistory />
            </div>
        </SlidePanel>
    );
}
