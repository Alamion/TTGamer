import { translate } from '@docusaurus/Translate';
import type { SpeciesEntry } from '@site/src/data/speciesData';
import { SPECIES } from '@site/src/data/speciesData';
import type { UiMessageDescriptor } from '@site/src/i18n/generated/uiMessages';
import { uiMessages } from '@site/src/i18n/generated/uiMessages';
import { AutoResizeTextarea } from '@site/src/sheet_manager/components/AutoResizeTextarea';
import {
    getSafePortraitUrl,
    loadPortrait,
    savePortrait,
} from '@site/src/sheet_manager/persistence/portraitStorage';
import { ChevronDown, ChevronUp, Pen, Trash2, Upload, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import type { AccentColor, CatalogEntry } from '../../../components';
import { CatalogSuggest, CollapsibleBlock, SectionCard } from '../../../components';
import { useCharacter, useExpandedState } from '../../../hooks';
import type { CharacterMetadata } from '../../../types/character';

type MetadataKey = keyof CharacterMetadata;

interface BaseBlockProps {
    accentColor?: AccentColor;
}

const FIELD_CONFIGS: Array<{
    key: MetadataKey;
    label: UiMessageDescriptor;
    placeholder: UiMessageDescriptor;
}> = [
    { key: 'name', ...uiMessages.sheet.base.fields.name },
    { key: 'concept', ...uiMessages.sheet.base.fields.concept },
    { key: 'species', ...uiMessages.sheet.base.fields.species },
    { key: 'player', ...uiMessages.sheet.base.fields.player },
    { key: 'nature', ...uiMessages.sheet.base.fields.nature },
    { key: 'homeWorld', ...uiMessages.sheet.base.fields.homeWorld },
    { key: 'adventure', ...uiMessages.sheet.base.fields.adventure },
    { key: 'demeanor', ...uiMessages.sheet.base.fields.demeanor },
    { key: 'age', ...uiMessages.sheet.base.fields.age },
];

const APPEARANCE_FIELDS: Array<{ key: MetadataKey; label: UiMessageDescriptor }> = [
    { key: 'gender', ...uiMessages.sheet.base.fields.gender },
    { key: 'height', ...uiMessages.sheet.base.fields.height },
    { key: 'build', ...uiMessages.sheet.base.fields.build },
    { key: 'hair', ...uiMessages.sheet.base.fields.hair },
    { key: 'eyes', ...uiMessages.sheet.base.fields.eyes },
    { key: 'features', ...uiMessages.sheet.base.fields.features },
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
            <label
                htmlFor={`character-${config.key}`}
                className="text-xs text-textSecondary uppercase tracking-wider"
            >
                {translate(config.label)}
            </label>
            <input
                id={`character-${config.key}`}
                type="text"
                value={(metadata[config.key] as string) ?? ''}
                onChange={(e) => handleFieldChange(config.key, e.target.value)}
                disabled={readOnly}
                className="w-full bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary disabled:opacity-60 disabled:cursor-default"
                placeholder={translate(config.placeholder)}
                aria-label={translate(config.label)}
            />
        </div>
    );

    return (
        <CollapsibleBlock
            title={translate(uiMessages.sheet.base.title)}
            accentColor={accentColor}
            storageKey="baseBlock"
            docsPath="/docs/star-wars-wod-2e/quick-start#2-fill-in-the-basics"
        >
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
                {portraitExpanded ? (
                    <ImagePortrait
                        key={character.id}
                        imageUrl={metadata.imageUrl}
                        portraitId={metadata.portraitId}
                        onMetadataChange={(updates) =>
                            updateCharacter(character.id, { metadata: { ...metadata, ...updates } })
                        }
                        readOnly={readOnly}
                        onToggleCollapse={togglePortraitExpanded}
                    />
                ) : (
                    <button
                        type="button"
                        onClick={togglePortraitExpanded}
                        className="absolute top-0 left-0 p-1 rounded hover:bg-bgSurface text-textSecondary hover:text-textPrimary transition-colors z-10"
                        aria-label={translate(uiMessages.sheet.base.portrait.expand)}
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
                                <span className="text-xs text-textSecondary uppercase tracking-wider">
                                    {translate(uiMessages.sheet.base.fields.species.label)}
                                </span>
                                <CatalogSuggest
                                    catalog={speciesCatalog}
                                    value={(metadata.species as string) ?? ''}
                                    onChange={(val) => handleFieldChange('species', val)}
                                    onSelect={handleSpeciesCatalogSelect}
                                    placeholder={translate(
                                        uiMessages.sheet.base.fields.species.placeholder
                                    )}
                                    ariaLabel={translate(
                                        uiMessages.sheet.base.fields.species.label
                                    )}
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

                    <SectionCard
                        title={translate(uiMessages.sheet.base.appearance)}
                        storageKey="baseAppearance"
                        defaultExpanded
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {APPEARANCE_FIELDS.slice(0, 3).map((field) => (
                                <div key={field.key} className="flex flex-col gap-1">
                                    <label className="text-xs text-textSecondary uppercase tracking-wider">
                                        {translate(field.label)}
                                    </label>
                                    <input
                                        type="text"
                                        value={(metadata[field.key] as string) ?? ''}
                                        onChange={(e) =>
                                            handleFieldChange(field.key, e.target.value)
                                        }
                                        disabled={readOnly}
                                        className="w-full bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary disabled:opacity-60 disabled:cursor-default"
                                        placeholder={translate(field.label)}
                                        aria-label={translate(field.label)}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            {APPEARANCE_FIELDS.slice(3, 6).map((field) => (
                                <div key={field.key} className="flex flex-col gap-1">
                                    <label className="text-xs text-textSecondary uppercase tracking-wider">
                                        {translate(field.label)}
                                    </label>
                                    <input
                                        type="text"
                                        value={(metadata[field.key] as string) ?? ''}
                                        onChange={(e) =>
                                            handleFieldChange(field.key, e.target.value)
                                        }
                                        disabled={readOnly}
                                        className="w-full bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary disabled:opacity-60 disabled:cursor-default"
                                        placeholder={translate(field.label)}
                                        aria-label={translate(field.label)}
                                    />
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title={translate(uiMessages.sheet.base.biography)}
                        storageKey="baseBiography"
                        defaultExpanded
                    >
                        <AutoResizeTextarea
                            value={metadata.biography ?? ''}
                            onChange={(val) => handleFieldChange('biography', val)}
                            readOnly={readOnly}
                            placeholder={translate(uiMessages.sheet.base.biographyPlaceholder)}
                        />
                    </SectionCard>
                </div>
            </div>
        </CollapsibleBlock>
    );
}

function ImagePortrait({
    imageUrl,
    portraitId,
    onMetadataChange,
    readOnly,
    onToggleCollapse,
}: {
    imageUrl?: string;
    portraitId?: string;
    onMetadataChange: (updates: Partial<CharacterMetadata>) => void;
    readOnly: boolean;
    onToggleCollapse: () => void;
}) {
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlDraft, setUrlDraft] = useState({ source: imageUrl ?? '', value: imageUrl ?? '' });
    const [imgError, setImgError] = useState(false);
    const [urlError, setUrlError] = useState<string>();
    const [localPortrait, setLocalPortrait] = useState<{
        portraitId: string;
        url: string;
    }>();
    const [processing, setProcessing] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let objectUrl: string | undefined;
        let cancelled = false;
        if (portraitId) {
            void loadPortrait(portraitId).then((blob) => {
                if (!blob || cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setLocalPortrait({ portraitId, url: objectUrl });
            });
        }
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [portraitId]);

    const commitUrl = (value: string) => {
        const safeUrl = getSafePortraitUrl(value);
        if (value.trim() && !safeUrl) {
            setUrlError(translate(uiMessages.sheet.base.portrait.invalidUrl));
            return;
        }
        setUrlError(undefined);
        setImgError(false);
        onMetadataChange({ imageUrl: safeUrl ?? '' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setUrlDraft({ source: imageUrl ?? '', value: val });
        setImgError(false);
        setUrlError(undefined);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            commitUrl(val);
        }, 500);
    };

    const handleLocalFile = async (file?: File) => {
        if (!file || processing) return;
        setProcessing(true);
        try {
            const nextPortraitId = await savePortrait(file);
            onMetadataChange({ portraitId: nextPortraitId });
            setImgError(false);
            toast.success(translate(uiMessages.sheet.base.portrait.saved));
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : translate(uiMessages.sheet.base.portrait.saveFailed)
            );
        } finally {
            setProcessing(false);
        }
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        if (readOnly) return;
        const image =
            Array.from(event.clipboardData.files).find((file) => file.type.startsWith('image/')) ??
            Array.from(event.clipboardData.items)
                .find((item) => item.type.startsWith('image/'))
                ?.getAsFile() ??
            undefined;
        if (image) {
            event.preventDefault();
            void handleLocalFile(image);
        }
    };

    const removeLocalPortrait = () => {
        onMetadataChange({ portraitId: undefined });
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const inputValue = urlDraft.source === (imageUrl ?? '') ? urlDraft.value : (imageUrl ?? '');
    const localUrl =
        localPortrait && localPortrait.portraitId === portraitId ? localPortrait.url : undefined;
    const safeRemoteUrl = getSafePortraitUrl(imageUrl);
    const portraitUrl = localUrl ?? safeRemoteUrl;
    const hasImage = !!portraitUrl && !imgError;

    return (
        <div>
            <div className="flex items-center justify-between gap-2 mb-2">
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="p-1 rounded hover:bg-bgSurface text-textSecondary hover:text-textPrimary transition-colors"
                    aria-label={translate(uiMessages.sheet.base.portrait.collapse)}
                >
                    <ChevronUp size={16} />
                </button>
                {showUrlInput && (
                    <div className="flex-1">
                        <input
                            type="url"
                            value={inputValue}
                            onChange={handleInputChange}
                            onBlur={() => commitUrl(inputValue)}
                            placeholder={translate(uiMessages.sheet.base.portrait.urlPlaceholder)}
                            className="w-full bg-bgSurface border rounded px-2 py-1 text-xs text-textPrimary"
                            aria-label={translate(uiMessages.sheet.base.portrait.urlAriaLabel)}
                            aria-invalid={!!urlError}
                            aria-describedby={urlError ? 'portrait-url-error' : 'portrait-url-note'}
                        />
                        <p
                            id={urlError ? 'portrait-url-error' : 'portrait-url-note'}
                            role={urlError ? 'alert' : undefined}
                            className={`mt-1 text-xs ${urlError ? 'text-error' : 'text-textSecondary'}`}
                        >
                            {urlError ?? translate(uiMessages.sheet.base.portrait.remoteHostNote)}
                        </p>
                    </div>
                )}
                {!readOnly && (
                    <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        aria-label={
                            showUrlInput
                                ? translate(uiMessages.sheet.base.portrait.hideUrlInput)
                                : translate(uiMessages.sheet.base.portrait.editUrl)
                        }
                        className="p-1 rounded hover:bg-bgSurface text-textSecondary hover:text-textPrimary transition-colors"
                    >
                        <Pen size={16} />
                    </button>
                )}
            </div>
            <div
                className="relative w-full aspect-[2/3] bg-bgSurface border rounded overflow-hidden focus-within:ring-2 focus-within:ring-primary/50"
                onPaste={handlePaste}
                tabIndex={readOnly ? undefined : 0}
                aria-label={
                    readOnly ? undefined : translate(uiMessages.sheet.base.portrait.pasteAriaLabel)
                }
            >
                {hasImage ? (
                    <img
                        src={portraitUrl}
                        alt={translate(uiMessages.sheet.base.portrait.alt)}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-textSecondary">
                        <User size={32} />
                    </div>
                )}
                {!readOnly && (
                    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-bgBase/85 p-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) => {
                                void handleLocalFile(event.target.files?.[0]);
                                event.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={processing}
                            className="flex items-center gap-1 rounded bg-bgSurface px-2 py-1 text-xs text-textPrimary disabled:opacity-60"
                            title={translate(uiMessages.sheet.base.portrait.uploadTitle)}
                        >
                            <Upload size={14} aria-hidden="true" />
                            {processing
                                ? translate(uiMessages.sheet.base.portrait.processing)
                                : translate(uiMessages.sheet.base.portrait.upload)}
                        </button>
                        {portraitId && (
                            <button
                                type="button"
                                onClick={removeLocalPortrait}
                                className="rounded bg-bgSurface p-1 text-error"
                                aria-label={translate(uiMessages.sheet.base.portrait.remove)}
                            >
                                <Trash2 size={14} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
