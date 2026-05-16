import { CollapsibleBlock } from '../../../components/shared';
import { DerivedStatsBlock, ExperienceBlock } from './StatsBlock';
import { useCharacterStore } from '../../../store/characterStore';

export function OtherBlock() {
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    return (
        <CollapsibleBlock title="Other" accentColor="secondary" storageKey="otherBlock">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DerivedStatsBlock />
                <ExperienceBlock />
                <div className="bg-bgSurface border rounded-lg p-4">
                    <h3 className="text-textSecondary text-sm font-semibold uppercase tracking-wider mb-3">
                        Notes
                    </h3>
                    <textarea
                        className="w-full bg-bgSurface border rounded-lg px-4 py-3 text-sm text-textPrimary resize-none"
                        rows={6}
                        placeholder="Character notes, background, equipment..."
                        value={currentCharacter.notes}
                        onChange={(e) =>
                            updateCharacter(currentCharacter.id, { notes: e.target.value })
                        }
                    />
                </div>
            </div>
        </CollapsibleBlock>
    );
}
