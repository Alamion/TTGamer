import { useCallback } from 'react';
import { clsx } from 'clsx';
import { Dices } from 'lucide-react';
import { useDiceRollerStore } from '../dice_roller/store/diceRollerStore';

export default function NavbarDiceRoller() {
    const togglePanel = useDiceRollerStore((s) => s.togglePanel);
    const notationInput = useDiceRollerStore((s) => s.notationInput);
    const setNotationInput = useDiceRollerStore((s) => s.setNotationInput);
    const roll = useDiceRollerStore((s) => s.roll);

    const handleClick = useCallback(() => {
        roll(notationInput);
        setNotationInput('');
    }, [setNotationInput, notationInput, roll]);

    const handleContextMenu = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setNotationInput('');
        },
        [setNotationInput]
    );

    const hasNotation = notationInput.trim().length > 0;

    return (
        <div className="tailwind-root">
            <div
                className={clsx(
                    'flex items-center rounded-lg border-2 transition-colors',
                    hasNotation ? 'border-primary' : 'border-transparent'
                )}
            >
                <button
                    onClick={togglePanel}
                    aria-label="Toggle dice roller"
                    className="inline-flex items-center justify-center p-2 border-transparent rounded-md cursor-pointer bg-transparent text-textSecondary hover:border-primary hover:text-primary transition-colors"
                >
                    <Dices size={18} />
                </button>
                {hasNotation && (
                    <button
                        onClick={handleClick}
                        onContextMenu={handleContextMenu}
                        className="bg-transparent border-none cursor-pointer p-2 font-mono text-sm truncate max-w-[120px] text-textPrimary hover:text-primary transition-colors"
                        title="Left click to roll, right click to clear"
                    >
                        {notationInput}
                    </button>
                )}
            </div>
        </div>
    );
}
