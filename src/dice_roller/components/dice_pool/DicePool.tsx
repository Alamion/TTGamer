import { translate } from '@docusaurus/Translate';
import { type UiMessageDescriptor, uiMessages } from '@site/src/i18n/generated/uiMessages';
import { clsx } from 'clsx';

import { useDiceRollerStore } from '../../store/diceRollerStore';
import type { DicePanelTab } from '../../utils/rollReader';
import DndTab from './DiceTabDnd';
import StandardTab from './DiceTabStandard';
import WodTab from './DiceTabWod';
import NotationInput from './NotationInput';
import RollControls from './RollControls';

/** Tab labels: a message to translate, or a system name shown verbatim in every locale. */
const TABS: { id: DicePanelTab; label: UiMessageDescriptor | string }[] = [
    { id: 'standard', label: uiMessages.dice.pool.tabs.standard },
    { id: 'dnd', label: uiMessages.dice.pool.tabs.dnd },
    { id: 'wod', label: 'WoD' },
];

export default function DicePool() {
    const activeTab = useDiceRollerStore((s) => s.panelTab);
    const setActiveTab = useDiceRollerStore((s) => s.setPanelTab);

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
                        {typeof tab.label === 'string' ? tab.label : translate(tab.label)}
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
