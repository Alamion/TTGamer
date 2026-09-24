import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { memo } from 'react';

import type { DiceConfig } from '../dice-config';

interface DiceButtonProps {
    config: DiceConfig;
    primaryColor: string;
    secondaryColor: string;
    onAdd: (config: DiceConfig) => void;
    onRemove: (config: DiceConfig, e: React.MouseEvent) => void;
    /** Accessible name prefix, e.g. "Special die", announced before the add/remove hint. */
    label?: string;
}

const DiceButton = memo(function DiceButton({
    config,
    primaryColor,
    secondaryColor,
    onAdd,
    onRemove,
    label,
}: DiceButtonProps) {
    const hint = translate(uiMessages.dice.pool.diceButtonTitle, { notation: config.notation });
    return (
        <button
            type="button"
            onClick={() => onAdd(config)}
            onContextMenu={(e) => onRemove(config, e)}
            className="flex items-center justify-center p-1.5 rounded-md cursor-pointer
                border border-transparent transition-all
                hover:bg-bgBase/40 hover:border-border active:scale-95"
            title={label ? `${label}. ${hint}` : hint}
            aria-label={label ? `${label}. ${hint}` : hint}
        >
            <config.Component
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                value={config.faceLabel}
                style={{ width: '60px', height: '60px', pointerEvents: 'none' }}
            />
        </button>
    );
});

export default DiceButton;
