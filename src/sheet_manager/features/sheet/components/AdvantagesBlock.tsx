import { CollapsibleBlock, SectionCard } from '../../../components';
import type { AccentColor } from '../../../components';
import { CustomTraitList, MeritFlawList } from '../../../components';
import { useCharacterStore } from '../../../store/characterStore.ts';
import type { Background, MeritFlawItem } from '../../../types/character.ts';
import { generateId } from '@site/src/shared/utils/random';

interface AdvantagesBlockProps {
    accentColor?: AccentColor;
}

export function AdvantagesBlock({ accentColor = 'primary' }: AdvantagesBlockProps) {
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const backgrounds = currentCharacter.backgrounds ?? [];
    const merits = currentCharacter.merits ?? [];
    const flaws = currentCharacter.flaws ?? [];

    const addBackground = () => {
        const newBackground: Background = { id: generateId(), label: '', value: 0 };
        updateCharacter(currentCharacter.id, {
            backgrounds: [...backgrounds, newBackground],
        });
    };

    const removeBackground = (id: string) => {
        updateCharacter(currentCharacter.id, {
            backgrounds: backgrounds.filter((b) => b.id !== id),
        });
    };

    const updateBackground = (id: string, value: number, label?: string) => {
        updateCharacter(currentCharacter.id, {
            backgrounds: backgrounds.map((b) =>
                b.id === id ? { ...b, value: value, label: label ?? b.label } : b
            ),
        });
    };

    const addMerit = () => {
        const newMerit: MeritFlawItem = { id: generateId(), points: 1, label: '' };
        updateCharacter(currentCharacter.id, {
            merits: [...merits, newMerit],
        });
    };

    const removeMerit = (id: string) => {
        updateCharacter(currentCharacter.id, {
            merits: merits.filter((m) => m.id !== id),
        });
    };

    const updateMerit = (id: string, points: number, label: string) => {
        updateCharacter(currentCharacter.id, {
            merits: merits.map((m) => (m.id === id ? { ...m, points, label } : m)),
        });
    };

    const addFlaw = () => {
        const newFlaw: MeritFlawItem = { id: generateId(), points: 1, label: '' };
        updateCharacter(currentCharacter.id, {
            flaws: [...flaws, newFlaw],
        });
    };

    const removeFlaw = (id: string) => {
        updateCharacter(currentCharacter.id, {
            flaws: flaws.filter((f) => f.id !== id),
        });
    };

    const updateFlaw = (id: string, points: number, label: string) => {
        updateCharacter(currentCharacter.id, {
            flaws: flaws.map((f) => (f.id === id ? { ...f, points, label } : f)),
        });
    };

    return (
        <CollapsibleBlock title="Advantages" accentColor={accentColor} storageKey="advantagesBlock">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SectionCard title="Backgrounds">
                    <CustomTraitList
                        items={backgrounds}
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
                    onAdd={addMerit}
                    onRemove={removeMerit}
                    onChange={updateMerit}
                    isMerit={true}
                />

                <MeritFlawList
                    title="Flaws"
                    items={flaws}
                    onAdd={addFlaw}
                    onRemove={removeFlaw}
                    onChange={updateFlaw}
                    isMerit={false}
                />
            </div>
        </CollapsibleBlock>
    );
}
