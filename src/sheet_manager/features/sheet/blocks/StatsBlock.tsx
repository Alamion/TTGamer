import { SectionCard } from '../../../components';
import { useCharacter } from '../../../hooks';

export function DerivedStatsBlock() {
    const { character: currentCharacter } = useCharacter();

    if (!currentCharacter) return null;

    const wits = currentCharacter.attributes.Wits?.value || 0;

    const controlDots = currentCharacter.forceSkills?.Control?.value || 0;
    const telekinesisDots = currentCharacter.forceSkills?.Telekinesis?.value || 0;

    const alertness = currentCharacter.skills.Alertness?.value || 0;

    const initiativeStandard = wits + alertness;
    const initiativeLightsaber = initiativeStandard + controlDots;
    const jumpingDistanceMultiplier = Math.min(controlDots, telekinesisDots) || 1;
    const runningSpeedMultiplier = Math.min(controlDots, telekinesisDots) || 1;

    return (
        <SectionCard
            title="Derived Stats"
            docsPath="/docs/star-wars-wod-2e/character/virtues-willpower#derived-stats"
        >
            <div className="grid grid-cols-2 gap-2 text-sm">
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

interface ExperienceBlockProps {
    readOnly?: boolean;
}

export function ExperienceBlock({ readOnly = false }: ExperienceBlockProps) {
    const {
        character: currentCharacter,
        readOnly: contextReadOnly,
        updateCharacter,
    } = useCharacter();

    if (!currentCharacter) return null;

    const experience = currentCharacter.experience ?? { total: 0, spent: 0 };

    return (
        <SectionCard title="Experience" docsPath="/docs/star-wars-wod-2e/gm/rewards-advancement">
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-textSecondary text-sm">Total XP</span>
                    <input
                        type="number"
                        value={experience.total}
                        min={0}
                        disabled={readOnly || contextReadOnly}
                        onChange={(e) => {
                            if (readOnly || contextReadOnly) return;
                            const total = Math.max(0, Math.trunc(Number(e.target.value) || 0));
                            updateCharacter(currentCharacter.id, {
                                experience: {
                                    total,
                                    spent: Math.min(experience.spent, total),
                                },
                            });
                        }}
                        step={1}
                        className="w-20 bg-bgSurface border rounded px-3 py-1.5 text-right text-textPrimary font-mono disabled:opacity-60 disabled:cursor-default"
                        aria-label="Total experience points"
                    />
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-textSecondary text-sm">Spent</span>
                    <input
                        type="number"
                        value={experience.spent}
                        min={0}
                        disabled={readOnly || contextReadOnly}
                        onChange={(e) => {
                            if (readOnly || contextReadOnly) return;
                            const spent = Math.min(
                                experience.total,
                                Math.max(0, Math.trunc(Number(e.target.value) || 0))
                            );
                            updateCharacter(currentCharacter.id, {
                                experience: { ...experience, spent },
                            });
                        }}
                        max={experience.total}
                        step={1}
                        className="w-20 bg-bgSurface border rounded px-3 py-1.5 text-right text-textPrimary font-mono disabled:opacity-60 disabled:cursor-default"
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
