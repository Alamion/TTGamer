import { CollapsibleBlock, SectionCard } from '../../../components/shared';
import type { AccentColor } from '../../../components/shared';
import { TraitRowWithInput } from '../../../components/shared';
import { StatDot } from '../../../components/shared';
import { useCharacterStore } from '../../../store/characterStore';
import { DEFAULT_TRAIT_VALUE } from '../../../types/character';

interface ForceBlockProps {
    accentColor?: AccentColor;
}

const FORCE_SKILLS = ['Control', 'Dynamism', 'Rapport', 'Sense', 'Telekinesis'] as const;
const VIRTUES = ['Conscience', 'Passion', 'Self Control'] as const;

function getDarkSideColor(percentage: number): { bg: string; border: string } {
    if (percentage <= 30) return { bg: 'bg-jediRed', border: 'border-jediRed' };
    if (percentage <= 70) return { bg: 'bg-empireGrey', border: 'border-empireGrey' };
    if (percentage <= 100) return { bg: 'bg-jediBlue', border: 'border-jediBlue' };
    return { bg: 'bg-secondary', border: 'border-secondary' };
}

export function ForceBlock({ accentColor = 'secondary' }: ForceBlockProps) {
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const forcePoints = currentCharacter.forcePoints ?? { current: 0, max: 10 };
    const darkSide = currentCharacter.darkSideResistance ?? 5;
    const willpower = currentCharacter.willpower ?? { current: 5, max: 5 };

    const passion = currentCharacter.virtues?.Passion?.value ?? 1;
    const selfControl = currentCharacter.virtues?.['Self Control']?.value ?? 1;

    const willpowerMinimal = Math.min(passion + selfControl, 10);
    const forcePointsMax = selfControl;

    const handleForceSkillChange = (
        key: string,
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => {
        const currentSkill = currentCharacter.forceSkills?.[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(currentCharacter.id, {
            forceSkills: {
                ...currentCharacter.forceSkills,
                [key]: {
                    value,
                    specialization: specialization ?? currentSkill.specialization ?? false,
                    experienced: experienced ?? currentSkill.experienced ?? false,
                    practiced: practiced ?? currentSkill.practiced ?? false,
                },
            },
        });
    };

    const handleForceSkillSpecializationChange = (key: string, specializationText: string) => {
        const currentSkill = currentCharacter.forceSkills?.[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(currentCharacter.id, {
            forceSkills: {
                ...currentCharacter.forceSkills,
                [key]: { ...currentSkill, specializationText },
            },
        });
    };

    const handleVirtueChange = (
        key: string,
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => {
        const currentVirtue = currentCharacter.virtues?.[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(currentCharacter.id, {
            virtues: {
                ...currentCharacter.virtues,
                [key]: {
                    value,
                    specialization: specialization ?? currentVirtue.specialization ?? false,
                    experienced: experienced ?? currentVirtue.experienced ?? false,
                    practiced: practiced ?? currentVirtue.practiced ?? false,
                },
            },
        });
    };

    const handleVirtueSpecializationChange = (key: string, specializationText: string) => {
        const currentVirtue = currentCharacter.virtues?.[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(currentCharacter.id, {
            virtues: {
                ...currentCharacter.virtues,
                [key]: { ...currentVirtue, specializationText },
            },
        });
    };

    const handleWillpowerChange = (value: number) => {
        updateCharacter(currentCharacter.id, {
            willpower: { ...willpower, current: value },
        });
    };

    const handleForcePointsChange = (value: number) => {
        updateCharacter(currentCharacter.id, {
            forcePoints: { current: value, max: forcePointsMax },
        });
    };

    const handleDarkSideChange = (value: number) => {
        updateCharacter(currentCharacter.id, {
            darkSideResistance: value,
        });
    };

    return (
        <CollapsibleBlock title="Force" accentColor={accentColor} storageKey="forceBlock">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SectionCard title="Force Skills">
                    {FORCE_SKILLS.map((skill) => {
                        const trait = currentCharacter.forceSkills?.[skill] || {
                            ...DEFAULT_TRAIT_VALUE,
                        };
                        return (
                            <TraitRowWithInput
                                key={skill}
                                name={skill}
                                specializationText={trait.specializationText}
                                value={trait.value}
                                onChange={(val, spec, exp, prc) =>
                                    handleForceSkillChange(skill, val, spec, exp, prc)
                                }
                                onSpecializationTextChange={(text) =>
                                    handleForceSkillSpecializationChange(skill, text)
                                }
                                size="sm"
                            />
                        );
                    })}
                </SectionCard>
                <SectionCard title="Virtues">
                    {VIRTUES.map((virtue) => {
                        const trait = currentCharacter.virtues?.[virtue] || {
                            ...DEFAULT_TRAIT_VALUE,
                        };
                        return (
                            <TraitRowWithInput
                                key={virtue}
                                name={virtue}
                                specializationText={trait.specializationText}
                                value={trait.value}
                                onChange={(val, spec, exp, prc) =>
                                    handleVirtueChange(virtue, val, spec, exp, prc)
                                }
                                onSpecializationTextChange={(text) =>
                                    handleVirtueSpecializationChange(virtue, text)
                                }
                                size="sm"
                                minimal={1}
                            />
                        );
                    })}
                </SectionCard>
                <SectionCard title="Resolve">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-textPrimary">Willpower</span>
                        <StatDot
                            value={willpower.current}
                            maxValue={10}
                            onChange={(val) => handleWillpowerChange(val)}
                            size="md"
                            minimal={willpowerMinimal}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-textPrimary">Force Points</span>
                        <StatDot
                            value={forcePoints.current}
                            maxValue={Math.max(1, forcePointsMax)}
                            onChange={(val) => handleForcePointsChange(val)}
                            size="md"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-textPrimary">Dark Side Resistance</span>
                        <StatDot
                            value={darkSide}
                            maxValue={10}
                            onChange={(val) => handleDarkSideChange(val)}
                            size="md"
                            activeColor={getDarkSideColor((darkSide / 10) * 100)}
                        />
                    </div>
                </SectionCard>
            </div>
        </CollapsibleBlock>
    );
}
