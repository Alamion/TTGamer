import { memo } from 'react';
import type { DiceConfig } from '../dice-config';

interface DiceButtonProps {
    config: DiceConfig;
    primaryColor: string;
    secondaryColor: string;
    onAdd: (config: DiceConfig) => void;
    onRemove: (config: DiceConfig, e: React.MouseEvent) => void;
}

const DiceButton = memo(function DiceButton({
    config,
    primaryColor,
    secondaryColor,
    onAdd,
    onRemove,
}: DiceButtonProps) {
    return (
        <button
            type="button"
            onClick={() => onAdd(config)}
            onContextMenu={(e) => onRemove(config, e)}
            className="flex items-center justify-center p-1.5 rounded-md cursor-pointer
                border border-transparent transition-all
                hover:bg-bgBase/40 hover:border-border active:scale-95"
            title={`Left-click: Add ${config.notation} | Right-click: Remove ${config.notation}`}
        >
            <config.Component
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                value={config.label}
                style={{ width: '60px', height: '60px', pointerEvents: 'none' }}
            />
        </button>
    );
});

export default DiceButton;
