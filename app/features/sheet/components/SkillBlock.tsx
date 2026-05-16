import { CollapsibleBlock } from '../../../components/shared';
import { CustomTraitList, TraitRowWithInput } from '../../../components/shared';
import { useCharacterStore } from '../../../store/characterStore';
import { DEFAULT_TRAIT_VALUE } from '../../../types/character';
import type { CustomSkill } from '../../../types/character';

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
} as const;

type SkillCategory = keyof typeof SKILLS;

const SKILL_CATEGORIES: { key: SkillCategory; label: string }[] = [
    { key: 'talents', label: 'Talents' },
    { key: 'skills', label: 'Skills' },
    { key: 'knowledges', label: 'Knowledges' },
];

export function SkillBlock() {
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const customTalents = currentCharacter.customTalents || [];
    const customSkills = currentCharacter.customSkills || [];
    const customKnowledges = currentCharacter.customKnowledges || [];

    const getCustomList = (category: SkillCategory): CustomSkill[] => {
        switch (category) {
            case 'talents':
                return customTalents;
            case 'skills':
                return customSkills;
            case 'knowledges':
                return customKnowledges;
        }
    };

    const handleSkillChange = (
        key: string,
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => {
        const currentSkill = currentCharacter.skills[key] || { ...DEFAULT_TRAIT_VALUE };
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
        const currentSkill = currentCharacter.skills[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(currentCharacter.id, {
            skills: {
                ...currentCharacter.skills,
                [key]: { ...currentSkill, specializationText },
            },
        });
    };

    const addCustomSkill = (category: SkillCategory) => {
        const newSkill: CustomSkill = {
            id: crypto.randomUUID(),
            label: '',
            value: 0,
            specialization: false,
            experienced: false,
            practiced: false,
        };
        updateCharacter(currentCharacter.id, {
            customTalents: category === 'talents' ? [...customTalents, newSkill] : customTalents,
            customSkills: category === 'skills' ? [...customSkills, newSkill] : customSkills,
            customKnowledges:
                category === 'knowledges' ? [...customKnowledges, newSkill] : customKnowledges,
        });
    };

    const removeCustomSkill = (category: SkillCategory, id: string) => {
        updateCharacter(currentCharacter.id, {
            customTalents:
                category === 'talents' ? customTalents.filter((s) => s.id !== id) : customTalents,
            customSkills:
                category === 'skills' ? customSkills.filter((s) => s.id !== id) : customSkills,
            customKnowledges:
                category === 'knowledges'
                    ? customKnowledges.filter((s) => s.id !== id)
                    : customKnowledges,
        });
    };

    const updateCustomSkill = (
        category: SkillCategory,
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
        updateCharacter(currentCharacter.id, {
            customTalents: category === 'talents' ? updateList(customTalents) : customTalents,
            customSkills: category === 'skills' ? updateList(customSkills) : customSkills,
            customKnowledges:
                category === 'knowledges' ? updateList(customKnowledges) : customKnowledges,
        });
    };

    const renderSkillColumn = (category: SkillCategory, skillsList: readonly string[]) => {
        const customList = getCustomList(category);
        return (
            <div className="bg-bgSurface border rounded-lg p-4">
                <h3 className="text-textSecondary text-sm font-semibold uppercase tracking-wider mb-3">
                    {SKILL_CATEGORIES.find((c) => c.key === category)?.label}
                </h3>
                <div className="space-y-0">
                    {skillsList.map((skill) => {
                        const trait = currentCharacter.skills[skill] || { ...DEFAULT_TRAIT_VALUE };
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
                    items={customList}
                    onAdd={() => addCustomSkill(category)}
                    onRemove={(id) => removeCustomSkill(category, id)}
                    onChange={(id, val, spec, exp, prc) =>
                        updateCustomSkill(
                            category,
                            id,
                            val,
                            undefined,
                            spec ?? undefined,
                            exp ?? undefined,
                            prc ?? undefined
                        )
                    }
                    onLabelChange={(id, label) => updateCustomSkill(category, id, 0, label)}
                    size="sm"
                    showFlags={true}
                />
            </div>
        );
    };

    return (
        <CollapsibleBlock title="Abilities" accentColor="secondary" storageKey="skillBlock">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderSkillColumn('talents', SKILLS.talents)}
                {renderSkillColumn('skills', SKILLS.skills)}
                {renderSkillColumn('knowledges', SKILLS.knowledges)}
            </div>
        </CollapsibleBlock>
    );
}
