import { SheetHeader } from './SheetHeader';
import { AttributeBlock } from './AttributeBlock';
import { SkillBlock } from './SkillBlock';
import { AdvantagesBlock } from './AdvantagesBlock';
import { PowerBlock } from './PowerBlock';
import { BodyBlock } from './BodyBlock';
import { OtherBlock } from './OtherBlock';
import { useCharacterStore } from '../../../store/characterStore';
import { Plus } from 'lucide-react';

export function CharacterSheet() {
    const { currentCharacter, createNewCharacter } = useCharacterStore();

    if (!currentCharacter) {
        return (
            <div className="min-h-screen bg-bgBase flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-textPrimary mb-4">
                        No Character Loaded
                    </h2>
                    <button
                        onClick={createNewCharacter}
                        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 text-primary-on rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Create New Character
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bgBase">
            <SheetHeader />

            <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-8">
                <AttributeBlock />
                <SkillBlock />
                <AdvantagesBlock />
                <PowerBlock />
                <BodyBlock />
                <OtherBlock />
            </div>
        </div>
    );
}
