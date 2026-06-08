import { Dices } from 'lucide-react';
import { useDiceRollerStore } from '../dice_roller/store/diceRollerStore';

export default function NavbarDiceRoller() {
    const togglePanel = useDiceRollerStore((s) => s.togglePanel);

    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
                onClick={togglePanel}
                aria-label="Toggle dice roller"
                className="button button--sm button--outline button--outline-hover-primary"
                style={{ display: 'flex' }}
            >
                <Dices size={18} />
            </button>
        </div>
    );
}
