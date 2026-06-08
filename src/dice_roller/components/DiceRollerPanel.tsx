import { useDiceRollerStore } from '../store/diceRollerStore';
import DicePool from './dice_pool/DicePool';
import RollHistory from './RollHistory';

export default function DiceRollerPanel() {
    const panelOpen = useDiceRollerStore((s) => s.panelOpen);
    const togglePanel = useDiceRollerStore((s) => s.togglePanel);

    if (!panelOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={togglePanel} />
            <div
                className="fixed top-0 right-0 h-full w-full sm:max-w-sm z-50
                    bg-bgSurface border-l border-border shadow-xl
                    flex flex-col overflow-hidden"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h2 className="text-sm font-bold tracking-wide uppercase text-textPrimary">
                        Dice Roller
                    </h2>
                    <button
                        type="button"
                        onClick={togglePanel}
                        className="flex items-center justify-center w-7 h-7 rounded
                            hover:bg-bgBase/50 transition-colors text-textSecondary
                            hover:text-textPrimary"
                        aria-label="Close dice roller"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 flex flex-col min-h-0 px-4 py-3 gap-4">
                    <DicePool />
                    <div className="h-px bg-border flex-shrink-0" />
                    <RollHistory />
                </div>
            </div>
        </>
    );
}
