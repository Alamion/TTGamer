import { useRef, useState } from 'react';
import { useCharacterStore } from '../../../store/characterStore.ts';
import { Download, Upload, RotateCcw, Users, Plus } from 'lucide-react';
import { BaseCharacterSchema, createDefaultCharacter } from '../../../types/character.ts';
import { ConfirmDialog, CharacterManagerModal } from '../../../components';

type SheetLayoutProps = {
    children: React.ReactNode;
};
const btnBase =
    'flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed';

const btnSecondary = `${btnBase} text-textPrimary bg-bgSurface hover:bg-bgBase`;
const btnDanger = `${btnBase} text-error bg-bgSurface hover:bg-bgBase`;
const btnPrimary = `${btnBase} text-white bg-primary hover:bg-primary/90 border-transparent`;

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
            <div className="bg-bgSurface p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 sm:pb-0">
                    {/* Левая часть: Основные действия с персонажами */}
                    <div className="flex flex-wrap items-center gap-2.5 justify-around">
                        {/* Группа: Файловые операции */}
                        <div className="flex items-center gap-1.5 bg-bgSurface/50 p-1 rounded-lg border border-border/20">
                            <button
                                onClick={handleExport}
                                disabled={!currentCharacter}
                                className={btnSecondary}
                                title="Export character as JSON"
                            >
                                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Export</span>
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className={btnSecondary}
                                title="Import characters from JSON"
                            >
                                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Import</span>
                            </button>
                        </div>

                        {/* Группа: Управление */}
                        <div className="flex items-center gap-1.5 bg-bgSurface/50 p-1 rounded-lg border border-border/20">
                            <button
                                onClick={() => setManagerModalOpen(true)}
                                className={btnSecondary}
                                title="Manage characters"
                            >
                                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Manage</span>
                            </button>

                            <button
                                onClick={() => setResetDialogOpen(true)}
                                disabled={!currentCharacter}
                                className={btnDanger}
                                title="Reset all sheet data"
                            >
                                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Reset</span>
                            </button>
                        </div>
                    </div>

                    {/* Правая часть: Главное целевое действие (CTA) */}
                    <div className="flex items-center">
                        <button
                            onClick={createNewCharacter}
                            className={`${btnPrimary} w-full sm:w-auto px-4 py-2 text-sm`} // Чуть крупнее, так как это главное действие
                            title="Create new character"
                        >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                            <span>New</span>
                        </button>
                    </div>

                    {/* Скрытый инпут */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImport}
                        className="hidden"
                        aria-label="Import character file"
                        multiple
                    />
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
