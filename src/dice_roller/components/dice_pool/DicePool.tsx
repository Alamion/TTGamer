import { useState, useCallback, useEffect, useRef } from 'react';
import { Info, Star } from 'lucide-react';
import { validateNotation } from '../../dice-logic';
import { useDiceRollerStore } from '../../store/diceRollerStore';
import DiceRollerSettingsModal from '../DiceRollerSettingsModal';
import StandardTab from './DiceTabStandard';
import DndTab from './DiceTabDnd';
import WodTab from './DiceTabWod';

type DiceTab = 'standard' | 'dnd' | 'wod' | '';

const TABS: { id: DiceTab; label: string }[] = [
    { id: 'standard', label: 'Standard' },
    { id: 'dnd', label: 'D&D' },
    { id: 'wod', label: 'WoD' },
];

export default function DicePool() {
    const [activeTab, setActiveTab] = useState<DiceTab>('standard');
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
            () => {
                setDebouncedInput(notationInput);
            },
            notationInput.length === 0 ? 0 : 300
        );
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [notationInput]);

    const notationValid = debouncedInput.length === 0 || validateNotation(debouncedInput);
    const starred =
        notationInput.trim().length > 0 && favorites.some((f) => f.notation === notationInput);

    const clearNotation = useCallback(() => {
        setNotationInput('');
    }, [setNotationInput]);

    const rollNotation = useCallback(() => {
        const toRoll = notationInput.trim();
        if (!toRoll) return;
        roll(toRoll);
        setNotationInput('');
    }, [notationInput, roll, setNotationInput]);

    const canClear = notationInput.trim().length > 0;
    const canRoll = notationInput.trim().length > 0;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex gap-0.5">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(activeTab !== tab.id ? tab.id : '')}
                        className={`flex-1 py-1.5 px-2 text-xs font-semibold tracking-wide
                            border-b-2 transition-opacity cursor-pointer
                            ${
                                activeTab === tab.id
                                    ? 'opacity-100 border-b-primary'
                                    : 'opacity-60 border-b-transparent hover:opacity-85'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'standard' && <StandardTab />}
            {activeTab === 'dnd' && <DndTab />}
            {activeTab === 'wod' && <WodTab />}

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
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && notationValid && notationInput.trim()) {
                                rollNotation();
                            }
                        }}
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

            <div className="flex items-center gap-2 pt-2 border-t border-border">
                <DiceRollerSettingsModal />
                <button
                    type="button"
                    onClick={clearNotation}
                    disabled={!canClear}
                    className="flex-1 py-1.5 px-3 text-xs font-semibold rounded border border-border
                        bg-bgSurface text-textPrimary cursor-pointer
                        hover:bg-bgBase/50 transition-colors
                        disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Clear
                </button>
                <button
                    type="button"
                    onClick={rollNotation}
                    disabled={!canRoll}
                    className="flex-[2] py-1.5 px-3 text-xs font-semibold rounded border border-border
                        bg-primary text-primary-on cursor-pointer
                        hover:bg-primary-hover transition-colors
                        disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Roll
                </button>
            </div>
        </div>
    );
}
