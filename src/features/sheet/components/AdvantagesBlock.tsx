import { ChevronDown, ChevronUp } from 'lucide-react';
import { CustomTraitList, MeritFlawList } from '../../../components/shared';
import { useCharacterStore } from '../../../store/characterStore';
import { useExpandedState } from '../../../hooks';
import type { Background, MeritFlawItem } from '../../../types/character';

export function AdvantagesBlock() {
    const [isExpanded, toggleExpanded] = useExpandedState('advantagesBlock', true);
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const backgrounds = currentCharacter.backgrounds ?? [];
    const merits = currentCharacter.merits ?? [];
    const flaws = currentCharacter.flaws ?? [];

    const addBackground = () => {
        const newBackground: Background = { id: crypto.randomUUID(), label: '', value: 0 };
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
        const newMerit: MeritFlawItem = { id: crypto.randomUUID(), points: 1, label: '' };
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
        const newFlaw: MeritFlawItem = { id: crypto.randomUUID(), points: 1, label: '' };
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
        <div className="space-y-6">
            <button onClick={toggleExpanded} className="w-full flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <span className="w-1 h-6 bg-rebel-red rounded-full" />
                    Advantages
                </h2>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>

            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                        <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-3">
                            Backgrounds
                        </h3>
                        <CustomTraitList
                            items={backgrounds}
                            onAdd={addBackground}
                            onRemove={removeBackground}
                            onChange={(id, val) => updateBackground(id, val)}
                            onLabelChange={(id, label) => updateBackground(id, 0, label)}
                            size="sm"
                            placeholder="Background name..."
                        />
                    </div>

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
            )}
        </div>
    );
}
