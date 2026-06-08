import { CollapsibleBlock, SectionCard } from '../../../components';
import type { AccentColor } from '../../../components';
import { useCharacterStore } from '../../../store/characterStore.ts';
import type { CharacterMetadata } from '../../../types/character.ts';

type MetadataKey = keyof CharacterMetadata;

interface BaseBlockProps {
    accentColor?: AccentColor;
}

const FIELD_CONFIGS: Array<{ key: MetadataKey; label: string; placeholder: string }> = [
    { key: 'name', label: 'Name', placeholder: 'Character name...' },
    { key: 'concept', label: 'Concept', placeholder: 'Character concept...' },
    { key: 'species', label: 'Species', placeholder: "Human, Twi'lek..." },
    { key: 'player', label: 'Player', placeholder: 'Player name...' },
    { key: 'nature', label: 'Nature', placeholder: 'Nature...' },
    { key: 'homeWorld', label: 'Home World', placeholder: 'Coruscant, Tatooine...' },
    { key: 'adventure', label: 'Adventure', placeholder: 'Adventure/campaign...' },
    { key: 'demeanor', label: 'Demeanor', placeholder: 'Demeanor...' },
    { key: 'age', label: 'Age', placeholder: 'Age...' },
];

export function BaseBlock({ accentColor = 'primary' }: BaseBlockProps) {
    const { currentCharacter, updateCharacter } = useCharacterStore();

    if (!currentCharacter) return null;

    const metadata = currentCharacter.metadata;

    const handleFieldChange = (field: MetadataKey, value: string) => {
        updateCharacter(currentCharacter.id, {
            metadata: { ...metadata, [field]: value },
        });
    };

    const renderField = (config: (typeof FIELD_CONFIGS)[number], className: string = '') => (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label className="text-xs text-textSecondary uppercase tracking-wider">
                {config.label}
            </label>
            <input
                type="text"
                value={(metadata[config.key] as string) ?? ''}
                onChange={(e) => handleFieldChange(config.key, e.target.value)}
                className="w-full bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary"
                placeholder={config.placeholder}
                aria-label={config.label}
            />
        </div>
    );

    return (
        <CollapsibleBlock title="Base" accentColor={accentColor} storageKey="baseBlock">
            <SectionCard>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {renderField(FIELD_CONFIGS[0])}
                    {renderField(FIELD_CONFIGS[1])}
                    {renderField(FIELD_CONFIGS[2])}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {renderField(FIELD_CONFIGS[3])}
                    {renderField(FIELD_CONFIGS[4])}
                    {renderField(FIELD_CONFIGS[5])}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {renderField(FIELD_CONFIGS[6])}
                    {renderField(FIELD_CONFIGS[7])}
                    {renderField(FIELD_CONFIGS[8])}
                </div>
            </SectionCard>
        </CollapsibleBlock>
    );
}
