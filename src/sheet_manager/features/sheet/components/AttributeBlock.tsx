import { CollapsibleBlock, SectionCard } from '../../../components';
import type { AccentColor } from '../../../components';
import { TraitRowWithInput } from '../../../components';
import { useCharacterStore } from '../../../store/characterStore.ts';
import { useCharacterContext } from '../../../context/CharacterContext.tsx';
import { DEFAULT_TRAIT_VALUE } from '../../../types/character.ts';
import { buildDiceNotation } from '@site/src/shared/utils/diceNotation';

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
    const { character: contextChar, readOnly } = useCharacterContext();

    const character = contextChar ?? currentCharacter;
    if (!character) return null;

    const handleAttributeChange = (
        key: string,
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => {
        if (readOnly) return;
        const currentAttr = character.attributes[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(character.id, {
            attributes: {
                ...character.attributes,
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
        if (readOnly) return;
        const currentAttr = character.attributes[key] || { ...DEFAULT_TRAIT_VALUE };
        updateCharacter(character.id, {
            attributes: {
                ...character.attributes,
                [key]: { ...currentAttr, specializationText },
            },
        });
    };

    const renderAttributeColumn = (title: string, attrs: typeof ATTRIBUTES.physical) => (
        <SectionCard title={title}>
            {attrs.map((attr) => {
                const trait = character.attributes[attr.key] || {
                    ...DEFAULT_TRAIT_VALUE,
                };
                return (
                    <TraitRowWithInput
                        key={attr.key}
                        name={attr.label}
                        specializationText={trait.specializationText}
                        value={trait.value}
                        disabled={readOnly}
                        onChange={(val, spec, exp, prc) =>
                            handleAttributeChange(attr.key, val, spec, exp, prc)
                        }
                        onSpecializationTextChange={(text) =>
                            handleAttributeSpecializationChange(attr.key, text)
                        }
                        size="lg"
                        minimal={1}
                        showFlags={true}
                        specialization={trait.specialization}
                        experienced={trait.experienced}
                        practiced={trait.practiced}
                        onDiceRoll={buildDiceNotation}
                    />
                );
            })}
        </SectionCard>
    );

    return (
        <CollapsibleBlock
            title="Attributes"
            accentColor={accentColor}
            storageKey="attributeBlock"
            docsPath="/docs/star-wars-wod-2e/core-rules/attributes-abilities#attributes"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderAttributeColumn('Physical', ATTRIBUTES.physical)}
                {renderAttributeColumn('Social', ATTRIBUTES.social)}
                {renderAttributeColumn('Mental', ATTRIBUTES.mental)}
            </div>
        </CollapsibleBlock>
    );
}
