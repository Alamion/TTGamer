import { translate } from '@docusaurus/Translate';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { Info, Star } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { diagnoseNotation } from '../../dice-logic/dice-parser';
import { currentPanelOrigin, useDiceRollerStore } from '../../store/diceRollerStore';
import { notationDiagnosticMessage } from './notationDiagnosticMessage';

export default function NotationInput() {
    const notationInput = useDiceRollerStore((s) => s.notationInput);
    const setNotationInput = useDiceRollerStore((s) => s.setNotationInput);
    const roll = useDiceRollerStore((s) => s.roll);
    const favorites = useDiceRollerStore((s) => s.favorites);
    const toggleFavorite = useDiceRollerStore((s) => s.toggleFavorite);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [debouncedInput, setDebouncedInput] = useState('');

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(
            () => setDebouncedInput(notationInput),
            notationInput.length === 0 ? 0 : 300
        );
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [notationInput]);

    const errorId = useId();
    const diagnostic = useMemo(() => diagnoseNotation(debouncedInput), [debouncedInput]);
    const notationValid = debouncedInput.trim().length === 0 || diagnostic === null;
    const errorMessage = diagnostic ? notationDiagnosticMessage(diagnostic) : '';
    const starred =
        notationInput.trim().length > 0 && favorites.some((f) => f.notation === notationInput);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && notationValid && notationInput.trim()) {
            const toRoll = notationInput.trim();
            roll(toRoll, { origin: currentPanelOrigin('enter') });
            setNotationInput('');
        }
    };

    return (
        <div>
            <div className="relative flex items-center">
                <input
                    data-dr-notation-input
                    type="text"
                    className={`w-full pr-20 py-1.5 px-2 text-sm rounded border
                        bg-bgBase text-textPrimary
                        focus:border-primary focus:outline-none
                        ${
                            notationInput.length > 0
                                ? notationValid
                                    ? 'border-green-500/60'
                                    : 'border-red-500/60'
                                : 'border-border'
                        }`}
                    placeholder={translate(uiMessages.dice.pool.notation.placeholder)}
                    value={notationInput}
                    onChange={(e) => setNotationInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    aria-invalid={notationInput.length > 0 && !notationValid}
                    aria-describedby={
                        notationInput.length > 0 && !notationValid ? errorId : undefined
                    }
                />
                {notationInput.length > 0 && (
                    <span
                        className={`absolute right-16 text-sm font-bold pointer-events-none
                            ${notationValid ? 'text-green-500' : 'text-red-500'}`}
                    >
                        {notationValid ? '\u2713' : '\u2717'}
                    </span>
                )}
                {notationInput.length > 0 && !notationValid && (
                    <a
                        href="https://dice-roller.github.io/documentation/guide/notation/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-10 flex items-center justify-center w-5 h-5
                            text-textSecondary hover:text-textPrimary transition-colors"
                        title={translate(uiMessages.dice.pool.notation.reference)}
                    >
                        <Info size={14} />
                    </a>
                )}
                {notationInput.length > 0 && notationValid && (
                    <button
                        type="button"
                        onClick={() => toggleFavorite(notationInput)}
                        className={`absolute right-10 flex items-center justify-center w-5 h-5 transition-colors
                            ${starred ? 'text-yellow-500' : 'text-textSecondary hover:text-textPrimary'}`}
                        title={translate(
                            starred
                                ? uiMessages.dice.pool.notation.removeFavorite
                                : uiMessages.dice.pool.notation.saveFavorite
                        )}
                    >
                        <Star size={14} fill={starred ? 'currentColor' : 'none'} />
                    </button>
                )}
            </div>
            <div id={errorId} role="status" aria-live="polite" className="text-xs mt-0.5">
                {notationInput.length > 0 && diagnostic && (
                    <>
                        <span className="text-red-500 block">{errorMessage}</span>
                        <code
                            aria-hidden="true"
                            className="block font-mono text-textSecondary whitespace-pre-wrap break-all"
                        >
                            {debouncedInput.slice(0, diagnostic.offset)}
                            <mark className="bg-red-500/30 text-textPrimary rounded-sm">
                                {diagnostic.length > 0
                                    ? debouncedInput.slice(
                                          diagnostic.offset,
                                          diagnostic.offset + diagnostic.length
                                      )
                                    : '\u2038'}
                            </mark>
                            {debouncedInput.slice(diagnostic.offset + diagnostic.length)}
                        </code>
                    </>
                )}
            </div>
        </div>
    );
}
