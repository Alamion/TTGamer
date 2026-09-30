import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { useSheetDiceActions } from '@site/src/integrations/sheet-dice/useSheetDiceActions';
import { clsx } from 'clsx';
import { Dices } from 'lucide-react';
import type { MouseEvent } from 'react';

import { useDocumentRollSource } from '../../hooks/useDocumentSource';

export type TraitDiceRoll = (
    value: number,
    specialization: boolean | null,
    experienced: boolean | null,
    practiced: boolean | null
) => string | undefined;

export const statFlagSizeClasses = {
    sm: 'w-3 h-3 text-[8px]',
    md: 'w-4 h-4 text-[10px]',
    lg: 'w-5 h-5 text-xs',
} as const;

export const statDotPixels = { sm: 12, md: 16, lg: 20 } as const;

interface StatDiceButtonProps {
    onDiceRoll: TraitDiceRoll;
    value: number;
    specialization?: boolean | null;
    experienced?: boolean | null;
    practiced?: boolean | null;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    statLabel?: string;
    characterName?: string;
}

/** The die of a trait row: a click queues the stat's pool, the context menu rolls it at once. */
export function StatDiceButton({
    onDiceRoll,
    value,
    specialization = null,
    experienced = null,
    practiced = null,
    disabled = false,
    size = 'md',
    statLabel,
    characterName,
}: StatDiceButtonProps) {
    const rollSource = useDocumentRollSource();
    const { queueNotation, rollImmediately } = useSheetDiceActions({
        characterName,
        statLabel,
        rollSource,
    });
    const notation = () =>
        disabled ? undefined : onDiceRoll(value, specialization, experienced, practiced);

    return (
        <button
            type="button"
            onClick={() => {
                const pool = notation();
                if (pool) queueNotation(pool);
            }}
            onContextMenu={(event: MouseEvent) => {
                event.preventDefault();
                const pool = notation();
                if (pool) void rollImmediately(pool);
            }}
            disabled={disabled}
            className={clsx(
                'rounded font-bold transition-all duration-200 flex items-center justify-center',
                statFlagSizeClasses[size],
                'text-textSecondary opacity-40 hover:opacity-70',
                disabled && 'cursor-not-allowed'
            )}
            title={translate(uiMessages.sheet.controls.statDot.diceTitle)}
            aria-label={
                statLabel
                    ? translate(uiMessages.sheet.controls.statDot.rollStat, { stat: statLabel })
                    : translate(uiMessages.sheet.controls.statDot.roll)
            }
        >
            <Dices size={statDotPixels[size] - 2} />
        </button>
    );
}
