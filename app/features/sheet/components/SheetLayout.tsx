import { useRef, useState } from 'react';
import { useCharacterStore } from '../../../store/characterStore';
import { Download, Upload, RotateCcw, Users, Plus } from 'lucide-react';
import { BaseCharacterSchema, createDefaultCharacter } from '../../../types/character';
import { ConfirmDialog, CharacterManagerModal } from '../../../components/shared';

type SheetLayoutProps = {
    children: React.ReactNode;
};

export function SheetLayout({ children }: SheetLayoutProps) {
    const {
        currentCharacter,
        setCurrentCharacter,
        createNewCharacter,
        importCharacter,
        updateCharacter,
    } = useCharacterStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [managerModalOpen, setManagerModalOpen] = useState(false);

    const handleExport = () => {
        if (!currentCharacter) return;
        const dataStr = JSON.stringify(currentCharacter, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentCharacter.metadata.name.replace(/\s+/g, '_') ?? 'character'}_${Date.now()}.json`;
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
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setImportError(null);

        if (files.length > 1) {
            let successCount = 0;
            let errorCount = 0;

            Array.from(files).forEach((file) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const json = JSON.parse(e.target?.result as string);
                        const parsed = BaseCharacterSchema.parse(json);
                        importCharacter(parsed);
                        successCount++;
                    } catch {
                        errorCount++;
                    }
                };
                reader.readAsText(file);
            });

            if (errorCount > 0) {
                setImportError(
                    `Imported ${successCount} character(s), ${errorCount} file(s) failed to parse.`
                );
            }
        } else {
            const file = files[0];
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
        }
        event.target.value = '';
    };

    return (
        <>
            <div className="bg-bgSurface border-b p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            disabled={!currentCharacter}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-textPrimary bg-bgSurface border hover:bg-bgBase rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Export character as JSON"
                        >
                            <Download className="w-3.5 h-3.5" aria-hidden="true" />
                            Export
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-textPrimary bg-bgSurface border hover:bg-bgBase rounded transition-colors"
                            title="Import characters from JSON"
                        >
                            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                            Import
                        </button>
                        <button
                            onClick={() => setResetDialogOpen(true)}
                            disabled={!currentCharacter}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error bg-bgSurface border hover:bg-bgBase rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Reset all sheet data"
                        >
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                            Reset
                        </button>
                        <button
                            onClick={() => setManagerModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-textPrimary bg-bgSurface border hover:bg-bgBase rounded transition-colors"
                            title="Manage characters"
                        >
                            <Users className="w-3.5 h-3.5" aria-hidden="true" />
                            Manage
                        </button>
                        <button
                            onClick={createNewCharacter}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded hover:bg-primary/80 transition-colors"
                            title="Create new character"
                        >
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                            New
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleImport}
                            className="hidden"
                            aria-label="Import character file"
                            multiple={true}
                        />
                    </div>
                </div>

                {importError && (
                    <div
                        className="mb-4 p-3 bg-error/10 border border-error rounded-lg text-sm text-error"
                        role="alert"
                    >
                        {importError}
                    </div>
                )}

                {!currentCharacter && (
                    <div className="text-center py-6">
                        <h2 className="text-xl font-bold text-textPrimary mb-2">
                            No Character Loaded
                        </h2>
                        <p className="text-sm text-textSecondary mb-4">
                            Create a new character or load one from the manager.
                        </p>
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

            <CharacterManagerModal open={managerModalOpen} onOpenChange={setManagerModalOpen} />

            {currentCharacter && children}
        </>
    );
}
