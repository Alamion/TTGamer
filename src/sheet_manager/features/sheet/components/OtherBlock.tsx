import { CollapsibleBlock, SectionCard } from '../../../components';
import type { AccentColor } from '../../../components';
import { DerivedStatsBlock, ExperienceBlock } from './StatsBlock.tsx';
import { useCharacterStore } from '../../../store/characterStore.ts';

interface OtherBlockProps {
    accentColor?: AccentColor;
}

export function OtherBlock({ accentColor = 'secondary' }: OtherBlockProps) {
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    return (
        <CollapsibleBlock title="Other" accentColor={accentColor} storageKey="otherBlock">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DerivedStatsBlock />
                <ExperienceBlock />
                <SectionCard title="Notes">
                    <textarea
                        className="w-full bg-bgSurface border rounded-lg px-4 py-3 text-sm text-textPrimary resize-none"
                        rows={6}
                        placeholder="Character notes, background, equipment..."
                        value={currentCharacter.notes}
                        onChange={(e) =>
                            updateCharacter(currentCharacter.id, { notes: e.target.value })
                        }
                    />
                </SectionCard>
            </div>
        </CollapsibleBlock>
    );
}
