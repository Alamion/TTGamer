import { CharacterContext } from '../context/CharacterContext';
import { AdvantagesBlock } from '../features/sheet/components/AdvantagesBlock';
import { AttributeBlock } from '../features/sheet/components/AttributeBlock';
import { BaseBlock } from '../features/sheet/components/BaseBlock';
import { BodyBlock } from '../features/sheet/components/BodyBlock';
import { ForceBlock } from '../features/sheet/components/ForceBlock';
import { HealthBlock } from '../features/sheet/components/HealthBlock';
import { OtherBlock } from '../features/sheet/components/OtherBlock';
import { SkillBlock } from '../features/sheet/components/SkillBlock';
import type { BaseCharacter, ConditionMark } from '../types/character';

interface CharacterViewerProps {
    character: BaseCharacter;
}

export function CharacterViewer({ character }: CharacterViewerProps) {
    return (
        <CharacterContext.Provider value={{ character, readOnly: true }}>
            <span className="tailwind-root">
                <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-8">
                    <BaseBlock accentColor="primary" />
                    <AttributeBlock accentColor="secondary" />
                    <SkillBlock accentColor="primary" />
                    <AdvantagesBlock accentColor="secondary" />
                    <ForceBlock accentColor="primary" />
                    <BodyBlock accentColor="secondary" />
                    <OtherBlock accentColor="primary" />
                </div>
            </span>
        </CharacterContext.Provider>
    );
}

interface HealthViewerProps {
    levels: ConditionMark[];
}

export function HealthViewer({ levels }: HealthViewerProps) {
    const character: BaseCharacter = {
        id: 'health-viewer',
        metadata: { name: '', type: 'sentient', template: '' },
        attributes: {},
        skills: {},
        health: {
            levels: levels as [
                ConditionMark,
                ConditionMark,
                ConditionMark,
                ConditionMark,
                ConditionMark,
                ConditionMark,
                ConditionMark,
            ],
        },
        inventory: [],
        armor: [],
        weapons: [],
        implants: [],
        customTalents: [],
        customSkills: [],
        customKnowledges: [],
        notes: '',
    };
    return (
        <CharacterContext.Provider value={{ character, readOnly: true }}>
            <span className="tailwind-root">
                <div className="max-w-xs mx-auto">
                    <HealthBlock />
                </div>
            </span>
        </CharacterContext.Provider>
    );
}
