import { CollapsibleBlock, SectionCard } from '../../../components';
import type { AccentColor } from '../../../components';
import { CustomTraitList, TraitRowWithInput } from '../../../components';
import { useCharacterStore } from '../../../store/characterStore.ts';
import { useCharacterContext } from '../../../context/CharacterContext.tsx';
import { DEFAULT_TRAIT_VALUE } from '../../../types/character.ts';
import type { CustomSkill } from '../../../types/character.ts';
import { generateId } from '@site/src/shared/utils/random';
import { buildDiceNotation } from '@site/src/shared/utils/diceNotation';

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

interface SkillBlockProps {
    accentColor?: AccentColor;
}

export function SkillBlock({ accentColor = 'secondary' }: SkillBlockProps) {
    const { currentCharacter, updateCharacter } = useCharacterStore();
    const { character: contextChar, readOnly } = useCharacterContext();

    const character = contextChar ?? currentCharacter;
    if (!character) return null;

    const customTalents = character.customTalents || [];
    const customSkills = character.customSkills || [];
    const customKnowledges = character.customKnowledges || [];

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
        if (readOnly) return;
        const currentSkill = character.skills[key] || { ...DEFAULT_TRAIT_VALUE, value: 0 };
        updateCharacter(character.id, {
            skills: {
                ...character.skills,
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
        if (readOnly) return;
        const currentSkill = character.skills[key] || { ...DEFAULT_TRAIT_VALUE, value: 0 };
        updateCharacter(character.id, {
            skills: {
                ...character.skills,
                [key]: { ...currentSkill, specializationText },
            },
        });
    };

    const addCustomSkill = (category: SkillCategory) => {
        if (readOnly) return;
        const newSkill: CustomSkill = {
            id: generateId(),
            label: '',
            value: 0,
            specialization: false,
            experienced: false,
            practiced: false,
        };
        updateCharacter(character.id, {
            customTalents: category === 'talents' ? [...customTalents, newSkill] : customTalents,
            customSkills: category === 'skills' ? [...customSkills, newSkill] : customSkills,
            customKnowledges:
                category === 'knowledges' ? [...customKnowledges, newSkill] : customKnowledges,
        });
    };

    const removeCustomSkill = (category: SkillCategory, id: string) => {
        if (readOnly) return;
        updateCharacter(character.id, {
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
        if (readOnly) return;
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
        updateCharacter(character.id, {
            customTalents: category === 'talents' ? updateList(customTalents) : customTalents,
            customSkills: category === 'skills' ? updateList(customSkills) : customSkills,
            customKnowledges:
                category === 'knowledges' ? updateList(customKnowledges) : customKnowledges,
        });
    };

    const renderSkillColumn = (category: SkillCategory, skillsList: readonly string[]) => {
        const customList = getCustomList(category);
        return (
            <SectionCard title={SKILL_CATEGORIES.find((c) => c.key === category)?.label}>
                {skillsList.map((skill) => {
                    const trait = character.skills[skill] || {
                        ...DEFAULT_TRAIT_VALUE,
                        value: 0,
                    };
                    return (
                        <TraitRowWithInput
                            key={skill}
                            name={skill}
                            specializationText={trait.specializationText}
                            value={trait.value}
                            disabled={readOnly}
                            onChange={(val, spec, exp, prc) =>
                                handleSkillChange(skill, val, spec, exp, prc)
                            }
                            onSpecializationTextChange={(text) =>
                                handleSkillSpecializationChange(skill, text)
                            }
                            size="md"
                            showFlags={true}
                            specialization={trait.specialization}
                            experienced={trait.experienced}
                            practiced={trait.practiced}
                            onDiceRoll={buildDiceNotation}
                        />
                    );
                })}
                <CustomTraitList
                    items={customList}
                    disabled={readOnly}
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
                    size="md"
                    showFlags={true}
                    onDiceRoll={buildDiceNotation}
                />
            </SectionCard>
        );
    };

    return (
        <CollapsibleBlock
            title="Skills"
            accentColor={accentColor}
            storageKey="skillBlock"
            docsPath="/docs/star-wars-wod-2e/core-rules/attributes-abilities#abilities"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderSkillColumn('talents', SKILLS.talents)}
                {renderSkillColumn('skills', SKILLS.skills)}
                {renderSkillColumn('knowledges', SKILLS.knowledges)}
            </div>
        </CollapsibleBlock>
    );
}
