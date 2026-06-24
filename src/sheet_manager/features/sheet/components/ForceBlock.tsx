import { CollapsibleBlock, SectionCard } from '../../../components';
import type { AccentColor } from '../../../components';
import { TraitRowWithInput } from '../../../components';
import { StatDot } from '../../../components';
import { useCharacterStore } from '../../../store/characterStore.ts';
import { useCharacterContext } from '../../../context/CharacterContext.tsx';
import { DEFAULT_TRAIT_VALUE } from '../../../types/character.ts';
import { buildDiceNotation } from '@site/src/shared/utils/diceNotation';

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
    const { character: contextChar, readOnly } = useCharacterContext();

    const character = contextChar ?? currentCharacter;
    if (!character) return null;

    const forcePoints = character.forcePoints ?? { current: 0, max: 10 };
    const darkSide = character.darkSideResistance ?? 5;
    const willpower = character.willpower ?? { current: 5, max: 5 };

    const passion = character.virtues?.Passion?.value ?? 1;
    const selfControl = character.virtues?.['Self Control']?.value ?? 1;

    const willpowerMinimal = Math.min(passion + selfControl, 10);
    const forcePointsMax = selfControl;

    const handleForceSkillChange = (
        key: string,
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => {
        if (readOnly) return;
        const currentSkill = character.forceSkills?.[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(character.id, {
            forceSkills: {
                ...character.forceSkills,
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
        if (readOnly) return;
        const currentSkill = character.forceSkills?.[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(character.id, {
            forceSkills: {
                ...character.forceSkills,
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
        if (readOnly) return;
        const currentVirtue = character.virtues?.[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(character.id, {
            virtues: {
                ...character.virtues,
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
        if (readOnly) return;
        const currentVirtue = character.virtues?.[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(character.id, {
            virtues: {
                ...character.virtues,
                [key]: { ...currentVirtue, specializationText },
            },
        });
    };

    const handleWillpowerChange = (value: number) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            willpower: { ...willpower, current: value },
        });
    };

    const handleForcePointsChange = (value: number) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            forcePoints: { current: value, max: forcePointsMax },
        });
    };

    const handleDarkSideChange = (value: number) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            darkSideResistance: value,
        });
    };

    return (
        <CollapsibleBlock
            title="Force"
            accentColor={accentColor}
            storageKey="forceBlock"
            docsPath="/docs/star-wars-wod-2e/character/force"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SectionCard title="Force Skills">
                    {FORCE_SKILLS.map((skill) => {
                        const trait = character.forceSkills?.[skill] || {
                            ...DEFAULT_TRAIT_VALUE,
                        };
                        return (
                            <TraitRowWithInput
                                key={skill}
                                name={skill}
                                disabled={readOnly}
                                specializationText={trait.specializationText}
                                value={trait.value}
                                onChange={(val, spec, exp, prc) =>
                                    handleForceSkillChange(skill, val, spec, exp, prc)
                                }
                                onSpecializationTextChange={(text) =>
                                    handleForceSkillSpecializationChange(skill, text)
                                }
                                size="md"
                                onDiceRoll={buildDiceNotation}
                            />
                        );
                    })}
                </SectionCard>
                <SectionCard title="Virtues">
                    {VIRTUES.map((virtue) => {
                        const trait = character.virtues?.[virtue] || {
                            ...DEFAULT_TRAIT_VALUE,
                        };
                        return (
                            <TraitRowWithInput
                                key={virtue}
                                name={virtue}
                                disabled={readOnly}
                                specializationText={trait.specializationText}
                                value={trait.value}
                                onChange={(val, spec, exp, prc) =>
                                    handleVirtueChange(virtue, val, spec, exp, prc)
                                }
                                onSpecializationTextChange={(text) =>
                                    handleVirtueSpecializationChange(virtue, text)
                                }
                                size="md"
                                minimal={1}
                                onDiceRoll={buildDiceNotation}
                            />
                        );
                    })}
                </SectionCard>
                <SectionCard title="Resolve">
                    <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-textPrimary">Willpower</span>
                        <StatDot
                            value={willpower.current}
                            maxValue={10}
                            disabled={readOnly}
                            onChange={(val) => handleWillpowerChange(val)}
                            size="md"
                            minimal={willpowerMinimal}
                            onDiceRoll={buildDiceNotation}
                        />
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-textPrimary">Force Points</span>
                        <StatDot
                            value={forcePoints.current}
                            maxValue={Math.max(1, forcePointsMax)}
                            disabled={readOnly}
                            onChange={(val) => handleForcePointsChange(val)}
                            size="md"
                            onDiceRoll={buildDiceNotation}
                        />
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-textPrimary">Dark Side Resistance</span>
                        <StatDot
                            value={darkSide}
                            maxValue={10}
                            disabled={readOnly}
                            onChange={(val) => handleDarkSideChange(val)}
                            size="md"
                            activeColor={getDarkSideColor((darkSide / 10) * 100)}
                            onDiceRoll={buildDiceNotation}
                        />
                    </div>
                </SectionCard>
            </div>
        </CollapsibleBlock>
    );
}
