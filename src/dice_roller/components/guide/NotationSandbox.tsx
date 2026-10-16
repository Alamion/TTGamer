import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';
import { Dices } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { diagnoseNotation } from '../../dice-logic/dice-parser';
import { rollDices } from '../../dice-logic/dice-roller';
import type { RollResult } from '../../dice-logic/types';
import { notationDiagnosticMessage } from '../dice_pool/notationDiagnosticMessage';
import { RollBreakdown } from './RollBreakdown';

const sandbox = uiMessages.dice.guide.sandbox;

/**
 * A notation field for the guide: the panel's own check (same parser, same messages) and a roll
 * shown die by die. Rolls stay on the page, like inline rolls.
 */
export function NotationSandbox({
    initial = '4d6dl1',
    examples = [],
}: {
    initial?: string;
    examples?: readonly string[];
}) {
    const [notation, setNotation] = useState(initial);
    const [result, setResult] = useState<RollResult | null>(null);
    const inputId = useId();
    const errorId = useId();
    const diagnostic = useMemo(() => diagnoseNotation(notation), [notation]);
    const empty = notation.trim().length === 0;
    const valid = !empty && diagnostic === null;

    const roll = (value = notation) => {
        if (value.trim().length === 0 || diagnoseNotation(value)) return;
        setResult(rollDices(value.trim()));
    };

    return (
        <div className="tailwind-root">
            <div className="my-4 flex flex-col gap-3 rounded-lg border border-border bg-bgSurface p-3">
                <label htmlFor={inputId} className="text-sm font-semibold text-textPrimary">
                    {translate(sandbox.label)}
                </label>
                <div className="flex gap-2">
                    <input
                        id={inputId}
                        type="text"
                        value={notation}
                        spellCheck={false}
                        autoComplete="off"
                        onChange={(event) => setNotation(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') roll();
                        }}
                        aria-invalid={!empty && !valid}
                        aria-describedby={errorId}
                        className={clsx(
                            'min-w-0 flex-1 rounded-sm border bg-bgBase px-2 py-1.5 font-mono text-sm text-textPrimary focus:border-primary focus:outline-hidden',
                            empty
                                ? 'border-border'
                                : valid
                                  ? 'border-green-500/60'
                                  : 'border-red-500/60'
                        )}
                    />
                    <button
                        type="button"
                        onClick={() => roll()}
                        disabled={!valid}
                        className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-primary-on hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Dices size={16} aria-hidden="true" />
                        {translate(uiMessages.dice.pool.controls.roll)}
                    </button>
                </div>
                <div id={errorId} role="status" aria-live="polite" className="text-xs">
                    {diagnostic && !empty ? (
                        <>
                            <span className="block text-red-500">
                                {notationDiagnosticMessage(diagnostic)}
                            </span>
                            <code
                                aria-hidden="true"
                                className="block whitespace-pre-wrap break-all font-mono text-textSecondary"
                            >
                                {notation.slice(0, diagnostic.offset)}
                                <mark className="rounded-xs bg-red-500/30 text-textPrimary">
                                    {diagnostic.length > 0
                                        ? notation.slice(
                                              diagnostic.offset,
                                              diagnostic.offset + diagnostic.length
                                          )
                                        : '‸'}
                                </mark>
                                {notation.slice(diagnostic.offset + diagnostic.length)}
                            </code>
                        </>
                    ) : (
                        <span className="text-textSecondary">{translate(sandbox.hint)}</span>
                    )}
                </div>
                {examples.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-textSecondary">
                        <span>{translate(sandbox.examples)}:</span>
                        {examples.map((example) => (
                            <button
                                key={example}
                                type="button"
                                onClick={() => {
                                    setNotation(example);
                                    roll(example);
                                }}
                                className="rounded-sm border border-border bg-bgBase px-1.5 py-0.5 font-mono text-textPrimary hover:border-primary"
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                )}
                {result && (
                    <div
                        aria-live="polite"
                        className="rounded-md border border-border bg-bgBase p-3"
                    >
                        <RollBreakdown result={result} />
                    </div>
                )}
            </div>
        </div>
    );
}
