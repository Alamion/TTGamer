import { useState, useEffect, useRef } from 'react';
import { Info, Star } from 'lucide-react';
import { validateNotation } from '../../dice-logic';
import { useDiceRollerStore } from '../../store/diceRollerStore';

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

    const notationValid = debouncedInput.length === 0 || validateNotation(debouncedInput);
    const starred =
        notationInput.trim().length > 0 && favorites.some((f) => f.notation === notationInput);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && notationValid && notationInput.trim()) {
            const toRoll = notationInput.trim();
            roll(toRoll);
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
                    placeholder="Roll notation (e.g. 2d6+3 or 4d20kh3)"
                    value={notationInput}
                    onChange={(e) => setNotationInput(e.target.value)}
                    onKeyDown={handleKeyDown}
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
                        title="View dice notation reference"
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
                        title={starred ? 'Remove from favorites' : 'Save as favorite'}
                    >
                        <Star size={14} fill={starred ? 'currentColor' : 'none'} />
                    </button>
                )}
            </div>
            {notationInput.length > 0 && !notationValid && (
                <span className="text-xs text-red-500 mt-0.5 block">Invalid notation</span>
            )}
        </div>
    );
}
