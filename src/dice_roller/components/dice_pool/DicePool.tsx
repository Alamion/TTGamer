import { useState } from 'react';
import { clsx } from 'clsx';
import NotationInput from './NotationInput';
import RollControls from './RollControls';
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

    return (
        <div className="flex flex-col gap-3">
            <div className="flex gap-0.5">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(activeTab !== tab.id ? tab.id : '')}
                        className={clsx(
                            'flex-1 py-1.5 px-2 text-xs font-semibold tracking-wide',
                            'border-b-2 transition-opacity cursor-pointer',
                            activeTab === tab.id
                                ? 'opacity-100 border-b-primary'
                                : 'opacity-60 border-b-transparent hover:opacity-85'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'standard' && <StandardTab />}
            {activeTab === 'dnd' && <DndTab />}
            {activeTab === 'wod' && <WodTab />}

            <NotationInput />
            <RollControls />
        </div>
    );
}
