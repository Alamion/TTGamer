import { ChevronDown, ChevronUp } from 'lucide-react';
import { TraitRowWithInput } from '../../../components/shared';
import { StatDot } from '../../../components/shared';
import { useCharacterStore } from '../../../store/characterStore';
import { useExpandedState } from '../../../hooks';

const FORCE_SKILLS = ['Control', 'Dynamism', 'Rapport', 'Sense', 'Telekinesis'];
const VIRTUES = ['Conscience', 'Passion', 'Self Control'];

function getDarkSideColor(percentage: number): { bg: string; border: string } {
    if (percentage <= 30) return { bg: 'bg-rebel-red', border: 'border-rebel-red' };
    if (percentage <= 70) return { bg: 'bg-slate-500', border: 'border-slate-500' };
    if (percentage <= 100) return { bg: 'bg-white', border: 'border-white' };
    return { bg: 'bg-slate-500', border: 'border-slate-500' };
}

export function PowerBlock() {
    const [isExpanded, toggleExpanded] = useExpandedState('powerBlock', true);
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
        const currentSkill = currentCharacter.forceSkills?.[key] || {
            value: 0,
            specialization: false,
            experienced: false,
            practiced: false,
        };
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
        const currentSkill = currentCharacter.forceSkills?.[key] || {
            value: 0,
            specialization: false,
            experienced: false,
            practiced: false,
        };
        updateCharacter(currentCharacter.id, {
            forceSkills: {
                ...currentCharacter.forceSkills,
                [key]: { ...currentSkill, specializationText },
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
        <div className="space-y-6">
            <button onClick={toggleExpanded} className="w-full flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <span className="w-1 h-6 bg-hologram-blue rounded-full" />
                    Power
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
                        <h3 className="text-hologram-blue text-sm font-semibold uppercase tracking-wider mb-3">
                            Force Skills
                        </h3>
                        <div className="space-y-0">
                            {FORCE_SKILLS.map((skill) => {
                                const trait = currentCharacter.forceSkills?.[skill] || {
                                    value: 0,
                                    specialization: false,
                                    experienced: false,
                                    practiced: false,
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
                        </div>
                    </div>

                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                        <h3 className="text-imperial-blue text-sm font-semibold uppercase tracking-wider mb-3">
                            Virtues
                        </h3>
                        <div className="space-y-0">
                            {VIRTUES.map((virtue) => {
                                const trait = currentCharacter.virtues?.[virtue] || {
                                    value: 0,
                                    specialization: false,
                                    experienced: false,
                                    practiced: false,
                                };
                                return (
                                    <TraitRowWithInput
                                        key={virtue}
                                        name={virtue}
                                        specializationText={trait.specializationText}
                                        value={trait.value}
                                        onChange={(val, spec, exp, prc) => {
                                            updateCharacter(currentCharacter.id, {
                                                virtues: {
                                                    ...currentCharacter.virtues,
                                                    [virtue]: {
                                                        value: val,
                                                        specialization: spec ?? false,
                                                        experienced: exp ?? false,
                                                        practiced: prc ?? false,
                                                    },
                                                },
                                            });
                                        }}
                                        onSpecializationTextChange={(text) => {
                                            updateCharacter(currentCharacter.id, {
                                                virtues: {
                                                    ...currentCharacter.virtues,
                                                    [virtue]: {
                                                        ...trait,
                                                        specializationText: text,
                                                    },
                                                },
                                            });
                                        }}
                                        size="sm"
                                        minimal={1}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                        <h3 className="text-imperial-blue text-sm font-semibold uppercase tracking-wider mb-3">
                            Resolve
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-300">Willpower</span>
                                <StatDot
                                    value={willpower.current}
                                    maxValue={10}
                                    onChange={(val) => handleWillpowerChange(val)}
                                    size="md"
                                    minimal={willpowerMinimal}
                                    activeColor={{
                                        bg: 'bg-imperial-blue',
                                        border: 'border-imperial-blue',
                                    }}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-300">Force Points</span>
                                <StatDot
                                    value={forcePoints.current}
                                    maxValue={Math.max(1, forcePointsMax)}
                                    onChange={(val) => handleForcePointsChange(val)}
                                    size="md"
                                    activeColor={{
                                        bg: 'bg-hologram-blue',
                                        border: 'border-hologram-blue',
                                    }}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-300">Dark Side Resistance</span>
                                <StatDot
                                    value={darkSide}
                                    maxValue={10}
                                    onChange={(val) => handleDarkSideChange(val)}
                                    size="md"
                                    activeColor={getDarkSideColor((darkSide / 10) * 100)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
