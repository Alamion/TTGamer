import { useRef, useState } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { ChevronDown, ChevronUp, Download, Upload, RotateCcw } from 'lucide-react';
import { BaseCharacterSchema, createDefaultCharacter } from '../../../types/character';
import type { CharacterMetadata } from '../../../types/character';
import { useExpandedState } from '../../../hooks';
import { ConfirmDialog } from '../../../components/shared';

type MetadataKey = keyof CharacterMetadata;

export function SheetHeader() {
    const { currentCharacter, updateCharacter, importCharacter, setCurrentCharacter } =
        useCharacterStore();
    const [isExpanded, toggleExpanded] = useExpandedState('sheetHeader', false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    if (!currentCharacter) return null;

    const metadata: CharacterMetadata = currentCharacter.metadata;

    const handleMetadataChange = (field: MetadataKey, value: string) => {
        updateCharacter(currentCharacter.id, {
            metadata: { ...metadata, [field]: value },
        });
    };

    const handleExport = () => {
        if (!currentCharacter) return;
        const dataStr = JSON.stringify(currentCharacter, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${metadata.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleResetConfirm = () => {
        if (!currentCharacter) return;
        const resetData = {
            ...createDefaultCharacter(),
            id: currentCharacter.id,
        };
        setCurrentCharacter(resetData);
        updateCharacter(currentCharacter.id, resetData);
        setResetDialogOpen(false);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                setImportError(null);
                const json = JSON.parse(e.target?.result as string);
                const parsed = BaseCharacterSchema.parse(json);
                importCharacter(parsed);
            } catch {
                setImportError(
                    'Invalid character file. Please select a valid JSON character export.'
                );
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const renderField = (
        label: string,
        field: MetadataKey,
        placeholder: string,
        className: string = ''
    ) => (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label className="text-xs text-textSecondary uppercase tracking-wider">{label}</label>
            <input
                type="text"
                value={(metadata[field] as string) ?? ''}
                onChange={(e) => handleMetadataChange(field, e.target.value)}
                className="w-full bg-bgSurface border rounded px-3 py-2 text-sm text-textPrimary"
                placeholder={placeholder}
                aria-label={label}
            />
        </div>
    );

    return (
        <>
            <div className="bg-bgSurface border-b p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-textPrimary bg-bgSurface border hover:bg-bgBase rounded transition-colors"
                            title="Export character as JSON"
                        >
                            <Download className="w-3.5 h-3.5" aria-hidden="true" />
                            Export
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-textPrimary bg-bgSurface border hover:bg-bgBase rounded transition-colors"
                            title="Import character from JSON"
                        >
                            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                            Import
                        </button>
                        <button
                            onClick={() => setResetDialogOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-bgSurface border hover:bg-bgBase rounded transition-colors"
                            title="Reset all sheet data"
                        >
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                            Reset
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleImport}
                            className="hidden"
                            aria-label="Import character file"
                        />
                    </div>

                    <button
                        onClick={toggleExpanded}
                        className="flex items-center gap-1 text-sm text-textPrimary hover:text-textPrimary/80 transition-colors"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? 'Collapse header' : 'Expand header'}
                    >
                        {isExpanded ? 'Collapse' : 'Expand'}
                        {isExpanded ? (
                            <ChevronUp className="w-4 h-4" aria-hidden="true" />
                        ) : (
                            <ChevronDown className="w-4 h-4" aria-hidden="true" />
                        )}
                    </button>
                </div>

                {importError && (
                    <div
                        className="mb-4 p-3 bg-error/10 border border-error rounded-lg text-sm text-error"
                        role="alert"
                    >
                        {importError}
                    </div>
                )}

                {!isExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {renderField('Name', 'name', 'Character name...')}
                        {renderField('Concept', 'concept', 'Character concept...')}
                        {renderField('Species', 'species', "Human, Twi'lek...")}
                    </div>
                )}

                {isExpanded && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {renderField('Name', 'name', 'Character name...')}
                            {renderField('Concept', 'concept', 'Character concept...')}
                            {renderField('Species', 'species', "Human, Twi'lek...")}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {renderField('Player', 'player', 'Player name...')}
                            {renderField('Nature', 'nature', 'Nature...')}
                            {renderField('Home World', 'homeWorld', 'Coruscant, Tatooine...')}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {renderField('Adventure', 'adventure', 'Adventure/campaign...')}
                            {renderField('Demeanor', 'demeanor', 'Demeanor...')}
                            {renderField('Age', 'age', 'Age...')}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                onConfirm={handleResetConfirm}
                title="Reset Character Sheet"
                description="Are you sure you want to reset all sheet data? This cannot be undone."
                confirmLabel="Reset"
                cancelLabel="Cancel"
                variant="danger"
            />
        </>
    );
}
