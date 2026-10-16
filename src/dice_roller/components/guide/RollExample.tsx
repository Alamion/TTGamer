import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Dices } from 'lucide-react';
import { useState } from 'react';

import { rollDices } from '../../dice-logic/dice-roller';
import type { RollResult } from '../../dice-logic/types';
import { RollBreakdown } from './RollBreakdown';

/**
 * A notation in the guide that rolls where it stands and shows every die; like `InlineRoll`, the
 * roll stays on the page (no history, no sharing).
 */
export function RollExample({ notation }: { notation: string }) {
    const [result, setResult] = useState<RollResult | null>(null);
    return (
        <span className="tailwind-root">
            <span className="inline-flex flex-col items-start gap-2 py-0.5">
                <button
                    type="button"
                    onClick={() => setResult(rollDices(notation))}
                    aria-label={translate(
                        result
                            ? uiMessages.dice.guide.rollAgain
                            : uiMessages.dice.guide.rollExample,
                        { notation }
                    )}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-bgBase px-2 py-0.5 font-mono text-sm text-textPrimary hover:border-primary"
                >
                    <Dices size={14} aria-hidden="true" className="opacity-60" />
                    {notation}
                </button>
                {result && (
                    <span aria-live="polite" className="block">
                        <RollBreakdown result={result} />
                    </span>
                )}
            </span>
        </span>
    );
}
