import { CollapsibleBlock, SectionCard } from '../../../components';
import type { AccentColor } from '../../../components';
import { CustomTraitList, MeritFlawList } from '../../../components';
import { useCharacterStore } from '../../../store/characterStore.ts';
import { useCharacterContext } from '../../../context/CharacterContext.tsx';
import type { Background, MeritFlawItem } from '../../../types/character.ts';
import { generateId } from '@site/src/shared/utils/random';

interface AdvantagesBlockProps {
    accentColor?: AccentColor;
}

export function AdvantagesBlock({ accentColor = 'primary' }: AdvantagesBlockProps) {
    const { currentCharacter, updateCharacter } = useCharacterStore();
    const { character: contextChar, readOnly } = useCharacterContext();

    const character = contextChar ?? currentCharacter;
    if (!character) return null;

    const backgrounds = character.backgrounds ?? [];
    const merits = character.merits ?? [];
    const flaws = character.flaws ?? [];

    const addBackground = () => {
        if (readOnly) return;
        const newBackground: Background = { id: generateId(), label: '', value: 0 };
        updateCharacter(character.id, {
            backgrounds: [...backgrounds, newBackground],
        });
    };

    const removeBackground = (id: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            backgrounds: backgrounds.filter((b) => b.id !== id),
        });
    };

    const updateBackground = (id: string, value: number, label?: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            backgrounds: backgrounds.map((b) =>
                b.id === id ? { ...b, value: value, label: label ?? b.label } : b
            ),
        });
    };

    const addMerit = () => {
        if (readOnly) return;
        const newMerit: MeritFlawItem = { id: generateId(), points: 1, label: '' };
        updateCharacter(character.id, {
            merits: [...merits, newMerit],
        });
    };

    const removeMerit = (id: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            merits: merits.filter((m) => m.id !== id),
        });
    };

    const updateMerit = (id: string, points: number, label: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            merits: merits.map((m) => (m.id === id ? { ...m, points, label } : m)),
        });
    };

    const addFlaw = () => {
        if (readOnly) return;
        const newFlaw: MeritFlawItem = { id: generateId(), points: 1, label: '' };
        updateCharacter(character.id, {
            flaws: [...flaws, newFlaw],
        });
    };

    const removeFlaw = (id: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            flaws: flaws.filter((f) => f.id !== id),
        });
    };

    const updateFlaw = (id: string, points: number, label: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            flaws: flaws.map((f) => (f.id === id ? { ...f, points, label } : f)),
        });
    };

    return (
        <CollapsibleBlock title="Advantages" accentColor={accentColor} storageKey="advantagesBlock">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SectionCard
                    title="Backgrounds"
                    docsPath="/docs/star-wars-wod-2e/character/backgrounds"
                >
                    <CustomTraitList
                        items={backgrounds}
                        disabled={readOnly}
                        onAdd={addBackground}
                        onRemove={removeBackground}
                        onChange={(id, val) => updateBackground(id, val)}
                        onLabelChange={(id, label) => updateBackground(id, 0, label)}
                        size="md"
                        placeholder="Background name..."
                    />
                </SectionCard>

                <MeritFlawList
                    title="Merits"
                    items={merits}
                    disabled={readOnly}
                    onAdd={addMerit}
                    onRemove={removeMerit}
                    onChange={updateMerit}
                    isMerit={true}
                    docsPath="/docs/star-wars-wod-2e/character/merits-flaws"
                />

                <MeritFlawList
                    title="Flaws"
                    items={flaws}
                    disabled={readOnly}
                    onAdd={addFlaw}
                    onRemove={removeFlaw}
                    onChange={updateFlaw}
                    isMerit={false}
                    docsPath="/docs/star-wars-wod-2e/character/merits-flaws"
                />
            </div>
        </CollapsibleBlock>
    );
}
