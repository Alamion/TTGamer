import { ChevronDown, ChevronUp } from 'lucide-react';
import { TraitRowWithInput } from '../../../components/shared';
import { useCharacterStore } from '../../../store/characterStore';
import { useExpandedState } from '../../../hooks';

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

export function AttributeBlock() {
    const [isExpanded, toggleExpanded] = useExpandedState('attributeBlock', true);
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const handleAttributeChange = (
        key: string,
        value: number,
        specialization: boolean | null,
        experienced: boolean | null,
        practiced: boolean | null
    ) => {
        const currentAttr = currentCharacter.attributes[key] || {
            value: 0,
            specialization: false,
            experienced: false,
            practiced: false,
        };
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
        const currentAttr = currentCharacter.attributes[key] || {
            value: 0,
            specialization: false,
            experienced: false,
            practiced: false,
        };
        updateCharacter(currentCharacter.id, {
            attributes: {
                ...currentCharacter.attributes,
                [key]: {
                    ...currentAttr,
                    specializationText,
                },
            },
        });
    };

    const renderAttributeColumn = (title: string, attrs: typeof ATTRIBUTES.physical) => (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-hologram-blue text-sm font-semibold uppercase tracking-wider mb-3">
                {title}
            </h3>
            <div className="space-y-0">
                {attrs.map((attr) => {
                    const trait = currentCharacter.attributes[attr.key] || {
                        value: 0,
                        specialization: false,
                        experienced: false,
                        practiced: false,
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
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <button onClick={toggleExpanded} className="w-full flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <span className="w-1 h-6 bg-hologram-blue rounded-full" />
                    Attributes
                </h2>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>

            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {renderAttributeColumn('Physical', ATTRIBUTES.physical)}
                    {renderAttributeColumn('Social', ATTRIBUTES.social)}
                    {renderAttributeColumn('Mental', ATTRIBUTES.mental)}
                </div>
            )}
        </div>
    );
}
