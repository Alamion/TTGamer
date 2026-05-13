import { ChevronDown, ChevronUp } from 'lucide-react';
import { CustomTraitList, TraitRowWithInput } from '../../../components/shared';
import { useCharacterStore } from '../../../store/characterStore';
import { useExpandedState } from '../../../hooks';

const SKILLS = {
    talents: [
        'Alertness',
        'Athletics',
        'Brawl',
        'Command',
        'Diplomacy',
        'Dodge',
        'Empathy',
        'Intimidation',
        'Streetwise',
        'Subterfuge',
    ],
    skills: [
        'Blaster',
        'Gunnery',
        'Melee',
        'Pilot',
        'Programming',
        'Repair',
        'Ride',
        'Security',
        'Stealth',
        'Survival',
    ],
    knowledges: [
        'Astrogation',
        'Bureaucracy',
        'Cultures',
        'Interfaces',
        'Investigation',
        'Languages',
        'Medicine',
        'Politics',
        'Tech',
        'Trade',
    ],
};

interface CustomSkill {
    id: string;
    label: string;
    value: number;
    specialization?: boolean;
    experienced?: boolean;
    practiced?: boolean;
}

export function SkillBlock() {
    const [isExpanded, toggleExpanded] = useExpandedState('skillBlock', true);
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const customTalents = currentCharacter.customTalents || [];
    const customSkills = currentCharacter.customSkills || [];
    const customKnowledges = currentCharacter.customKnowledges || [];

    const handleSkillChange = (
        key: string,
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => {
        const currentSkill = currentCharacter.skills[key] || {
            value: 0,
            specialization: false,
            experienced: false,
            practiced: false,
        };
        updateCharacter(currentCharacter.id, {
            skills: {
                ...currentCharacter.skills,
                [key]: {
                    value,
                    specialization: specialization ?? currentSkill.specialization ?? false,
                    experienced: experienced ?? currentSkill.experienced ?? false,
                    practiced: practiced ?? currentSkill.practiced ?? false,
                },
            },
        });
    };

    const handleSkillSpecializationChange = (key: string, specializationText: string) => {
        const currentSkill = currentCharacter.skills[key] || {
            value: 0,
            specialization: false,
            experienced: false,
            practiced: false,
        };
        updateCharacter(currentCharacter.id, {
            skills: {
                ...currentCharacter.skills,
                [key]: {
                    ...currentSkill,
                    specializationText,
                },
            },
        });
    };

    const addCustomSkill = (type: 'talents' | 'skills' | 'knowledges') => {
        const id = crypto.randomUUID();
        const newSkill: CustomSkill = {
            id,
            label: '',
            value: 0,
            specialization: false,
            experienced: false,
            practiced: false,
        };
        if (type === 'talents') {
            updateCharacter(currentCharacter.id, { customTalents: [...customTalents, newSkill] });
        } else if (type === 'skills') {
            updateCharacter(currentCharacter.id, { customSkills: [...customSkills, newSkill] });
        } else {
            updateCharacter(currentCharacter.id, {
                customKnowledges: [...customKnowledges, newSkill],
            });
        }
    };

    const removeCustomSkill = (type: 'talents' | 'skills' | 'knowledges', id: string) => {
        if (type === 'talents') {
            updateCharacter(currentCharacter.id, {
                customTalents: customTalents.filter((s) => s.id !== id),
            });
        } else if (type === 'skills') {
            updateCharacter(currentCharacter.id, {
                customSkills: customSkills.filter((s) => s.id !== id),
            });
        } else {
            updateCharacter(currentCharacter.id, {
                customKnowledges: customKnowledges.filter((s) => s.id !== id),
            });
        }
    };

    const updateCustomSkill = (
        type: 'talents' | 'skills' | 'knowledges',
        id: string,
        value: number,
        label?: string,
        specialization?: boolean,
        experienced?: boolean,
        practiced?: boolean
    ) => {
        const updateList = (list: CustomSkill[]) =>
            list.map((s) =>
                s.id === id
                    ? {
                          ...s,
                          value,
                          label: label ?? s.label,
                          specialization: specialization ?? s.specialization,
                          experienced: experienced ?? s.experienced,
                          practiced: practiced ?? s.practiced,
                      }
                    : s
            );
        if (type === 'talents') {
            updateCharacter(currentCharacter.id, { customTalents: updateList(customTalents) });
        } else if (type === 'skills') {
            updateCharacter(currentCharacter.id, { customSkills: updateList(customSkills) });
        } else {
            updateCharacter(currentCharacter.id, {
                customKnowledges: updateList(customKnowledges),
            });
        }
    };

    const renderSkillColumn = (title: string, skillsList: string[]) => (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-cyber-yellow text-sm font-semibold uppercase tracking-wider mb-3">
                {title}
            </h3>
            <div className="space-y-0">
                {skillsList.map((skill) => {
                    const trait = currentCharacter.skills[skill] || {
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
                                handleSkillChange(skill, val, spec, exp, prc)
                            }
                            onSpecializationTextChange={(text) =>
                                handleSkillSpecializationChange(skill, text)
                            }
                            size="sm"
                            showFlags={true}
                            specialization={trait.specialization}
                            experienced={trait.experienced}
                            practiced={trait.practiced}
                        />
                    );
                })}
            </div>
            <CustomTraitList
                items={
                    title === 'Talents'
                        ? customTalents
                        : title === 'Skills'
                          ? customSkills
                          : customKnowledges
                }
                onAdd={() =>
                    addCustomSkill(
                        title === 'Talents'
                            ? 'talents'
                            : title === 'Skills'
                              ? 'skills'
                              : 'knowledges'
                    )
                }
                onRemove={(id) =>
                    removeCustomSkill(
                        title === 'Talents'
                            ? 'talents'
                            : title === 'Skills'
                              ? 'skills'
                              : 'knowledges',
                        id
                    )
                }
                onChange={(id, val, spec, exp, prc) =>
                    updateCustomSkill(
                        title === 'Talents'
                            ? 'talents'
                            : title === 'Skills'
                              ? 'skills'
                              : 'knowledges',
                        id,
                        val,
                        undefined,
                        spec ?? undefined,
                        exp ?? undefined,
                        prc ?? undefined
                    )
                }
                onLabelChange={(id, label) =>
                    updateCustomSkill(
                        title === 'Talents'
                            ? 'talents'
                            : title === 'Skills'
                              ? 'skills'
                              : 'knowledges',
                        id,
                        0,
                        label
                    )
                }
                size="sm"
                showFlags={true}
            />
        </div>
    );

    return (
        <div className="space-y-6">
            <button onClick={toggleExpanded} className="w-full flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <span className="w-1 h-6 bg-cyber-yellow rounded-full" />
                    Abilities
                </h2>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>

            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {renderSkillColumn('Talents', SKILLS.talents)}
                    {renderSkillColumn('Skills', SKILLS.skills)}
                    {renderSkillColumn('Knowledges', SKILLS.knowledges)}
                </div>
            )}
        </div>
    );
}
