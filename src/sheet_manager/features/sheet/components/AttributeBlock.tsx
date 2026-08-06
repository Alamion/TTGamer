import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { localizeCatalogEntry } from '@site/src/data/localizeCatalogEntry';
import { buildDiceNotation } from '@site/src/shared/utils/diceNotation';

import type { AccentColor } from '../../../components';
import { CollapsibleBlock, SectionCard, TraitRowWithInput } from '../../../components';
import { useCharacter } from '../../../hooks';
import { DEFAULT_ATTRIBUTE_VALUE } from '../../../types/character';

const ATTRIBUTES = {
    physical: [
        { id: 'strength', key: 'Strength', label: 'Strength' },
        { id: 'dexterity', key: 'Dexterity', label: 'Dexterity' },
        { id: 'stamina', key: 'Stamina', label: 'Stamina' },
    ],
    social: [
        { id: 'charisma', key: 'Charisma', label: 'Charisma' },
        { id: 'manipulation', key: 'Manipulation', label: 'Manipulation' },
        { id: 'appearance', key: 'Appearance', label: 'Appearance' },
    ],
    mental: [
        { id: 'perception', key: 'Perception', label: 'Perception' },
        { id: 'intelligence', key: 'Intelligence', label: 'Intelligence' },
        { id: 'wits', key: 'Wits', label: 'Wits' },
    ],
};

interface AttributeBlockProps {
    accentColor?: AccentColor;
}

export function AttributeBlock({ accentColor = 'primary' }: AttributeBlockProps) {
    const { i18n } = useDocusaurusContext();
    const { character, readOnly, updateCharacter } = useCharacter();
    if (!character) return null;

    const handleAttributeChange = (
        key: string,
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => {
        const currentAttr = character.attributes[key] || { ...DEFAULT_ATTRIBUTE_VALUE };
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
        const currentAttr = character.attributes[key] || { ...DEFAULT_ATTRIBUTE_VALUE };
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
                    ...DEFAULT_ATTRIBUTE_VALUE,
                };
                return (
                    <TraitRowWithInput
                        key={attr.key}
                        name={
                            localizeCatalogEntry('attributes', attr.id, i18n.currentLocale, {
                                name: attr.label,
                            }).name
                        }
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
                        characterName={character.metadata.name}
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
