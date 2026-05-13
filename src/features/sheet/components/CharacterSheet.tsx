import { SheetHeader } from './SheetHeader';
import { AttributeBlock } from './AttributeBlock';
import { SkillBlock } from './SkillBlock';
import { AdvantagesBlock } from './AdvantagesBlock';
import { PowerBlock } from './PowerBlock';
import { BodyBlock } from './BodyBlock';
import { DerivedStatsBlock, ExperienceBlock } from './StatsBlock';
import { useCharacterStore } from '../../../store/characterStore';
import { Plus } from 'lucide-react';

export function CharacterSheet() {
    const { currentCharacter, createNewCharacter } = useCharacterStore();

    if (!currentCharacter) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-100 mb-4">No Character Loaded</h2>
                    <button
                        onClick={createNewCharacter}
                        className="flex items-center gap-2 px-6 py-3 bg-hologram-blue hover:bg-hologram-blue/80 text-white rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Create New Character
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <SheetHeader />

            <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-8">
                <AttributeBlock />
                <SkillBlock />
                <AdvantagesBlock />
                <PowerBlock />

                <BodyBlock />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DerivedStatsBlock />
                    <ExperienceBlock />
                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                        <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-3">
                            Notes
                        </h3>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-hologram-blue focus:outline-none resize-none"
                            rows={6}
                            placeholder="Character notes, background, equipment..."
                            value={currentCharacter.notes}
                            onChange={(e) =>
                                useCharacterStore
                                    .getState()
                                    .updateCharacter(currentCharacter.id, { notes: e.target.value })
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
