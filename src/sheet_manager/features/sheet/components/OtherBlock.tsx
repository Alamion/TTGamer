import { CollapsibleBlock, SectionCard } from '../../../components';
import type { AccentColor } from '../../../components';
import { DerivedStatsBlock, ExperienceBlock } from './StatsBlock.tsx';
import { useCharacterStore } from '../../../store/characterStore.ts';
import { useCharacterContext } from '../../../context/CharacterContext.tsx';

interface OtherBlockProps {
    accentColor?: AccentColor;
}

export function OtherBlock({ accentColor = 'secondary' }: OtherBlockProps) {
    const { currentCharacter, updateCharacter } = useCharacterStore();
    const { character: contextChar, readOnly } = useCharacterContext();

    const character = contextChar ?? currentCharacter;
    if (!character) return null;

    return (
        <CollapsibleBlock title="Other" accentColor={accentColor} storageKey="otherBlock">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DerivedStatsBlock />
                <ExperienceBlock readOnly={readOnly} />
                <SectionCard title="Notes">
                    <textarea
                        disabled={readOnly}
                        className="w-full bg-bgSurface border rounded-lg px-4 py-3 text-sm text-textPrimary resize-none disabled:opacity-60 disabled:cursor-default"
                        rows={6}
                        placeholder="Character notes, background, equipment..."
                        value={character.notes}
                        onChange={(e) => {
                            if (readOnly) return;
                            updateCharacter(character.id, { notes: e.target.value });
                        }}
                    />
                </SectionCard>
            </div>
        </CollapsibleBlock>
    );
}
