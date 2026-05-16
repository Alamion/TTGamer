import { useCharacterStore } from '../../../store/characterStore';
import { SectionCard } from '@site/app/components/shared';

export function DerivedStatsBlock() {
    const { currentCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const wits = currentCharacter.attributes.Wits?.value || 0;

    const conscience = currentCharacter.virtues?.Conscience?.value || 1;
    const passion = currentCharacter.virtues?.Passion?.value || 1;
    const selfControl = currentCharacter.virtues?.['Self Control']?.value || 1;

    const controlDots = currentCharacter.forceSkills?.Control?.value || 0;
    const telekinesisDots = currentCharacter.forceSkills?.Telekinesis?.value || 0;

    const alertness = currentCharacter.skills.Alertness?.value || 0;

    const willpowerMax = passion + selfControl;
    const darkSideResistance = 5 + conscience - passion;
    const initiativeStandard = wits + alertness;
    const initiativeLightsaber = initiativeStandard + controlDots;
    const jumpingDistanceMultiplier = Math.min(controlDots, telekinesisDots) || 1;
    const runningSpeedMultiplier = Math.min(controlDots, telekinesisDots) || 1;

    return (
        <SectionCard title="Derived Stats">
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-textSecondary">Willpower</span>
                    <span className="text-textPrimary font-mono">{willpowerMax}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-textSecondary">Dark Side Res.</span>
                    <span className="text-textPrimary font-mono">{darkSideResistance}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-textSecondary">Initiative (Std)</span>
                    <span className="text-textPrimary font-mono">{initiativeStandard}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-textSecondary">Initiative (Saber)</span>
                    <span className="text-textPrimary font-mono">{initiativeLightsaber}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-textSecondary">Jumping Distance</span>
                    <span className="text-textPrimary font-mono">×{jumpingDistanceMultiplier}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-textSecondary">Running Speed</span>
                    <span className="text-textPrimary font-mono">×{runningSpeedMultiplier}</span>
                </div>
            </div>
        </SectionCard>
    );
}

export function ExperienceBlock() {
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const experience = currentCharacter.experience ?? { total: 0, spent: 0 };

    return (
        <SectionCard title="Experience">
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-textSecondary text-sm">Total XP</span>
                    <input
                        type="number"
                        value={experience.total}
                        onChange={(e) =>
                            updateCharacter(currentCharacter.id, {
                                experience: { ...experience, total: parseInt(e.target.value) || 0 },
                            })
                        }
                        className="w-20 bg-bgSurface border rounded px-3 py-1.5 text-right text-textPrimary font-mono"
                        aria-label="Total experience points"
                    />
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-textSecondary text-sm">Spent</span>
                    <input
                        type="number"
                        value={experience.spent}
                        onChange={(e) =>
                            updateCharacter(currentCharacter.id, {
                                experience: { ...experience, spent: parseInt(e.target.value) || 0 },
                            })
                        }
                        className="w-20 bg-bgSurface border rounded px-3 py-1.5 text-right text-textPrimary font-mono"
                        aria-label="Spent experience points"
                    />
                </div>
                <div className="flex justify-between pt-2 border-t">
                    <span className="text-textSecondary text-sm">Available</span>
                    <span className="text-textPrimary font-mono">
                        {experience.total - experience.spent}
                    </span>
                </div>
            </div>
        </SectionCard>
    );
}
