import { CollapsibleBlock, SectionCard } from '../../../components/shared';
import type { AccentColor } from '../../../components/shared';
import { TraitRowWithInput } from '../../../components/shared';
import { useCharacterStore } from '../../../store/characterStore';
import { DEFAULT_TRAIT_VALUE } from '../../../types/character';

const ATTRIBUTES = {
    physical: [
        { key: 'Strength', label: 'Strength' },
        { key: 'Dexterity', label: 'Dexterity' },
        { key: 'Stamina', label: 'Stamina' },
    ],
    social: [
        { key: 'Charisma', label: 'Charisma' },
        { key: 'Manipulation', label: 'Manipulation' },
        { key: 'Appearance', label: 'Appearance' },
    ],
    mental: [
        { key: 'Perception', label: 'Perception' },
        { key: 'Intelligence', label: 'Intelligence' },
        { key: 'Wits', label: 'Wits' },
    ],
};

interface AttributeBlockProps {
    accentColor?: AccentColor;
}

export function AttributeBlock({ accentColor = 'primary' }: AttributeBlockProps) {
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const handleAttributeChange = (
        key: string,
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => {
        const currentAttr = currentCharacter.attributes[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(currentCharacter.id, {
            attributes: {
                ...currentCharacter.attributes,
                [key]: {
                    value,
                    specialization: specialization ?? currentAttr.specialization ?? false,
                    experienced: experienced ?? currentAttr.experienced ?? false,
                    practiced: practiced ?? currentAttr.practiced ?? false,
                },
            },
        });
    };

    const handleAttributeSpecializationChange = (key: string, specializationText: string) => {
        const currentAttr = currentCharacter.attributes[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(currentCharacter.id, {
            attributes: {
                ...currentCharacter.attributes,
                [key]: { ...currentAttr, specializationText },
            },
        });
    };

    const renderAttributeColumn = (title: string, attrs: typeof ATTRIBUTES.physical) => (
        <SectionCard title={title}>
            {attrs.map((attr) => {
                const trait = currentCharacter.attributes[attr.key] || {
                    ...DEFAULT_TRAIT_VALUE,
                };
                return (
                    <TraitRowWithInput
                        key={attr.key}
                        name={attr.label}
                        specializationText={trait.specializationText}
                        value={trait.value}
                        onChange={(val, spec, exp, prc) =>
                            handleAttributeChange(attr.key, val, spec, exp, prc)
                        }
                        onSpecializationTextChange={(text) =>
                            handleAttributeSpecializationChange(attr.key, text)
                        }
                        minimal={1}
                        showFlags={true}
                        specialization={trait.specialization}
                        experienced={trait.experienced}
                        practiced={trait.practiced}
                    />
                );
            })}
        </SectionCard>
    );

    return (
        <CollapsibleBlock title="Attributes" accentColor={accentColor} storageKey="attributeBlock">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderAttributeColumn('Physical', ATTRIBUTES.physical)}
                {renderAttributeColumn('Social', ATTRIBUTES.social)}
                {renderAttributeColumn('Mental', ATTRIBUTES.mental)}
            </div>
        </CollapsibleBlock>
    );
}
