import { useCharacterStore } from '../../../store/characterStore';

export function DerivedStatsBlock() {
    const { currentCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const dex = currentCharacter.attributes.Dexterity?.value || 0;
    const wits = currentCharacter.attributes.Wits?.value || 0;
    const str = currentCharacter.attributes.Strength?.value || 0;
    const con = currentCharacter.attributes.Constitution?.value || 0;
    const perce = currentCharacter.attributes.Perception?.value || 0;
    const int = currentCharacter.attributes.Intelligence?.value || 0;

    const initiative = dex + wits;
    const dodge = dex + (currentCharacter.skills.Dodge?.value || 0);
    const soak = con + (currentCharacter.attributes.Stamina?.value || con);
    const runSpeed = 10 + dex + str;
    const carriedLimit = str * 10;
    const woundThreshold = Math.ceil(con / 2) + 3;
    const consciousness = con * 2;

    return (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-hologram-blue text-sm font-semibold uppercase tracking-wider mb-3">
                Derived Stats
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-400">Initiative</span>
                    <span className="text-slate-200 font-mono">{initiative}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Dodge</span>
                    <span className="text-slate-200 font-mono">{dodge}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Soak</span>
                    <span className="text-slate-200 font-mono">{soak}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Run Speed</span>
                    <span className="text-slate-200 font-mono">{runSpeed}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Carried Limit</span>
                    <span className="text-slate-200 font-mono">{carriedLimit} kg</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Wound Threshold</span>
                    <span className="text-slate-200 font-mono">{woundThreshold}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Consciousness</span>
                    <span className="text-slate-200 font-mono">{consciousness}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Perception</span>
                    <span className="text-slate-200 font-mono">{perce + int}</span>
                </div>
            </div>
        </div>
    );
}

export function ExperienceBlock() {
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const experience = currentCharacter.experience ?? { total: 0, spent: 0 };

    return (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-hologram-blue text-sm font-semibold uppercase tracking-wider mb-3">
                Experience
            </h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Total XP</span>
                    <input
                        type="number"
                        value={experience.total}
                        onChange={(e) =>
                            updateCharacter(currentCharacter.id, {
                                experience: { ...experience, total: parseInt(e.target.value) || 0 },
                            })
                        }
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-right text-slate-200 font-mono [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Spent</span>
                    <input
                        type="number"
                        value={experience.spent}
                        onChange={(e) =>
                            updateCharacter(currentCharacter.id, {
                                experience: { ...experience, spent: parseInt(e.target.value) || 0 },
                            })
                        }
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-right text-slate-200 font-mono [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-slate-400 text-sm">Available</span>
                    <span className="text-slate-200 font-mono">
                        {experience.total - experience.spent}
                    </span>
                </div>
            </div>
        </div>
    );
}
