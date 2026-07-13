import { CollapsibleBlock, SectionCard } from '../../../components';
import type { AccentColor } from '../../../components';
import { CustomTraitList, TraitRowWithInput, StatDot } from '../../../components';
import type { CatalogEntry } from '../../../components';
import { useCharacterStore } from '../../../store/characterStore.ts';
import { useCharacterContext } from '../../../context/CharacterContext.tsx';
import { DEFAULT_TRAIT_VALUE } from '../../../types/character.ts';
import { buildDiceNotation } from '@site/src/shared/utils/diceNotation';
import { FORCE_POWERS } from '@site/src/data/forcePowersData';
import type { ForcePowerEntry } from '@site/src/data/forcePowersData';
import { generateId } from '@site/src/shared/utils/random';

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
            forcePoints: { ...forcePoints, current: value },
        });
    };

    const handleMaxForcePointsChange = (value: number) => {
        if (readOnly) return;
        const current = Math.min(forcePoints.current, value);
        updateCharacter(character.id, {
            forcePoints: { current, max: value },
        });
    };

    const handleDarkSideChange = (value: number) => {
        if (readOnly) return;
        updateCharacter(character.id, {
            darkSideResistance: value,
        });
    };

    const forcePowerItems = (character.forcePowerItems ?? []).map((fp) => ({
        id: fp.id,
        label: fp.name,
        value: fp.value,
    }));

    const forcePowersCatalog: CatalogEntry[] = FORCE_POWERS.map((e: ForcePowerEntry) => ({
        id: e.id,
        name: e.name,
        subtitle: e.shortDescription,
    }));

    const addForcePower = () => {
        if (readOnly) return;
        const current = character.forcePowerItems ?? [];
        updateCharacter(character.id, {
            forcePowerItems: [...current, { id: generateId(), name: '', value: 0 }],
        });
    };

    const removeForcePower = (id: string) => {
        if (readOnly) return;
        const current = character.forcePowerItems ?? [];
        updateCharacter(character.id, {
            forcePowerItems: current.filter((fp) => fp.id !== id),
        });
    };

    const handleForcePowerValueChange = (id: string, value: number) => {
        if (readOnly) return;
        const current = character.forcePowerItems ?? [];
        updateCharacter(character.id, {
            forcePowerItems: current.map((fp) => (fp.id === id ? { ...fp, value } : fp)),
        });
    };

    const handleForcePowerLabelChange = (id: string, label: string) => {
        if (readOnly) return;
        const current = character.forcePowerItems ?? [];
        updateCharacter(character.id, {
            forcePowerItems: current.map((fp) => (fp.id === id ? { ...fp, name: label } : fp)),
        });
    };

    const handleForcePowerCatalogSelect = (id: string, entry: CatalogEntry) => {
        if (readOnly) return;
        const current = character.forcePowerItems ?? [];
        updateCharacter(character.id, {
            forcePowerItems: current.map((fp) =>
                fp.id === id ? { ...fp, name: entry.name, catalogId: entry.id } : fp
            ),
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
                <SectionCard
                    title="Force Skills"
                    docsPath="/docs/star-wars-wod-2e/character/force#force-skills"
                >
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

                <div className="space-y-4">
                    <SectionCard
                        title="Virtues"
                        docsPath="/docs/star-wars-wod-2e/character/virtues-willpower#the-three-virtues"
                    >
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
                    <SectionCard>
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
                            <span className="text-sm text-textPrimary">Max Force Points</span>
                            <StatDot
                                value={forcePoints.max}
                                maxValue={10}
                                disabled={readOnly}
                                onChange={(val) => handleMaxForcePointsChange(val)}
                                size="md"
                                minimal={selfControl}
                                onDiceRoll={buildDiceNotation}
                            />
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-textPrimary">Force Points</span>
                            <StatDot
                                value={forcePoints.current}
                                maxValue={Math.max(1, forcePoints.max)}
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

                <SectionCard
                    title="Force Powers"
                    docsPath="/docs/star-wars-wod-2e/character/force#force-powers"
                >
                    <CustomTraitList
                        items={forcePowerItems}
                        disabled={readOnly}
                        onAdd={addForcePower}
                        onRemove={removeForcePower}
                        onChange={(id, val) => handleForcePowerValueChange(id, val)}
                        onLabelChange={(id, label) => handleForcePowerLabelChange(id, label)}
                        maxValue={1}
                        placeholder="Force power name..."
                        size="sm"
                        catalog={forcePowersCatalog}
                        onCatalogSelect={handleForcePowerCatalogSelect}
                    />
                </SectionCard>
            </div>
        </CollapsibleBlock>
    );
}
