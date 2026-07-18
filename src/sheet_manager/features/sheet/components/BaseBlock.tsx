import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Pen, User } from 'lucide-react';
import { CollapsibleBlock, SectionCard, CatalogSuggest } from '../../../components';
import type { AccentColor, CatalogEntry } from '../../../components';
import { useExpandedState, useCharacter } from '../../../hooks';
import type { CharacterMetadata } from '../../../types/character';
import { SPECIES } from '@site/src/data/speciesData';
import type { SpeciesEntry } from '@site/src/data/speciesData';

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

const APPEARANCE_FIELDS: Array<{ key: MetadataKey; label: string }> = [
    { key: 'gender', label: 'Gender' },
    { key: 'height', label: 'Height' },
    { key: 'build', label: 'Build' },
    { key: 'hair', label: 'Hair' },
    { key: 'eyes', label: 'Eyes' },
    { key: 'features', label: 'Features' },
];

export function BaseBlock({ accentColor = 'primary' }: BaseBlockProps) {
    const { character, readOnly, updateCharacter } = useCharacter();
    const [portraitExpanded, togglePortraitExpanded] = useExpandedState('basePortrait', true);

    if (!character) return null;

    const metadata = character.metadata;

    const handleFieldChange = (field: MetadataKey, value: string) => {
        updateCharacter(character.id, {
            metadata: { ...metadata, [field]: value },
        });
    };

    const speciesCatalog: CatalogEntry[] = SPECIES.map((s: SpeciesEntry) => ({
        id: s.id,
        name: s.name,
        subtitle: s.shortDescription,
    }));

    const handleSpeciesCatalogSelect = (entry: CatalogEntry) => {
        handleFieldChange('species', entry.name);
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
                disabled={readOnly}
                className="w-full bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary disabled:opacity-60 disabled:cursor-default"
                placeholder={config.placeholder}
                aria-label={config.label}
            />
        </div>
    );

    return (
        <CollapsibleBlock
            title="Base"
            accentColor={accentColor}
            storageKey="baseBlock"
            docsPath="/docs/star-wars-wod-2e/quick-start#2-fill-in-the-basics"
        >
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
                {portraitExpanded ? (
                    <ImagePortrait
                        key={character.id}
                        imageUrl={metadata.imageUrl}
                        onImageUrlChange={(url) => handleFieldChange('imageUrl', url)}
                        readOnly={readOnly}
                        onToggleCollapse={togglePortraitExpanded}
                    />
                ) : (
                    <button
                        type="button"
                        onClick={togglePortraitExpanded}
                        className="absolute top-0 left-0 p-1 rounded hover:bg-bgSurface text-textSecondary hover:text-textPrimary transition-colors z-10"
                        aria-label="Expand portrait"
                    >
                        <ChevronDown size={16} />
                    </button>
                )}

                <div
                    className={
                        portraitExpanded ? 'md:col-span-2 space-y-4' : 'md:col-span-3 space-y-4'
                    }
                >
                    <SectionCard>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {renderField(FIELD_CONFIGS[0])}
                            {renderField(FIELD_CONFIGS[1])}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-textSecondary uppercase tracking-wider">
                                    Species
                                </label>
                                <CatalogSuggest
                                    catalog={speciesCatalog}
                                    value={(metadata.species as string) ?? ''}
                                    onChange={(val) => handleFieldChange('species', val)}
                                    onSelect={handleSpeciesCatalogSelect}
                                    placeholder="Human, Twi'lek..."
                                    disabled={readOnly}
                                    className="w-full bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary disabled:opacity-60 disabled:cursor-default"
                                />
                            </div>
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

                    <SectionCard title="Appearance" storageKey="baseAppearance" defaultExpanded>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {APPEARANCE_FIELDS.slice(0, 3).map((field) => (
                                <div key={field.key} className="flex flex-col gap-1">
                                    <label className="text-xs text-textSecondary uppercase tracking-wider">
                                        {field.label}
                                    </label>
                                    <input
                                        type="text"
                                        value={(metadata[field.key] as string) ?? ''}
                                        onChange={(e) =>
                                            handleFieldChange(field.key, e.target.value)
                                        }
                                        disabled={readOnly}
                                        className="w-full bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary disabled:opacity-60 disabled:cursor-default"
                                        placeholder={field.label}
                                        aria-label={field.label}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            {APPEARANCE_FIELDS.slice(3, 6).map((field) => (
                                <div key={field.key} className="flex flex-col gap-1">
                                    <label className="text-xs text-textSecondary uppercase tracking-wider">
                                        {field.label}
                                    </label>
                                    <input
                                        type="text"
                                        value={(metadata[field.key] as string) ?? ''}
                                        onChange={(e) =>
                                            handleFieldChange(field.key, e.target.value)
                                        }
                                        disabled={readOnly}
                                        className="w-full bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary disabled:opacity-60 disabled:cursor-default"
                                        placeholder={field.label}
                                        aria-label={field.label}
                                    />
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard title="Biography" storageKey="baseBiography" defaultExpanded>
                        <AutoResizeTextarea
                            value={metadata.biography ?? ''}
                            onChange={(val) => handleFieldChange('biography', val)}
                            readOnly={readOnly}
                            placeholder="Character biography..."
                        />
                    </SectionCard>
                </div>
            </div>
        </CollapsibleBlock>
    );
}

function ImagePortrait({
    imageUrl,
    onImageUrlChange,
    readOnly,
    onToggleCollapse,
}: {
    imageUrl?: string;
    onImageUrlChange: (url: string) => void;
    readOnly: boolean;
    onToggleCollapse: () => void;
}) {
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [inputValue, setInputValue] = useState(imageUrl ?? '');
    const [imgError, setImgError] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        setImgError(false);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            onImageUrlChange(val);
        }, 500);
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const hasImage = !!imageUrl && !imgError;

    return (
        <div>
            <div className="flex items-center justify-between gap-2 mb-2">
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="p-1 rounded hover:bg-bgSurface text-textSecondary hover:text-textPrimary transition-colors"
                    aria-label="Collapse portrait"
                >
                    <ChevronUp size={16} />
                </button>
                {showUrlInput && (
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        placeholder="Paste image URL..."
                        className="flex-1 bg-bgSurface border rounded px-2 py-1 text-xs text-textPrimary"
                        aria-label="Portrait image URL"
                    />
                )}
                {!readOnly && (
                    <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        aria-label={showUrlInput ? 'Hide portrait URL input' : 'Edit portrait URL'}
                        className="p-1 rounded hover:bg-bgSurface text-textSecondary hover:text-textPrimary transition-colors"
                    >
                        <Pen size={16} />
                    </button>
                )}
            </div>
            <div className="relative w-full aspect-[2/3] bg-bgSurface border rounded overflow-hidden">
                {hasImage ? (
                    <img
                        src={imageUrl}
                        alt="Character portrait"
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-textSecondary">
                        <User size={32} />
                    </div>
                )}
            </div>
        </div>
    );
}

function AutoResizeTextarea({
    value,
    onChange,
    readOnly,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    readOnly: boolean;
    placeholder?: string;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = Math.max(el.scrollHeight, 80) + 'px';
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            className="w-full bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary disabled:opacity-60 disabled:cursor-default resize-none overflow-hidden min-h-[80px]"
            placeholder={placeholder}
            aria-label="Biography"
        />
    );
}
